var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var http = require('http');
var https = require('https');
var util = require('./util');
var oembed = require('oembed-any').default;
var map = require('typed-promisify').map;

var MSGBUFLEN = 100;

if (process.argv.length < 3) {
    console.log('Usage: nekocafe <port> [key.pem cert.pem]');
    process.exit(1);
}

var port = process.argv[2];

if (process.argv.length > 3)
{
    var key = fs.readFileSync(process.argv[3]);
    var cert = fs.readFileSync(process.argv[4]);
    var server = https.createServer({key: key, cert: cert}, app);
}
else
{
    var server = http.createServer(app);
}

var io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, '..', 'dist')));

var Neko = function(socket, nick) {
    this.id = new Date().getTime();
    this.socket = socket;
    this.nick = nick;
};

var nekoes = [];
var messages = [];

var Message = function (nick, msg, embeds) {
    this.type = 'message';
    this.value = {time: Date.now(), nick: nick, message: msg, embeds: embeds};
}

var Users = function(nekoes) {
    this.type = 'users';
    this.value = nekoes.map(function(n) {return {id: n.id, nick: n.nick}});
}

var Join = function(neko) {
    this.type = 'join';
    this.value = {id: neko.id, nick: neko.nick};
}

var Part = function(neko) {
    this.type = 'part';
    this.value = {id: neko.id, nick: neko.nick};
}

var Time = function() {
    this.type = 'time';
    this.value = Date.now();
}

function unicast(socket, message) {
    socket.emit(message.type, message.value);
}

function broadcast(message) {
    nekoes.forEach(function(n) {
        n.socket.emit(message.type, message.value);
    });
}

setInterval(function() {broadcast(new Time())}, 15000);

io.on('connection', function(socket) {
    var me;
    socket.on('nick', function(params) {
        if (me === undefined) {
            me = new Neko(socket, params.nick);
            broadcast(new Join(me));
            nekoes.push(me);
            unicast(socket, new Users(nekoes));
            messages.forEach(function(m) {unicast(socket, m)});
            unicast(socket, new Time());
        }
    });
    socket.on('disconnect', function() {
        if (me !== undefined) {
            nekoes = nekoes.filter(function(n) {return n.id !== me.id;});
            broadcast(new Part(me));
        }
    });
    socket.on('message', function(msg) {
        getEmbeds(msg)
        .then(embeds => {
            var message = new Message(me.nick, msg, embeds);
            messages.push(message);
            while (messages.length > MSGBUFLEN)
                messages.shift();
            broadcast(message);
        });
    });
});

var server = server.listen(port, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});

function plain(url) {
    return oembed(url)
    .then(res => res.html);
}

function wrap16x9(url) {
    return oembed(url)
    .then(res => {
        return '<div class="thumbnail embed-responsive embed-responsive-16by9">' + res.html + '</div>';
    });
}

var handlers = [
    {pattern: /^https?:\/\/(www\.)?youtu\.be/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?youtube\.com/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?soundcloud\.com/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?twitter\.com/i, handler: plain}
];

function resolve(url) {
    var match = handlers.filter(h => h.pattern.test(url));
    if (match.length === 0)
        return Promise.reject('no oembed handler');
    return match[0].handler(url);
}

function getEmbed(url) {
    return resolve(url)
    .catch(err => null);
}

function getEmbeds(s) {
    return map(util.getLinks(s), getEmbed)
    .then(res => res.filter(e => e !== null));
}