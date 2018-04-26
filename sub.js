
process.on('message', (m) => {
  // console.log('CHILD got message:', m);
  // process.send(m);
  if (m.reqType) {
    process.send(m.reqType);
    switch (m.reqType) {
      case 'clusterData request':
        processClusterDataReq(m.data);
        break;
      case 'clusterDataNew request':
        processClusterDataNewReq(m.data);
        break;
      case 'yearly cluster request':
        processYearlyClusterReq(m.data);
        break;
      case 'scenario year request':
        processScenarioYearReq(m.data);
        break;
      case 'test cluster request':
        testCluster();
        break;
      case 'scenario cluster request':
        processScenarioClusterReq(m.data);
        break;
    }
  }
});

process.send('connected');

const figue = require('./lib/figue');
const d3 = require('d3');
const PythonShell = require('python-shell');
const fs = require('fs');
const execFile = require('child_process').execFile;
var path = require('path');

var $;
require("jsdom").env("", function (err, window) {
  if (err) {
    console.error(err);
    return;
  }

  $ = require("jquery")(window);
});

Array.prototype.unique = function () {
  var a = this.concat();
  for (var i = 0; i < a.length; ++i) {
    for (var j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j])
        a.splice(j--, 1);
    }
  }

  return a;
};

function testCluster() {
  var data = [
    { 'company': 'anna', 'size': 37, 'revenue': 2 },
    { 'company': 'karin', 'size': 65, 'revenue': 3 },
    { 'company': 'john', 'size': 34, 'revenue': 2 },
    { 'company': 'tom', 'size': 38, 'revenue': 5 },
    { 'company': 'marc', 'size': 38, 'revenue': 6 },
    { 'company': 'stephany', 'size': 38, 'revenue': 3 }
  ];

  var labels = [];
  var vectors = [];
  for (var i = 0; i < data.length; i++) {
    labels[i] = data[i]['company'];
    vectors[i] = [data[i]['size'], data[i]['revenue']];
  }

  var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
  var dendogram = clusters.buildDendogram(5, true, true, false, true);
  var d3Cluster = buildBasicD3Cluster(clusters);

  process.send({ reqType: 'cluster response', data: { clusters: clusters, dendogram: dendogram, d3Cluster: d3Cluster } });
}

function buildBasicD3Cluster(cluster) {
  var d3Cluster = { name: "Scenarios", children: [] };
  d3Cluster.children = generateBasicDendogram(cluster).children;
  return d3Cluster;
}


function generateBasicDendogram(tree) {
  var cluster = {};

  if (tree.isLeaf()) {
    var labelstr = String(tree.label);
    cluster.name = labelstr;
    cluster.centroid = tree.centroid;
  } else {
    cluster.name = "dist: " + (tree.dist).toFixed(2);
    cluster.children = [];
    cluster.children.push(generateBasicDendogram(tree.left));
    cluster.children.push(generateBasicDendogram(tree.right));
  }
  return cluster;
}

function processClusterDataReq(data) {
  process.send('processClusterDataReq');
  var labels = d3.keys(data.scenarios).sort();
  var vectors = processData(data.queries, data.keys, data.scenarios);
  process.send({ reqType: 'progress update', data: 0.25 });

  process.send('agglomerate BEGIN ' + (new Date()).toUTCString());
  var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
  process.send({ reqType: 'progress update', data: 0.25 });
  process.send('agglomerate END ' + (new Date()).toUTCString());

  /*process.send('buildDendogram BEGIN ' + (new Date()).toUTCString());
  var dendogram = clusters.buildDendogram(5, true, true, false, true);
  process.send('buildDendogram END ' + (new Date()).toUTCString());
  process.send({reqType: 'progress update', data: 0.25});

  */

  // Uncomented 4/3
  process.send('buildD3Cluster BEGIN ' + (new Date()).toUTCString());
  var d3Cluster = buildD3Cluster(clusters, data.inputs);
  process.send("dendogram created!");
  process.send('buildD3Cluster END ' + (new Date()).toUTCString());
  writeData('d3Cluster.json', JSON.stringify(d3Cluster));


  writeData('ProccessClusterVectors.txt', JSON.stringify(vectors));

  // process.send({reqType: 'cluster response', data: {clusters: clusters, dendogram: dendogram, d3Cluster: d3Cluster}});
  // process.send({reqType: 'cluster response', data: {dendogram: dendogram, d3Cluster: d3Cluster}});
  // process.send({reqType: 'cluster response', data: {clusters: clusters, inputs: data.inputs}});
  process.send({ reqType: 'cluster response', data: { clusters: clusters, inputs: data.inputs, d3Cluster: d3Cluster } });
}

