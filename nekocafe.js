var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('static'));

io.on('connection', function(socket) {
    console.log('user connected');
    socket.send('Hello socket');
});

var server = http.listen(10300, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});
