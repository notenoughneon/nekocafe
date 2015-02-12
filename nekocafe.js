var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

if (process.argv.length < 3) {
    console.log('Usage: node nekocafe.js [port]');
    process.exit(1);
}

var port = process.argv[2];

app.use(express.static('static'));

var Neko = function(socket, nick) {
    this.id = new Date().getTime();
    this.socket = socket;
    this.nick = nick;
};

var nekoes = [];

function broadcast(type, obj) {
    nekoes.forEach(function(n) {
        n.socket.emit(type, obj);
    });
}

io.on('connection', function(socket) {
    var me;
    socket.on('nick', function(nick) {
        if (me === undefined) {
            me = new Neko(socket, nick);
            nekoes.push(me);
            broadcast('system', me.nick + ' joined.');
            socket.emit('system', 'Welcome to Neko Cafe.');
            socket.emit('system', 'Nekoes online: ' +
                nekoes.map(function(n){return n.nick;}).join(', ') +
                '.');
        }
    });
    socket.on('disconnect', function() {
        nekoes = nekoes.filter(function(n) {return n.id !== me.id;});
        broadcast('system', me.nick + ' left.');
    });
    socket.on('message', function(msg) {
        broadcast('message', {nick: me.nick, message: msg});
    });
});

var server = http.listen(port, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});