function processClusterDataNewReq(data) {
  process.send('processClusterDataNewReq');
  var labels = d3.keys(data.scenarios).sort();
  var vectors = processDataNew(data.queries, data.keys, data.scenarios);
  process.send({ reqType: 'progress update', data: 0.25 });

  process.send('agglomerate BEGIN ' + (new Date()).toUTCString());
  var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
  process.send({ reqType: 'progress update', data: 0.25 });
  process.send('agglomerate END ' + (new Date()).toUTCString());

  /*process.send('buildDendogram BEGIN ' + (new Date()).toUTCString());
  var dendogram = clusters.buildDendogram(5, true, true, false, true);
  process.send('buildDendogram END ' + (new Date()).toUTCString());
  process.send({reqType: 'progress update', data: 0.25});

  */

  // Uncomented 4/3
  process.send('buildD3Cluster BEGIN ' + (new Date()).toUTCString());
  var d3Cluster = buildD3Cluster(clusters, data.inputs);
  process.send("dendogram created!");
  process.send('buildD3Cluster END ' + (new Date()).toUTCString());
  writeData('d3Cluster.json', JSON.stringify(d3Cluster));


  writeData('ProccessClusterVectors.txt', JSON.stringify(vectors));

  // process.send({reqType: 'cluster response', data: {clusters: clusters, dendogram: dendogram, d3Cluster: d3Cluster}});
  // process.send({reqType: 'cluster response', data: {dendogram: dendogram, d3Cluster: d3Cluster}});
  // process.send({reqType: 'cluster response', data: {clusters: clusters, inputs: data.inputs}});
  process.send({ reqType: 'cluster response', data: { clusters: clusters, inputs: data.inputs, d3Cluster: d3Cluster } });
}

function processYearlyClusterReq(data) {
  process.send('mode: ' + data.mode + ', pcaMode: ' + data.pcaMode + ', pythonMode: ' + data.pythonMode);
  process.send('yearly cluster request' + (new Date()).toUTCString());

  var labels = d3.keys(data.scenarios).sort();
  var transformedVectors = [],
    yearlyVector = [],
    yearVectors = [];

  if (data.pcaMode < 3) {
    var yearlyVector = processDataYearly(data.queries, data.keys, data.scenarios);
    for (var i = 0; i < yearlyVector.length; i++) {
      scenarioIDs = [],
        scenarioDists = [];

      var cluster = figue.agglomerate(labels, yearlyVector[i], figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);

      switch (data.pcaMode) {
        // case 0: Clusters
        case 0:
          getScenarioIDs(cluster, labels);
          scenarioIDs = scenarioIDs.filter(function (n, i) { return n != -1 });
          break;
        // case 1: Clusters with centriod Information
        case 1:
          getScenarioDetails(cluster, labels);
          scenarioIDs = scenarioIDs.filter(function (n, i) { return n != -1 });
          break;
        // case 2: No longer used
        case 2:
          getScenarioDetailsV2(cluster, labels);
          scenarioIDs = scenarioIDs.filter(function (n, i) { return n != -1 }).concat(scenarioDists);
          break;
      }
      // printScenarioIDs(scenarioIDs);
      // console.log(scenarioIDs);
      yearVectors.push(scenarioIDs);

      scenarioIDs = [];
      getScenarioIDs(cluster, labels);
      scenarioIDs = scenarioIDs.filter(function (n, i) { return n != -1 });
      // process.send('doing ids');
      // process.send(data.scenarios[d3.keys(data.scenarios)[0]].years[i]+ ': ' + scenarioIDs);
    }
    process.send({ reqType: 'progress update', data: 0.03 });
  }
  // case 3: Feature Space
  else {
    yearVectors = getYearVectors(data.queries, data.keys, data.scenarios);
  }

  process.send({ reqType: 'progress update', data: 0.2 });

  pythonPCA(data.pythonMode, yearVectors, true, process);
  return;
}

function processScenarioYearReq(data) {
  process.send({ reqType: 'scenario year response', data: pythonPCA(0, data, false) });
}

