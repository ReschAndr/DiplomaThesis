var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

//when the url of the server is entered the index.html page is sent back
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

//sets a function that is called when a client connects
io.sockets.on('connection', function (client) {

    //sets a function that is executed when a client emits a login call
    client.on('login', function (data) {

        console.log(data);

        //Sends an answer back to the client
        client.emit('loggedin', 'Login successful');
    });

});

//defines the port on which the server is listening
http.listen(3000, function () {
    console.log('listening on *:3000');
});