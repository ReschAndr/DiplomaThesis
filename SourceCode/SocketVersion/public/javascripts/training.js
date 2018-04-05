$(function () {
    var socket = io.connect('http://127.0.0.1:4200');
    var acttype = null;
    var pics = [];
    var user = JSON.parse(sessionStorage.getItem('user'));

    var Pic = function (typeid, data) {
        this.typeid = typeid;
        this.pic_data = data;
    };

    var TrainingsData = function (pics, iterations) {
        this.pictures = pics;
        this.iterations = iterations;
    };

    function typeclick(ev) {
        acttype = $(this)[0].id;
        var previousSelected = $('.selectedtype')[0];
        if (previousSelected != undefined)
            previousSelected.className = 'btn btn-primary btn-lg';
        $(this)[0].className = 'btn btn-primary btn-lg selectedtype';
        //ToDo set the label of the actual selected type (data binding)
    };

    //Compresses r,g,b to 0 or 1
    function rgbToBinary(rgbPic) {
        var actPixel = 0;
        var binaryPic = '';
        for (let i = 0; i < rgbPic.data.length; i += 4) {
            actPixel = rgbPic.data[i] + rgbPic.data[i + 1] + rgbPic.data[i + 2] + rgbPic.data[i + 3];
            if (actPixel == 0)
                binaryPic = binaryPic + "0";
            else
                binaryPic = binaryPic + "1";
        }
        return binaryPic;
    };

    //Resizes Picture from 400x400 to 100x100
    function resizePicture(binaryPic) {
        var pixel = 0;
        var resizedPic = '';
        var height = 400;
        var width = 400;
        var xdiv = Math.round(height / 100);
        var ydiv = Math.round(width / 100);
        for (let y = Math.floor(ydiv / 2); y <= width - Math.floor(ydiv / 2); y += ydiv) {
            for (let x = Math.floor(xdiv / 2); x <= height - Math.floor(xdiv / 2); x += xdiv) {
                for (let i = Math.floor(ydiv / 2) * -1; i < Math.floor(ydiv / 2) - 1; i++) {
                    for (let u = Math.floor(xdiv / 2) * -1; u < Math.floor(xdiv / 2) - 1; u++) {
                        pixel += parseInt(binaryPic[(y + i) * height + (x + u)]);
                    }
                }
                if (pixel > 0)
                    resizedPic += "1";
                else
                    resizedPic += "0";
                pixel = 0;
            }
        }
        return resizedPic;
    };

    function lengthEncodePicture(resizedPic) {
        var count = 0;
        var lengthEncodPic = '';
        var lastpix = 'B';
        var actpix = '';
        for (var u = 0; u < resizedPic.length; u++) {
            switch (resizedPic[u]) {
                case '0':
                    actpix = 'B';
                    break;
                case '1':
                    actpix = 'W';
                    break;
            }
            if (lastpix == actpix) {
                count++;
            } else {
                lengthEncodPic += count + lastpix;
                lastpix = actpix;
                count = 1;
            }
            if (u == resizedPic.length - 1) {
                lengthEncodPic += count + actpix;
            }
        }
        return lengthEncodPic;
    };

    socket.on('messages', function (data) {
        var messages = JSON.parse(data);
        console.log(messages);
        //TODO disply messages on browser
    });

    socket.on('no-messages', function () {
        console.log('No messages stored');
        //TODO display info on browser
    });

    socket.on('type', function (data) {
        $('.result').css('display', 'inherit');
        data = JSON.parse(data);
        var h2 = document.createElement('h2');
        h2.innerHTML = 'It is a ' + data.label;
        $('#possibilities').append(h2);
    });

    socket.on('taskcreationerror', function (data) {
        //TODO notify user
        console.log(data);
    });

    socket.on('alltypes', function (data) {
        var types = JSON.parse(data);
        for (let i = 0; i < types.length; i++) {
            let btn = document.createElement('button');
            btn.innerHTML = types[i].label;
            btn.id = types[i].type_id;
            btn.className = "btn btn-primary btn-lg";
            btn.onclick = typeclick;
            $('#types').append(btn);
        }
    });

    socket.on('task_created', function (data) {
        //TODO delete saved pictures and notify user
        pics = [];
        console.log(data);
    });

    $('.type').click(function () {
        acttype = this.id;
        $('#actel').html('Draw Sketch for: ' + acttype);
    });

    $('#saveactdrawing').click(function () {

        if (acttype == null) {
            console.log('No type selected');
            return;
        }

        //get the pixel of the canvas
        var canvas = $('#can')[0];
        var ctx = canvas.getContext("2d");
        var pix = ctx.getImageData(0, 0, 400, 400);

        //Compress data
        var binaryPic = rgbToBinary(pix);

        var resizedPic = resizePicture(binaryPic);

        var lengthEncodPic = lengthEncodePicture(resizedPic);

        if (lengthEncodPic == "10000B") {
            console.log('No picture was drawn');
            return;
        }

        var picture = new Pic(acttype, lengthEncodPic);

        pics[pics.length] = picture;

        //To clear the canvas after saving
        ctx.clearRect(0, 0, w, h);

    });

    $('#clearcanv').click(function () {
        var canvas = $('#can')[0];
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, w, h);
    });

    $('#newtrainingtask').click(function () {
        socket.emit('newtrainingtask', JSON.stringify({ username: user.username, pictures: pics }));
        //TODO: let user wait until task is created
    });

    $('#newtestingtask').click(function () {
        socket.emit('newtestingtask', JSON.stringify({ username: user.username, pictures: pics }));
        //TODO: let user wait until task is created
    });

    //Sends the last drawn picture to server
    $('#gettype').click(function () {
        socket.emit('gettype', user.username, pics[pics.length - 1].pic_data);
        pics = [];
    });

    setInterval(function () {
        socket.emit('getmessages', user.username);
    }, 60000);

    socket.emit('getmessages', user.username);
    socket.emit('getalltypes');
});