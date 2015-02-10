var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('static'));

var allnicks = [];

io.on('connection', function(socket) {
    var mynick;
    socket.on('nick', function(nick) {
        mynick = nick;
        allnicks.push(mynick);
        io.emit('join', mynick);
        socket.emit('nicks', allnicks);
    });
    socket.on('disconnect', function() {
        allnicks = allnicks.filter(function(n) {return n !== mynick;});
        io.emit('part', mynick);
    });
    socket.on('message', function(msg) {
        io.emit('message', {nick: mynick, message: msg});
    });
});

var server = http.listen(10300, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});
