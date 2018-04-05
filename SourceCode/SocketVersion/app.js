'use strict';
var debug = require('debug');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var fs = require('fs');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var http = require('http');
var convnetjs = require('convnetjs');

//all global variables
var trainercount = 0;
var users = [];
const dbserver = 'localhost';
const dbserverport = 4400;

function GenerateVol(data) {
    var x = new convnetjs.Vol(100, 100, 1);
    for (var i = 0; i < data.length; i++)
        x.w[i] = parseInt(data[i]);
    return x;
}

function decompressPic(pic_data) {
    var count = '';
    var actvalue = '0';
    var decomppic = '';
    for (var u = 0; u < pic_data.length; u++) {
        if (pic_data[u] == 'B' || pic_data[u] == 'W') {
            switch (pic_data[u]) {
                case 'B':
                    actvalue = '0';
                    break;
                case 'W':
                    actvalue = '1';
            }
            for (var c = 0; c < count; c++) {
                decomppic += actvalue;
            }
            count = '';
        } else {
            count += pic_data[u];
        }
    }
    return decomppic;
};

function getTypeFromPic(pic,net) {
    var vol = GenerateVol(pic);
    var result = net.forward(vol);
    var max = 0;
    var max_id = 0;
    for (var i = 0; i < result.depth; i++) {
        var per = result.w[i];
        if (per > max) {
            max = per;
            max_id = i;
        }
    }
    return max_id;
}

function getTypeName(id, client) {


    http.get('http://' + dbserver + ':' + dbserverport + '/gettypename/' + id, (res) => {
        //Gets the request-header "Content-Length"
        var length = res.headers["content-length"];
        var resdata = '';
        //Sets a function which is called when data arrives
        res.on('data', (temp) => {
            resdata += temp;
            //Checks if the whole data has arrived
            if (length == resdata.length) {
                //Check if request was sucessul
                if (res.statusCode == 200) {
                    //
                    client.emit('type', JSON.stringify({ label: resdata, type_id: id }));
                }
            }
        });
    });
}


app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res, next) {
    res.sendFile(__dirname + '/public/login.html');
});


io.sockets.on('connection', function (client) {
    client.on('login', function (user) {
        var req = http.request({
            hostname: dbserver,
            port: dbserverport,
            path: '/checkpw',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': user.length
            }
        }, (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {
                        client.emit('login_confirmed', resdata);
                    } else if (res.statusCode == 400) {
                        client.emit('login_denied', resdata);
                    }
                }
            });
        });
        req.write(user);
        req.end();
    });

    client.on('newuser', function (user) {
        var req = http.request({
            hostname: dbserver,
            port: dbserverport,
            path: '/newuser',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': user.length
            }
        }, (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {
                    client.emit('user_created', resdata);
                    } else if (res.statusCode == 400) {
                        client.emit('username_not_free', JSON.stringify(resdata));
                    }
                }
            });
        });
        req.write(user);
        req.end();
    });

    client.on('newtrainingtask', function (data) {
        var req = http.request({
            hostname: dbserver,
            port: dbserverport,
            path: '/newtrainingtask',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            if (res.statusCode == 200) {
                console.log('New Training Task ' + JSON.stringify(res.statusMessage));
                client.emit('task_created', 'Training task created');
            } else {
                client.emit('taskcreationerror', JSON.stringify({ msg: 'Error creating a new training task' }));
            }
        });
        req.write(data);
        req.end();
    });

    client.on('newtestingtask', function (data) {
        var req = http.request({
            hostname: dbserver,
            port: dbserverport,
            path: '/newtestingtask',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            if (res.statusCode == 200) {
                console.log('New Testing Task ' + JSON.stringify(res.statusMessage));
                client.emit('task_created', 'Testing task created');
            } else {
                client.emit('taskcreationerror', JSON.stringify({ msg: 'Error creating a new testing task' }));
            }
        });
        req.write(data);
        req.end();
    });

    client.on('getmessages', function (username) {
        http.get('http://' +dbserver+':' + dbserverport + '/getmessages/' + username, (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {
                        client.emit('messages', resdata);
                    }
                    if (res.statusCode == 400) {
                        client.emit('no-messages');
                    }
                }
            });
        });
    });

    client.on('getalltypes', function() {
        http.get('http://' +dbserver + ':'+ dbserverport + '/getalltypes', (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {
                        client.emit('alltypes', resdata);
                    }
                }
            });
        });
    });

    client.on('gettype', function (username, pic_data) {
        http.get('http://' +dbserver + ':'+ dbserverport + '/getbrain/' + username, (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {

                        var net = new convnetjs.Net();
                        net.fromJSON(JSON.parse(resdata));

                        //Decompress Pictures
                        var decomppic = decompressPic(pic_data);

                        //Get the type from the brain
                        var type_id = getTypeFromPic(decomppic, net);

                        //Get thy name of the type
                        var type_name = getTypeName(type_id, client);                       

                    }
                }
            });
        });
    });

    //client.on('getdataforeditor', function () {
    //    http.get('http://' +dbserver + ':' + dbserverport + '/getdataforedito', (res) => {
    //        var length = res.headers["content-length"];
    //        var resdata = '';
    //        res.on('data', (temp) => {
    //            resdata += temp;
    //            if (length == resdata.length) {
    //                if (res.statusCode == 200) {
    //                    client.emit('dataforeditor', resdata);
    //                }
    //            }
    //        });
    //    });
    //});

    client.on('getattrsoftype', function (type_id) {
        http.get('http://' +dbserver + ':' + dbserverport + '/getattrsoftype/' + type_id, (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {
                        client.emit('attrsoftype', type_id, resdata);
                    }
                }
            });
        });
    });
    
});

console.log("Client Server ready");

server.listen(4200);
