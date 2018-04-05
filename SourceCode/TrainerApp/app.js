var convnetjs = require('convnetjs');
var fs = require('fs');
var io = require('socket.io');
var http = require('http');
var pdfkit = require('pdfkit');
var chartjs = require('chart.js');
var chartjs = require('chartjs-node');

const dbserver = 'localhost';
const dbserverport = 4400;

console.log("Trainer ready!");
//returns a convnetjs.Vol with given data
function generateVol(data) {
    var x = new convnetjs.Vol(100, 100, 1);
    for (var i = 0; i < data.length; i++)
        x.w[i] = parseInt(data[i]);
    return x;
}

//Checks if the average loss is under a specific number and returns boolean
function avg(array) {
    var sumloss = 0;
    for (var i = 0; i < array.length; i++) {
        sumloss += (array[i].loss != undefined) ? array[i].loss : "0";
    }
    //TODO: Check the change of the loss not the absolute number
    if (sumloss / array.length < 0.0001)
        return true;
    return false;
}

//Decodes the length encoding of the pictures
function decodeLengthEncoding(task) {
    var pics = [];
    for (let i = 0; i < task.pictures.length; i++) {
        var actpic = '';
        var count = '';
        var actvalue = '0';
        for (let u = 0; u < task.pictures[i].pic_data.length; u++) {
            if (task.pictures[i].pic_data[u] == 'B' || task.pictures[i].pic_data[u] == 'W') {
                switch (task.pictures[i].pic_data[u]) {
                    case 'B':
                        actvalue = '0';
                        break;
                    case 'W':
                        actvalue = '1';
                }
                for (var c = 0; c < count; c++) {
                    actpic += actvalue;
                }
                count = '';
            } else {
                count += task.pictures[i].pic_data[u];
            }
        }

        pics[i] = {
            'type_id': task.pictures[i].type_id, 'data': actpic
        };
    }
    return pics;
}

//Sends a request to the rest service to store the given message
function sendMessageToRestService(message) {
    //Request definition
    var req = http.request({
        hostname: dbserver,
        port: dbserverport,
        path: '/newmessage',
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'content-length': message.length
        }
    //Function which is called on response of the server
    }, (res) => {
        console.log('Message has been sent to server');
        });
    //Sends the request
    req.write(message);
    req.end();
}

//Sends a request to the rest service to lock the given task
function lockTask(task) {
    http.get('http://' + dbserver + ':' + dbserverport + '/locktask/' + task.task_id, (res) => {
        if (res.statusCode == 200) {
            console.log('Task ' + task.task_id + ' is locked.');
            if (task.training == 'TRUE')
                processTraining(task);
            else
                processTest(task);

        } else
            console.log('Error locking task ' + task.task_id + ' reguarding client ' + task.username);
    });
}

//Sends a request to the rest service to unlock the given task to the rest service
function unlockTask(task) {
    http.get('http://' + dbserver + ':' + dbserverport + '/unlocktask/' + task.task_id, (res) => {
        if (res.statusCode == 200) {
            console.log('Task ' + task.task_id + ' is unlocked.');
        }
        else
            console.log('Error unlocking task ' + task.task_id);
    });
}

//Sends a request to the rest service to save the given network fot the given user
function saveTheNetwork(net, username) {
    var save = JSON.stringify(net.toJSON());
    var req = http.request({
        hostname: dbserver,
        port: dbserverport,
        path: '/updatebrain/' + username,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'content-length': save.length
        }
    }, (res) => {
        //TODO Handle if brain is not saved
    });
    req.write(save);
    req.end();
}

//Sends a request to the rest service to remove the given task from the database because it is finished
function removeFinishedTask(task) {
    http.get('http://' + dbserver + ':' + dbserverport + '/removetask/' + task.task_id, (res) => {
        if (res.statusCode == 200)
            console.log('Finished and removed task ' + task.task_id);
        else
            console.log('Error removing task ' + task.task_id + ' reguarding client ' + task.username);
    });
}

//Draws a chart displaying the error per type during testing
function drawErrorChart(pictypes, errorcount, picspertype) {
    var errorcountpercent = [];
    for (let i = 0; i < errorcount.length; i++)
        errorcountpercent[i] = errorcount[i] / picspertype[i] * 100;

    var ErrorChart = new chartjs(400, 300);
    return new Promise((resolve, reject) => {
        ErrorChart.drawChart({
            type: 'bar',
            yAxisID: 'Percentage',
            XAxisID: 'Type Number:',
            data: {
                labels: pictypes,
                datasets: [{
                    label: 'Percentage of Error per Type',
                    data: errorcountpercent,
                    backgroundColor: 'rgb(66, 134, 244)'
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: 100
                        }
                    }]
                }
            }
        }).then(() => {
            return ErrorChart.writeImageToFile('image/png', './test_protocolls/temp/errorpertypechart.png').then(() => {
                resolve(true);
                console.log('done');
            });
        });
    });
};

