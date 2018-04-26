// Build clusterKeys with Queries and their keys
function addKeys(array, keys) {
	for (var index = 0; index < keys.length; index++) {
		if (array.indexOf(keys[index]) == -1 && typeof (keys[index]) != "function") {
			array.push(keys[index]);
		}
	}
}

// When files are down being loaded process all data and request main.js to begin clustering
function loadingComplete() {
	$('#file-selection').show();

	processAllInputs();

	buildFeatureSelection(clusterKeys);
	hideLoading();
	showDialog('fea');
}

function featuresSelected(keys) {
	showLoading(true);
	console.log('clusterData request', new Date());
	//send the structured data to the main process
	// console.log('with keys:', keys);

	var reqString = state.server ? 'clusterDataNew request' : 'clusterData request';

	socket.emit(reqString, { queries: clusterQueries, keys: keys, scenarios: clusterData, inputs: scenarioInputs });

	if (!state.featuresSelected) {
		prepareScatterPlot(clusterQueries, clusterKeys);
		prepareParCoor(clusterQueries, clusterKeys);

		// in Process.js, processes data locally for browser use
		if (!state.server)
			processDataLocal(clusterQueries, clusterKeys, clusterData);

		loadNewGeoJSON(clusterShapefile, clusterShapefile.parsedJson, true);
		// delete clusterShapefile.parsedJson;

		updateClusterKValues();

		state.featuresSelected = 1;
	}
}

// When user does file open, setup intial variables and create file reader for each new file
// after each file is ready either read as a geojson for the map or as a data file.
// loadClusterJSON parses the data files and stores them in clusterData
// map data is stored in clusterShapefile
function readFileNew(e) {

	if (e.target.files.length == 0)
		return;

	console.log("readFileNew Begin", new Date());
	showLoading(true);

	$('#par-controls-container').hide();

	if (clusterShapefile.layer) {
		map.removeLayer(clusterShapefile.layer);
		console.log("Should remove layer!!!!")
	}

	state.fileMode = 1;

	var files = e.target.files;
	state.geoLoaded = 0,
		state.scenariosLoaded = 0;
	state.scenariosProc = 0;
	state.filesLoaded = 0;
	state.filesCount = e.target.files.length;
	state.featuresSelected = 0;
	fileNames = [];

	clusterShapefile = {},
		clusterData = {},
		clusterQueries = [],
		clusterKeys = {};

	for (var i = 0; i < files.length; i++) {
		var file = files[i];

		if (!file || typeof (dataArray[file.name]) != "undefined") {
			return;
		}
		var reader = new FileReader();
		reader.fileName = file.name;

		fileNames.push(reader.fileName);
		// console.log('file:', file);
		reader.onload = function (e) {
			var contents = e.target.result;
			var parsedJson = JSON.parse(contents);

			if (!('geo_data' in parsedJson) && !('geodata' in parsedJson)) {
				// if the data is geo_data map shapfile
				clusterShapefile = { scenario: parsedJson.scenario, years: parsedJson.years, parsedJson: parsedJson };

				state.filesLoaded++;
				state.geoLoaded++;

				if (state.filesLoaded == state.filesCount) {
					if (state.scenariosLoaded > 1) {
						loadingComplete();
					}
					else {
						hideLoading();
						alert("Atleast two scenario files must be uploaded!");
						console.log('if');
					}
				}
			}
			else {//otherwise, the data is scenario values.
				var years = parsedJson.years == undefined ? parsedJson.scenario.years : parsedJson.years;
				clusterData[this.fileName] = { scenario: parsedJson.scenario, years: years.slice() };

				$('#fileSelected').append($("<option></option>").attr("value", this.fileName).text(this.fileName));

				loadClusterJSON(clusterData[this.fileName], parsedJson);
				state.filesLoaded++;
				state.scenariosLoaded++;

				if (state.scenariosLoaded == 2) {
					state.years = years;
					var min = d3.min(state.years);
					state.yearsScaled = [];
					state.years.forEach(function (n, i) { state.yearsScaled.push(n - min); });

					$('#par-controls-container').show();

					var yearSelect = $('#par-year-select');
					yearSelect.empty();
					yearSelect.append($("<option/>")
						.val(-1)
						.text('All'));
					$.each(state.years, function (key, value) {
						yearSelect.append($("<option/>")
							.val(key)
							.text(value));
					});
				}

				if (state.filesLoaded == state.filesCount) {
					console.log("readFileNew End", new Date());

					if (state.scenariosLoaded > 1) {
						loadingComplete();
					}
					else {
						hideLoading();
						alert("Atleast two scenario files must be uploaded!");
						// console.log('else')
					}
				}
			}
		};
		reader.readAsText(file);
	};
}

