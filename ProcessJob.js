"use strict"

const fs = require("pn/fs");
const path = require('path');

class ProcessJob {

    constructor(id, jobName, processJobManager, dbDir, dataDir, databases, sampleQuery, queryFile) {
        this.id = id;
        this.jobName = jobName;
        this.processJobManager = processJobManager;
        this.dbDir = dbDir;
        this.dataDir = dataDir;
        this.databases = databases;
        this.sampleQuery = sampleQuery;
        this.queryFile = queryFile;

        this.sockets = [];
        this.startTimes = [];
        this.jobCount = 0;
        this.jobsCompleted = 0;

        this.startTime;

        this.rJobs = {
            scheduled: [],
            processing: [],
            completed: [],
            invalid: []
        }
        this.mainJobs = {
            scheduled: ['S_Extent', 'S_Agglo', 'S_PCA_SV', 'S_KMeans_SV'],
            processing: [],
            completed: []
        }
        this.kJobs = {
            scheduled: [],
            processing: [],
            completed: []
        }
        this.pcaJobs = {
            scheduled: [],
            processing: [],
            completed: []
        }

        databases.forEach((element, index) => {
            this.rJobs.scheduled.push(element);
        }, this);
    }

    fileSort(a, b) {
        var aNum = a.match(/(\d+)/g);
        var bNum = b.match(/(\d+)/g);
        if (aNum != null && bNum != null) {
            return (Number(aNum[0]) - Number((bNum[0])));
        }
        else if (aNum == null && bNum == null) {
            var aUpper = a.toUpperCase();
            var bUpper = b.toUpperCase();

            if (aUpper < bUpper) {
                return -1;
            }
            if (aUpper > bUpper) {
                return 1;
            }

            return 0;
        }
        else if (aNum == null) {
            return -1;
        }
        else {
            return 1;
        }
    }

    printJobs(processing) {
        console.log('---------------------------------------');
        console.log(
            JSON.stringify(this.rJobs),
            JSON.stringify(this.mainJobs),
            JSON.stringify(this.kJobs.processing),
            JSON.stringify(this.pcaJobs.processing),
            JSON.stringify(processing)
        );
        console.log('---------------------------------------');
    }

    printJobCounts() {
        console.log('---------------------------------------');
        console.log(
            'rJobs (s, p, c): (' + this.rJobs.scheduled.length + ', ' +
            this.rJobs.processing.length + ', ' + this.rJobs.completed.length + ')'
        );
        console.log(
            'mainJobs (s, p, c): (' + this.mainJobs.scheduled.length + ', ' +
            this.mainJobs.processing.length + ', ' + this.mainJobs.completed.length + ')'
        );
        console.log(
            'kJobs (s, p, c): (' + this.kJobs.scheduled.length + ', ' +
            this.kJobs.processing.length + ', ' + this.kJobs.completed.length + ')'
        );
        console.log(
            'pcaJobs (s, p, c): (' + this.pcaJobs.scheduled.length + ', ' +
            this.pcaJobs.processing.length + ', ' + this.pcaJobs.completed.length + ')'
        );
        console.log('Time elapsed (' + this.sockets.length + ' sockets): ' + (((new Date()) - this.startTime) / 60000).toFixed(4) + ' minutes')
        console.log('---------------------------------------');
    }

    isComplete() {
        if (
            this.rJobs.scheduled.length == 0 && this.mainJobs.scheduled.length == 0 &&
            this.kJobs.scheduled.length == 0 && this.pcaJobs.scheduled.length == 0 &&
            this.rJobs.processing.length == 0 && this.mainJobs.processing.length == 0 &&
            this.kJobs.processing.length == 0 && this.pcaJobs.processing.length == 0
        ) {
            return true;
        }
        return false;
    }

