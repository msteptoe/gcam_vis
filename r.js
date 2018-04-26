const R = require("r-script");
const fs = require("pn/fs");
const path = require('path');
const os = require('os');

const cpusAvailable = os.cpus().length - 1;
const ipAddress = process.argv[2] ? process.argv[2] : "localhost";

let obj;
let startTime = new Date();
let fileCount = 0;
let filesCompleted = 0;
let jobName = "test"
let dbDir = "r_scenarios"
let databases = [];
let dataDir = "jobs" + path.sep + "test" + path.sep;

const socket = require('socket.io-client')('http://' + ipAddress + ':3081');

echo(ipAddress);

socket.on('connect', () => {
    echo('Process got connect!');
    // socket.emit('processDatabases');
});

socket.on('processDatabases', params => {
    socket.emit('state_active', params);
    startTime = new Date();
    filesCompleted = 0;
    jobName = params.jobName;
    dbDir = params.dbDir;
    dataDir = 'jobs' + path.sep + jobName + path.sep;
    databases = params.databases;
    fileCount = databases.length;

    echo(JSON.stringify(params));

    if (dbDir && jobName && fileCount) {
        startProcessing();
    }
});

socket.on('databases', databases => {
    echo('databases:', databases);
    socket.emit('databasesRecieved', databases);
});

socket.on('start_analysis', dir => {
    echo('start_analysis:', dir);
    dataDir = dir;
    aggloCluster();
    kmeans();
});

socket.on('exit', databases => {
    echo('exiting!');
    process.exit();
});

const PythonShell = require('python-shell');

function pca() {
    var options = {
        args: [dataDir, path.sep, 'ScenarioVectors']
    };

    echo('pca start');
    let pyStart = new Date();
    PythonShell.run('python' + path.sep + 'pca.py', options, function (err, results) {
        if (err) {
            echo(err);
            throw err;
        }
        // results is an array consisting of messages collected during execution
        // console.log('results: %j', results);
        echo('pca complete in ' +((new Date()) - pyStart) / 60000 + ' minutes' );
        socket.emit('state_inactive');
    });
}

function aggloCluster() {
    var options = {
        args: [dataDir]
    };

    echo('aggloCluster start');
    let pyStart = new Date();
    PythonShell.run('python' + path.sep + 'agglo_cluster.py', options, function (err, results) {
        if (err) {
            echo(err);
            throw err;
        }
        // results is an array consisting of messages collected during execution
        // console.log('results: %j', results);
        echo('aggloCluster complete in ' +((new Date()) - pyStart) / 60000 + ' minutes' );
        pca();
    });
}

function kmeans() {
    var options = {
        args: [dataDir, path.sep, 'ScenarioVectors']
    };

    echo('kmeans start');
    let pyStart = new Date();
    PythonShell.run('python' + path.sep + 'kmeans.py', options, function (err, results) {
        if (err) {
            echo(err);
            throw err;
        }
        // results is an array consisting of messages collected during execution
        // console.log('results: %j', results);
        echo('kmeans complete in ' +((new Date()) - pyStart) / 60000 + ' minutes' );
    });
}


function processDatabase(scenarioIndex, increment, stop, firstScenario) {
    let inc = increment ? increment : 1;
    let scenarioNum = databases[scenarioIndex].split('basexdb_')[1];

    R("dynamicExport.R")
        .data({
            dbDir: dbDir,
            db: "database_basexdb_" + scenarioNum,
            dataDir: dataDir,
            scenarioName: "db_" + scenarioNum,
            firstScenario: firstScenario ? firstScenario : false
        })
        .call(function (err, d) {
            if (err && err.toString().toLowerCase().indexOf('error') > -1) {
                echo(err);
                throw err;
            }
            if (d) {
                echo(d);

                fs.unlink(d + '.proj', function (err) {
                    if (err) return echo(err);
                    echo('Deleted: ' + d + '.proj');

                    filesCompleted++;
                    // echo('scenarioIndex:', scenarioIndex, ', increment:', inc, ', val:', (scenarioIndex + inc));
                    // echo('files completed: ' + filesCompleted);

                    if (firstScenario && !stop) {
                        echo('About to begin batch process!');
                        batchProcessDatabase(3, 1);
                    }
                    else if (scenarioIndex + inc < fileCount && !stop) {
                        processDatabase(scenarioIndex + inc, inc);
                    }
                    else if (filesCompleted == fileCount || stop) {
                        let endTime = new Date();
                        echo((endTime - startTime) / 60000 + ' minutes')
                        echo(startTime, endTime);
                        socket.emit('processDatabasesComplete');
                        aggloCluster();
                        kmeans();
                    }
                });
            }
        });
}

// processDatabase(0, 1, true);

function batchProcessDatabase(count, startIndex) {
    let index = 0,
        processCount = count,
        increment = count;
    if (typeof (startIndex) !== 'undefined') {
        index += startIndex,
            processCount += startIndex;
    }
    // echo(index, processCount)
    for (let i = index; i < processCount; i++) {
        if (i >= fileCount)
            break;
        setTimeout(() => {
            processDatabase(i, increment);
        }, (i - index) * 8000);
    }
}

// batchProcessDatabase(3);

function echo(message) {
    console.log(message);
    if (socket) {
        socket.emit('console', message);
    }
}

function startProcessing() {
    var files = [];
    for (var i = 0; i < databases.length; i++) {
        files.push("db_" + databases[i].split('basexdb_')[1] + '.json');
    }

    fs.mkdir(dataDir)
        .then(() =>
            Promise.all([
                fs.mkdir(dataDir + 'ScenarioData'),
                fs.mkdir(dataDir + 'ScenarioVectors'),
                fs.writeFile(dataDir + 'Files.json', JSON.stringify(files))
            ])
        )
        .then(result => {
            echo('Done creating directories!');
            processDatabase(0, 1, false, true);
        }).catch(reason => {
            echo(reason)
        });
}

function start() {
    var files = [];
    for (var i = 0; i < fileCount; i++) {
        files.push("db_" + i + '.json');
    }
    Promise.all([
        fs.mkdir(dataDir + 'ScenarioData'),
        fs.mkdir(dataDir + 'ScenarioVectors'),
        fs.writeFile(dataDir + 'Files.json', JSON.stringify(files))
    ]).then(result => {
        echo('Done creating directories!');
        processDatabase(0, 1, false, true);
    }).catch(reason => {
        echo(reason)
    });
}
// start();

function writeFileNames() {
    var files = [];
    for (var i = 0; i < fileCount; i++) {
        files.push('db_' + i + '.json');
    }
    fs.writeFile('./data/Files.json', JSON.stringify(files))
}
// writeFileNames();