var denver = false;
function runDenver() {
	console.log("runDenver Begin", new Date());
	showLoading(true);
	denver = true;

	$('#par-controls-container').hide();

	if (clusterShapefile.layer) {
		map.removeLayer(clusterShapefile.layer);
		console.log("Should remove layer!!!!")
	}

	state.fileMode = 1;


	var files = [];
	/*for(var i = 0; i < 5040; i++){
		files.push("denver" + i + ".geojson")
	}*/
	for (var i = 0; i < 300; i++) {
		var fileIndex = Math.floor(Math.random() * 5039) + 1;
		while (files.indexOf("denver" + fileIndex + ".geojson") > -1) {
			fileIndex = Math.floor(Math.random() * 5039) + 1;
		}
		files.push("denver" + fileIndex + ".geojson")
	}

	// K = 4;
	// files = ["denver1124.geojson","denver3643.geojson","denver4303.geojson","denver1876.geojson","denver1157.geojson","denver1110.geojson","denver3924.geojson","denver2338.geojson","denver2743.geojson","denver3340.geojson","denver1011.geojson","denver3982.geojson","denver2885.geojson","denver2991.geojson","denver4264.geojson","denver1284.geojson","denver3960.geojson","denver2981.geojson","denver2537.geojson","denver357.geojson","denver2888.geojson","denver2226.geojson","denver51.geojson","denver5009.geojson","denver3501.geojson","denver636.geojson","denver1228.geojson","denver123.geojson","denver3812.geojson","denver3572.geojson","denver2710.geojson","denver4437.geojson","denver1292.geojson","denver1063.geojson","denver1256.geojson","denver3514.geojson","denver566.geojson","denver1937.geojson","denver1290.geojson","denver4699.geojson","denver2328.geojson","denver897.geojson","denver1698.geojson","denver2197.geojson","denver880.geojson","denver497.geojson","denver2941.geojson","denver1211.geojson","denver626.geojson","denver950.geojson","denver2135.geojson","denver1946.geojson","denver820.geojson","denver3962.geojson","denver1072.geojson","denver2982.geojson","denver3224.geojson","denver3630.geojson","denver3832.geojson","denver2916.geojson","denver1371.geojson","denver4428.geojson","denver4023.geojson","denver1603.geojson","denver190.geojson","denver5033.geojson","denver4109.geojson","denver2976.geojson","denver2192.geojson","denver4440.geojson","denver4397.geojson","denver4701.geojson","denver4598.geojson","denver2058.geojson","denver840.geojson","denver4232.geojson","denver3467.geojson","denver4377.geojson","denver1393.geojson","denver2779.geojson","denver514.geojson","denver4509.geojson","denver678.geojson","denver843.geojson","denver2917.geojson","denver1647.geojson","denver4804.geojson","denver1425.geojson","denver4218.geojson","denver4385.geojson","denver4725.geojson","denver4883.geojson","denver1265.geojson","denver34.geojson","denver4526.geojson","denver4324.geojson","denver2213.geojson","denver918.geojson","denver4316.geojson","denver4175.geojson","denver3635.geojson","denver2724.geojson","denver1224.geojson","denver3845.geojson","denver3023.geojson","denver4733.geojson","denver4520.geojson","denver3757.geojson","denver2630.geojson","denver2539.geojson","denver422.geojson","denver1054.geojson","denver4774.geojson","denver4009.geojson","denver2064.geojson","denver3637.geojson","denver4543.geojson","denver4738.geojson","denver2984.geojson","denver700.geojson","denver3391.geojson","denver593.geojson","denver1212.geojson","denver2822.geojson","denver91.geojson","denver3863.geojson","denver3094.geojson","denver719.geojson","denver3740.geojson","denver735.geojson","denver1998.geojson","denver1772.geojson","denver2831.geojson","denver3689.geojson","denver962.geojson","denver4312.geojson","denver207.geojson","denver4410.geojson","denver1227.geojson","denver2785.geojson","denver4356.geojson","denver3301.geojson","denver3822.geojson","denver3135.geojson","denver1274.geojson","denver1396.geojson","denver1754.geojson","denver2675.geojson","denver4008.geojson","denver3586.geojson","denver1639.geojson","denver2963.geojson","denver2578.geojson","denver4425.geojson","denver1778.geojson","denver3456.geojson","denver4546.geojson","denver4931.geojson","denver111.geojson","denver541.geojson","denver1240.geojson","denver2645.geojson","denver981.geojson","denver26.geojson","denver3025.geojson","denver23.geojson","denver5027.geojson","denver1981.geojson","denver2553.geojson","denver662.geojson","denver2209.geojson","denver1531.geojson","denver2413.geojson","denver839.geojson","denver4626.geojson","denver1171.geojson","denver2855.geojson","denver4932.geojson","denver4156.geojson","denver1183.geojson","denver4971.geojson","denver1207.geojson","denver3954.geojson","denver723.geojson","denver437.geojson","denver656.geojson","denver4996.geojson","denver1849.geojson","denver2329.geojson","denver3634.geojson","denver1711.geojson","denver1148.geojson","denver230.geojson","denver3583.geojson","denver3073.geojson","denver67.geojson","denver2482.geojson","denver730.geojson","denver1907.geojson","denver4016.geojson","denver2955.geojson","denver2102.geojson","denver1609.geojson","denver1209.geojson","denver4128.geojson","denver2121.geojson","denver3215.geojson","denver4344.geojson","denver3744.geojson","denver2283.geojson","denver4734.geojson","denver1708.geojson","denver3844.geojson","denver3416.geojson","denver4283.geojson","denver3632.geojson","denver267.geojson","denver5021.geojson","denver385.geojson","denver3050.geojson","denver1868.geojson","denver500.geojson","denver2911.geojson","denver1414.geojson","denver2949.geojson","denver4553.geojson","denver1001.geojson","denver1307.geojson","denver1432.geojson","denver1508.geojson","denver4253.geojson","denver4002.geojson","denver903.geojson","denver1581.geojson","denver4469.geojson","denver2765.geojson","denver2853.geojson","denver1327.geojson","denver1372.geojson","denver2868.geojson","denver60.geojson","denver742.geojson","denver1022.geojson","denver2516.geojson","denver4578.geojson","denver2267.geojson","denver1483.geojson","denver2689.geojson","denver3203.geojson","denver4105.geojson","denver511.geojson","denver262.geojson","denver1584.geojson","denver3285.geojson","denver3904.geojson","denver1764.geojson","denver4234.geojson","denver3351.geojson","denver2544.geojson","denver919.geojson","denver1045.geojson","denver4177.geojson","denver370.geojson","denver2476.geojson","denver2706.geojson","denver4964.geojson","denver2947.geojson","denver4161.geojson","denver3910.geojson","denver2538.geojson","denver2041.geojson","denver4247.geojson","denver3932.geojson","denver484.geojson","denver750.geojson","denver4660.geojson","denver2653.geojson","denver3427.geojson","denver1185.geojson","denver998.geojson","denver2091.geojson","denver480.geojson","denver1017.geojson","denver4068.geojson","denver3926.geojson","denver4709.geojson","denver472.geojson","denver3836.geojson","denver4718.geojson","denver3180.geojson","denver4274.geojson","denver563.geojson","denver3892.geojson","denver2814.geojson","denver2510.geojson","denver1552.geojson","denver4942.geojson","denver3364.geojson","denver3554.geojson","denver970.geojson"];


	state.geoLoaded = 0,
		state.scenariosLoaded = 0;
	state.scenariosProc = 0;
	state.filesLoaded = 0;
	state.filesCount = files.length;
	state.featuresSelected = 0;
	fileNames = [];

	clusterShapefile = {},
		clusterData = {},
		clusterQueries = [],
		clusterKeys = {};

	$.each(files, function (index, file) {
		fileNames.push(file);
		var path = "../denver_scenarios/";
		$.getJSON(path + file, function (parsedJson) {
			// console.log(file)
			if (!('geo_data' in parsedJson) && !('geodata' in parsedJson)) {
				clusterShapefile = { scenario: parsedJson.scenario, years: parsedJson.years, parsedJson: parsedJson };

				state.filesLoaded++;
				state.geoLoaded++;

				if (state.filesLoaded == state.filesCount) {
					if (state.scenariosLoaded > 1) {
						processAllInputs();

						buildFeatureSelection(clusterKeys);
						hideLoading();
						// showDialog('fea');
						featuresSelected(getSelectedFeatures());
					}
					else {
						hideLoading();
						alert("Atleast two scenario files must be uploaded!");
						console.log('if');
					}
				}
			}
			else {
				var years = parsedJson.years == undefined ? parsedJson.scenario.years : parsedJson.years;
				clusterData[file] = { scenario: parsedJson.scenario, years: years.slice() };

				loadClusterJSON(clusterData[file], parsedJson);
				state.filesLoaded++;
				state.scenariosLoaded++;

				if (state.scenariosLoaded == 2) {
					state.years = years;
					var min = d3.min(state.years);
					state.yearsScaled = [];
					state.years.forEach(function (n, i) { state.yearsScaled.push(n - min); });

					$('#par-controls-container').show();

					var yearSelect = $('#par-year-select');
					yearSelect.empty();
					yearSelect.append($("<option/>")
						.val(-1)
						.text('All'));
					$.each(state.years, function (key, value) {
						yearSelect.append($("<option/>")
							.val(key)
							.text(value));
					});
				}

				if (state.filesLoaded == state.filesCount) {
					console.log("readFileNew End", new Date());

					if (state.scenariosLoaded > 1) {
						processAllInputs();

						buildFeatureSelection(clusterKeys);
						hideLoading();
						// showDialog('fea');
						featuresSelected(getSelectedFeatures());
					}
					else {
						hideLoading();
						alert("Atleast two scenario files must be uploaded!");
						// console.log('else')
					}
				}
			}
		});
	});
}