    addSocket(socket) {
        let self = this;

        socket
            .on('disconnect', () => {
                console.log('Process disconnected!');
                self.removeSocket(socket);
            })
            .on('P_Console', message => {
                let timeElapsed = (((new Date()) - self.startTime) / 60000).toFixed(4) + ' mins';
                console.log('P_Console (' + self.jobName + ', ' + socket.jobID + ', S-' + this.sockets.length + ') ' + timeElapsed + ': ', message);
            })
            .on('P_Error', message => {
                let timeElapsed = (((new Date()) - self.startTime) / 60000).toFixed(4) + ' mins';
                console.log('P_Error (' + self.jobName + ', ' + socket.jobID + ', S-' + this.sockets.length + ') ' + timeElapsed + ': ', message);
            })
            .on('P_GetJob', processing => {
                // If there are jobs in the queue then pass the job                
                self.getJob(socket, processing);
            })
            .on('P_ReturnJob', (processing, processingInfo) => {            
                // Return job if not enough time to process it
            })
            .on('P_JobCompleted', (jobType, jobValue, processing) => {
                let index = self[jobType].processing.indexOf(jobValue);
                if (index == -1) {
                    console.log('Strange cannot find:', jobType, jobValue);
                }
                else {
                    self[jobType].processing.splice(index, 1);
                    self[jobType].completed.push(jobValue);
                    self.jobsCompleted++;
                }

                // self.printJobs(processing);
                if (self.jobsCompleted % 50 == 0)
                    self.printJobCounts();
                // if(jobType == 'rJobs')
                //     self.printJobCounts();
                // else if(self.jobsCompleted % 150 == 0)
                //     self.printJobCounts();

                if (jobType == 'rJobs' && self[jobType].processing.length == 0 && self[jobType].scheduled.length == 0) {
                    console.log('Inside rJobs completion');
                    if (self.databases.length != self[jobType].completed.length) {
                        var files = [];
                        for (var i = 0; i < self[jobType].completed.length; i++) {
                            files.push("db_" + self[jobType].completed[i].split('basexdb_')[1] + '.json');
                        }
                        console.log('Before fileSort');
                        files.sort(self.fileSort);
                        console.log('Before writeFileSync Files.json');
                        fs.writeFileSync(self.dataDir + 'Files.json', JSON.stringify(files));
                    }
                    console.log('After updating Files.json');

                    self.sockets.forEach(socket => {
                        self.getJob(socket, []);
                    }, this);

                    let info = 'ProcessJob(' + self.id + '): Intertactive after ' + (((new Date()) - self.startTime) / 60000).toFixed(4) + ' minutes';
                    console.log(info);
                    fs.writeFile(self.dataDir + 'Intertactive.txt', info);

                    if (self[jobType].invalid.length) {
                        fs.writeFile(self.dataDir + 'InvalidDbs.json', JSON.stringify(self[jobType].invalid));
                    }
                }
                else {
                    self.getJob(socket, processing);
                }
            })
            .on('P_FirstDbCompleted', (jobType, jobValue, processing) => {
                // 1st Process complete, ready to begin concurrent processing
                let job = self.rJobs.processing.shift();
                self[jobType].completed.push(job);
                self.jobsCompleted++;

                self.printJobCounts();
                // self.printJobs([]);
                self.sockets.forEach(socket => {
                    self.getJob(socket, []);
                }, this);

                fs.readFile(self.dataDir + 'Paths.json', 'utf8')
                    .then((Paths) => {
                        self.pcaJobs.scheduled = JSON.parse(Paths);
                        self.kJobs.scheduled = JSON.parse(Paths);
                    })
                    .catch(err => {
                        console.log('Error:', self.dataDir + 'Paths.json', err)
                    });
            })
            .on('P_InvalidDb', database => {
                self.rJobs.invalid.push(database);

                let index = self.rJobs.processing.indexOf(database);
                if (index == -1) {
                    console.log('Strange cannot find:', 'rJobs', database);
                }
                else {
                    self.rJobs.processing.splice(index, 1);
                }

                console.log('Added to invalid stack: ' + database);
            })
            .on('P_Exit', (processing, processingInfo) => {
                console.log('P_Exit (' + self.jobName + ', ' + socket.jobID + ', S-' + self.sockets.length + ')', processing, JSON.stringify(processingInfo));
                // If there are jobs in the queue then pass the job
                for (let index = 0; index < processingInfo.length; index++) {
                    let info = processingInfo[index];
                    self[info.type].scheduled.unshift(info.value);

                    let jobIndex = self[info.type].processing.indexOf(info.value);
                    if (index == -1) {
                        console.log('Strange cannot find:', info.type, info.value);
                    }
                    else {
                        self[info.type].processing.splice(jobIndex, 1);
                    }

                    console.log('Added back to the scheduled stack: ' + info.type + ', ' + info.value);
                }
            });

        socket.emit('S_DataDirectory', this.dataDir);
        this.sockets.push(socket);
        socket.startTime = new Date();
        this.startTimes.push(socket.startTime);
        self.getJob(socket, []);
    }

