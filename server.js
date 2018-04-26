const express = require('express');
const app = express();
const http = require('http');
const clientServer = http.Server(app);
const clientIO = require('socket.io')(clientServer);

const fs = require("pn/fs");
const dir = require('node-dir');
const path = require('path');
const child_process = require('child_process');

const uuidv1 = require('uuid/v1');
const util = require('util');
const logFile = fs.createWriteStream('log_' +(new Date()).getTime() + '.txt', { flags: 'a' });

const d3 = require('d3');
const jsdom = require('jsdom');
let $;

const ProcessJobManager = require('./ProcessJobManager');
const processJM = new ProcessJobManager();

setInterval(() => {
    console.log('---------------------------------------');
    console.log('ClientSockets: ' + clientSockets.length);
    console.log('ProcessSockets: ' + processJM.getSockets().length);
    console.log('---------------------------------------');

    logFile.write('---------------------------------------');
    logFile.write('ClientSockets: ' + clientSockets.length);
    logFile.write('ProcessSockets: ' + processJM.getSockets().length);
    logFile.write('---------------------------------------');
    // console.log('processSockets inactive: ' + processSockets.inactive.length);
    // console.log('processSockets active: ' + processSockets.active.length);
}, 15 * 60 * 1000);

let clientSockets = [];
let userSessions = {};

