var debug = require('debug');

var express = require('express');
var app = express();
var server = require('http').createServer(app);

var convnetjs = require('convnetjs');
var fs = require('fs');
const sqlite3 = require('sqlite3').verbose();






let db = new sqlite3.Database('../data/queue_application.db', (err) => {
    if (err)
        console.log(err);
    console.log('Connected to queue_application.db');
});

//Create Tables
const create_table_task = `CREATE TABLE IF NOT EXISTS task (
    username TEXT    NOT NULL,
    time             NOT NULL,
    locked   BOOLEAN DEFAULT FALSE,
    training BOOLEAN NOT NULL
                     DEFAULT TRUE
);`;

const create_table_user = `CREATE TABLE IF NOT EXISTS user (
    username TEXT    NOT NULL,
    password TEXT    NOT NULL,
    brain    TEXT,
    locked   BOOLEAN DEFAULT FALSE
);`;

const create_table_message = `CREATE TABLE IF NOT EXISTS message (
    username INTEGER NOT NULL,
    time             NOT NULL,
    msg_data TEXT    NOT NULL,
    sent     BOOLEAN DEFAULT FALSE
);`;

const create_table_picture = `CREATE TABLE IF NOT EXISTS picture (
    type_id        INTEGER NOT NULL,
    pic_data       BLOB    NOT NULL,
    username       INTEGER NOT NULL,
    trainings_data BOOLEAN NOT NULL
                           DEFAULT TRUE
);`;

const create_table_type = `CREATE TABLE IF NOT EXISTS type (
    type_id  INTEGER NOT NULL,
    label    TEXT    NOT NULL,
    html_tag TEXT
);
`;

//Task Operations
const new_training_task = `INSERT INTO task (username,time) VALUES (?,strftime('%s','now'));`;
const new_testing_task = `INSERT INTO task (username,time,training) VALUES (?,strftime('%s','now'),'FALSE');`;
const count_opentasks = `SELECT COUNT(rowid) opentasks FROM task WHERE locked = 'FALSE';`;
const get_task = `SELECT rowid,* FROM task WHERE locked = 'FALSE' AND time = (SELECT MIN(time) FROM task WHERE locked = 'FALSE') AND (SELECT locked FROM user WHERE username = task.username) = 'FALSE'  LIMIT 1;`;
const get_user_of_task = `SELECT username FROM task WHERE rowid = ? ;`;
const get_max_task_rowid = `SELECT MAX(rowid) maxrowid FROM task;`;
const lock_task = `UPDATE task SET locked = 'TRUE' WHERE rowid = ? ;`;
const unlock_task = `UPDATE task SET locked = 'FALSE' WHERE rowid = ? ;`;
const remove_task = `DELETE FROM task WHERE rowid = ? AND locked = 'TRUE';`;
const remove_all_tasks_of_user = `DELETE FROM task WHERE username = ? ;`;

//User Operations
const new_user = `INSERT INTO user (username,password,brain) VALUES(?,?,?);`;
const get_password = `SELECT password FROM user WHERE username = ? ;`;
const check_username = `SELECT COUNT(username) count FROM user WHERE username = ? ;`;
const get_userid = `SELECT rowid FROM user WHERE username = ? ;`;
const get_brain = `SELECT brain FROM user WHERE username = ? ;`;
const get_default_user = `SELECT rowid FROM user WHERE username = 'default';`;
const lock_user = `UPDATE user SET locked = 'TRUE' WHERE username = ? ;`;
const unlock_user = `UPDATE user SET locked = 'FALSE' WHERE username = ? ;`;
const update_brain = `UPDATE user SET brain = ? WHERE username = ? ;`;
const remove_user = `DELETE FROM user WHERE rowid = ? ;`;