function runDatabase() {
	console.log("runDatabase Begin", new Date());
	showLoading(true);
	state.server = true;

	$('#par-controls-container').hide();

	if (clusterShapefile.layer) {
		map.removeLayer(clusterShapefile.layer);
		console.log("Should remove layer!!!!")
	}

	state.fileMode = 1;


	var files = [];
	for (var fileIndex = 0; fileIndex < 16; fileIndex++) {
		files.push("scenarios-database_basexdb_" + fileIndex + ".json");
	}

	state.geoLoaded = 0,
		state.scenariosLoaded = 0;
	state.scenariosProc = 0;
	state.filesLoaded = 0;
	state.filesCount = files.length;
	state.featuresSelected = 0;
	fileNames = [];

	clusterShapefile = {},
		clusterData = {},
		clusterQueries = [],
		clusterKeys = {};

	$.each(files, function (index, file) {
		fileNames.push(file);
		var path = "../data/r/";
		$.getJSON(path + file, function (parsedJson) {
			// console.log(file)

			clusterData[file] = parsedJson;

			// loadClusterJSON(clusterData[file], parsedJson);
			state.filesLoaded++;
			state.scenariosLoaded++;

			if (state.scenariosLoaded == 2) {
				state.years = parsedJson.scenario.years;

				// Comeback to later, won't be able to find slope atm
				// var min = d3.min(state.years);
				// state.yearsScaled = [];
				// state.years.forEach(function (n, i) { state.yearsScaled.push(n - min); });

				$('#par-controls-container').show();

				var yearSelect = $('#par-year-select');
				yearSelect.empty();
				yearSelect.append($("<option/>")
					.val(-1)
					.text('All'));
				$.each(state.years, function (key, value) {
					yearSelect.append($("<option/>")
						.val(key)
						.text(value));
				});
			}

			if (state.filesLoaded == state.filesCount) {
				console.log("readFileNew End", new Date());

				clusterQueries = parsedJson.queries;
				clusterQueries.forEach((query, index) => {
					clusterKeys[query] = ["data"];
					clusterMetrics[query] = parsedJson.data[query].units[0];
				});

				// if (key != "data" && dataMetric != "N/V") {
				// 	clusterMetrics[key] = dataMetric;
				// }
				// else if (dataMetric != "N/V") {
				// 	clusterMetrics[query] = dataMetric;
				// }

				if (state.scenariosLoaded > 1) {
					/*processAllInputs();

					buildFeatureSelection(clusterKeys);
					hideLoading();
					// showDialog('fea');
					featuresSelected(getSelectedFeatures());*/
					loadingComplete();
				}
				else {
					hideLoading();
					alert("Atleast two scenario files must be uploaded!");
					// console.log('else')
				}
			}
		});
	});
}