clientIO.on('connection', socket => {
    console.log('Client connection!');
    clientSockets.push(socket);
    socket.emit('S_PathSep', path.sep);

    socket
        .on('C_GetUserID', (view) => {
            let userID = uuidv1();
            socket.emit('S_UserID', userID);
            userSessions[userID] = {};
            userSessions[userID][view] = socket;
            socket.view = view;
            socket.userID = userID;
        })
        .on('C_SetUserID', (userID, view) =>{
            if (userSessions[userID] == undefined){
                userSessions[userID] = {};
            }
            userSessions[userID][view] = socket;
            socket.view = view;
            socket.userID = userID;
        })
        .on('C_GetDbs', dirPath => {
            console.log('C_GetDbs', dirPath);

            if (fs.existsSync(dirPath)) {
                fs.readdir(dirPath, (err, list) => {
                    let databases = list.filter((element) => {
                        return element.indexOf('database_basexdb_') > -1;
                    }).sort(databaseSort);
                    socket.emit('S_Dbs', databases);
                });
            }
            else {
                socket.emit('S_Dbs', false);
            }
        })
        .on('C_GetProcessingJobs', () => {
            console.log('C_GetProcessingJobs');

            if (fs.existsSync(processJM.jobDir)) {
                dir.promiseFiles(processJM.jobDir, 'dir', { recursive: false })
                    .then(files => {
                        var processing = [];
                        for (let i = 0; i < files.length; i++) {
                            var exists = fs.existsSync(files[i] + path.sep + 'Completed.txt');
                            if (!exists) {
                                processing.push(files[i]);
                            }
                        }

                        if (processing.length) {
                            processing.sort();
                            processing.push(processJM.jobDir);
                        }
                        socket.emit('S_ProcessingJobs', processing);
                    })
                    .catch(error => console.error(error));

            }
            else {
                socket.emit('S_ProcessingJobs', false);
            }
        })
        .on('C_GetCompletedJobs', () => {
            console.log('C_GetCompletedJobs');

            if (fs.existsSync(processJM.jobDir)) {
                dir.promiseFiles(processJM.jobDir, 'dir', { recursive: false })
                    .then(files => {
                        var completed = [];
                        for (let i = 0; i < files.length; i++) {
                            var exists = fs.existsSync(files[i] + path.sep + 'Completed.txt');
                            if (exists) {
                                completed.push(files[i]);
                            }
                        }

                        if (completed.length) {
                            completed.sort();
                            completed.push(processJM.jobDir);
                        }
                        socket.emit('S_CompletedJobs', completed);
                    })
                    .catch(error => {
                        console.error(error);
                        socket.emit('S_CompletedJobs', false);
                    });

            }
            else {
                socket.emit('S_CompletedJobs', false);
            }
        })
        .on('C_CreateJob', params => {
            // console.log('C_CreateJob:', JSON.stringify(params));
            if (!params.sampleQuery && (!params.queryFile || params.queryFile && !fs.existsSync(params.queryFile))) {
                return socket.emit('S_InvalidQF');
            }

            return processJM.createJob(params.jobName, params.dbDir, params.databases, params.sampleQuery, params.queryFile);
        })
        .on('C_OpenJob', dirPath => {
            console.log('C_OpenJob', dirPath);
            let jobPath = dirPath + path.sep;
            let files = [jobPath + 'Files.json', jobPath + 'Extent.json', jobPath + 'Keys.json', jobPath + 'Units.json', jobPath + 'Regions.json', jobPath + 'Years.json'];
            let valid = fs.existsSync(dirPath);

            for (let i = 0; i < files.length; i++) {
                if (!valid) {
                    break;
                }

                valid &= fs.existsSync(files[i]);
            }

            if (valid) {
                let promises = [];
                for (let i = 0; i < files.length; i++) {
                    promises.push(fs.readFile(files[i], 'utf8'))
                }

                Promise.all(promises)
                    .then(results => {
                        let parsedResults = [];
                        for (let i = 0; i < results.length; i++) {
                            parsedResults.push(JSON.parse(results[i]));
                        }
                        socket.emit('S_OpenedJob', true, parsedResults);
                    })
                    .catch(error => {
                        console.error(error);
                        socket.emit('S_OpenedJob', false, error);
                    });
            }
            else {
                socket.emit('S_OpenedJob', false);
            }
        })
        .on('C_GetClusters3D', (dirPath, k, query, variable, value) => {
            // console.log('C_GetClusters3D', dirPath, k, query, variable, value);
            let jobPath = dirPath + path.sep;
            let feature = query == undefined ? '' : query + path.sep;
            if (query && variable && value) {
                feature += path.sep + variable + path.sep + value + path.sep;
            }
            Promise.all([
                fs.readFile(jobPath + 'ClusterAssignments' + path.sep + feature + 'k' + k + '.json', 'utf8'),
                fs.readFile(jobPath + 'PCAs' + path.sep + feature + 'pca.json', 'utf8'),
                fs.readFile(jobPath + 'Files.json', 'utf8')
            ])
                .then((results) => {
                    var assignments = JSON.parse(results[0]);
                    var pca = JSON.parse(results[1]);
                    var files = JSON.parse(results[2]);

                    var data = [];
                    // Need to find and remove duplicate points and combine names
                    $.each(assignments, function (index, assign) {
                        if (!data[assign]) {
                            data[assign] = { x: [], y: [], z: [], text: [] };
                        }
                        data[assign].x.push(pca[index][0]);
                        data[assign].y.push(pca[index][1]);
                        data[assign].z.push(pca[index][2]);
                        // Commented out until real
                        data[assign].text.push(files[index].split('.json')[0]);
                    });

                    socket.emit('S_Clusters3D', data, query, variable, value);
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_Clusters3D', false);
                });
        })
        .on('C_GetClusters2D', (dirPath, k, query, variable, value) => {
            // console.log('C_GetClusters3D', dirPath, k, query, variable, value);
            let jobPath = dirPath + path.sep;
            let feature = query == undefined ? '' : query + path.sep;
            if (query && variable && value) {
                feature += path.sep + variable + path.sep + value + path.sep;
            }
            Promise.all([
                fs.readFile(jobPath + 'ClusterAssignments' + path.sep + feature + 'k' + k + '.json', 'utf8'),
                fs.readFile(jobPath + 'PCAs' + path.sep + feature + 'pca.json', 'utf8')
            ])
                .then((results) => {

                    socket.emit('S_Clusters2D', JSON.parse(results[0]), JSON.parse(results[1]));
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_Clusters2D', false);
                });
        })
        .on('C_GetMaps', (dirPath, files, yearRange, query, variable, value) => {
            // console.log('C_GetMaps', dirPath, files, yearRange, query, variable, value);
            let jobPath = dirPath + path.sep;
            let feature = query + path.sep;

            let promises = [];
            for (let i = 0; i < files.length; i++) {
                promises.push(fs.readFile(jobPath + 'ScenarioData' + path.sep + files[i], 'utf8'))
            }
            promises.push(fs.readFile(jobPath + 'Extent.json', 'utf8'));

            Promise.all(promises)
                .then((results) => {

                    let parsedResults = [];
                    for (let i = 0; i < results.length; i++) {
                        parsedResults.push(JSON.parse(results[i]));
                    }
                    let extent = parsedResults.pop();

                    var maxMean = null;
                    var minMean = null;
                    var data = [];
                    var years = [];
                    if (variable) {
                        $.each(parsedResults, function (index, scenario) {
                            data[index] = [];
                            years = scenario.data[query].years;

                            $.each(scenario.data[query].data, function (i, d) {
                                if (d[variable] == value) {
                                    data[index].push(d);
                                }
                            });
                        });

                        minMean = d3.mean(extent[query][variable][value].min, function (d, i) {
                            if (yearRange.indexOf(years[i]) > -1) {
                                return d;
                            }
                        });

                        maxMean = d3.mean(extent[query][variable][value].max, function (d, i) {
                            if (yearRange.indexOf(years[i]) > -1) {
                                return d;
                            }
                        });
                    }
                    else {
                        $.each(parsedResults, function (index, scenario) {
                            years = scenario.data[query].years;
                            data.push(scenario.data[query].data);
                        });

                        minMean = d3.mean(extent[query].min, function (d, i) {
                            if (yearRange.indexOf(years[i]) > -1) {
                                return d;
                            }
                        });

                        maxMean = d3.mean(extent[query].max, function (d, i) {
                            if (yearRange.indexOf(years[i]) > -1) {
                                return d;
                            }
                        });
                    }

                    socket.emit('S_Maps', data, [minMean, maxMean], years, query, variable, value);
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_Maps', false);
                });
        })
        .on('C_GetLineCharts', (dirPath, files, yearRange, region, query, variable, value) => {
            // console.log('C_GetLineCharts', dirPath, files, yearRange, region, query, variable, value);
            let jobPath = dirPath + path.sep;
            let feature = query + path.sep;

            let promises = [];
            for (let i = 0; i < files.length; i++) {
                promises.push(fs.readFile(jobPath + 'ScenarioData' + path.sep + files[i], 'utf8'))
            }
            promises.push(fs.readFile(jobPath + 'Extent.json', 'utf8'));

            Promise.all(promises)
                .then((results) => {

                    let parsedResults = [];
                    for (let i = 0; i < results.length; i++) {
                        parsedResults.push(JSON.parse(results[i]));
                    }
                    let extent = parsedResults.pop();

                    let data = [];
                    let max = null;
                    let min = null;
                    let years;
                    let units;

                    // If variable exists then must use value for match
                    // Else just use values based on the query
                    if (variable) {
                        $.each(parsedResults, function (index, scenario) {
                            years = scenario.data[query].years;
                            units = scenario.data[query].units;

                            $.each(scenario.data[query].data, function (i, d) {
                                if ((d.region == region || d.region == undefined) && d[variable] == value) {
                                    data.push(d.value);
                                    return false;
                                }
                            });
                        });

                        min = d3.min(extent[query][variable][value].min);
                        // min = d3.min(extent[query][variable][value].min, function (d, i) {
                        //     if (yearRange.indexOf(years[i]) > -1) {
                        //         return d;
                        //     }
                        // });

                        max = d3.max(extent[query][variable][value].max);
                        // max = d3.max(extent[query][variable][value].max, function (d, i) {
                        //     if (yearRange.indexOf(years[i]) > -1) {
                        //         return d;
                        //     }
                        // });
                    }
                    else {
                        $.each(parsedResults, function (index, scenario) {
                            years = scenario.data[query].years;
                            units = scenario.data[query].units;

                            $.each(scenario.data[query].data, function (i, d) {
                                if (d.region == region || d.region == undefined) {
                                    data.push(d.value);
                                    return false;
                                }
                            });
                        });

                        min = d3.min(extent[query].min);
                        // min = d3.min(extent[query].min, function (d, i) {
                        //     if (yearRange.indexOf(years[i]) > -1) {
                        //         return d;
                        //     }
                        // });

                        max = d3.max(extent[query].max);
                        // max = d3.max(extent[query].max, function (d, i) {
                        //     if (yearRange.indexOf(years[i]) > -1) {
                        //         return d;
                        //     }
                        // });
                    }

                    socket.emit('S_LineCharts', data, [min, max], years, region, units, query, variable, value);
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_LineCharts', false);
                });
        })
        .on('C_GetDendrogram', (dirPath) => {
            console.log('C_GetDendrogram', dirPath);
            let jobPath = dirPath + path.sep;
            fs.readFile(jobPath + 'd3-dendrogram.json', 'utf8')
                .then((results) => {
                    socket.emit('S_Dendrogram', results);
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_Dendrogram', false);
                });
        })
        .on('C_GetParCoorPCA', (dirPath) => {
            console.log('C_GetDendrogram', dirPath);
            let jobPath = dirPath + path.sep;
            Promise.all([fs.readFile(jobPath + 'Files.json', 'utf8'), fs.readFile(jobPath + 'PCAs' + path.sep + 'pca.json', 'utf8')])
                .then((results) => {
                    //Find extent of the pca data and then pass each axis as a scenario array
                    let files = JSON.parse(results[0]);
                    let data = JSON.parse(results[1]);
                    let extent = [];
                    let toSend = [];

                    for (var i = 0; i < 5; i++) {
                        extent[i] = { min: [0], max: [0] };
                        toSend[i] = {};
                    }

                    $.each(data, (vdx, vector) => {
                        $.each(vector, (edx, element) => {
                            if (vdx == 0) {
                                extent[edx].min[0] = element;
                                extent[edx].max[0] = element;
                            }
                            else {
                                extent[edx].min[0] = d3.min([extent[edx].min[0], element]);
                                extent[edx].max[0] = d3.max([extent[edx].max[0], element]);
                            }

                            toSend[edx][files[vdx]] = [element];
                        });
                    });

                    $.each(toSend, (index, data) => {
                        let query = "pca " + index;
                        socket.emit('S_ParCoorAxis_Extent', extent[index], query, undefined, undefined);
                        socket.emit('S_ParCoorAxis_Data', data, undefined, query, undefined, undefined);
                    })
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_ParCoorAxis_Data', undefined, undefined, undefined, undefined, error);
                });
        })
        .on('C_GetParCoorAxis', async (dirPath, files, region, query, variable, value) => {
            console.log('C_GetParCoorAxis', dirPath, files, region, query, variable, value);
            let jobPath = dirPath + path.sep;
            const THRESHOLD = 300;

            try {
                let initFiles = await Promise.all([
                    fs.readFile(jobPath + 'Extent.json', 'utf8'),
                    fs.readFile(jobPath + 'Files.json', 'utf8')
                ]);

                let extent = JSON.parse(initFiles[0]);
                if (variable) {
                    extent = extent[query][variable][value];
                }
                else {
                    extent = extent[query];
                }

                if (extent.regions) {
                    let finalExtent = { min: [], max: [] };
                    for (var i = 0; i < extent.min.length; i++) {
                        finalExtent.min[i] = 0;
                        finalExtent.max[i] = 0;
                    }

                    //Combine regions for final max or multiply by count
                    $.each(extent.regions, (index, region) => {
                        for (var i = 0; i < region.min.length; i++) {
                            finalExtent.min[i] += region.min[i];
                            finalExtent.max[i] += region.max[i];
                        }
                    });

                    extent = finalExtent;
                }

                socket.emit('S_ParCoorAxis_Extent', extent, query, variable, value);


                let allFiles = JSON.parse(initFiles[1]);
                let firstFile = '';
                let sendImmediately = false;

                if (files && files.length) {
                    firstFile = files.pop();
                    allFiles.splice(allFiles.indexOf(firstFile), 1);
                    sendImmediately = true;
                }
                else {
                    firstFile = allFiles.pop();
                }

                firstFile = await fs.readFile(jobPath + 'ScenarioData' + path.sep + firstFile, 'utf8');
                let yearMap = JSON.parse(firstFile).data[query].yearMap;

                socket.emit('S_ParCoorAxis_YearMap', yearMap, query, variable, value);

                let promises = [Promise.resolve(firstFile)];
                let promisesCount = 1;

                if (files && files.length) {
                    for (let i = 0; i < files.length; i++) {
                        promises[promisesCount++] = fs.readFile(jobPath + 'ScenarioData' + path.sep + files[i], 'utf8');

                        if (promisesCount > THRESHOLD) {
                            let results = await Promise.all(promises);
                            let toSend = getDataFromScenarios(results, region, query, variable, value);

                            socket.emit('S_ParCoorAxis_Data', toSend, region, query, variable, value);
                            promises = [];
                            promisesCount = 0;
                        }

                        allFiles.splice(allFiles.indexOf(files[i]), 1);
                    }
                }

                if (promisesCount && sendImmediately) {
                    let results = await Promise.all(promises);
                    let toSend = getDataFromScenarios(results, region, query, variable, value);

                    socket.emit('S_ParCoorAxis_Data', toSend, region, query, variable, value);
                    promises = [];
                    promisesCount = 0;
                }

                for (let i = 0; i < allFiles.length; i++) {
                    // console.log(allFiles[i]);
                    promises[promisesCount++] = fs.readFile(jobPath + 'ScenarioData' + path.sep + allFiles[i], 'utf8');

                    if (promisesCount > THRESHOLD) {
                        let results = await Promise.all(promises);
                        let toSend = getDataFromScenarios(results, region, query, variable, value);

                        socket.emit('S_ParCoorAxis_Data', toSend, region, query, variable, value);
                        promises = [];
                        promisesCount = 0;
                    }
                }

                if (promisesCount) {
                    let results = await Promise.all(promises);
                    let toSend = getDataFromScenarios(results, region, query, variable, value);

                    socket.emit('S_ParCoorAxis_Data', toSend, region, query, variable, value);
                    promises = [];
                    promisesCount = 0;
                }
            }
            catch (error) {
                console.error(error);
                socket.emit('S_ParCoorAxis_Data', region, query, variable, value, error);
            }
        })
        .on('C_GetScatterPlot', async (dirPath, files, queries, variables, values, sctIndex) => {
            console.log('C_GetScatterPlot', dirPath, files, queries, variables, values, sctIndex);
            let jobPath = dirPath + path.sep;

            try {
                let initFiles = await fs.readFile(jobPath + 'Files.json', 'utf8');
                let allFiles = JSON.parse(initFiles);
                let promises = [];

                $.each(allFiles, (fileIndex, file)=>{
                    promises[fileIndex] = fs.readFile(jobPath + 'ScenarioData' + path.sep + file, 'utf8');
                });  
                
                let results = await Promise.all(promises);
                let [toSend, extents] = getScatterPlotData(results, undefined, queries, variables, values);

                socket.emit('S_ScatterPlot_Data', toSend, extents, queries);
            }
            catch (error) {
                console.error(error);
                socket.emit('S_ScatterPlot_Data', undefined, undefined, undefined, undefined, undefined, error);
            }
        })
        .on('C_GetScatterPlotPCA', async (dirPath, sctIndices) => {
            console.log('C_GetScatterPlotPCA', dirPath, sctIndices);
            let jobPath = dirPath + path.sep;
            Promise.all([fs.readFile(jobPath + 'Files.json', 'utf8'), fs.readFile(jobPath + 'PCAs' + path.sep + 'pca.json', 'utf8')])
                .then((results) => {
                    //Find extent of the pca data and then pass each axis as a scenario array
                    let files = JSON.parse(results[0]);
                    let data = JSON.parse(results[1]);
                    let extent = [];
                    let pcaData = [];

                    for (var i = 0; i < 5; i++) {
                        extent[i] = {};
                        pcaData[i] = [];
                    }

                    $.each(data, (vdx, vector) => {
                        $.each(vector, (edx, element) => {
                            if (vdx == 0) {
                                extent[edx].min = element;
                                extent[edx].max = element;
                            }
                            else {
                                extent[edx].min = d3.min([extent[edx].min, element]);
                                extent[edx].max = d3.max([extent[edx].max, element]);
                            }

                            pcaData[edx][vdx] = element;
                        });
                    });

                    let toSend = [];
                    for (var i = 1; i < 5; i++) {
                        let xData = pcaData[0];
                        let yData = pcaData[i];
                        let plotData = [];

                        for (var index = 0; index < xData.length; index++) {
                            plotData[index] = [xData[index], yData[index]];
                        }

                        toSend[i - 1] = plotData;
                    }

                    $.each(toSend, (index, data) => {
                        let yIndex = index + 1;
                        socket.emit('S_ScatterPlot_Data', data, [extent[0], extent[yIndex]], ["pca 0", "pca " + yIndex]);
                    })
                })
                .catch(error => {
                    console.error(error);
                    socket.emit('S_ScatterPlot_Data', undefined, undefined, undefined, undefined, undefined, error);
                });
        })
        .on('C_Echo', params => {
            console.log(params);
            logFile.write(util.format.apply(null, params) + '\n');
        })
        .on('C_Console', params => {
            console.log(params);
            logFile.write(util.format.apply(null, params) + '\n');
        })
        .on('disconnect', () => {
            let index = clientSockets.indexOf(socket);
            if (index == -1) {
                console.log('Strange socket was not in clientSockets');
                logFile.write('Strange socket was not in clientSockets');
            }
            else {
                clientSockets.splice(index, 1);
            }

            delete userSessions[socket.userID][socket.view];

            console.log('Client disconnected!');
            logFile.write('Client disconnected!');
        });
});

