var net = require('net');
var readline = require('readline');

var Neko = function (sock, name, rl) {
    this.sock = sock;
    this.name = name;
    this.rl = rl;
};

var Cafe = function (port) {
    var self = this;
    this.port = port;
    this.nekoes = [];

    this.describe = function(sock) {
        sock.write(
            'You are in Neko Cafe.\r\n'
            + 'Nekoes here: '
            + this.nekoes.map(function(n) {return n.name;}).join(', ')
            + '.\r\n');
    };

    this.signIn = function(sock) {
        var rl = readline.createInterface(sock, sock);
        rl.question('What is your neko name? ', function(name) {
            self.addNeko(new Neko(sock, name, rl));
            self.describe(sock);
        });
    };

    this.writeNekoes = function(msg) {
        this.nekoes.forEach(function(n) {
            n.sock.write(msg + '\r\n');
        });
    };

    this.addNeko = function(neko) {
        this.nekoes.push(neko);
        this.writeNekoes('* ' + neko.name + ' joined.');
        neko.rl.on('line', function(line) {
            if (line === '/look')
                self.describe(neko.sock);
            else if (line === '/quit')
                neko.sock.end();
            else
                self.writeNekoes('<' + neko.name + '> ' + line);
        });
        neko.sock.on('end', function() {
            self.nekoes = self.nekoes.filter(function(n) {
                return n.name !== neko.name;
            });
            self.writeNekoes('* ' + neko.name + ' left.');
        });
    };

    this.start = function() {
        net.createServer(this.signIn)
            .listen(this.port, function () {
                console.log('Listening on port ' + self.port);
        });
    };
};

new Cafe(10300).start();

