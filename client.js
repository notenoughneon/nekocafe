
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
        messages: [],
        nick: null,
        isConnected: false
    },
    reducers: {
        setNick: (action, state) => xtend(state, {nick: action}),
        setConnected: (action, state) => xtend(state, {isConnected: action.connected}),
        receiveMessage: (action, state) => xtend(state, {messages: [...state.messages, action.message]}),
        setTime: (action, state) => xtend(state, {now: action})
    },
    effects: {
        sendMessage: (action, state, send, done) => {
            socket.emit('message', action.text);
        },
        login: (action, state, send, done) => {
            send('setNick', action.nick, done);
            socket = io();
            socket.on('connect', function() {
                socket.emit('nick', {nick: action.nick, lastMsg: 0});
                send('setConnected', {connected: true}, done);
            });
            socket.on('disconnect', function() {
                send('setConnected', {connected: false}, done);
                send('receiveMessage', {message: {time: new Date(), text: '* Disconnected.'}}, done);
            });
            socket.on('system', function(msg) {
                send('receiveMessage', {message: {time: new Date(msg.time), text: '* ' + util.escapeHtml(msg.message)}}, done);
            });
            socket.on('message', function(msg) {
                if (isBlurred) {
                    unread++;
                    document.title = `(${unread}) nekocafe`;
                }
                send('receiveMessage', {message: {
                    time: new Date(msg.time),
                    text: util.escapeHtml('<' + msg.nick + '> ') + util.hotLink(util.escapeHtml(msg.message))
                }}, done);
            });
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

function scrollDown(el) {
    let body = document.getElementsByTagName('body')[0];
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

    var status = html`<p class="navbar-text" href="">logged_in_user</a>`;

    var loginWidget = html`
        <form class="navbar-form navbar-left" onsubmit=${login}>
            <div class="form-group">
                <input class="form-control" type="text" name="nick" placeholder="Name" autofocus required />
            </div>
            <button class="btn btn-primary" type="button">Connect</button>
        </form>
    `;

    return html`
        <nav class="navbar navbar-default navbar-fixed-top">
            <div class="container">
                <div class="row">
                    <span class="col-xs-11">
                        ${state.nick == null ? loginWidget : (state.isConnected ? status : spinner)}
                    </span>
                    <span class="col-xs-1">
                        <button class="btn btn-default navbar-btn navbar-right" type="button" tabindex="-1">+</button>
                    </span>
                </div>
            </div>
        </nav>
    `;
};

const optionsWidget = (state, send) => {
    return html`
        <form>
            <div class="checkbox">
                <label>
                    <input type="checkbox" />
                    Notifications
                </label>
            </div>
            <div class="checkbox">
                <label>
                    <input type="checkbox" />
                    Dark mode
                </label>
            </div>
        </form>
    `;
};

function disableIf(exp) {
    return exp ? 'disabled' : '';
}

const messageBar = ({isConnected}, send) => {
    function onSubmit(e) {
        e.preventDefault();
        var data = new FormData(e.target);
        send('sendMessage', {text: data.get('message')});
        e.target.reset();
    }
    return html`
        <nav class="navbar navbar-default navbar-fixed-bottom">
            <div class="container">
                <form class="navbar-form messageWidget" onsubmit=${onSubmit}>
                    <div class="input-group">
                        <input ${disableIf(!isConnected)} id="message" name="message"
                            class="form-control" placeholder="Enter message" autocomplete="off" />
                        <span class="input-group-btn">
                            <button ${disableIf(!isConnected)} class="btn btn-default" type="submit">Send</button>
                        </span>
                    </div>
                </form>
            </div>
        </nav>
    `;
}

const mainView = (state, prev, send) => html`
    <div>
        ${statusBar(state, send)}
        <div class="container content">
            ${messageList(state)}
        </div>
        ${messageBar(state, send)}
    </div>
`;

app.router(route => [
    route('/', mainView)
]);

const tree = app.start();
document.getElementById('body').appendChild(tree);


// var socket;

// $(window).blur(function() {
//     isBlurred = true;
//     newCount = 0;
// }).focus(function() {
//     isBlurred = false;
//     $('title').text('nekocafe');
// });

// //firefox auto-fill workaround
// $('#darkMode').prop('checked', false);
// $('#notifications').prop('checked', false);

// $('#darkMode').click(function() {
//     if (this.checked) {
//         $('body').addClass('dark');
//         $('nav').removeClass('navbar-default');
//         $('nav').addClass('navbar-inverse');
//         } else {
//         $('body').removeClass('dark');
//         $('nav').addClass('navbar-default');
//         $('nav').removeClass('navbar-inverse');
//     }
// });

// $('#notifications').click(function() {
//     if (this.checked) {
//         Notification.requestPermission();
//         notifications = true;
//         } else {
//         notifications = false;
//     }
// });

// function notify(text) {
//     if (notifications) {
//         var n = new Notification('nekocafe', {tag: 'nekocafe', body: text});
//     }
// }

// function parseQuery(s) {
//     var re = /([^?=&]+)=([^?=&]+)/g;
//     var m;
//     var q = {};
//     while ((m = re.exec(s)) !== null)
//         q[m[1]] = m[2];
//     return q;
// }

// function escapeHtml(s) {
//     return s.replace(/&/g,'&amp;').
//     replace(/</g,'&lt;').
//     replace(/>/g,'&gt;');
// }

// var urlRe = /(https?:\/\/[\w-]+(\.[\w-]+)*(:[0-9]+)?(\/[\w\.\/%+?=&,:;@#!~()-]*)?)/ig;

// function replacer(match, p1) {
//     // un-html-escape &'s in url
//     var fixedUrl = p1.replace('&amp;', '&');
//     return '<a href="' +
//         fixedUrl +
//         '" target="_blank" tabindex="-1">' +
//         p1 +
//         '</a>';
// }

// function hotLink(s) {
//     return s.replace(urlRe, replacer);
// }

// function liveTime(elt) {
//     $('time').each(function() {
//         var month = ['Jan','Feb','Mar','Apr','May','Jun',
//         'Jul','Aug','Sep','Oct','Nov','Dec'];
//         var dt = new Date($(this).attr('datetime'));
//         var delta = $.now() - dt.getTime();
//         if (delta < 1000*60) {
//             $(this).text(Math.floor(Math.max(0,delta/(1000))) + 's');
//             //$(this).text('<1m');
//             } else if (delta < 1000*60*60) {
//             $(this).text(Math.floor(Math.max(0,delta/(1000*60))) + 'm');
//             } else if (delta < 1000*60*60*24) {
//             $(this).text(Math.floor(delta/(1000*60*60)) + 'h');
//             } else if (delta < 1000*60*60*24*30) {
//             $(this).text(Math.floor(delta/(1000*60*60*24)) + 'd');
//             } else if (delta < 1000*60*60*24*365) {
//             $(this).text(dt.getDate() + ' ' + month[dt.getMonth()]);
//             } else {
//             $(this).text(dt.getDate() + ' ' + month[dt.getMonth()]
//             + ' ' + dt.getFullYear());
//         }
//         return true;
//     });
// }

// window.setInterval(liveTime, 1000 * 10);

// function log(time, text) {
//     if (typeof(time) === 'number')
//         time = new Date(time);
//     else
//         time = new Date();
//     $('#messages').append($('<li class="row">').
//     append($('<time class="col-xs-2 col-sm-1">').
//     attr('datetime', time.toISOString()).
//     attr('title', time.toLocaleString())).
//     append($('<span class="col-xs-10 col-sm-11">').html(text))
//     );
//     $("html, body").animate({ scrollTop: $(document).height()-$(window).height() }, 10);
//     if (isBlurred) {
//         newCount++;
//         $('title').text('(' + newCount + ') nekocafe');
//     }
//     liveTime();
// }

// $('#chatForm').submit(function() {
//     var msg = $('#message').val();
//     $('#message').val('');
//     var cmd = msg.match(/^\/(\w+)\s*(.*)/);
//     if (cmd !== null) {
//         if (cmd[1] == 'disconnect')
//             socket.disconnect();
//         else if (cmd[1] == 'connect')
//             socket.connect();
//         else
//             socket.emit('command', {type: cmd[1], params: cmd[2]});
//         } else {
//         socket.emit('message', msg);
//     }
//     return false;
// });

// $('#loginForm').submit(function() {
//     $('#loginScreen').hide();
//     $('#chatScreen').show();
//     var disconnects = 0;
//     var lastMsgId = -1;
//     socket = io();
//     socket.on('connect', function() {
//         socket.emit('nick', {nick: $('#nick').val(), lastMsg: lastMsgId});
//     });
//     socket.on('disconnect', function() {
//         disconnects++;
//         log(null, '* Disconnected.');
//         if (disconnects >= 3) {
//             log(null, '*** Reload the page to log in.');
//             socket.destroy();
//         }
//     });
//     socket.on('system', function(msg) {
//         log(msg.time, '* ' + escapeHtml(msg.message));
//     });
//     socket.on('message', function(msg) {
//         lastMsgId = msg.id;
//         log(msg.time, escapeHtml('<' + msg.nick + '> ') + hotLink(escapeHtml(msg.message)));
//         notify('<' + msg.nick + '> ' + msg.message);
//     });
//     return false;
// });

// $(function() {
//     var query = parseQuery(window.location.search);
//     if (query.name != null)
//         $('#nick').val(query.name);
//     if (query.darkmode)
//         $('#darkMode').prop('checked', true);
//     if (query.notifications)
//         $('#notifications').prop('checked', true);
// });