function databaseSort(a, b) {
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

function getScatterPlotData(scenarios, region, queries, variables, values){
    let scenarioData = [];
    let extents = [{}, {}];

    $.each(scenarios, (index, result) => {
        let data = JSON.parse(result);
        let yearCount = data.data[queries[0]].years.length;
        let toReturn = [0, 0];
        $.each(queries, (axisIndex, query) => {
            var itemCount = 0;

            if (variables[axisIndex]) {
                if (region) {

                }
                else {
                    $.each(data.data[query].data, (dataIndex, dataElement) => {
                        if (dataElement[variable] == values[axisIndex]) {
                            toReturn[axisIndex] += d3.sum(dataElement.value);
                            itemCount++;
                        }
                    });
                }
            }
            else {
                if (region) {

                }
                else {
                    $.each(data.data[query].data, (dataIndex, dataElement) => {
                        toReturn[axisIndex] += d3.sum(dataElement.value);
                        itemCount++;
                    });
                }
            }

            toReturn[axisIndex] = toReturn[axisIndex] / (itemCount * yearCount);

            if (index == 0){
                extents[axisIndex].min = toReturn[axisIndex];
                extents[axisIndex].max = toReturn[axisIndex];
            }
            else{
                extents[axisIndex].min = d3.min([extents[axisIndex].min, toReturn[axisIndex]]);
                extents[axisIndex].max = d3.max([extents[axisIndex].max, toReturn[axisIndex]]);
            }
        });
       
        scenarioData[scenarioData.length] = toReturn;
    });

    return [scenarioData, extents];
}

function getDataFromScenarios(scenario, region, query, variable, value) {
    let scenarioData = {};

    $.each(scenario, (index, result) => {
        let data = JSON.parse(result);
        let yearCount = data.data[query].years.length;
        let toReturn = new Array(data.data[query].years.length);

        for (var i = 0; i < toReturn.length; i++) {
            toReturn[i] = 0;
        }

        if (variable) {
            if (region) {

            }
            else {
                for (let yearIndex = 0; yearIndex < yearCount; yearIndex++) {
                    $.each(data.data[query].data, (dataIndex, dataElement) => {
                        if (dataElement[variable] == value) {
                            toReturn[yearIndex] += dataElement.value[yearIndex];
                        }
                    });
                }
            }
        }
        else {
            if (region) {

            }
            else {
                for (let yearIndex = 0; yearIndex < yearCount; yearIndex++) {
                    $.each(data.data[query].data, (dataIndex, dataElement) => {
                        toReturn[yearIndex] += dataElement.value[yearIndex];
                    });
                }
            }
        }

        scenarioData[data.scenario.name + '.json'] = toReturn;
    });

    return scenarioData;
}

// app.use(express.static(`file://${__dirname}/webcontent`));
app.use('/data', express.static('data'));
app.use('/jobs', express.static('jobs'));
app.use(express.static('db_webcontent'));

// Start server after jsdom environment is ready
jsdom.env({
    html: '',
    features: { QuerySelector: true }, //you need query selector for D3 to work
    done: function (err, window) {
        if (err) {
            echoError(err);
            return;
        }

        $ = require("jquery")(window);

        clientServer.listen(3080, function () {
            console.log('listening on *:3080');
        });
    }
});


function exitHandler(options, err) {
    console.log('exitHandler', options);

    if (options.cleanup) {
        processJM.cancelJobs();
        console.log('clean');
        logFile.close();

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