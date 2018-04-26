const socket = io();

// Socket Requests (Outgoing)
function scenarioYearRequest(scenarioVectors, mode, delay) {
	console.log('scenario year request', new Date(), ', mode: ', mode);
	socket.emit('scenario year request', { data: scenarioVectors, mode: !mode ? 0 : mode });
	setTimeout(showLoading, !delay ? 1000 : delay);
}

function yearlyClusterRequest(mode, pcaMode, pythonMode, delay) {
	if (typeof (state.den.data) != "undefined") {
		console.log('yearly cluster request', new Date());
		socket.emit('yearly cluster request', {
			queries: clusterQueries,
			keys: clusterKeys,
			scenarios: clusterData,
			mode: !mode ? state.evo.mode : mode,
			pcaMode: !pcaMode ? state.evo.pcaMode : pcaMode,
			pythonMode: !pythonMode ? state.evo.pythonMode : pythonMode,
		});
		setTimeout(showLoading, !delay ? 1000 : delay);
	}
}

function scenarioClusterRequest(mode, delay) {
	if (clusterQueries.length > 0) {
		state.clu.pca = null;
		state.clu.kmeans = null;

		console.log('scenario cluster request', new Date());
		socket.emit('scenario cluster request', { mode: !mode ? 0 : mode, k: state.clu.k });
		setTimeout(showLoading, !delay ? 1000 : delay);
	}
}


// Socket.on (incoming from main.js)
socket.on('console', function (req) {
	console.log(req)
})

socket.on('asynchronous-reply', function (arg) {
	console.log(`Asynchronous message reply: ${arg}`)
})

socket.on('progress update', function (progress) {
	console.log('progress update');
	progressLoadingBar(progress);
});

socket.on('cluster response', function (result) {
	console.log('cluster response', new Date());
	// console.log(result.clusters);

	// var d3Cluster = buildD3Cluster(result.clusters, result.inputs);

	$.getJSON('../data/d3Cluster.json', function (d3Cluster) {
		globalD3Cluster = d3Cluster;
		state.den.data = d3Cluster;
		zDendrogram(d3Cluster);

		if (denver) {
			state.parCoor.obj = new parCoor(fileNames.concat([]));
			showDialog('clu');
		}
		hideLoading();
	});

	// var d3Cluster = result.d3Cluster;
	// console.log(JSON.stringify(d3Cluster));
	// d3Cluster.inputs = result.d3Cluster;
	// d3Cluster.maxType = result.d3Cluster;

	// globalD3Cluster = d3Cluster;
	// state.den.data = d3Cluster;
	// zDendrogram(d3Cluster);

	/*if(denver){
		state.parCoor.obj = new parCoor(fileNames.concat([]));
		showDialog('clu');
	}*/



	// globalD3Cluster = result.d3Cluster;
	// state.den.data = result.d3Cluster;
	// zDendrogram(result.d3Cluster);
	// hideLoading();
});

socket.on('yearly cluster response', function (result) {
	console.log('yearly cluster response', new Date());
	yearVectors = result;

	$('#evo-controls-container').show();

	state.evo.obj = new Evo(yearVectors);
	hideLoading();
});

socket.on('scenario year response', function (result) {
	console.log('scenario year response', new Date());
	// scenariYear = result;
	state.evo.scatterData = result;
	state.evo.scatterPlot = new ScatterPlot(result);
	hideLoading();
});

socket.on('process response', function (result) {
	globalVector = result;
	console.log('process response', result);
});

socket.on('scenario cluster pca', function (result) {
	console.log('scenario cluster pca', new Date());
	state.clu.pca = result;
	if (state.clu.kmeans == null) {
		progressLoadingBar(0.5);
	}
	else {
		hideLoadingBar();
		state.clu.obj = new ClusterPlot(state.clu.pca);
		if (denver)
			showDialog('clu');
	}
});

socket.on('scenario cluster clusters', function (result) {
	console.log('scenario cluster clusters', new Date());
	state.clu.kmeans = result;
	if (state.clu.pca == null) {
		progressLoadingBar(0.5);
	}
	else {
		hideLoadingBar();
		state.clu.obj = new ClusterPlot(state.clu.pca);
		if (denver)
			showDialog('clu');
	}
});