//Message Operations
const new_message = `INSERT INTO message (username,time,msg_data) VALUES(?,strftime('%s','now'),?);`;
const get_messages_for_user = `SELECT rowid,* FROM message WHERE username = ? AND sent = 'FALSE' ORDER BY time;`;
const mark_messageas_sent_user = `UPDATE message SET sent = 'TRUE' WHERE username = ? AND sent = 'FALSE';`;
const remove_messages_from_user = `DELETE FROM message WHERE username = ? ;`;
const remove_sent_messages = `DELETE FROM message WHERE sent = 'TRUE';`;

//Picture Operations
const new_trainings_picture = `INSERT INTO picture (type_id, pic_data, username) VALUES (?,?,?);`;
const new_testing_picture = `INSERT INTO picture (type_id, pic_data, username, trainings_data) VALUES (?,?,?,'FALSE');`;
const get_all_trainings_pictures = `SELECT type_id, pic_data FROM picture WHERE trainings_data = 'TRUE';`;
const get_all_pictures_of_task = `SELECT type_id, pic_data FROM picture WHERE task_id = ? ;`;
const get_all_pictures_of_type = `SELECT pic_data FROM picture WHERE type_id = ?;`;
const get_all_pictures_of_user = `SELECT type_id, pic_data FROM picture WHERE username = ? ;`;
const get_all_testing_pictures = `SELECT type_id, pic_data FROM picture WHERE trainings_data = 'FALSE';`;

//Type Operations
const new_type = `INSERT INTO type (type_id,label,html_tag) VALUES(?,?,?);`;
const get_all_types = `SELECT * FROM type ORDER BY type_id;`;
const get_type_name = `SELECT label FROM type WHERE type_id = ? ;`;
const count_types = `SELECT COUNT(type_id) count FROM type;`;
const remove_type = `DELETE FROM type WHERE type_id = ? ;`;

//Type + Attribute Operations
const add_attr_to_type = `INSERT INTO type_attr (type_id,attr_id) VALUES (?,?);`;
const get_attrs_of_type = `SELECT rowid,* FROM attr WHERE rowid IN (SELECT attr_id FROM type_attr WHERE type_id = ?);`;


function initBrain() {
    return new Promise(function (resolve, reject) {
        db.get(count_types, function (err, row) {
            if (row == undefined || row.count == 0) {
                reject(Error('No Types in DB'));
            } else {
                var types = Number.parseInt(row.count);
                var net = new convnetjs.Net();
                var Layer_Defs = [];
                Layer_Defs.push({ type: 'input', out_sx: 100, out_sy: 100, out_depth: 1 });
                Layer_Defs.push({ type: 'pool', sx: 4, stride: 4 });
                Layer_Defs.push({
                    type: 'conv', sx: 5, filters: 8, stride: 1, pad: 2,
                    activation: 'relu', drop_prob: 0.1
                });
                Layer_Defs.push({ type: 'pool', sx: 2, stride: 2 });
                Layer_Defs.push({
                    type: 'conv', sx: 5, filters: 16, stride: 1, pad: 2,
                    activation: 'relu', drop_prob: 0.1
                });
                Layer_Defs.push({ type: 'pool', sx: 3, stride: 3 });
                Layer_Defs.push({ type: 'softmax', num_classes: types });
                net.makeLayers(Layer_Defs);
                resolve(net.toJSON());
            }
        });
    });
}

function initTypes() {
    db.run(new_type, [0, "Button", "button"]);
    db.run(new_type, [1, "Paragraph", "p"]);
    db.run(new_type, [2, "Container", "div"]);
    db.run(new_type, [3, "Input", "input"]);
    db.run(new_type, [4, "Image", "img"]);
    db.run(new_type, [5, "Selection", "select"]);
    db.run(new_type, [6, "Heading", "h1"]);
    db.run(new_type, [7, "Link", "a"]);
    db.run(new_type, [8, "Table", "table"]);
    db.run(new_type, [9, "List", "ul"]);
}