process.on('process data request', function (index) {
  var data = dataStore[index]
  var labels = Object.keys(data.scenarios);
  var vectors = processData(data.queries, data.keys, data.scenarios);
  var clusters = figue.agglomerate(labels, vectors, figue.EUCLIDIAN_DISTANCE, figue.AVERAGE_LINKAGE);
  // console.log(clusters);

  scenarioIDs = [],
    scenarioDists = [];
  getScenarioIDs(clusters, labels);
  scenarioIDs = scenarioIDs.filter(function (n, i) { return n != -1 });
  printScenarioIDs(scenarioIDs);

  scenarioIDs = [],
    scenarioDists = [];
  getScenarioDetails(clusters, labels);
  scenarioIDs = scenarioIDs.filter(function (n, i) { return n != -1 });
  printScenarioIDs(scenarioIDs);
  // console.log(d3Cluster);
})

// data.queries, data.keys, data.scenarios
process.on('compare data request', function (data) {

  var keys = dataStore[0].keys;
  var totalLength = 0,
    loopCount = 0;

  for (var scenarioIndex in dataStore[0].scenarios) {
    var scenarioData = [dataStore[0].scenarios[scenarioIndex].data, dataStore[1].scenarios[scenarioIndex].data],
      arrayLength = dataStore[0].scenarios[scenarioIndex].years.length;

    for (var dataIndex = 0; dataIndex < scenarioData[0]["primary_energy"].length; dataIndex++) {

      var queryData = [scenarioData[0]["primary_energy"][dataIndex], scenarioData[1]["primary_energy"][dataIndex]];

      for (var keyIndex = 0; keyIndex < keys["primary_energy"].length; keyIndex++) {

        var key = keys["primary_energy"][keyIndex];

        for (var i = 0; i < queryData[0][key].length; i++) {
          if (queryData[0][key][i] !== queryData[1][key][i]) {
            console.log('Error (', key, ', ', i, '): ', queryData[0][key][i], ', ', queryData[1][key][i]);
            return;
          }
        }

      }
    }
    if (loopCount == 0) {
      totalLength = arrayLength * keys["primary_energy"].length * scenarioData[0]["primary_energy"].length;
    }
    loopCount++;
  }
  console.log('all data matches!', keys, ', ', loopCount, ', ', totalLength);
});

process.on('compare vector request', function (data) {

  for (var i = 0; i < vectorStore[0].length; i++) {
    for (var j = 0; j < vectorStore[0][i].length; j++) {
      if (vectorStore[0][i][j] !== vectorStore[1][i][j]) {
        console.log('Error (', i, ', ', j, '): ', vectorStore[0][i][j], ', ', vectorStore[1][i][j]);
        console.log('Error: ', vectorStore[0][i].slice(0, j + 1), '\n', vectorStore[1][i].slice(0, j + 1))
        return;
      }
    }
  }

  console.log('all data matches!', vectorStore[0].length * vectorStore[0][0].length);
});

function printScenarioIDs(ids) {
  var str = "";
  for (var i = 0; i < ids.length; i++) {
    str += ids[i].toFixed(2);
    if (i < ids.length - 1) {
      str += ', ';
    }
  }
  process.send(str);
}

function processYearVectors(queries, keys, scenarios) {
  process.nextTick(function () {
    var yearVectors = getYearVectors(queries, keys, scenarios);
    var transformedVectors = PCA(yearVectors, 2);

    process.send('yearly cluster response', transformedVectors);
  })
}

process.on('process request', function (data) {
  process.nextTick(function () {
    var vectors = processData(data.queries, data.keys, data.scenarios);
    process.send('process response', vectors);
  });
});

