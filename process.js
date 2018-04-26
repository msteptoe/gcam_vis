const os = require('os');
const path = require('path');
const fs = require("pn/fs");
const child_process = require('child_process');
const R = require("r-script");
const jsdom = require('jsdom');

const cpusAvailable = os.cpus().length - 1;
const SHORT_JOB_LENGTH = 180;
const LONG_JOB_LENGTH = 300;
const ipAddress = process.argv[2] ? process.argv[2] : "localhost";
const processID = process.argv[3] ? process.argv[3] : "123456";
const jobID = process.argv[4] ? process.argv[4] : "654321";
const jobType = process.argv[5] ? process.argv[5] : "short";
const local = process.argv[6] ? process.argv[6] : false;
const maxCurrentProcessDbs = local ? 1 : 14;

const FIRST_DB_COMPLETED = 'P_FirstDbCompleted';
const JOB_COMPLETED = 'P_JobCompleted';

const JOB_TYPES = {
    R: 'rJobs',
    MAIN: 'mainJobs',
    PCA: 'pcaJobs',
    K: 'kJobs'
}

let $;
let socket;

let obj;
let startTime = new Date();
let fileCount = 0;
let filesCompleted = 0;
let jobName = "test"
let dbDir = "r_scenarios"
let databases = [];
let dataDir = "jobs" + path.sep + "test" + path.sep;
let processing = [];
let processingInfo = [];
let processExiting = false;
let serverExit = false;
let rSetup = false;
let pythonSetup = false;

function setupEnvR() {
    if (!rSetup && !local) {
        process.env.PATH = '/share/apps/R/3.3.3//bin:' + (process.env.PATH == undefined ? '' : process.env.PATH);
        process.env.MANPATH = '/share/apps/R/3.3.3//share/man:' + (process.env.MANPATH == undefined ? '' : process.env.MANPATH);
        process.env.LD_LIBRARY_PATH = '/share/apps/R/3.3.3//lib:' +
            '/share/apps/R/3.3.3//lib64/R/lib:/share/apps/libxml2/2.9.4/lib:' +
            (process.env.LD_LIBRARY_PATH == undefined ? '' : process.env.LD_LIBRARY_PATH) +
            ':/share/apps/R/3.3.3//lib64/R/lib/' + ':/share/apps/R/3.3.3//lib64/R/library/rJava/jri/' +
            ':/share/apps/R/3.3.3//lib64/R/library/rJava/libs/';
        rSetup = true;
    }
    return;
}

function setupEnvPython() {
    if (!pythonSetup && !local) {
        process.env.PYTHONHOME = '/share/apps/python/anaconda2.7';
        process.env.HDF5_DISABLE_VERSION_CHECK = 2;
        process.env.PATH = '/share/apps/python/anaconda2.7/bin:' + (process.env.PATH == undefined ? '' : process.env.PATH);
        process.env.MANPATH = '/share/apps/python/anaconda2.7/man:' + (process.env.MANPATH == undefined ? '' : process.env.MANPATH);
        process.env.LD_LIBRARY_PATH = (process.env.LD_LIBRARY_PATH == undefined ? '' : process.env.LD_LIBRARY_PATH) +
            ':/usr/lib64/:/share/apps/python/anaconda2.7/lib';
        pythonSetup = true;
    }
    return;
}

