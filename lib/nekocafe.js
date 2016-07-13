var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var http = require('http');
var https = require('https');

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

app.use(express.static(path.join(__dirname, '..', 'static')));

var Neko = function(socket, nick) {
    this.id = new Date().getTime();
    this.socket = socket;
    this.nick = nick;
};

var nekoes = [];
var messages = [];

var Message = function (nick, msg) {
    this.type = 'message';
    this.value = {time: Date.now(), nick: nick, message: msg};
}

var Users = function(nekoes) {
    this.type = 'users';
    this.value = nekoes.map(n => ({id: n.id, nick: n.nick}));
}

var Join = function(neko) {
    this.type = 'join';
    this.value = {id: neko.id, nick: neko.nick};
}

var Part = function(neko) {
    this.type = 'part';
    this.value = {id: neko.id, nick: neko.nick};
}

function unicast(socket, message) {
    socket.emit(message.type, message.value);
}

function broadcast(message) {
    nekoes.forEach(function(n) {
        n.socket.emit(message.type, message.value);
    });
}

io.on('connection', function(socket) {
    var me;
    socket.on('nick', function(params) {
        if (me === undefined) {
            me = new Neko(socket, params.nick);
            broadcast(new Join(me));
            nekoes.push(me);
            unicast(socket, new Users(nekoes));
            messages.forEach(m => unicast(socket, m));
        }
    });
    socket.on('disconnect', function() {
        if (me !== undefined) {
            nekoes = nekoes.filter(function(n) {return n.id !== me.id;});
            broadcast(new Part(me));
        }
    });
    socket.on('message', function(msg) {
        var message = new Message(me.nick, msg);
        messages.push(message);
        while (messages.length > MSGBUFLEN)
            messages.shift();
        broadcast(message);
    });
});

var server = server.listen(port, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});
