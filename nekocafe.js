var express = require('express');
var app = express();

app.use(express.static('static'));

var server = app.listen(10300, function () {
    var address = server.address();
    console.log('Listening on %s:%s', address.address,
        address.port);
});
