(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var socket;

var isBlurred = false;
var newCount = 0;

var notifications = false;

$(window).blur(function() {
    isBlurred = true;
    newCount = 0;
}).focus(function() {
    isBlurred = false;
    $('title').text('nekocafe');
});

//firefox auto-fill workaround
$('#darkMode').prop('checked', false);
$('#notifications').prop('checked', false);

$('#darkMode').click(function() {
    if (this.checked) {
        $('body').addClass('dark');
        $('nav').removeClass('navbar-default');
        $('nav').addClass('navbar-inverse');
        } else {
        $('body').removeClass('dark');
        $('nav').addClass('navbar-default');
        $('nav').removeClass('navbar-inverse');
    }
});

$('#notifications').click(function() {
    if (this.checked) {
        Notification.requestPermission();
        notifications = true;
        } else {
        notifications = false;
    }
});

function notify(text) {
    if (notifications) {
        var n = new Notification('nekocafe', {tag: 'nekocafe', body: text});
    }
}

function parseQuery(s) {
    var re = /([^?=&]+)=([^?=&]+)/g;
    var m;
    var q = {};
    while ((m = re.exec(s)) !== null)
        q[m[1]] = m[2];
    return q;
}

function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').
    replace(/</g,'&lt;').
    replace(/>/g,'&gt;');
}

var urlRe = /(https?:\/\/[\w-]+(\.[\w-]+)*(:[0-9]+)?(\/[\w\.\/%+?=&,:;@#!~()-]*)?)/ig;

function replacer(match, p1) {
    // un-html-escape &'s in url
    var fixedUrl = p1.replace('&amp;', '&');
    return '<a href="' +
        fixedUrl +
        '" target="_blank" tabindex="-1">' +
        p1 +
        '</a>';
}

function hotLink(s) {
    return s.replace(urlRe, replacer);
}

function liveTime(elt) {
    $('time').each(function() {
        var month = ['Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec'];
        var dt = new Date($(this).attr('datetime'));
        var delta = $.now() - dt.getTime();
        if (delta < 1000*60) {
            $(this).text(Math.floor(Math.max(0,delta/(1000))) + 's');
            //$(this).text('<1m');
            } else if (delta < 1000*60*60) {
            $(this).text(Math.floor(Math.max(0,delta/(1000*60))) + 'm');
            } else if (delta < 1000*60*60*24) {
            $(this).text(Math.floor(delta/(1000*60*60)) + 'h');
            } else if (delta < 1000*60*60*24*30) {
            $(this).text(Math.floor(delta/(1000*60*60*24)) + 'd');
            } else if (delta < 1000*60*60*24*365) {
            $(this).text(dt.getDate() + ' ' + month[dt.getMonth()]);
            } else {
            $(this).text(dt.getDate() + ' ' + month[dt.getMonth()]
            + ' ' + dt.getFullYear());
        }
        return true;
    });
}

window.setInterval(liveTime, 1000 * 10);

function log(time, text) {
    if (typeof(time) === 'number')
        time = new Date(time);
    else
        time = new Date();
    $('#messages').append($('<li class="row">').
    append($('<time class="col-xs-2 col-sm-1">').
    attr('datetime', time.toISOString()).
    attr('title', time.toLocaleString())).
    append($('<span class="col-xs-10 col-sm-11">').html(text))
    );
    $("html, body").animate({ scrollTop: $(document).height()-$(window).height() }, 10);
    if (isBlurred) {
        newCount++;
        $('title').text('(' + newCount + ') nekocafe');
    }
    liveTime();
}

$('#chatForm').submit(function() {
    var msg = $('#message').val();
    $('#message').val('');
    var cmd = msg.match(/^\/(\w+)\s*(.*)/);
    if (cmd !== null) {
        if (cmd[1] == 'disconnect')
            socket.disconnect();
        else if (cmd[1] == 'connect')
            socket.connect();
        else
            socket.emit('command', {type: cmd[1], params: cmd[2]});
        } else {
        socket.emit('message', msg);
    }
    return false;
});

$('#loginForm').submit(function() {
    $('#loginScreen').hide();
    $('#chatScreen').show();
    var disconnects = 0;
    var lastMsgId = -1;
    socket = io();
    socket.on('connect', function() {
        socket.emit('nick', {nick: $('#nick').val(), lastMsg: lastMsgId});
    });
    socket.on('disconnect', function() {
        disconnects++;
        log(null, '* Disconnected.');
        if (disconnects >= 3) {
            log(null, '*** Reload the page to log in.');
            socket.destroy();
        }
    });
    socket.on('system', function(msg) {
        log(msg.time, '* ' + escapeHtml(msg.message));
    });
    socket.on('message', function(msg) {
        lastMsgId = msg.id;
        log(msg.time, escapeHtml('<' + msg.nick + '> ') + hotLink(escapeHtml(msg.message)));
        notify('<' + msg.nick + '> ' + msg.message);
    });
    return false;
});

$(function() {
    var query = parseQuery(window.location.search);
    if (query.name != null)
        $('#nick').val(query.name);
    if (query.darkmode)
        $('#darkMode').prop('checked', true);
    if (query.notifications)
        $('#notifications').prop('checked', true);
});

},{}]},{},[1]);
