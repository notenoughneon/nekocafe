const choo = require('choo')
const html = require('choo/html')
const util = require('./util')
const app = choo({history: false, href: false})

var localStorage = window.localStorage
var socket

app.use((state, emitter) => {
    Object.assign(state, {
        now: new Date(),
        users: [],
        messages: [],
        nick: localStorage.nick ? localStorage.nick : '',
        loggedIn: false,
        connected: false,
        showOptions: false,
        notify: localStorage.notify === 'true',
        dark: localStorage.dark === 'true',
        boss: localStorage.boss === 'true',
        dragging: false,
        unread: 0,
        isBlurred: false
    })

    const lastMessage = () => {
        if (state.messages.length === 0) return 0
        return state.messages[state.messages.length - 1].time.getTime()
    }

    const render = f => args => {
        f(args)
        emitter.emit('render')
    }

    emitter.on('setNick', render(nick => localStorage.nick = state.nick = nick))
    emitter.on('setUsers', render(users => state.users = users))
    emitter.on('addUser', render(user => state.users.push(user)))
    emitter.on('deleteUser', render(user => state.users = state.users.filter(u => u.id !== user.id)))
    emitter.on('setLoggedIn', render(loggedIn => state.loggedIn = loggedIn))
    emitter.on('setConnected', render(connected => state.connected = connected))
    emitter.on('setShowOptions', render(showOptions => state.showOptions = showOptions))
    emitter.on('setNotify', render(notify => {
        if (notify) {
            Notification.requestPermission()
        }
        localStorage.notify = state.notify = notify
    }))
    emitter.on('setDark', render(dark => localStorage.dark = state.dark = dark))
    emitter.on('setBoss', render(boss => localStorage.boss = state.boss = boss))
    emitter.on('receiveMessage', render(message => {
        if (state.messages.some(m => m.time.getTime() === message.time.getTime())) {
            return
        }
        if (state.isBlurred) {
            state.unread++
            document.title = `(${state.unread}) nekocafe`
            if (state.notify) {
                var n = new Notification('nekocafe', {
                    tag: 'nekocafe',
                    body: `<${message.nick}> ${message.message}`
                })
            }
        }
        state.messages.push(message)
    }))
    emitter.on('setTime', render(time => state.now = time))
    emitter.on('setDragging', render(dragging => state.dragging = dragging))

    emitter.on('sendMessage', render(message => socket.emit('message', message)))
    emitter.on('sendFile', data => socket.emit('file', {name: data.name, type: data.type, data: data}))
    emitter.on('login', () => {
        emitter.emit('setLoggedIn', true)
        socket = io()
        socket.on('connect', () => {
            socket.emit('nick', {nick: state.nick})
            socket.emit('replay', {since: lastMessage()})
            emitter.emit('setConnected', true)
        })
        socket.on('disconnect', () => {
            emitter.emit('setConnected', false)
        })
        socket.on('message', msg => emitter.emit(
            'receiveMessage',
            {
                time: new Date(msg.time),
                nick: msg.nick,
                message: msg.message,
                embeds: msg.embeds
            }))
        socket.on('users', users => emitter.emit('setUsers', users))
        socket.on('join', user => emitter.emit('addUser', user))
        socket.on('part', user => emitter.emit('deleteUser', user))
        socket.on('time', time => emitter.emit('setTime', new Date(time)))
    })

    window.addEventListener('blur', () => {
        state.unread = 0
        state.isBlurred = true
    }, false)
    window.addEventListener('focus', () => {
        document.title = 'nekocafe'
        state.isBlurred = false
    }, false)
})

function scrollDown() {
    var body = document.body
    var html = document.getElementsByTagName('html')[0]
    // other browsers
    body.scrollTop = body.scrollHeight
    // firefox
    html.scrollTop = html.scrollHeight
}

const messageTime = (now, time) => html`
    <span class="col-xs-2 col-sm-1 time">${util.relTime(now, time)}</span>
`

const messageText = (message) => {
    const msgSpan = html`<span></span>`
    msgSpan.innerHTML = util.hotLink(util.escapeHtml(message.message))
    return html`
        <span class="col-xs-10 col-sm-11 text">${'<' + message.nick + '>'} ${msgSpan}</span>
    `
}

const embedRow = (embed) => {
    const onload = () => {
        if (embed.type === 'tweet') {
            twttr.widgets.createTweet(embed.id, inner)
        }
    }
    const inner = html`<div onload=${onload}></div>`
    switch (embed.type) {
        case 'html':
            inner.innerHTML = embed.html
            break
        case 'tweet':
            break
        default:
            inner.innerHTML = '[error loading embed]'
            break
    }
    const elt = html`
        <div class="row">
            <div class="col-xs-12 col-md-8">
                ${inner}
            </div>
        </div>
    `
    elt.isSameNode = () => true
    return elt
}

