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
        isConnected: false,
        showOptions: false,
        optionNotifications: false,
        optionDark: false
    },
    reducers: {
        setNick: (data, state) => xtend(state, {nick: data}),
        setUsers: (data, state) => xtend(state, {users: data}),
        addUser: (data, state) => xtend(state, {users: [...state.users, data]}),
        deleteUser: (data, state) => xtend(state, {users: state.users.filter(u => u.id !== data.id)}),
        setConnected: (data, state) => xtend(state, {isConnected: data}),
        setShowOptions: (data, state) => xtend(state, {showOptions: data}),
        setOptionNotifications: (data, state) => {
            if (data) {
                Notification.requestPermission();
            }
            return xtend(state, {optionNotifications: data});
        },
        setOptionDark: (data, state) => xtend(state, {optionDark: data}),
        receiveMessage: (data, state) => {
            if (isBlurred) {
                unread++;
                document.title = `(${unread}) nekocafe`;
                if (state.optionNotifications) {
                    var n = new Notification('nekocafe', {tag: 'nekocafe', body: data.text});
                }
            }
            return xtend(state, {messages: [...state.messages, data]});
        },
        setTime: (data, state) => xtend(state, {now: data})
    },
    effects: {
        sendMessage: (action, state, send, done) => {
            socket.emit('message', action.text);
        },
        login: (action, state, send, done) => {
            send('setNick', action.nick, done);
            socket = io();
            socket.on('connect', () => {
                socket.emit('nick', {nick: action.nick});
                send('setConnected', true, done);
            });
            socket.on('disconnect', () => {
                send('setConnected', false, done);
                send('receiveMessage', {time: new Date(), text: '* Disconnected.'}, done);
            });
            socket.on('message', (msg) => send(
                'receiveMessage',
                {
                    time: new Date(msg.time),
                    text: util.escapeHtml('<' + msg.nick + '> ') + util.hotLink(util.escapeHtml(msg.message))
                },
                done));
            socket.on('users', (users) => send('setUsers', users, done));
            socket.on('join', (user) => send('addUser', user, done));
            socket.on('part', (user) => send('deleteUser', user, done));
        }
    },
    subscriptions: {
        timer: (send, done) => {
            setInterval(() => send('setTime', new Date(), done), 5000);
        },
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

const messageRow = (now, {time, text}) => {
    const textSpan = html`<span class="col-xs-10 col-sm-11 text"></span>`;
    textSpan.innerHTML = text;
    return html`
        <li class="row message" onload=${scrollDown}>
            <span class="col-xs-2 col-sm-1 time">${util.relTime(now, time)}</span>
            ${textSpan}
        </li>
    `;
}

const messageList  = ({now, messages}) => html`
    <ul class="messageList">
        ${messages.map(message => messageRow(now, message))}
    </ul>
`;

const statusBar = (state, send) => {
    function login(e) {
        e.preventDefault();
        var data = new FormData(e.target);
        send('login', {nick: data.get('nick')});
    }

    var spinner = html`<p class="navbar-text">Connecting...</div>`;

    var status = html`<p class="navbar-text" href="">${state.users.map(u => u.nick).join(', ')}</a>`;

    var loginWidget = html`
        <form class="navbar-form navbar-left" onsubmit=${login}>
            <div class="form-group">
                <input class="form-control" type="text" name="nick" placeholder="Name" autofocus required />
            </div>
            <button class="btn btn-primary" type="button">Connect</button>
        </form>
    `;

    return html`
        <nav class="navbar ${state.optionDark ? 'navbar-inverse' : 'navbar-default'} navbar-fixed-top">
            <div class="container">
                <div class="row">
                    <span class="col-xs-11">
                        ${state.nick == null ? loginWidget : (state.isConnected ? status : spinner)}
                    </span>
                    <span class="col-xs-1">
                        <button class="btn btn-default navbar-btn navbar-right" type="button"
                            tabindex="-1" onclick=${() => send('setShowOptions', !state.showOptions)}>+</button>
                    </span>
                </div>
            </div>
        </nav>
    `;
};

const optionsWidget = (state, send) => {
    return html`
        <form class="options" onload=${scrollDown}>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.optionNotifications ? 'checked': ''}
                        onchange=${e => send('setOptionNotifications', e.target.checked)} />
                    Notifications
                </label>
            </div>
            <div class="checkbox">
                <label>
                    <input type="checkbox" ${state.optionDark ? 'checked' : ''}
                        onchange=${e => send('setOptionDark', e.target.checked)} />
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
        var data = new FormData(e.target);
        send('sendMessage', {text: data.get('message')});
        e.target.reset();
    }
    return html`
        <nav class="navbar ${state.optionDark ? 'navbar-inverse' : 'navbar-default'} navbar-fixed-bottom">
            <div class="container">
                <form class="navbar-form messageWidget" onsubmit=${onSubmit}>
                    <div class="input-group">
                        <input ${disableIf(!state.isConnected)} id="message" name="message"
                            class="form-control" placeholder="Enter message" autocomplete="off" />
                        <span class="input-group-btn">
                            <button ${disableIf(!state.isConnected)} class="btn btn-default" type="submit">Send</button>
                        </span>
                    </div>
                </form>
            </div>
        </nav>
    `;
}

const mainView = (state, prev, send) => html`
    <div class="${state.optionDark ? 'dark' : ''}">
        ${statusBar(state, send)}
        <div class="container content">
            ${messageList(state)}
            ${state.showOptions ? optionsWidget(state, send) : ''}
        </div>
        ${messageBar(state, send)}
    </div>
`;

app.router(route => [
    route('/', mainView)
]);

const tree = app.start();
document.body.appendChild(tree);