    removeSocket(socket) {
        let self = this;
        let index = this.sockets.indexOf(socket);
        if (index == -1) {
            console.log('Socket was already removed!');
        }
        else {
            console.log('Socket removed!');
            this.sockets.splice(index, 1);
            this.startTimes.splice(index, 1);
        }

        if (this.sockets.length == 0) {
            if (this.isComplete()) {
                let info = 'ProcessJob(' + this.id + '): Completed in ' + ((new Date()) - this.startTime) / 60000 + ' minutes';
                console.log(info);
                fs.writeFile(this.dataDir + 'Completed.txt', info).then(() => {
                    self.processJobManager.removeProcessJob(self.id);
                });
            }
            else {
                self.printJobCounts();
                console.log('---------------------------------------');
                console.log('lost all sockets!!!');
                console.log('---------------------------------------');
                Promise.all([
                    fs.writeFile(this.dataDir + 'rJobs.json', JSON.stringify(this.rJobs)),
                    fs.writeFile(this.dataDir + 'mainJobs.json', JSON.stringify(this.mainJobs)),
                    fs.writeFile(this.dataDir + 'kJobs.json', JSON.stringify(this.kJobs)),
                    fs.writeFile(this.dataDir + 'pcaJobs.json', JSON.stringify(this.pcaJobs))
                ]).then(() => process.exit());
            }
        }
    }

    terminateSocket(socket) {
        socket.emit('S_Exit');
        this.removeSocket(socket);
    }

    getJob(socket, processing) {
        // Check if there is enough time left on the socket, if not then terminate and schedule a new job
        let pjElapsed = (((new Date()) - this.startTime) / 60000).toFixed(4) + ' mins';
        let timeElapsed = (((new Date()) - socket.startTime) / 60000).toFixed(4) + ' mins';
        let timeRemaining = (socket.jobLength - (((new Date()) - socket.startTime) / 60000)).toFixed(4)  + ' mins';
        console.log('ProcessJob(' + this.jobName + ', ' + socket.jobID + ', S-' + this.sockets.length + '): Elapsed(', pjElapsed, '). Socket/Process: Elapsed(', timeElapsed, '), Remaining(', timeRemaining, ')');

        // If R jobs are avail then schedule them
        if (this.rJobs.scheduled.length > 0) {

            if (this.rJobs.completed.length == 0) {

                // If this is the first R job then schedule it
                if (this.rJobs.processing.length == 0) {
                    let database = this.rJobs.scheduled.shift();
                    this.rJobs.processing.push(database);
                    socket.emit('S_ProcessDatabase', this.dbDir, this.dataDir, database, this.rJobs.scheduled.length, true, this.sampleQuery, this.queryFile);
                    return true;
                }
                else {
                    console.log('Process waiting for inital R process to finish!')
                    return false;
                }
            }
            else {
                let database = this.rJobs.scheduled.shift();
                this.rJobs.processing.push(database);
                socket.emit('S_ProcessDatabase', this.dbDir, this.dataDir, database, this.rJobs.scheduled.length, false, this.sampleQuery, this.queryFile);
                return true;
            }
        }
        else if (this.rJobs.processing.length > 0) {
            console.log('Process waiting for all R processes to finish!');
            return false;
        }
        else if (this.mainJobs.scheduled.length > 0) {
            if (processing.length != 0) return false;

            let jobType = this.mainJobs.scheduled.shift();
            this.mainJobs.processing.push(jobType);
            socket.emit(jobType, this.dataDir);
            return true;
        }
        else if (
            this.kJobs.scheduled.length > 0 &&
            (processing.length == 0 || processing.length == 1 && processing[0] == 'S_PCA')
        ) {
            let path = this.kJobs.scheduled.shift();
            this.kJobs.processing.push(path);
            socket.emit('S_KMeans', this.dataDir, path, this.kJobs.scheduled.length, this.pcaJobs.scheduled.length);
            return true;
        }
        else if (
            this.pcaJobs.scheduled.length > 0 &&
            (processing.length == 0 || (processing.length == 1 && processing[0] == 'S_KMeans') || (processing.length == 1 && this.kJobs.scheduled.length == 0))
        ) {
            let path = this.pcaJobs.scheduled.shift();
            this.pcaJobs.processing.push(path);
            socket.emit('S_PCA', this.dataDir, path, this.kJobs.scheduled.length, this.pcaJobs.scheduled.length);
            return true;
        }
        else if (
            this.rJobs.scheduled.length == 0 && this.mainJobs.scheduled.length == 0 &&
            this.kJobs.scheduled.length == 0 && this.pcaJobs.scheduled.length == 0
        ) {
            console.log('All jobs are complete || processing!');
            this.terminateSocket(socket);
            return false;
        }

        console.log('Process is unable to be given a job.')
        return false;
    }
}

module.exports = ProcessJob;