jsdom.env({
    html: '',
    features: { QuerySelector: true }, //you need query selector for D3 to work
    done: function (err, window) {
        if (err) {
            echoError(err);
            return;
        }

        $ = require("jquery")(window);

        socket = require('socket.io-client')(
            'http://' + ipAddress + ':3081',
            {
                query: {
                    jobID: jobID,
                    processID: processID,
                    jobLength: jobType == "short" ? SHORT_JOB_LENGTH : LONG_JOB_LENGTH,
                    jobType: jobType
                }
            }
        );

        echo(cpusAvailable + ', ' + ipAddress + ' ' + processID + ' ' + jobID + ' ' + jobType);

        socket
            .on('connect', () => {
                echo('Process got connect!');
            })
            .on('S_DataDirectory', directory => dataDir = directory)
            .on('S_ProcessDatabase', (dbDir, dataDir, database, jobsScheduled, firstScenario, sampleQuery, queryFile) => {

                // echo(dbDir, dataDir, database, jobsScheduled, firstScenario);
                // echo('S_ProcessDatabase: ' + database);

                processing.push('S_ProcessDatabase');
                processingInfo.push({ type: JOB_TYPES.R, value: database });

                if (!dbDir || !dataDir || !database) {
                    echo("Missing params");
                    process.exit();
                }

                if (firstScenario) {
                    startTime = new Date();
                    filesCompleted = 0;
                    echo('S_ProcessDatabase First Job: ' + database);
                }
                else if (jobsScheduled > 0 && processing.length < maxCurrentProcessDbs) {
                    setTimeout(() => {
                        // echo('timeout: P_GetJob');
                        socket.emit('P_GetJob', processing);
                    }, 8000);
                }
                echo('S_ProcessDatabase Start Job: ' + database);
                processDatabase(dbDir, dataDir, database, jobsScheduled, firstScenario, sampleQuery, queryFile);
            })
            .on('S_Agglo', (dataDir) => {
                processing.push('S_Agglo');
                processingInfo.push({ type: JOB_TYPES.MAIN, value: 'S_Agglo' });
                aggloCluster(dataDir);
            })
            .on('S_Extent', (dataDir) => {
                processing.push('S_Extent');
                processingInfo.push({ type: JOB_TYPES.MAIN, value: 'S_Extent' });
                extent(dataDir);
            })
            .on('S_KMeans_SV', (dataDir) => {
                processing.push('S_KMeans_SV');
                processingInfo.push({ type: JOB_TYPES.MAIN, value: 'S_KMeans_SV' });
                kmeans(dataDir, path.sep, 'ScenarioVectors');
            })
            .on('S_PCA_SV', (dataDir) => {
                processing.push('S_PCA_SV');
                processingInfo.push({ type: JOB_TYPES.MAIN, value: 'S_PCA_SV' });
                pca(dataDir, path.sep, 'ScenarioVectors');
            })
            .on('S_KMeans', (dataDir, query, kJobsScheduled, pcaJobsScheduled) => {
                processing.push('S_KMeans');
                processingInfo.push({ type: JOB_TYPES.K, value: query });
                if (processing.length == 1 && pcaJobsScheduled > 0) {
                    socket.emit('P_GetJob', processing);
                }
                kmeans(dataDir, query, 'QueryVectors');
            })
            .on('S_PCA', (dataDir, query, kJobsScheduled, pcaJobsScheduled) => {
                processing.push('S_PCA');
                processingInfo.push({ type: JOB_TYPES.PCA, value: query });
                if (processing.length == 1 && (kJobsScheduled > 0 || pcaJobsScheduled > 0)) {
                    socket.emit('P_GetJob', processing);
                }
                pca(dataDir, query, 'QueryVectors');
            })
            .on('S_Exit', databases => {
                echo('exiting!');
                serverExit = true;
                process.exit();
            });
    }
});

function echo(message) {
    if (socket) {
        socket.emit('P_Console', message);
        // if (local) {
        console.log(message);
        // }
    }
}

function echoError(message) {
    if (socket) {
        socket.emit('P_Error', message);
        // if (local) {
        console.error(message);
        // }
    }
}

function jobComplete(event, type, value) {
    $.each(processingInfo, (index, info) => {
        if (info.type == type && info.value == value) {
            processingInfo.splice(index, 1);
            processing.splice(index, 1);

            return false;
        }
    })
    socket.emit(event, type, value, processing);
}

function invalidDatabase(database) {
    $.each(processingInfo, (index, info) => {
        if (info.value == database) {
            processingInfo.splice(index, 1);
            processing.splice(index, 1);

            return false;
        }
    })
    socket.emit('P_InvalidDb', database);
    socket.emit('P_GetJob', processing);
}


function processDatabase(dbDir, dataDir, database, jobsScheduled, firstScenario, sampleQuery, queryFile) {
    setupEnvR();

    let startProcess = new Date();

    const rScript = child_process.spawn(
        'Rscript',
        [
            'spawnDynamicExport.R',
            dbDir,
            database,
            dataDir,
            'db_' + database.split('basexdb_')[1],
            firstScenario ? firstScenario : false,
            sampleQuery,
            queryFile
        ]
    )

    let error = false;
    let errMsg = '';

    rScript.stdout.on('data', (data) => {
        echo(data.toString());
    });

    rScript.stderr.on('data', (data) => {
        if (data) {
            let message = data.toString();
            if (
                message.indexOf('Scenario Reference does not exist in this project.') == -1 &&
                message.indexOf('Loading required package: methods') == -1 &&
                message.indexOf('bxerr:BASX0000') == -1 &&
                message.indexOf('The command line is too long.') == -1
            ) {
                echoError(message);
            }
            if (message.toLowerCase().indexOf('error') > -1) {
                error = true;
                errMsg = message;
            }
        }
    });

    rScript.on('close', (code) => {
        if (error) {
            echoError(errMsg);
            echoError('Invalid db: ' + database);
            fs.writeFileSync(dataDir + 'Errors' + path.sep + 'Invalid-' + database + '.json', JSON.stringify([errMsg, dbDir, dataDir, database, jobsScheduled, firstScenario, sampleQuery, queryFile]), 'utf8');
            invalidDatabase(database);
        }
        else {
            filesCompleted++;

            if (firstScenario) {
                const Keys = JSON.parse(fs.readFileSync(dataDir + 'Keys.json', 'utf8'));
                let paths = [];
                $.each(Keys, (query, variableObject) => {
                    if (variableObject.length !== 0) {
                        $.each(variableObject, (variable, valueArray) => {
                            $.each(valueArray, (index, variableValue) => {
                                paths.push(query + path.sep + variable + path.sep + variableValue + path.sep);
                            });
                        });
                    }
                    else {
                        paths.push(query + path.sep);
                    }
                });

                fs.writeFileSync(dataDir + 'Paths.json', JSON.stringify(paths), 'utf8');
                jobComplete(FIRST_DB_COMPLETED, JOB_TYPES.R, database);
            }
            else {
                jobComplete(JOB_COMPLETED, JOB_TYPES.R, database);
            }

            echo('S_ProcessDatabase completed in ' + ((new Date()) - startProcess) / 1000 + ' seconds, ' + jobsScheduled + ' remaining');
        }
    });
}