//Draws a chart displaying the number of pictures per type used for testing
function drawNumbOfPicsPerType(pictypes, picspertype) {
    var NumbPicChart = new chartjs(400, 300);
    return new Promise((resolve, reject) => {
        NumbPicChart.drawChart({
            type: 'bar',
            yAxisID: 'Number of Pictures',
            xAxisID: 'Type Number',
            data: {
                labels: pictypes,
                datasets: [{
                    label: 'Number of tested Pictures per Type',
                    data: picspertype,
                    backgroundColor: 'rgb(66, 134, 244)'
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: Math.max.apply(Math, picspertype)
                        }
                    }]
                }
            }
        }).then(() => {
            return NumbPicChart.writeImageToFile('image/png', './test_protocolls/temp/picpertypechart.png').then(() => {
                resolve(true);
                console.log('done');
            });
        });
    });
};

//Creates a test protocoll which is stored local
function createTestProtocoll(numbPicsChartPromis, errorChartPromise, username, starttime, picspertype, errorcount, types) {

    var doc = new pdfkit();
    doc.pipe(fs.createWriteStream('./test_protocolls/testpdf_' + username + "_" + new Date().getTime() + '.pdf'));
    doc.fontSize(30).text('Test Protocoll', 10, 10);
    doc.fontSize(14).text('Username: ' + username);
    doc.text('Date: ' + new Date().toDateString());
    doc.text('Start Time: ' + starttime + ' End Time: ' + new Date().toLocaleTimeString());
    doc.moveDown();
    doc.moveDown();
    for (let i = 0; i < types.length; i++) {
        doc.text(types[i].label + ':');
        doc.text('     Anzahl der Testbilder: ' + picspertype[i]);
        doc.text('     Prozent der Fehler: ' + errorcount[i] / picspertype[i] * 100 + '%');
        doc.moveDown();
    }
    Promise.all([numbPicsChartPromis, errorChartPromise]).then(() => {
        doc.addPage();
        doc.image('./test_protocolls/temp/picpertypechart.png');
        for (let i = 0; i < types.length; i++) {
            doc.text(types[i].type_id + ': ' + types[i].label);
        }
        doc.addPage();
        doc.image('./test_protocolls/temp/errorpertypechart.png');
        for (let i = 0; i < types.length; i++) {
            doc.text(types[i].type_id + ': ' + types[i].label);
        }
        doc.save();
        doc.end();
    });
};

//Trains the network
function networkTraining(pics, net) {
    var trainer = new convnetjs.Trainer(
        net,
        { method: 'adadelta', batch_size: 20, l2_decay: 0.001 }
    );
    var loss = [];

    //At maximum passes every picture 100 times through the net
    for (let z = 0; z < 100 * pic.length; z++) {

        //Training magic
        var pic = pics[z % pics.length];
        var vol = generateVol(pic.data);
        var x = trainer.train(vol, parseInt(pic.type_id));

        //Checking the average loss after one iteration over all pictures 
        if (z % pics.length == 0 && z != 0) {
            //If loss falls below a certain value the training is automatically stoped 
            //to save time and prevent unnecessary training
            if (avg(loss))
                break;
            loss = [];
        }
        loss[z % pics.length] = x;
    }

    return net;
}

