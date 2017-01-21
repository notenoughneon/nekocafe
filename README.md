# nekocafe
Web chat room 🐱 💬

[![npm](https://img.shields.io/npm/v/nekocafe.svg?maxAge=2592000?style=plastic)](https://www.npmjs.com/package/nekocafe)

![screenshot](IMG_0717.png)
![screenshot](IMG_0718.png)

A chat server using websockets. Send your friends the url and chat through the browser.

* designed for mobile
* no passwords/registration
* 100 line backlog
* hotlinked urls
* embedded images, youtubes, tweets

## Installing

```
npm install -g nekocafe
```

## Running
```
nekocafe <portnumber>
```

For https mode, pass your certificates on the command line:
```
nekocafe <portnumber> <keyfile.pem> <certfile.pem>
```

## Development

`npm run dev` to build client side (outputs to dist/)

`node lib/server.js <portnumber>` to run the server (does not need to restart after client rebuild)

or `npm run start` to run on port 80

## Changelog

* 1.2.0 - embedded youtubes, tweets
* 1.1.0 - embedded images, remember username/prefs, performance improvements
* 1.0.0 - first release