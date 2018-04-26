const d3 = require('d3');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const child_process = require('child_process');


let globalSocket;
io.on('connection', function (socket) {
  globalSocket = socket;
  socket.on('clusterData request', function (req) {
    child.send({ reqType: 'clusterData request', data: req });
  });

  socket.on('clusterDataNew request', function (req) {
    child.send({ reqType: 'clusterDataNew request', data: req });
  });

  socket.on('test cluster request', function (req) {
    child.send({ reqType: 'test cluster request' });
  });

  socket.on('yearly cluster request', function (req) {
    child.send({ reqType: 'yearly cluster request', data: req });
  });

  socket.on('scenario year request', function (req) {
    writeData('large.txt', JSON.stringify(req.data));
    pythonPCA(req.mode, 'large.txt', 'scenario year response');
  });

  socket.on('scenario cluster request', function (req) {
    pythonPCA(req.mode, 'ProccessClusterVectors.txt', 'scenario cluster pca');
    child.send({ reqType: 'scenario cluster request', data: req });
  });

  socket.on('process data request', function (data) {
    child.send({ reqType: 'process data request', data: data });
  })

  socket.on('kill child', function (data) {
    child.kill();
  })

});

// app.use(express.static(`file://${__dirname}/webcontent`));
app.use('/data', express.static('data'));
app.use(express.static('webcontent'));

http.listen(4080, function () {
  console.log('listening on *:4080');
});


let child = child_process.fork(`${__dirname}/sub.js`);
setupchild(child);
function setupchild(ch) {
  ch.on('message', (m) => {
    if (m.reqType) {
      console.log('PARENT got message:', m.reqType, (new Date()).toUTCString());
      globalSocket.emit(m.reqType, m.data);
    }
    else {
      console.log('PARENT got message:', m, (new Date()).toUTCString());
    }
  });
  ch.on('error', function (err) {
    console.log('Error happened in child.');
  });

  ch.on('exit', function (code, signal) {
    console.log('Child exited with code ' + code);

    if (code > 0) {
      console.log('New child is being spawned!')
      child = child_process.fork(`${__dirname}/sub.js`);
      setupchild(child);
    }
  });
}

const PythonShell = require('python-shell');
const fs = require('fs');
const execFile = require('child_process').execFile;
const path = require('path');

function pythonPCA(mode, filename, message) {
  // console.log(JSON.stringify(data));
  var options = {
    args: [mode, 'data/' + filename, true]
  };

  // execFile('python/dist/pca/pca.exe', options.args, function (err, results) {
    PythonShell.run('python/pca.py', options, function (err, results) {
    if (err) {
      console.log(err);
      return;
    }
    // results is an array consisting of messages collected during execution
    // console.log(results);
    // When clustering thousands of results need to write to file and pipe file to main window
    var output = JSON.parse(results);
    // console.log('output parsed: ', output);
    globalSocket.emit(message, output);

    console.log(message, (new Date()).toUTCString())
  });
}

function writeData(filename, data) {
  fs.writeFileSync("data/" + filename, data);
}