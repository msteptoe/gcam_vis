"use strict"

const fs = require("pn/fs");
const path = require('path');

const SlurmJobManager = require('./SlurmJobManager');
const ProcessJob = require('./ProcessJob');

const LOCAL = process.argv[2] ? process.argv[2] : false;

class ProcessJobManager {

    constructor() {
        let self = this;

        this.ipAddress = "127.0.0.1";
        this.jobCount = 0;
        this.io = require('socket.io')();
        this.slurmJM = new SlurmJobManager();
        this.processJobs = {};
        this.jobDir = LOCAL ? 'jobs' + path.sep : path.sep + 'pic' + path.sep + 'scratch' + path.sep + 'gcam_server' + path.sep;

        fs.mkdir(this.jobDir)
            .then(res => {
                console.log('Job Directory Created:', self.jobDir)
            })
            .catch(err => {
                if (err.code == 'EEXIST') {
                    console.log('jobDir already exists');
                }
                console.log('Job Directory:', self.jobDir);
            })

        require('dns').lookup(require('os').hostname(), function (err, address, fam) {
            // console.log('ip address: ' + address);
            self.ipAddress = address;
        });

        this.io.on('connection', (socket) => {
            console.log('Process connection!');
            // console.log('Socket Query:', socket.handshake.query);

            socket.jobID = socket.handshake.query.jobID;
            socket.processID = socket.handshake.query.processID;
            socket.jobLength = socket.handshake.query.jobLength;
            socket.jobType = socket.handshake.query.jobType;

            if (this.processJobs[socket.processID]) {
                var processJob = this.processJobs[socket.processID];
                if (processJob.startTime == undefined) {
                    processJob.startTime = new Date();
                }

                processJob.addSocket(socket);
            }
            else {
                socket.emit('S_Exit');
                console.log('Closed socket with no processJob');
            }
        });

        this.io.listen(3081);
    }

    // Terminate all running processes and clear Slurm Queue
    cancelJobs() {
        console.log('cancelJobs');
        this.io.emit('S_Exit');
        this.slurmJM.cancelJobs();
    }

    removeProcessJob(processID) {
        console.log('removeProcessJob');
        delete this.processJobs[processID];
        process.exit();
    }

    getSockets() {
        let sockets = [];
        for (let id in this.processJobs) {
            sockets = sockets.concat(this.processJobs[id].sockets);
        }

        return sockets;
    }

    createJob(jobName, dbDir, databases, sampleQuery, queryFile) {
        let self = this;
        let args = [this.ipAddress, ++this.jobCount];
        let dataDir = this.jobDir + jobName + path.sep;
        // return console.log(this.jobCount, jobName, this, dbDir, dataDir, databases, sampleQuery, queryFile);

        this.processJobs[this.jobCount] = new ProcessJob(this.jobCount, jobName, this, dbDir, dataDir, databases, sampleQuery, queryFile);
        // console.log(this.processJobs);

        var files = [];
        for (var i = 0; i < databases.length; i++) {
            files.push("db_" + databases[i].split('basexdb_')[1] + '.json');
        }

        fs.mkdir(dataDir)
            .then(() =>
                Promise.all([
                    fs.mkdir(dataDir + 'ScenarioData'),
                    fs.mkdir(dataDir + 'ScenarioVectors'),
                    fs.mkdir(dataDir + 'Errors'),
                    fs.writeFile(dataDir + 'Files.json', JSON.stringify(files))
                ])
            )
            .then(result => {
                console.log('Done creating directories!');

                if (LOCAL) {
                    // Create short-job to start 1st R process,
                    // Continue processing R databases until a long-job is avail
                    self.slurmJM.submitJobLocal(1, args.concat(["123", "short", true]));

                    // Create 2 long-jobs to handle data preprocessing
                    setTimeout(function () {
                        self.slurmJM.submitJobLocal(1, args.concat(["234", "long", true]));
                    }, 3000);
                    setTimeout(function () {
                        self.slurmJM.submitJobLocal(1, args.concat(["345", "long", true]));
                    }, 6000);
                    setTimeout(function () {
                        self.slurmJM.submitJobLocal(1, args.concat(["456", "long", true]));
                    }, 6000);
                    setTimeout(function () {
                        self.slurmJM.submitJobLocal(1, args.concat(["567", "long", true]));
                    }, 6000);
                    setTimeout(function () {
                        self.slurmJM.submitJobLocal(1, args.concat(["789", "long", true]));
                    }, 6000);
                }
                else {
                    // Create short-job to start 1st R process,
                    // Continue processing R databases until a long-job is avail
                    self.slurmJM.submitJob('short', args);

                    if (files.length > 300) {
                        // Create 9 long-jobs to handle data preprocessing
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                        self.slurmJM.submitJob('long', args);
                    }
                }
            }).catch(reason => {
                console.log('createJob - Create Directories Failed:', reason);
            });
    }
}

module.exports = ProcessJobManager;
