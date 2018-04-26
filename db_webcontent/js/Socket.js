var FILES = {};
var EXTENT = {};
var KEYS = {};
var UNITS = {};
var JOB_PATH = '';
var PATH_SEP = '/';
var COLOR = d3.scale.category10();

var INPUTS = ["Pop/GDP", "Ind/Trans/Building", "AGLU", "Energy", "CCS", "Fossil Fuels", "LT Tax"];

function Socket() {
    var self = this;
    this.jobPath = '';
    this.userID = localStorage.getItem("Socket_UserID");
    this.view = window.location.pathname.indexOf('Analyze') ? 'Analyze' : 'Report';
    this.dataToSend = [];
    this.socket = io();
    this.socket
        .on('connect', function () {
            if (self.userID == undefined) {
                self.getUserID(self.view);
            }
            else {
                self.setUserID(self.userID, self.view);
            }
        })
        .on('S_UserID', function (userID) {
            self.userID = userID;
            localStorage.setItem("Socket_UserID", userID);
        })
        .on('S_DataRequest', function (requestor) {
            if (self.dataToSend.length) {
                $.each(dataToSend, function (index, data) {
                    self.sendData(self.view, requestor, data);
                });
                console.log('Data sent: ' + self.dataToSend.length);
                self.dataToSend = [];
            }
        })
        .on('S_DataResponse', function (sender, results) {
            if (sender && results) {
                FILES = results[0];
                EXTENT = results[1];
                KEYS = results[2];
                UNITS = results[3];
                REGIONS = results[4];
                YEARS = results[5];
                self.jobPath = results[6];

                progressLoadingBar();

                $.each(KEYS, function (query, keys) {
                    clusterQueries.push(query);
                    clusterKeys[query] = ["data"];
                    queryKeys[query] = keys;
                });
                clusterMetrics = UNITS;
                state.years = YEARS;
                state.regions = REGIONS;

                initControls();
            }
        })
        .on('S_PathSep', function (sep) {
            // console.log('S_PathSep:', sep);
            PATH_SEP = sep;
        })
        .on('S_Dbs', function (result) {
            // console.log('S_Dbs:', result);
            if (result) {
                PATH_SEP = result.pop();

                state.subDirs = result;
                buildDatabaseSelection(result);
                var defaultJobFormat = d3.time.format("%Y_%m_%dT%H_%M_%SZ");
                $('#jobName').val(defaultJobFormat(new Date()));
                showDialog('dbs');
            }
            else {
                alert('Please try again. Either the specified directory does not contain databases or it no longer exist.');
                showDialog('newJob');
            }
        })
        .on('S_InvalidQF', function (result) {
            alert('Please try again. The specified query file does not exist.');
            showDialog('dbs');
        })
        .on('S_CompletedJobs', function (result) {
            // console.log('S_CompletedJobs:', result);
            if (result) {
                if (result.length) {
                    state.jobDir = result.pop();
                    state.completedJobs = result;
                    buildCompletedJobRadio(result);
                    openDialog('completedJobs');
                }
                else
                    alert('There are no completed jobs.')
            }
            else {
                alert('The job directory cannot be found.');
                closeDialog('completedJobs');
            }
        })
        .on('S_ProcessingJobs', function (result) {
            // console.log('S_ProcessingJobs:', result);
            if (result) {
                if (result.length) {
                    state.jobDir = result.pop();
                    state.processingJobs = result;
                    buildProcessingJobRadio(result);
                    openDialog('processingJobs');
                }
                else
                    alert('There are no processing jobs.')
            }
            else {
                alert('The job directory cannot be found.');
            }
        })
        .on('S_OpenedJob', function (valid, results) {
            // console.log('S_OpenedJob:', valid);
            if (valid) {
                FILES = results[0];
                EXTENT = results[1];
                KEYS = results[2];
                UNITS = results[3];
                REGIONS = results[4];
                YEARS = results[5];

                progressLoadingBar();

                $.each(KEYS, function (query, keys) {
                    clusterQueries.push(query);
                    clusterKeys[query] = ["data"];
                    queryKeys[query] = keys;
                });
                clusterMetrics = UNITS;
                state.years = YEARS;
                state.regions = REGIONS;

                initControls();
            }
            else {
                if (results) {
                    alert('Please try again.');
                    // console.log(results);
                }
                else {
                    alert('Invalid job.')
                }
                hideLoading();
            }
        })
        .on('S_Clusters3D', function (data, query, variable, value) {
            // console.log('S_Clusters3D:', data, query, variable, value);
            if (data) {
                // console.log()
                Cluster(data, query, variable, value);
            }
            else {
                alert('Please try again.');
            }
        })
        .on('S_Clusters2D', function (kmeans, pca) {
            // console.log('S_Clusters3D:', data, query, variable, value);
            if (kmeans && pca) {
                // console.log()
                ClusterPlot(kmeans, pca);
                state.clu.kmeans = kmeans;
                parCoorPlot.plot();
            }
            else {
                alert('Please try again.');
            }
        })
        .on('S_Maps', function (data, extent, years, query, variable, value) {
            // console.log('S_Maps:', data, extent, years, query, variable, value);
            if (data) {
                // console.log()
                if (state.view == 'map') {
                    LeafletMaps(data, extent, years, query, variable, value);
                }
            }
            else {
                alert('Please try again.');
            }
        })
        .on('S_LineCharts', function (data, extent, years, region, units, query, variable, value) {
            // console.log('S_LineCharts:', data, extent, years, region, units, query, variable, value);
            if (data) {
                // console.log()
                if (state.view == 'lc') {
                    LineCharts(data, extent, years, region, units, query, variable, value);
                }
            }
            else {
                alert('Please try again.');
            }
        })
        .on('S_Dendrogram', function (data) {
            // console.log('S_Dendrogram:', data);
            if (data) {
                zDendrogram(JSON.parse(data));
                hideLoading();
            }
            else {
                alert('Please try again.');
            }
        })
        .on('S_ParCoorAxis_Extent', function (data, query, variable, value) {
            // console.log('S_ParCoorAxis_Extent:', data, query, variable, value);
            if (data) {
                var axis = variable == undefined ? query : query + " " + variable + " " + value;
                parCoorPlot.addExtent(data, axis);
            }
            else {
                alert('Please try again.');
                // console.log("S_ParCoorAxis_Extent Error:", query);
            }
        })
        .on('S_ParCoorAxis_YearMap', function (data, query, variable, value) {
            // console.log('S_ParCoorAxis_YearMap:', data, query, variable, value);
            if (data) {
                var axis = variable == undefined ? query : query + " " + variable + " " + value;
                parCoorPlot.addYearMap(data, axis);
            }
            else {
                alert('Please try again.');
                // console.log("S_ParCoorAxis_YearMap Error:", query);
            }
        })
        .on('S_ParCoorAxis_Data', function (data, region, query, variable, value, error) {
            // console.log('S_ParCoorAxis_Data:', data);
            if (error == undefined) {
                var axis = variable == undefined ? query : query + " " + variable + " " + value;
                parCoorPlot.addData(data, axis);
            }
            else {
                alert('Please try again.');
                var axis = variable == undefined ? query : query + " " + variable + " " + value;
                parCoorPlot.removeAxis(axis);
                // console.log("S_ParCoorAxis_Data Error:", error);
            }
        })
        .on('S_ScatterPlot_Data', function (data, extents, queries, variables, values, error) {
            // console.log('S_ScatterPlot_Data:', data, extents, queries);
            if (error == undefined) {
                controller.addScatterPlot(data, extents, queries, variables, values);
            }
            else {
                alert('Please try again.');

                // console.log("S_ScatterPlot_Data Error:", error);
            }
        })
}