//Tests the network
function networkTesting(pics, net, username, types) {

    var GetTypePromise = new Promise((resolve, reject) => {
        http.get(dbserver + ':' + dbserverport + '/getalltypes', (res) => {
            var length = res.headers["content-length"];
            var resdata = '';
            res.on('data', (temp) => {
                resdata += temp;
                if (length == resdata.length) {
                    if (res.statusCode == 200) {
                        var types = JSON.parse(resdata);
                        resolve(types);
                    }
                }
            });
        })
    });
    GetTypePromise.then((types) => {
        var pictypes = [];
        for (let i = 0; i < types.length; i++) {
            pictypes[types[i].type_id] = types[i].type_id;
        }
        var starttime = new Date().toLocaleTimeString();
        var errorcount = new Int32Array(types.length);
        var picspertype = new Int32Array(types.length);

        //Forward all pics of test data
        for (let i = 0; i < pics.length; i++) {
            let pic = pics[i];
            let vol = generateVol(pic.data);
            let result = net.forward(vol);
            let max = 0;
            let max_id = 0;

            //get the type with the highest percentage
            for (let x = 0; x < result.depth; x++) {
                var per = result.w[x];
                if (per > max) {
                    max = per;
                    max_id = x;
                }
            }
            picspertype[pic.type_id] += 1;
            //check if right type has been predicted
            if (max_id != pic.type_id)
                errorcount[pic.type_id] += 1;
        }

        var endtime = new Date().toLocaleTimeString();

        //Create PDF Test Documentation

        var numbPicsChartPromis = drawNumbOfPicsPerType(pictypes, picspertype);

        var errorChartPromise = drawErrorChart(pictypes, errorcount, picspertype);

        createTestProtocoll(numbPicsChartPromis, errorChartPromise, username, starttime, endtime, picspertype, errorcount, types);

    });
}

//Handels a training task
function processTraining(task) {
    try {
        //Loading the brain
        net = new convnetjs.Net();
        net.fromJSON(task.brain);

        //Decode lengthencoding
        var pics = decodeLengthEncoding(task);

        //Training the brain
        networkTraining(pics, net);

        //Saving the new brain
        saveTheNetwork(net, task.username);

        //Removing finished task
        removeFinishedTask(task);

        //Sending user a message that task has finsihed
        var message = JSON.stringify({ username: task.username, msg_data: 'The task ' + task.task_id + ' has finsihed training.' });
        sendMessageToRestService(message);

    } catch (err) {
        console.log(err);
        unlockTask(task);
    }
}

//Handels a testing task
function processTest(task) {
    try {
        //Loading the brain
        net = new convnetjs.Net();
        net.fromJSON(task.brain);

        //Decode lengthencoding
        var pics = decodeLengthEncoding(task);

        //Test the brain
        networkTesting(pics, net, task.username);

        //Removing finished task
        removeFinishedTask(task);

        //Sending user a message that task has finsihed
        var message = JSON.stringify({ username: task.username, msg_data: 'The task ' + task.task_id + ' has finsihed training.' });
        sendMessageToRestService(message);

    } catch (err) {
        console.log(err);
        unlockTask(task);
    }
}

//Checks if a task is available 
function starttask() {
    try {
        //Check if there are open tasks
        http.get('http://' + dbserver + ':' + dbserverport + '/countopentasks', (res) => {
            res.on('data', (opentasks) => {
                if (JSON.parse(opentasks) > 0) {

                    //Get open task
                    http.get('http://' + dbserver + ':' + dbserverport + '/gettask', (res) => {

                        //DB returned task successfully
                        if (res.statusCode == 200) {
                            var tdata = '';
                            res.on('data', (rdata) => {
                                tdata += rdata;

                                //As soon as all data has been received
                                if (tdata.length == res.headers['content-length']) {
                                    var task = JSON.parse(tdata);
                                    lockTask(task);
                                }
                            });
                        } else {
                            //If something went wrong getting the task from the db
                            console.log('error getting the task from the db');
                        }
                    });
                } else {
                    console.log('no open tasks');
                }
            });

        });
    } catch (err) {
        console.log(err);
    }
};

//function printPics() {
//    http.get(dbserver + ':' + dbserverport + '/gettask', (res) => {

//        //DB returned task successfully
//        if (res.statusCode == 200) {
//            var tdata = '';
//            res.on('data', (rdata) => {
//                tdata += rdata;

//                //As soon as all data has been received
//                if (tdata.length == res.headers['content-length']) {
//                    var task = JSON.parse(tdata);
//                    var pics = decodeLengthEncoding(task);
//                    console.log('Start');
//                    for (let i = 75 * 2; i < 75 * 3; i++) {
//                        console.log(task.pictures[i].pic_data);
//                        console.log(pics[i].type_id);
//                        console.log(' ');
//                        for (let u = 0; u < pics[i].data.length - 100; u += 100) {
//                            console.log(pics[i].data.slice(u, u + 100));
//                        }
//                        console.log(' ');
//                        console.log('-----------------------------------------------------------------------------------------------------------------------------');
//                    }
//                }
//            });
//        } else {
//            //If something went wrong getting the task from the db
//            console.log('error getting the task from the db');
//        }
//    });
//};

//Sets a interval of 5000ms in which the method starttask is executed
setInterval(starttask, 5000);
//Executes the method starttask when the application is started
starttask();