// scenarios = {"scenario_757.gejson": {"data": {"Queries": [0-248(# of countries)]-> {"QueryType": [0-21(# of years)-> value]}}}}
// keys = {"Queries": [(Query Type for each query, unknown # varies per query)]}
// Loops through each scenario and stores all information for all queries, query types, and years in a row vector.
// Each row in featureVectors represent a single scenario
function processData(queries, keys, scenarios) {
  var labels = d3.keys(scenarios).sort();
  var featureVectors = new Array(labels.length),
    featureVectorCount = 0;

  // Check if JQuery available
  var useJQ = false;
  if (typeof ($) != "undefined") {
    useJQ = true;
  }

  // process.send('labels: ' + labels.join(', '));
  process.send('processData BEGIN: ' + (new Date()).toUTCString());
  for (var si = 0; si < labels.length; si++) {
    var scenarioIndex = labels[si];
    var scenarioData = scenarios[scenarioIndex].data,
      arrayLength = scenarios[scenarioIndex].years.length,
      vector = [];

    for (var query in keys) {

      for (var dataIndex = 0; dataIndex < scenarioData[query].length; dataIndex++) {

        var queryData = scenarioData[query][dataIndex];

        for (var keyIndex = 0; keyIndex < keys[query].length; keyIndex++) {

          var key = keys[query][keyIndex];

          if (!queryData[key] || queryData[key][0] == "No data") {
            vector = vector.concat(new Array(arrayLength).fill(0));
          }
          else {
            if (useJQ) {
              queryData[key].pop();
              vector = $.merge(vector, queryData[key]);
            }
            else {
              vector = vector.concat(queryData[key].slice(0, -1));
            }
          }

        }
      }
    }

    featureVectors[featureVectorCount] = vector;
    featureVectorCount++;
  }
  process.send('processData END: ' + (new Date()).toUTCString())
  return featureVectors;
}


// scenarios = {"scenario_757.gejson": {"data": {"Queries": {"data": [(# of regions || # of years)-> value]}}}}
// keys = {"Queries": [(Query Type for each query, unknown # varies per query)]}
// Loops through each scenario and stores all information for all queries, query types, and years in a row vector.
// Each row in featureVectors represent a single scenario
function processDataNew(queries, keys, scenarios) {
  let labels = d3.keys(scenarios).sort();
  let featureVectors = new Array(labels.length),
    featureVectorCount = 0;

  // Check if JQuery available
  let useJQ = false;
  if (typeof ($) != "undefined") {
    useJQ = true;
  }

  process.send('processData BEGIN: ' + (new Date()).toUTCString());
  for (let si = 0; si < labels.length; si++) {
    let scenarioIndex = labels[si];
    let scenarioData = scenarios[scenarioIndex].data,
      vector = [];

    for (let query in keys) {
      let queryData = scenarioData[query].data;

      // If array contains values then merge with vector
      // Else iterate over the array of array and merge each with the vector
      if (typeof (queryData[0]) == "number") {
        if (useJQ) {
          vector = $.merge(vector, queryData);
        }
        else {
          vector = vector.concat(queryData);
        }
      }
      else {
        for (let dataIndex = 0; dataIndex < queryData.length; dataIndex++) {
          let regionData = queryData[dataIndex];
          if (useJQ) {
            vector = $.merge(vector, regionData);
          }
          else {
            vector = vector.concat(regionData);
          }
        }
      }
    }

    featureVectors[featureVectorCount] = vector;
    featureVectorCount++;
  }
  process.send('processData END: ' + (new Date()).toUTCString())
  return featureVectors;
}

// scenarios = {"scenario_757.gejson": {"data": {"Queries": [0-248(# of countries)]-> {"QueryType": [0-21(# of years)]}}}}
// keys = {"Queries": [(Query Type for each query, unknown # varies per query)]}
// Loops through each year and stores all information for all scenearios, queries, and query types in a 2d vector.
// Each row in featureVectors represent a single year containing a 2d vector of scenarios
function processDataYearly(queries, keys, scenarios) {
  // var labels = Object.keys(scenarios);
  var yearLength = scenarios[d3.keys(scenarios)[0]].years.length;
  var yearFeatureVectors = new Array(yearLength);
  var labels = d3.keys(scenarios).sort();
  // console.log(labels);
  var keyCount = 0,
    queryKeys = d3.keys(keys).sort();

  for (var key in keys) {
    keyCount += keys[key].length;
  }
  // process.send('keyCount: ' + keyCount);

  for (var yearIndex = 0; yearIndex < yearLength; yearIndex++) {

    var featureVectors = new Array(labels.length),
      featureVectorCount = 0;

    for (var si = 0; si < labels.length; si++) {
      var scenarioIndex = labels[si];
      var scenarioData = scenarios[scenarioIndex].data;
      var vector = new Array(keyCount * scenarioData[queryKeys[0]].length),
        vectorCount = 0;

      for (var queryKeyIndex = 0; queryKeyIndex < queryKeys.length; queryKeyIndex++) {

        var queryKey = queryKeys[queryKeyIndex],
          queryElements = scenarioData[queryKey];

        for (var elementIndex = 0; elementIndex < queryElements.length; elementIndex++) {
          var queryElement = queryElements[elementIndex],
            keyArray = keys[queryKey];

          for (var keyIndex = 0; keyIndex < keyArray.length; keyIndex++) {
            vector[vectorCount] = queryElement[keyArray[keyIndex]][yearIndex];
            vectorCount++;
          }
        }
      }
      featureVectors[featureVectorCount] = vector;
      featureVectorCount++;
    }
    yearFeatureVectors[yearIndex] = featureVectors;
    // console.log('progress update');
  }
  // writeData('yearFeatureVectors.txt', JSON.stringify(yearFeatureVectors));
  return yearFeatureVectors;
}

