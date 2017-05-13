var Component = require('cache-component')
const html = require('choo/html')

class Tweet extends Component {
    constructor(tweetId) {
        super()
        this.tweetId = tweetId
    }

    _render() {
        console.log('rendering ' + this.tweetId)
        var elt = html`<div></div>`
        twttr.widgets.createTweet(this.tweetId, elt)
        return elt
    }

    _update() {
        return false
    }
}

_tweets = {}

function tweetFactory(key, tweetId) {
    if (_tweets[key] == null) {
        console.log('adding key '+ key)
        _tweets[key] = new Tweet(tweetId)
    }
    return _tweets[key].render()
}

module.exports = tweetFactory