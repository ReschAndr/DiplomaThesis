var socket = io.connect('http://127.0.0.1:4200');
var username, password, userid;
$(function() {
    var totraining = false;
    $('#login').click(() => {
        username = $('#username').val();
        password = $('#password').val();
        var obj = { username: username, password: password };
        socket.emit('login', JSON.stringify(obj));
    });

    $('#newuser').click(() => {
        username = $('#username').val();
        password = $('#password').val();
        var obj = { username: username, password: password };
        socket.emit('newuser', JSON.stringify(obj));
        totraining = false;
    });

    $('#training').click(() => {
        username = $('#username').val();
        password = $('#password').val();
        var obj = { username: username, password: password };
        socket.emit('login', JSON.stringify(obj));
        totraining = true;
    });

    socket.on('login_confirmed', (data) => {
        var obj = { username: username, password: password };
        sessionStorage.setItem('user', JSON.stringify(obj));
        window.location.href = (totraining)? 'training.html':'editor.html';
    });

    socket.on('login_denied', (data) => {
        alert('Login denied ' + data);
    });

    socket.on('user_created', (data) => {
        var obj = { username: username, password: password };
        socket.emit('login', JSON.stringify(obj));
    });

    socket.on('username_not_free', (data) => {
        alert('Username not free');
    });

});