Socket.prototype.getUserID = function () {
    // console.log('C_GetUserID:', path);
    this.socket.emit('C_GetUserID');
};

Socket.prototype.setUserID = function (userID) {
    // console.log('C_GetUserID:', path);
    this.socket.emit('C_SetUserID', userID);
};

Socket.prototype.getDatabases = function (path) {
    // console.log('C_GetDbs:', path);
    this.socket.emit('C_GetDbs', path);
};

Socket.prototype.createJob = function (jobName, dbDir, databases, sampleQuery, queryFile) {
    // console.log('C_CreateJob:', databases);
    this.socket.emit('C_CreateJob', { jobName: jobName, dbDir: dbDir, databases: databases, sampleQuery: sampleQuery, queryFile: queryFile });
}

Socket.prototype.getCompletedJobs = function () {
    // console.log('C_GetCompletedJobs');
    this.socket.emit('C_GetCompletedJobs');
}

Socket.prototype.getProcessingJobs = function () {
    // console.log('C_GetProcessingJobs');
    this.socket.emit('C_GetProcessingJobs');
}

Socket.prototype.openJob = function (path) {
    // console.log('C_OpenJob:', path);
    this.jobPath = path;
    this.socket.emit('C_OpenJob', path);
    showLoading(true);
}

Socket.prototype.getClusters3D = function (k, query, variable, value) {
    // console.log('C_GetClusters3D:', this.jobPath, k, query, variable, value);
    this.socket.emit('C_GetClusters3D', this.jobPath, k, query, variable, value);
}