function createDefaultUser() {
    var pBrainCreated = initBrain();
    pBrainCreated.then(function (result) {
        db.run(new_user, ['default', 'default', JSON.stringify(result)]);
    }, function (err) {
        console.log(err);
    });
}

db.serialize(function () {
    db.run(create_table_user);
    db.run(create_table_task);
    db.run(create_table_message);
    db.run(create_table_type);
    db.run(create_table_picture);
    db.get(count_types, function (err, row) {
        if (row.count == 0) {
            initTypes();
        }
    });
    db.get(get_default_user, function (err, row) {
        if (row == undefined) {
            createDefaultUser();
        }
    });
});

// Task Requests
app.post('/newtrainingtask', function (req, res) {
    var length = req.header('Content-Length');
    var reqdata = '';
    //is called when data arrives over the network
    req.on('data', function (temp) {
        reqdata += temp;
        //checks if the whole data has been sent
        if (length == reqdata.length) {
            var obj = JSON.parse(reqdata);
            db.serialize(() => {
                db.run(new_training_task, [obj.username]);
                for (let i = 0; i < obj.pictures.length; i++) {
                    db.run(new_trainings_picture, [obj.pictures[i].typeid, obj.pictures[i].pic_data, obj.username]);
                }
                //send response to the caller of the request
                res.status(200).send("Testing task created");
            });
        }
    });
});

app.post('/newtestingtask', function (req, res) {
    var length = req.header('Content-Length');
    var reqdata = '';
    //is called when data arrives over the network
    req.on('data', function (temp) {
        reqdata += temp;
        //checks if the whole data has been sent
        if (length == reqdata.length) {
            var obj = JSON.parse(reqdata);
            db.serialize(() => {
                db.run(new_testing_task, [obj.username]);
                for (let i = 0; i < obj.pictures.length; i++) {
                    db.run(new_testing_picture, [obj.pictures[i].typeid, obj.pictures[i].pic_data, obj.username]);
                }
                //send response to the caller of the request
                res.status(200).send("Testing task created");
            });
        }
    });
});

app.get('/countopentasks', function (req, res) {
    db.get(count_opentasks, function (err, row) {
        //send response to the caller of the request
        res.status(200).send(JSON.stringify(row.opentasks));
    });
});

app.get('/gettask', function (req, res) {
    db.get(get_task, function (err, row) {
        if (row == undefined) {
            res.status(400).send('No open Tasks. Maybe the user of the task is locked!');
        } else {
            var username = row.username;
            var task_id = row.rowid;
            var training = row.training;
            var brain;
            var pics = [];
            db.serialize(() => {
                db.get(get_brain, [username], (err, row) => {
                    brain = row.brain;
                    var query = "";
                    if (training == 'TRUE')
                        query = get_all_trainings_pictures;
                    else
                        query = get_all_testing_pictures;
                    db.all(query, [], function (err, rows) {
                        if (rows != undefined) {
                            rows.forEach(function (row) {
                                pics[pics.length] = { type_id: row.type_id, pic_data: row.pic_data };
                            });
                            var data = JSON.stringify({ task_id: task_id, username: username, training: training, brain: JSON.parse(brain), pictures: pics });
                            res.setHeader('Content-Length', data.length)
                            res.send(data);
                        } else {
                            res.status(400).send("There are no pictures for this task in DB!");
                        }
                    });
                });
            });
        }
    });
});

app.get('/locktask/:id', function (req, res) {
    db.run(lock_task, [req.params.id]);
    db.get(get_user_of_task, [req.params.id], function (err, row) {
        db.run(lock_user, [row.username]);
    });
    res.status(200).send("Task Locked");
});

app.get('/removetask/:id', function (req, res) {
    db.get(get_user_of_task, [req.params.id], function (err, row) {
        db.run(unlock_user, [row.username]);
    });
    db.run(remove_task, [req.params.id]);
    res.status(200).send("Task Removed");
});

