var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http');
var https = require('https');

var MSGBUFLEN = 100;

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
var messages = [];
var nextMsgId = 0;

var SystemMessage = function(msg) {
    this.type = 'system';
    this.value = {time: Date.now(), message: msg};
}

var Message = function (id, nick, msg) {
    this.type = 'message';
    this.value = {time: Date.now(), id: id, nick: nick, message: msg};
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

function getIndexById(id) {
    var index = messages.find(function(elt, i) {
        return elt.value.id === id;
    });
    if (index === undefined)
        return 0;
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
    socket.on('replay', function(id) {
        messages.slice(getIndexById(id)).forEach(function(msg) {unicast(socket, msg);});
    });
    socket.on('message', function(msg) {
        var message = new Message(nextMsgId++, me.nick, msg);
        messages.push(message);
        while (messages.length > MSGBUFLEN)
            messages.shift();
        broadcast(message);
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

// array.find polyfill
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find#Polyfill
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}