// scenarios = {"scenario_757.gejson": {"data": {"Queries": [0-248(# of countries)]-> {"QueryType": [0-21(# of years)]}}}}
// keys = {"Queries": [(Query Type for each query, unknown # varies per query)]}
// Loops through each year and stores all information for all scenearios, queries, and query types in a row vector.
// Each row in featureVectors represent a single year containing all scenarios for that year
function getYearVectors(queries, keys, scenarios) {
  // var labels = Object.keys(scenarios);
  var labels = d3.keys(scenarios).sort();
  var firstScenario = scenarios[labels[0]];
  var yearLength = scenarios[d3.keys(scenarios)[0]].years.length;
  var yearFeatureVectors = new Array(yearLength);

  var keyCount = 0,
    queryKeys = d3.keys(keys).sort();

  for (var key in keys) {
    keyCount += keys[key].length;
  }

  for (var yearIndex = 0; yearIndex < yearLength; yearIndex++) {
    var featureVectors = new Array(labels.length * keyCount * firstScenario.data[queryKeys[0]].length),
      featureVectorCount = 0;

    for (var si = 0; si < labels.length; si++) {
      var scenarioIndex = labels[si];
      var scenarioData = scenarios[scenarioIndex].data,
        arrayLength = scenarios[scenarioIndex].years.length;

      for (var queryKeyIndex = 0; queryKeyIndex < queryKeys.length; queryKeyIndex++) {

        var queryKey = queryKeys[queryKeyIndex],
          queryElements = scenarioData[queryKey];

        for (var elementIndex = 0; elementIndex < queryElements.length; elementIndex++) {
          var queryElement = queryElements[elementIndex],
            keyArray = keys[queryKey];

          for (var keyIndex = 0; keyIndex < keyArray.length; keyIndex++) {
            featureVectors[featureVectorCount] = +queryElement[keyArray[keyIndex]][yearIndex];
            featureVectorCount++;
          }
        }
      }

    }
    yearFeatureVectors[yearIndex] = featureVectors;
  }
  console.log('yearFeatureVectors.length: ', yearFeatureVectors.length);
  return yearFeatureVectors;
}

function combineInputs(children) {
  var inputs0 = children[0].inputs,
    inputs1 = children[1].inputs;

  // process.send('inputs0: ' + JSON.stringify(inputs0));
  // process.send('inputs1: ' + JSON.stringify(inputs1));

  var result = {};
  var types = d3.keys(inputs0).concat(d3.keys(inputs1)).unique();
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    result[type] = {};
    if (typeof (inputs0[type]) != "undefined") {
      for (var value in inputs0[type]) {
        result[type][value] = inputs0[type][value];
      }

      if (typeof (inputs1[type]) != "undefined") {
        for (var value in inputs1[type]) {
          if (result[type][value])
            result[type][value] += inputs1[type][value];
          else
            result[type][value] = inputs1[type][value];
        }
      }
    }
    else if (typeof (inputs1[type]) != "undefined") {
      for (var value in inputs1[type]) {
        result[type][value] = inputs1[type][value];
      }
    }
    else {
      process.send('this is odd');
    }
  }
  return result;
}

function diffInputs(children) {
  var inputs0 = children[0].inputs,
    inputs1 = children[1].inputs;

  var types = d3.keys(inputs0).concat(d3.keys(inputs1)).unique();

  var maxType = '',
    max = 0;
  for (var i = 0; i < types.length; i++) {
    var type = types[i];
    var sum = 0;

    if (typeof (inputs0[type]) != "undefined") {
      if (typeof (inputs1[type]) != "undefined") {
        var values = d3.keys(inputs0[type]).concat(d3.keys(inputs1[type])).unique();

        for (var j = 0; j < values.length; j++) {
          var value = values[j];
          if (inputs0[type][value]) {
            if (inputs1[type][value]) {
              sum += Math.abs(inputs0[type][value] - inputs1[type][value]);
            }
            else {
              sum += inputs0[type][value];
            }
          }
          else {
            sum += inputs1[type][value];
          }
        }
      }
      else {
        for (var value in inputs0[type]) {
          sum += inputs0[type][value];
        }
      }
    }
    else if (typeof (inputs1[type]) != "undefined") {
      for (var value in inputs1[type]) {
        sum += inputs1[type][value];
      }
    }
    else {
      console.log('this is odd')
    }
    // console.log('type: ' + type + ', sum: ' + sum);

    if (sum > max) {
      maxType = type;
      max = sum;
    }
  }
  // console.log('type: ' + maxType + ', count: ' + max);
  return maxType;
}

