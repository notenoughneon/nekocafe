
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

function niceSize(bytes) {
    if (bytes < 1024) {
        return `${bytes}B`
    } else if (bytes < 1024 * 1024) {
        return `${Math.round(bytes/1024)}KB`
    } else {
        return `${Math.round(bytes/(1024*1024))}MB`
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
    niceSize,
    escapeHtml,
    hotLink,
    getLinks
};