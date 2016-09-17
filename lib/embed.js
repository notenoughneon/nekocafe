var oembed = require('oembed-any').default;
var map = require('typed-promisify').map;
var util = require('./util');

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
    return map(util.getLinks(s), getEmbed)
    .then(res => res.filter(e => e !== null));
}

module.exports = {
    getEmbeds
};