//File VF
//clusterData['scenario'].data = [Query]-> [country] -> [QueryKeys]
function loadClusterJSON(obj, json) {
	// console.log(obj.scenario);
	var features = json.features;

	obj.properties = [],
		obj.ids = [],
		obj.hasData = [],
		obj.features = [],
		obj.queries = Object.keys(features[0].queries),
		obj.data = {},
		obj.dataKeys = {};

	for (var index = 0; index < obj.queries.length; index++) {
		obj.data[obj.queries[index]] = [];
		obj.dataKeys[obj.queries[index]] = [];
	}

	for (var featureIndex = 0; featureIndex < features.length; featureIndex++) {
		var feature = features[featureIndex];

		obj.properties.push(feature.properties);
		obj.ids.push(feature.id);

		for (var queryIndex in feature.queries) {
			var query = feature.queries[queryIndex]

			obj.data[queryIndex].push(query);

			if (Array.isArray(query)) {
				obj.dataKeys[queryIndex] = ["Array"];
			}
			else {
				addKeys(obj.dataKeys[queryIndex], Object.keys(query));
			}
		}
		// <<<<<<< HEAD
		//some of the regions is null of which the query property will be null
		// =======
		// >>>>>>> GCAM-Electron/master
		if (feature.queries) {
			obj.hasData.push(true);
		}
		else {
			obj.hasData.push(false);
		}

	}

	addKeys(clusterQueries, obj.queries);

	for (var index = 0; index < obj.queries.length; index++) {
		if (!clusterKeys[obj.queries[index]])
			clusterKeys[obj.queries[index]] = [];

		addKeys(clusterKeys[obj.queries[index]], obj.dataKeys[obj.queries[index]]);
	}
	// console.log(obj);
}



