var express = require('express')
var fs = require('fs')
var path = require('path')
var app = express()
var http = require('http')
var https = require('https')
var embed = require('./embed')
var util = require('./util')

var MSGBUFLEN = 100

if (process.argv.length < 3) {
    console.log('Usage: nekocafe <port> [key.pem cert.pem]')
    process.exit(1)
}

var port = process.argv[2]

if (process.argv.length > 3)
{
    var key = fs.readFileSync(process.argv[3])
    var cert = fs.readFileSync(process.argv[4])
    var server = https.createServer({key: key, cert: cert}, app)
}
else
{
    var server = http.createServer(app)
}

var io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, '..', 'dist')))

// upload server
app.use((req, res, next) => {
    console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path)
    if (req.method !== 'GET') {
        res.sendStatus(400)
        return
    }
    var match = req.path.match(/^\/(\d+)\/(.*)$/)
    if (match === null) {
        res.sendStatus(404)
        return
    }
    var id = match[1]
    var name = decodeURI(match[2])
    if (files[id] === undefined || files[id].name !== name) {
        res.sendStatus(404)
        return
    }
    res.set('Content-Type', files[id].type)
    res.send(files[id].data)
})

var Neko = function(socket, nick) {
    this.id = new Date().getTime()
    this.socket = socket
    this.nick = nick
}

var nekoes = []
var messages = []
var files = {}

var Message = function (time, nick, msg, embeds) {
    this.type = 'message'
    this.value = {time, nick, message: msg, embeds}
}

function addMessage(message) {
    messages.push(message)
    while (messages.length > MSGBUFLEN) {
        var id = messages[0].value.time
        delete files[id]
        messages.shift()
    }
    broadcast(message)
}

var Users = function(nekoes) {
    this.type = 'users'
    this.value = nekoes.map(n => ({id: n.id, nick: n.nick}))
}

var Join = function(neko) {
    this.type = 'join'
    this.value = {id: neko.id, nick: neko.nick}
}

var Part = function(neko) {
    this.type = 'part'
    this.value = {id: neko.id, nick: neko.nick}
}

var Time = function() {
    this.type = 'time'
    this.value = Date.now()
}

function unicast(socket, message) {
    socket.emit(message.type, message.value)
}

function broadcast(message) {
    nekoes.forEach(n => n.socket.emit(message.type, message.value))
}

setInterval(() => broadcast(new Time()), 15000)

io.on('connection', socket => {
    console.log(socket.conn.remoteAddress + ' connect')
    var me
    socket.on('nick', params => {
        console.log(socket.conn.remoteAddress + ' nick ' + params.nick)
        if (me === undefined) {
            me = new Neko(socket, params.nick)
            broadcast(new Join(me))
            nekoes.push(me)
            unicast(socket, new Users(nekoes))
            unicast(socket, new Time())
        }
    })
    socket.on('replay', params => {
        console.log(socket.conn.remoteAddress + ' replay ' + params.since)
        if (me !== undefined) {
            messages.filter(m => m.value.time > params.since).forEach(m => unicast(socket, m))
        }
    })
    socket.on('disconnect', () => {
        console.log(socket.conn.remoteAddress + ' disconnect')
        if (me !== undefined) {
            nekoes = nekoes.filter(n => n.id !== me.id)
            broadcast(new Part(me))
        }
    })
    socket.on('message', msg => {
        embed.getEmbeds(msg)
        .then(embeds => {
            addMessage(new Message(Date.now(), me.nick, msg, embeds))
        })
    })
    socket.on('file', file => {
        let time = Date.now()
        files[time] = file
        let fileUrl = time + '/' + encodeURI(file.name)
        let msg = `neko://${fileUrl} ${util.niceSize(file.data.length)}`
        let embeds = []
        if (file.type.startsWith('image/')) {
            embeds.push({type: 'html', html: `<div class="thumbnail"><img src="${fileUrl}" /></div>`})
        }
        addMessage(new Message(time, me.nick, msg, embeds))
    })
})

var server = server.listen(port, () => {
    var address = server.address()
    console.log('Listening on %s:%s', address.address,
        address.port)
})

