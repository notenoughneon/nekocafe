var express = require('express');
var fs = require('fs');
var path = require('path');
var app = express();
var http = require('http');
var https = require('https');
var embed = require('./embed');

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

// upload server
app.use(function(req, res, next) {
    console.log(req.method + ' ' + req.path);
    if (req.method !== 'GET') {
        res.sendStatus(400);
        return;
    }
    var match = req.path.match(/^\/(\d+)\/.*$/);
    if (match === null) {
        res.sendStatus(404);
        return;
    }
    var id = match[1];
    if (files[id] === undefined) {
        res.sendStatus(404);
        return;
    }
    res.set('Content-Type', files[id].type);
    res.send(files[id].data);
})

var Neko = function(socket, nick) {
    this.id = new Date().getTime();
    this.socket = socket;
    this.nick = nick;
};

var nekoes = [];
var messages = [];
var files = {};

var Message = function (nick, msgOrFile, embeds) {
    this.type = 'message';
    var time = Date.now();
    var html;
    if (typeof msgOrFile === 'string') {
        this.value = {time, nick, message: msgOrFile, embeds};
    } else {
        var fileUrl = time + '/' + msgOrFile.name;
        if (msgOrFile.type.startsWith('image/')) {
            html = `<div class="thumbnail"><img src="${fileUrl}" /></div>`;
        } else {
            html = `<a target="_blank" tabindex="-1" href="${fileUrl}">${msgOrFile.name}</a>`;
        }
        this.value = {
            time,
            nick,
            message: msgOrFile.name,
            embeds:[{type: 'html', html}]
        };
        files[time] = msgOrFile;
    }
}

function addMessage(message) {
    messages.push(message);
    while (messages.length > MSGBUFLEN) {
        var id = messages[0].value.time;
        delete files[id];
        messages.shift();
    }
    broadcast(message);
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
        embed.getEmbeds(msg)
        .then(embeds => {
            addMessage(new Message(me.nick, msg, embeds));
        });
    });
    socket.on('file', function(file) {
        addMessage(new Message(me.nick, file));
    })
});

var server = server.listen(port, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});