// Debugging only!!!
function readFileGeo(e) {
	console.log("readFileGeo Begin", new Date());
	showLoading(true);

	state.fileMode = 1;

	var files = e.target.files;
	state.geoLoaded = 0,
		state.scenariosLoaded = 0;
	state.scenariosProc = 0;
	state.filesLoaded = 0;
	state.filesCount = e.target.files.length;
	fileNames = [];

	clusterShapefile = {},
		clusterData = {},
		clusterQueries = [],
		clusterKeys = {};

	for (var i = 0, f; file = files[i]; i++) {
		if (!file || typeof (dataArray[file.name]) != "undefined") {
			return;
		}
		var reader = new FileReader();
		reader.fileName = file.name;

		fileNames.push(reader.fileName);

		reader.onload = function (e) {
			var contents = e.target.result;
			var parsedJson = JSON.parse(contents);
			var years = parsedJson.years == undefined ? parsedJson.scenario.years : parsedJson.years;

			clusterData[this.fileName] = { scenario: parsedJson.scenario, years: years };

			$('#fileSelected').append($("<option></option>").attr("value", this.fileName).text(this.fileName));

			loadClusterJSON(clusterData[this.fileName], parsedJson);
			state.filesLoaded++;
			state.scenariosLoaded++;

			if (state.scenariosLoaded == 2) {
				state.years = years;
				var min = d3.min(state.years);
				state.yearsScaled = [];
				state.years.forEach(function (n, i) { state.yearsScaled.push(n - min); });

				$('#par-controls-container').show();

				var yearSelect = $('#par-year-select');
				yearSelect.empty();
				yearSelect.append($("<option/>")
					.val(-1)
					.text('All'));
				$.each(state.years, function (key, value) {
					yearSelect.append($("<option/>")
						.val(key)
						.text(value));
				});
			}

			if (state.filesLoaded == state.filesCount) {
				console.log("readFileNew End", new Date());

				hideLoading();
			}
		};
		reader.readAsText(file);
	};
}