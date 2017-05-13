var Component = require('cache-component')
const html = require('choo/html')

class Tweet extends Component {
    constructor(id) {
        super()
        this._id = id
    }

    _render() {
        console.log('rendering ' + this._id)
        var elt = html`<div></div>`
        twttr.widgets.createTweet(this._id, elt)
        return elt
    }

    _update() {
        return false
    }
}

_tweets = {}

function tweetFactory(key, id) {
    if (_tweets[key] == null) {
        console.log('adding key '+ key)
        _tweets[key] = new Tweet(id)
    }
    return _tweets[key].render()
}

module.exports = tweetFactory