Socket.prototype.getClusters2D = function (k, query, variable, value) {
    // console.log('C_GetClusters2D:', this.jobPath, k, query, variable, value);
    this.socket.emit('C_GetClusters2D', this.jobPath, k, query, variable, value);
}

Socket.prototype.getMaps = function (files, years, query, variable, value) {
    // console.log('C_GetMaps:', this.jobPath, files, years, query, variable, value);
    this.socket.emit('C_GetMaps', this.jobPath, files, years, query, variable, value);
}

Socket.prototype.getLineCharts = function (files, years, region, query, variable, value) {
    // console.log('C_GetLineCharts:', this.jobPath, files, years, region, query, variable, value);
    this.socket.emit('C_GetLineCharts', this.jobPath, files, years, region, query, variable, value);
}

Socket.prototype.getDendrogram = function () {
    // console.log('C_GetDendrogram:', this.jobPath);
    this.socket.emit('C_GetDendrogram', this.jobPath);
}

Socket.prototype.getParCoorAxis = function (files, region, query, variable, value) {
    this.socket.emit('C_GetParCoorAxis', this.jobPath, files, region, query, variable, value);
}

Socket.prototype.getParCoorPCA = function () {
    this.socket.emit('C_GetParCoorPCA', this.jobPath);
}

Socket.prototype.getScatterPlot = function (files, queries, variables, values, sctIndex) {
    this.socket.emit('C_GetScatterPlot', this.jobPath, files, queries, variables, values, sctIndex);
}

Socket.prototype.getScatterPlotPCA = function () {
    this.socket.emit('C_GetScatterPlotPCA', this.jobPath);
}

Socket.prototype.configureSession = function (session, init) {
    FILES = session[0];
    EXTENT = session[1];
    KEYS = session[2];
    UNITS = session[3];
    REGIONS = session[4];
    YEARS = session[5];
    this.jobPath = session[6];

    progressLoadingBar();

    $.each(KEYS, function (query, keys) {
        clusterQueries.push(query);
        clusterKeys[query] = ["data"];
        queryKeys[query] = keys;
    });
    clusterMetrics = UNITS;
    state.years = YEARS;
    state.regions = REGIONS;

    if(init){
        initControls();
        state.clu.k = 4;
    }

    if (state.selectedFeatures > 2){
        updateFeatureView(state.view, 0, 0, 0, FILES, true);
        updateFeatureView(state.view, 1, 0, 0, FILES, true);
        updateFeatureView(state.view, 2, 0, 0, FILES, true);
    }
    else if (state.selectedFeatures == 2){
        updateFeatureView(state.view, 0, 0, 0, FILES, true);
        updateFeatureView(state.view, 1, 0, 0, FILES, true);
    }
    else if (state.selectedFeatures == 1){
        updateFeatureView(state.view, 0, 0, 0, FILES, true);
    }
    
}

Socket.prototype.filterReport = function (databases) {
    var self = this;
    var toSend = [
        databases,
        EXTENT,
        KEYS,
        UNITS,
        REGIONS,
        YEARS,
        this.jobPath
    ];

    if (!this.reportView) {
        this.reportView = window.open('/Maps.html', '_blank');
        setTimeout(function() {
            self.reportView.socket.configureSession(toSend, true);
        }, 1000);
    }
    else {
        this.reportView.socket.configureSession(toSend);
    }
}


var socket = new Socket();