var oembed = require('oembed-any').default;
var map = require('typed-promisify').map;

function plain(url) {
    return oembed(url)
    .then(res => res.html);
}

function wrap16x9(url) {
    return oembed(url)
    .then(res => {
        return '<div class="thumbnail embed-responsive embed-responsive-16by9">' + res.html + '</div>';
    });
}

var handlers = [
    {pattern: /^https?:\/\/(www\.)?youtu\.be/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?youtube\.com/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?soundcloud\.com/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?twitter\.com/i, handler: plain}
];

function resolve(url) {
    var match = handlers.filter(h => h.pattern.test(url));
    if (match.length === 0)
        return Promise.reject('no oembed handler');
    return match[0].handler(url);
}

function getEmbed(url) {
    return resolve(url)
    .catch(err => null);
}

function getEmbeds(s) {
    return map(getLinks(s), getEmbed)
    .then(res => res.filter(e => e !== null));
}

function relTime(now, dt) {
    var month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var delta = now.getTime() - dt.getTime();
    if (delta < 1000*60) {
        return Math.floor(Math.max(0,delta/(1000))) + 's';
    } else if (delta < 1000*60*60) {
        return Math.floor(Math.max(0,delta/(1000*60))) + 'm';
    } else if (delta < 1000*60*60*24) {
        return Math.floor(delta/(1000*60*60)) + 'h';
    } else if (delta < 1000*60*60*24*30) {
        return Math.floor(delta/(1000*60*60*24)) + 'd';
    } else if (delta < 1000*60*60*24*365) {
        return dt.getDate() + ' ' + month[dt.getMonth()];
    } else {
        return dt.getDate() + ' ' + month[dt.getMonth()]
            + ' ' + dt.getFullYear();
    }
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

function getLinks(s) {
    var matches = s.match(urlRe);
    return matches ? matches : [];
}

module.exports = {
    relTime,
    escapeHtml,
    hotLink,
    getLinks,
    getEmbeds
};