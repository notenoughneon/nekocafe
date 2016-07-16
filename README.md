# nekocafe
Chat for neko pals 🐱 💬

[![npm](https://img.shields.io/npm/v/nekocafe.svg?maxAge=2592000?style=plastic)](https://www.npmjs.com/package/nekocafe)
[![built with choo v3](https://img.shields.io/badge/built%20with%20choo-v3-ffc3e4.svg?style=flat-square)](https://github.com/yoshuawuyts/choo)

![screenshot](IMG_0717.png)
![screenshot](IMG_0718.png)

## What

A simple chat server using websockets and node. Send your friends the url and you can chat using a browser.

* designed for mobile
* no passwords/registration
* use any name (even emoji 🍰 )
* hotlinked urls

## Installing

```
npm install -g nekocafe
```

## Running
```
nekocafe <portnumber>
```

For https mode, just pass your certificates on the command line:
```
nekocafe <portnumber> <keyfile.pem> <certfile.pem>
```