const messageItem = (state, message, installOnload) => {
    const embeds = state.boss ? [] : message.embeds
    if (installOnload)
        return html`
            <li onload=${scrollDown}>
                <div class="row message">
                    ${messageTime(state.now, message.time)}
                    ${messageText(message)}
                </div>
                ${embeds.map(embedRow)}
            </li>
        `
    else
        return html`
            <li>
                <div class="row message">
                    ${messageTime(state.now, message.time)}
                    ${messageText(message)}
                </div>
                ${embeds.map(embedRow)}
            </li>
        `
}

const messageList  = (state) => {
    const messages = state.messages
    return html`
        <ul class="messageList">
            ${messages.map((message, i) => messageItem(state, message, i+1 === messages.length))}
        </ul>
    `
}

const spinner = (state) => {
    return html`<p class="navbar-text">Connecting...</div>`
}

const loginWidget = (nick, oninput, login) => {
    return html`
        <form class="navbar-form login" onsubmit=${login}>
            <div class="form-group">
                <input class="form-control" type="text" name="nick" placeholder="Name"
                    oninput=${oninput} value=${nick} autofocus required />
            </div>
            <button class="btn btn-primary" type="submit">Connect</button>
        </form>
    `
}

const statusBar = (state, emit) => {
    function login(e) {
        e.preventDefault()
        emit('login')
    }

    function oninput(e) {
        emit('setNick', e.target.value)
    }

    var status = html`<p class="navbar-text" href="">${state.users.map(u => u.nick).join(', ')}</a>`

    return html`
        <nav class="navbar ${state.dark ? 'navbar-inverse' : 'navbar-default'} navbar-fixed-top">
            <div class="container">
                <div class="row">
                    <span class="col-xs-9 col-sm-10">
                        ${!state.loggedIn ? loginWidget(state.nick, oninput, login) :
                            (state.connected ? status : spinner(state))}
                    </span>
                    <span class="col-xs-3 col-sm-2">
                        <button class="btn btn-default navbar-btn navbar-right" type="button"
                            tabindex="-1" onclick=${() => emit('setShowOptions', !state.showOptions)}>${state.showOptions? '😺' : '🐱'}</button>
                    </span>
                </div>
            </div>
        </nav>
    `
}

const optionsWidget = (state, emit) => {
    function handleFiles(e) {
        emit('sendFile', e.target.files[0])
    }
    return html`
        <form class="options" onload=${scrollDown}>
            <label>Upload</label>
            <input type="file" onchange=${handleFiles} />
            <label>Online</label>
                <p>${state.users.map(u => u.nick).join(', ')}</p>
            <label>Options</label>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.notify ? 'checked': ''}
                        onchange=${e => emit('setNotify', e.target.checked)} />
                    Notifications
                </label>
            </div>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.dark ? 'checked' : ''}
                        onchange=${e => emit('setDark', e.target.checked)} />
                    Dark mode
                </label>
            </div>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.boss ? 'checked' : ''}
                        onchange=${e => emit('setBoss', e.target.checked)} />
                    Boss mode
                </label>
            </div>
        </form>
    `
}

const messageBox = () => {
    const elt = html`<input id="message" name="message" class="form-control"
        placeholder="Enter message" autocomplete="off" />`
    elt.isSameNode = () => true
    return elt
}

const messageBar = (state, emit) => {
    function onSubmit(e) {
        e.preventDefault()
        emit('sendMessage', e.target.children[0].children[0].value);
        e.target.reset();
    }
    return html`
        <nav class="navbar ${state.dark ? 'navbar-inverse' : 'navbar-default'} navbar-fixed-bottom">
            <div class="container">
                <form class="navbar-form messageWidget" onsubmit=${onSubmit}>
                    <div class="input-group">
                        ${messageBox()}
                        <span class="input-group-btn">
                            <button class="btn btn-default" type="submit">Send</button>
                        </span>
                    </div>
                </form>
            </div>
        </nav>
    `
}

const dragTarget = () => html`<div class="drag-target"></div>`

const mainView = (state, emit) => {
    // drag and drop handlers for file upload
    function dragenter(e) {
        e.stopPropagation()
        e.preventDefault()
        emit('setDragging', true)
    }
    function dragover(e) {
        e.stopPropagation()
        e.preventDefault()
        emit('setDragging', true)
    }
    function dragleave(e) {
        e.stopPropagation()
        e.preventDefault()
        emit('setDragging', false)
    }
    function drop(e) {
        e.stopPropagation()
        e.preventDefault()
        if (e.dataTransfer.files[0]) {
            emit('sendFile', e.dataTransfer.files[0])
        }
        emit('setDragging', false)
    }
    return html`
        <body class="main ${state.dark ? 'dark' : ''}"
        ondragenter=${dragenter} ondragover=${dragover} ondragleave=${dragleave} ondrop=${drop}>
            ${statusBar(state, emit)}
            ${state.dragging ? dragTarget() : null}
            <div class="container content">
                ${messageList(state)}
                ${state.showOptions ? optionsWidget(state, emit) : ''}
            </div>
            ${messageBar(state, emit)}
        </body>
    `
}

app.route('/', mainView)

app.mount('body')