function buildD3Cluster(cluster, inputs) {
  var d3Cluster = { name: "Scenarios", children: [] };
  d3Cluster.children = generateDendogram(cluster, inputs).children;

  // Remove later, should happen on front end while processing all inputs
  d3Cluster.inputs = combineInputs(d3Cluster.children);
  // Remove later, should happen on front end while processing all inputs

  d3Cluster.maxType = diffInputs(d3Cluster.children);
  return d3Cluster;
}


function generateDendogram(tree, inputs) {
  var cluster = {};

  if (tree.isLeaf()) {
    var labelstr = String(tree.label);
    cluster.name = labelstr;
    // cluster.centroid = tree.centroid;
    cluster.inputs = inputs[labelstr];
  } else {
    cluster.name = "dist: " + (tree.dist).toFixed(2);
    cluster.children = [];
    cluster.children.push(generateDendogram(tree.left, inputs));
    cluster.children.push(generateDendogram(tree.right, inputs));
    // process.send(JSON.stringify(cluster.children));
    cluster.inputs = combineInputs(cluster.children);
    cluster.maxType = diffInputs(cluster.children);
  }
  return cluster;
}

var scenarioIDs = [];
function getScenarioIDs(tree, labels) {
  var id = -1;

  if (tree.isLeaf()) {
    id = labels.indexOf(tree.label);
  } else {
    scenarioIDs.push(getScenarioIDs(tree.left, labels));
    scenarioIDs.push(getScenarioIDs(tree.right, labels));
  }

  return id;
}

function getScenarioDetails(tree, labels) {
  var id = -1;

  if (tree.isLeaf()) {
    id = labels.indexOf(tree.label);

  } else {
    scenarioIDs.push(getScenarioDetails(tree.left, labels));
    scenarioIDs.push(tree.dist);
    scenarioIDs.push(getScenarioDetails(tree.right, labels));
  }
  return id;
}

var scenarioDists = [];
function getScenarioDetailsV2(tree, labels) {
  var id = -1;

  if (tree.isLeaf()) {
    id = labels.indexOf(tree.label);

  } else {
    scenarioIDs.push(getScenarioDetailsV2(tree.left, labels));
    scenarioDists.push(tree.dist);
    scenarioIDs.push(getScenarioDetailsV2(tree.right, labels));
  }
  return id;
}

function pythonPCA(mode, data, useFile) {
  // console.log(JSON.stringify(data));
  process.send('pythonPCA');
  var options = {
    args: [mode]
  };

  if (useFile) {
    writeData('large.txt', JSON.stringify(data));
    options.args.push('data/large.txt');
    options.args.push(useFile);
  }
  else {
    options.args.push(JSON.stringify(data));
  }

  execFile('python/dist/pca/pca.exe', options.args, function (err, results) {
    if (err) {
      process.send(err);
      return;
    }
    // results is an array consisting of messages collected during execution
    // console.log(results);
    var output = JSON.parse(results);
    // console.log('output parsed: ', output);
    process.send({ reqType: 'yearly cluster response', data: output });

    process.send('yearly cluster response ' + (new Date()).toUTCString());
  });
}

function writeData(filename, data) {
  fs.writeFileSync("data/" + filename, data);
}

function processScenarioClusterReq(data) {

  var toParse = JSON.parse(fs.readFileSync('data/ProccessClusterVectors.txt', 'utf8'));
  var vectors = new Array(toParse.length);
  toParse.map(function (obj, i) { vectors[i] = obj.map(Number); });
  var clusters = figue.kmeans(data.k, vectors);


  process.send({ reqType: 'scenario cluster clusters', data: clusters });
  process.send('scenario cluster clusters ' + (new Date()).toUTCString());
}