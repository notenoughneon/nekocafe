var telnet = require('telnet');
var keypress = require('keypress');
var ansi = require('ansi');

var Prompter = function (client, prompt) {
    var self = this;
    this.client = client;
    this.prompt = prompt;
    this.buf = '';
    this.cursor = ansi(client, {enabled: true});
    this.onInput = null;

    this.write = function(msg) {
        self.cursor.horizontalAbsolute(0).eraseLine();
        self.cursor.write(msg);
        self.cursor.write(self.prompt + self.buf);
    };

    this.handleKey = function(ch, key) {
        if (ch !== undefined && ch >= ' ' && ch <= '~') {
            self.cursor.write(ch);
            self.buf += ch;
        } else if (key.name === 'backspace' && self.buf.length > 0) {
            self.cursor.back(1);
            self.cursor.write(' ');
            self.cursor.back(1);
            self.buf = self.buf.slice(0, -1);
        } else if (key.name === 'return' && self.buf.length > 0) {
            if (self.onInput !== null) {
                self.onInput(self.buf);
            }
            self.buf = '';
            self.cursor.horizontalAbsolute(0).eraseLine().write(self.prompt);
        }
    };

    client.do.transmit_binary();
    client.do.suppress_go_ahead();
    client.will.suppress_go_ahead();
    client.will.echo();
    keypress(client);
    client.on('keypress', this.handleKey);
    this.cursor.write(this.prompt);
};

var Neko = function (prompter, name) {
    var self = this;
    this.prompter = prompter;
    this.name = name;
};

var Cafe = function (port) {
    var self = this;
    this.port = port;
    this.nekoes = [];

    this.description = function() {
        return 'You are in Neko Cafe.\r\n' +
            'Nekoes here: ' +
            this.nekoes.map(function(n) {return n.name;}).join(', ') +
            '.\r\n';
    };

    this.signIn = function(client) {
        var prompter = new Prompter(client, 'What is your name? ');
        prompter.onInput = function(name) {
            self.addNeko(new Neko(prompter, name));
            prompter.prompt = '> ';
        };
    };

    this.writeNekoes = function(msg) {
        this.nekoes.forEach(function(n) {
            n.prompter.write(msg);
        });
    };

    this.addNeko = function(neko) {
        this.nekoes.push(neko);
        this.writeNekoes('* ' + neko.name + ' joined.\r\n');
        neko.prompter.write(self.description());
        neko.prompter.onInput = function(input) {
            if (input === '/look')
                neko.prompter.write(self.description());
            else if (input === '/quit')
                neko.prompter.client.end();
            else
                self.writeNekoes('<' + neko.name + '> ' + input + '\r\n');
        };
        neko.prompter.client.on('end', function() {
            self.nekoes = self.nekoes.filter(function(n) {
                return n.name !== neko.name;
            });
            self.writeNekoes('* ' + neko.name + ' left.\r\n');
        });
    };

    this.start = function() {
        telnet.createServer(this.signIn)
            .listen(this.port, function () {
                console.log('Listening on port ' + self.port);
        });
    };
};

new Cafe(10300).start();

