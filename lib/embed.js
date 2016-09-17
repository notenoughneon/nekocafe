var request = require('request');
var oembed = require('oembed-any').default;
var tp = require('typed-promisify');
var util = require('./util');

var head = tp.promisify(request.head);

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

var imgTypes = [
    'image/jpeg',
    'image/gif',
    'image/png',
    'image/svg'
];

function wrapImg(url) {
    return head(url)
    .then(res => {
        var contentType =res.headers['content-type'];
        if (imgTypes.includes(contentType))
            return '<div class="thumbnail"><img src="' + url + '" /></div>';
        else
            throw new Error(contentType + ' is not an image');
    });
}

var handlers = [
    {pattern: /^https?:\/\/(www\.)?youtu\.be/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?youtube\.com/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?soundcloud\.com/i, handler: wrap16x9},
    {pattern: /^https?:\/\/(www\.)?twitter\.com/i, handler: plain},
    {pattern: /.*/, handler: wrapImg}
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
    return tp.map(util.getLinks(s), getEmbed)
    .then(res => res.filter(e => e !== null));
}

module.exports = {
    getEmbeds
};