var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http');
var https = require('https');

if (process.argv.length < 3) {
    console.log('Usage: node nekocafe.js port [key.pem cert.pem]');
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

app.use(express.static('static'));

var Neko = function(socket, nick) {
    this.id = new Date().getTime();
    this.socket = socket;
    this.nick = nick;
};

var nekoes = [];

var SystemMessage = function(msg) {
    this.type = 'system';
    this.value = {time: Date.now(), message: msg};
}

var Message = function (nick, msg) {
    this.type = 'message';
    this.value = {time: Date.now(), nick: nick, message: msg};
}

function unicast(socket, message) {
    socket.emit(message.type, message.value);
}

function broadcast(message) {
    nekoes.forEach(function(n) {
        n.socket.emit(message.type, message.value);
    });
}

function who() {
    return 'Nekoes online: ' +
        nekoes.map(function(n){return n.nick;}).join(', ') + '.';
}

io.on('connection', function(socket) {
    var me;
    socket.on('nick', function(nick) {
        if (me === undefined) {
            me = new Neko(socket, nick);
            nekoes.push(me);
            broadcast(new SystemMessage(me.nick + ' joined.'));
            unicast(socket, new SystemMessage('Welcome to Neko Cafe.'));
            unicast(socket, new SystemMessage(who()));
        }
    });
    socket.on('disconnect', function() {
        if (me !== undefined) {
            nekoes = nekoes.filter(function(n) {return n.id !== me.id;});
            broadcast(new SystemMessage(me.nick + ' left.'));
        }
    });
    socket.on('message', function(msg) {
        broadcast(new Message(me.nick, msg));
    });
    socket.on('command', function(cmd) {
        if (cmd.type === 'who') {
            unicast(socket, new SystemMessage(who()));
        } else {
            unicast(socket, new SystemMessage('Unknown command ' +
                    cmd.type));
        }

    });
});

var server = server.listen(port, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});