app.get('/unlocktask/:id', function (req, res) {
    db.run(unlock_task, [req.params.id]);
    db.get(get_user_of_task, [req.params.id], function (err, row) {
        db.run(unlock_user, [row.username]);
    });
    res.status(200).send("Task Unlocked");
});

//end Task Requests

//User Requests

app.post('/newuser', function (req, res) {
    var length = req.header('Content-Length');
    var reqdata = '';
    req.on('data', function (temp) {
        reqdata += temp;
        if (length == reqdata.length) {
            var obj = JSON.parse(reqdata);
            db.get(check_username, [obj.username], function (err, row) {
                if (row.count == 0) {
                    db.get(get_brain, ['default'], function (err, row) {
                        var brain;
                        if (row == undefined) {
                            console.log('Default user is missing!');
                            res.status(1000).send("Default user is missing");
                        }
                        else {
                            brain = row.brain;
                            db.run(new_user, [obj.username, obj.password, brain]);
                            res.status(200).send("New User Created");
                        }
                    });
                } else {
                    res.status(400).send('Username already exists');
                }
            });
        }
    });
});

app.get('/getbrain/:username', (req, res) => {
    db.get(get_brain, [req.params.username], (err, row) => {
        //send response to the caller of the request
        res.status(200).send(row.brain);
    });
});

app.post('/updatebrain/:username', function (req, res) {
    var length = req.header('content-length');
    var reqdata = '';
    req.on('data', (temp) => {
        reqdata += temp;
        if (length == reqdata.length) {
            db.run(update_brain, [reqdata, req.params.username]);
            res.status(200).send("Brain of User " + req.params.username + " updated");
        }
    });
});

app.post('/checkpw', function (req, res) {
    var length = req.header('Content-Length');
    var reqdata = '';
    req.on('data', (temp) => {
        reqdata += temp;
        if (length == reqdata.length) {
            var obj = JSON.parse(reqdata);
            db.get(get_password, [obj.username], function (err, row) {
                if (row != undefined) {
                    if (row.password == obj.password) {
                        db.get(get_userid, [obj.username], function (err, row) {
                            res.status(200).send(JSON.stringify({ username: row.rowid }));
                        });
                    } else {
                        res.status(400).send("FALSE");
                    }
                } else {
                    res.status(400).send("User doesn't exist");
                }
            });
        }
    });
});

app.get('/lockuser/:username', function (req, res) {
    db.run(lock_user, [req.params.username]);
    res.status(200).send("User" + req.params.username + " locekd");
});

app.get('/unlockuser/:username', function (req, res) {
    db.run(unlock_user, [req.params.username]);
    res.status(200).send("User" + req.params.username + " unlocekd");
});

app.get('/removeuser/:username', function (req, res) {
    db.run(remove_user, [req.params.username]);
    //db.run(remove_all_tasks_of_user, [req.params.username]);
    //db.run(remove_messages_from_user, [req.params.username]);
    res.status(200).send("User " + req.params.username + " removed");
});

//end User Requests

//Message Requests

app.get('/getmessages/:username', function (req, res) {
    db.all(get_messages_for_user, [req.params.username], function (err, rows) {
        var messages = [];
        if (rows.length > 0) {
            rows.forEach(function (row) {
                messages[messages.length] = { msg_data: row.msg_data, time: row.time };
            });
            res.status(200).send(JSON.stringify(messages));
        } else {
            res.status(400).send('No messages stored.');
        }
    });
    db.run(mark_messageas_sent_user, [req.params.username]);
});

app.post('/newmessage', function (req, res) {
    //Gets the request-header "Content-Length"
    var length = req.header('Content-Length');
    var reqdata = '';
    //Add a function which is called when data arrives 
    req.on('data', (temp) => {
        reqdata += temp;
        //Checks if the whole data hase arrived
        if (length == reqdata.length) {
            //Parses the received JSON-Object
            var obj = JSON.parse(reqdata);
            //Inserts it into the database
            db.run(new_message, [obj.username, obj.msg_data]);
            //Sends response to client
            res.status(200).send("Message saved");
        }
    });
});

