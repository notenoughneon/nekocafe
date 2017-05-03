var Component = require('cache-component')
const html = require('choo/html')

class Tweet extends Component {
    constructor() {
        super()
        this._id = null
    }

    _render(id) {
        console.log('rendering ' + id)
        this._id = id
        var elt = html`<div></div>`
        twttr.widgets.createTweet(id, elt)
        return elt
    }

    _update(id) {
        console.log('update ' + id + ' !== ' + this._id)
        return id !== this._id
    }
}

_tweets = {}

function tweetFactory(id) {
    if (_tweets[id] == null) {
        _tweets[id] = new Tweet()
    }
    return _tweets[id].render(id)
}

module.exports = tweetFactory