function extent(dataDir) {
    let startNodeP = new Date();
    echo('extent start');
    const nodeP = child_process.spawn('node', ['Extent.js', dataDir]);

    nodeP.on('close', (code) => {
        if (processExiting) {
            echo(`extent exiting`);
        } else if (code !== 0) {
            echo(`extent process exited with code ${code}`);
        }
        else {
            echo('extent completed in ' + ((new Date()) - startNodeP) / 60000 + ' minutes');
            jobComplete(JOB_COMPLETED, JOB_TYPES.MAIN, processing[0]);
        }
    });

    nodeP.stdout.on('data', (data) => {

    });

    nodeP.stderr.on('data', (data) => {
        // echo(`stderr: ${data}`);
        let str = data.toString().split('\n')[0];
        echo(`stderr: ${str}`);
    });
}

function aggloCluster(dataDir) {
    setupEnvPython();

    let startPython = new Date();
    echo('aggloCluster start');
    const python = child_process.spawn('python', ['python' + path.sep + 'agglo_cluster.py', dataDir]);

    python.on('close', (code) => {
        if (processExiting) {
            echo(`aggloCluster exiting`);
        } else if (code !== 0) {
            echo(`aggloCluster process exited with code ${code}`);
        }
        else {
            echo('aggloCluster completed in ' + ((new Date()) - startPython) / 60000 + ' minutes');
            jobComplete(JOB_COMPLETED, JOB_TYPES.MAIN, processing[0]);
        }
    });

    python.stdout.on('data', (data) => {

    });

    python.stderr.on('data', (data) => {
        // echo(`stderr: ${data}`);
        let str = data.toString().split('\n')[0];
        echo(`stderr: ${str}`);
    });
}

function kmeans(dataDir, query, dataType) {
    setupEnvPython();

    let startPython = new Date();
    if (query == path.sep) {
        echo('kmeans start: ' + query + ', ' + dataType);
    }

    let args = ['python' + path.sep + 'mini_kmeans.py', dataDir, query, dataType];
    const python = child_process.spawn('python', args);

    python.on('close', (code) => {
        if (processExiting) {
            echo(`kmeans exiting`);
        } else if (code !== 0) {
            echo(`kmeans process exited with code ${code}`);
        }
        else {
            let type = JOB_TYPES.K;
            let value = query;
            if (query == path.sep) {
                type = JOB_TYPES.MAIN;
                value = processing[0];

                echo('S_KMeans_SV completed in ' + ((new Date()) - startPython) / 60000 + ' minutes');
            }

            jobComplete(JOB_COMPLETED, type, value);
        }
    });

    python.stdout.on('data', (data) => {

    });

    python.stderr.on('data', (data) => {
        // echo(`stderr: ${data}`);
        let str = data.toString().split('\n')[0];
        echo(`stderr: ${str}`);
    });
}

function pca(dataDir, query, dataType) {
    setupEnvPython();

    let startPython = new Date();
    if (query == path.sep) {
        echo('pca start: ' + query + ', ' + dataType);
    }

    let args = ['python' + path.sep + 'pca.py', dataDir, query, dataType];
    const python = child_process.spawn('python', args);

    python.on('close', (code) => {
        if (processExiting) {
            echo(`pca exiting`);
        } else if (code !== 0) {
            echo(`pca process exited with code ${code}`);
        }
        else {
            let type = JOB_TYPES.PCA;
            let value = query;
            if (query == path.sep) {
                type = JOB_TYPES.MAIN;
                value = processing[0];

                echo('S_PCA_SV completed in ' + ((new Date()) - startPython) / 60000 + ' minutes');
            }

            jobComplete(JOB_COMPLETED, type, value);
        }
    });

    python.stdout.on('data', (data) => {

    });

    python.stderr.on('data', (data) => {
        // echo(`stderr: ${data}`);
        let str = data.toString().split('\n')[0];
        echo(`stderr: ${str}`);
    });
}


function exitHandler(options, err) {
    echo('exitHandler - options: ' + JSON.stringify(options) + ', error: ' + JSON.stringify(err));

    if (options.cleanup && !serverExit) {
        processExiting = true;

        fs.writeFileSync(dataDir + 'Errors' + path.sep + processID + '_' + jobID + '-Exit.json', JSON.stringify([err, processing, processingInfo]), 'utf8');

        if (processingInfo.length > 0) {
            socket.emit('P_Exit', processing, processingInfo);
            processing = [];
            processingInfo = [];
        }

        echo('clean');

        // Necessary to keep socket open to send exit information.
        setTimeout(() => {
            if (err) console.log(err.stack);
            if (options.exit) process.exit();
        }, 1000);
    }
    else {
        if (err) console.log(err.stack);
        if (options.exit) process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { exiting: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true, cleanup: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true, cleanup: true }));