//Ones daily removes all sent Messages
setInterval(function () {
    db.run(remove_sent_messages);
}, 8.64e+7);

//end Message Requests

//Type Requests
app.post('/newtype', function (req, res) {
    var length = req.header('Content-Length');
    var reqdata = '';
    req.on('data', (temp) => {
        reqdata += temp;
        if (length == reqdata.length) {
            var obj = JSON.parse(reqdata);
            db.run(new_type, [obj.type_id, obj.label, obj.html_tag]);
            res.status(200).send("Type safed");
        }
    });
});


app.get('/getalltypes', function (req, res) {
    db.all(get_all_types, [], function (err, rows) {
        var types = [];
        rows.forEach(function (row) {
            types[types.length] = { type_id: row.type_id, label: row.label, html_tag: row.html_tag };
        });
        res.status(200).send(JSON.stringify(types));
    });
});

app.get('/gettypename/:type_id', function (req, res) {
    //Sends a request for the name of the type with the given id and adds a callback function
    db.get(get_type_name, [req.params.type_id], function (err, row) {
        //Sends response with type name to client
        res.status(200).send(JSON.stringify(row.label));
    });
});

app.get('/typecount', function (req, res) {
    db.get(count_types, [], function (err, rows) {
        res.status(200).send(JSON.stringify(row.count));
    });
});

app.get('/removetype/:type_id', function (req, res) {
    db.run(remove_type, [req.params.type_id]);
    res.status(200).send("Type " + req.params.type_id + " removed");
});

//end Type Requests

//Picture Requests

app.post('/newpicture', function (req, res) {
    var length = req.header('Content-Length');
    var reqdata = '';
    req.on('data', (temp) => {
        reqdata += temp;
        if (length == reqdata.length) {
            var obj = JSON.parse(reqdata);
            db.run(new_trainings_picture, [obj.type_id, obj.pic_data, obj.username]);
            res.status(200).send("Picture saved");
        }
    });
});

app.get('/getallpicsoftype/:type_id', function (req, res) {
    db.all(get_all_pictures_of_type, [req.params.type_id], function (err, rows) {
        var pics = [];
        rows.forEach(function (row) {
            pics[pics.length] = row.pic_data;
        });
        res.status(200).send(JSON.stringify(pics));
    });
});

app.get('/getallpicsoftask/:task_id', function (req, res) {
    db.all(get_all_pictures_of_task, [req.params.task_id], function (err, rows) {
        var pics = [];
        rows.forEach(function (row) {
            pics[pics.length] = { type_id: row.type_id, pic_data: row.pic_data };
        });
        res.status(200).send(JSON.stringify(pics));
    });
});

app.get('/getallpicsofuser/:username', function (req, res) {
    db.all(get_all_pictures_of_user, [req.params.username], function (err, rows) {
        var pics = [];
        rows.forEach(function (row) {
            pics[pics.length] = { type_id: row.type_id, pic_data: row.pic_data };
        });
        res.status(200).send(JSON.stringify(pics));
    });
});

app.get('/getallpics', function (req, res) {
    db.all(get_all_trainings_pictures, [req.params.username], function (err, rows) {
        var pics = [];
        rows.forEach(function (row) {
            pics[pics.length] = { task_id: row.task_id, type_id: row.type_id, pic_data: row.pic_data };
        });
        res.status(200).send(JSON.stringify(pics));
    });
});
//end Picture Requests

//app.get('/getdataforeditor', function (req, res) {
//    db.serialize(function () {
//        var types = [];
//        db.all(get_all_types, function (err, rows) {
//            rows.forEach(function (row) {
//                types[types.length] = { type_id: row.type_id, label: row.label, attrs: [] };
//            });
//        });
//    });
//});

server.listen(4400);