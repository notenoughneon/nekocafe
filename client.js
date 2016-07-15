const xtend = require('xtend');
const choo = require('choo');
const html = require('choo/html');
const util = require('./util');
const app = choo();

var socket;
var unread = 0;
var isBlurred = false;

app.model({
    state: {
        now: new Date(),
        users: [],
        messages: [],
        nick: null,
        connected: false,
        showOptions: false,
        notify: false,
        dark: false
    },
    reducers: {
        setNick: (nick, state) => xtend(state, {nick: nick}),
        setUsers: (users, state) => xtend(state, {users: users}),
        addUser: (user, state) => xtend(state, {users: [...state.users, user]}),
        deleteUser: (user, state) => xtend(state, {users: state.users.filter(u => u.id !== user.id)}),
        setConnected: (connected, state) => xtend(state, {connected: connected}),
        setShowOptions: (showOptions, state) => xtend(state, {showOptions: showOptions}),
        setNotify: (notify, state) => {
            if (notify) { Notification.requestPermission(); }
            return xtend(state, {notify: notify});
        },
        setDark: (dark, state) => xtend(state, {dark: dark}),
        receiveMessage: (message, state) => {
            if (state.messages.some(m => m.time.getTime() === message.time.getTime()))
                return state;
            if (isBlurred) {
                unread++;
                document.title = `(${unread}) nekocafe`;
                if (state.notify) {
                    var n = new Notification('nekocafe', {tag: 'nekocafe', body: `<${message.nick}> ${message.message}`});
                }
            }
            return xtend(state, {messages: [...state.messages, message]});
        },
        setTime: (time, state) => xtend(state, {now: time})
    },
    effects: {
        sendMessage: (data, state, send, done) => {
            socket.emit('message', data);
        },
        login: (data, state, send, done) => {
            send('setNick', data, done);
            socket = io();
            socket.on('connect', () => {
                socket.emit('nick', {nick: data});
                send('setConnected', true, done);
            });
            socket.on('disconnect', () => {
                send('setConnected', false, done);
            });
            socket.on('message', (msg) => send(
                'receiveMessage',
                {
                    time: new Date(msg.time),
                    nick: msg.nick,
                    message: msg.message
                },
                done));
            socket.on('users', (users) => send('setUsers', users, done));
            socket.on('join', (user) => send('addUser', user, done));
            socket.on('part', (user) => send('deleteUser', user, done));
            socket.on('time', (time) => send('setTime', new Date(time), done));
        }
    },
    subscriptions: {
        blur: (send, done) => {
            window.addEventListener('blur', () => {
                unread = 0;
                isBlurred = true;
            }, false);
            window.addEventListener('focus', () => {
                document.title = 'nekocafe';
                isBlurred = false;
            }, false);
        }
    }
});

function scrollDown() {
    var body = document.body;
    body.scrollTop = body.scrollHeight;
}

const messageRow = (now, message) => {
    const msgSpan = html`<span></span>`;
    msgSpan.innerHTML = util.hotLink(util.escapeHtml(message.message));
    return html`
        <li class="row message" onload=${scrollDown}>
            <span class="col-xs-2 col-sm-1 time">${util.relTime(now, message.time)}</span>
            <span class="col-xs-10 col-sm-11 text">${'<' + message.nick + '>'} ${msgSpan}</span>
        </li>
    `;
}

const messageList  = (state) => html`
    <ul class="messageList">
        ${state.messages.map(message => messageRow(state.now, message))}
    </ul>
`;

const statusBar = (state, send) => {
    function login(e) {
        e.preventDefault();
        send('login', e.target.children[0].children[0].value);
    }

    var spinner = html`<p class="navbar-text">Connecting...</div>`;

    var status = html`<p class="navbar-text" href="">${state.users.map(u => u.nick).join(', ')}</a>`;

    var loginWidget = html`
        <form class="navbar-form login" onsubmit=${login}>
            <div class="form-group">
                <input class="form-control" type="text" name="nick" placeholder="Name" autofocus required />
            </div>
            <button class="btn btn-primary" type="submit">Connect</button>
        </form>
    `;

    return html`
        <nav class="navbar ${state.dark ? 'navbar-inverse' : 'navbar-default'} navbar-fixed-top">
            <div class="container">
                <div class="row">
                    <span class="col-xs-9 col-sm-10">
                        ${state.nick == null ? loginWidget : (state.connected ? status : spinner)}
                    </span>
                    <span class="col-xs-3 col-sm-2">
                        <button class="btn btn-default navbar-btn navbar-right" type="button"
                            tabindex="-1" onclick=${() => send('setShowOptions', !state.showOptions)}>${state.showOptions? '😺' : '🐱'}</button>
                    </span>
                </div>
            </div>
        </nav>
    `;
};

const optionsWidget = (state, send) => {
    return html`
        <form class="options" onload=${scrollDown}>
            <label>Online</label>
                <p>${state.users.map(u => u.nick).join(', ')}</p>
            <label>Options</label>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.notify ? 'checked': ''}
                        onchange=${e => send('setNotify', e.target.checked)} />
                    Notifications
                </label>
            </div>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.dark ? 'checked' : ''}
                        onchange=${e => send('setDark', e.target.checked)} />
                    Dark mode
                </label>
            </div>
        </form>
    `;
};

function disableIf(exp) {
    return exp ? 'disabled' : '';
}

const messageBar = (state, send) => {
    function onSubmit(e) {
        e.preventDefault();
        send('sendMessage', e.target.children[0].children[0].value);
        e.target.reset();
    }
    return html`
        <nav class="navbar ${state.dark ? 'navbar-inverse' : 'navbar-default'} navbar-fixed-bottom">
            <div class="container">
                <form class="navbar-form messageWidget" onsubmit=${onSubmit}>
                    <div class="input-group">
                        <input ${disableIf(!state.connected)} id="message" name="message"
                            class="form-control" placeholder="Enter message" autocomplete="off" />
                        <span class="input-group-btn">
                            <button ${disableIf(!state.connected)} class="btn btn-default" type="submit">Send</button>
                        </span>
                    </div>
                </form>
            </div>
        </nav>
    `;
}

const mainView = (state, prev, send) => html`
    <body class="${state.dark ? 'dark' : ''}">
    <div>
        ${statusBar(state, send)}
        <div class="container content">
            ${messageList(state)}
            ${state.showOptions ? optionsWidget(state, send) : ''}
        </div>
        ${messageBar(state, send)}
    </div>
    </body>
`;

app.router(route => [
    route('/', mainView)
]);

const tree = app.start('#root');
