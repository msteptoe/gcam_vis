
// 
function processDataLocal(queries, keys, scenarios){
	console.log('processDataLocal begin', new Date())

	// Testing for all the same values
	var baseScenario = d3.keys(scenarios).sort()[0];
	var count = 0,
	diff = 0;

	for(var scenarioIndex in scenarios){
		var scenarioData = scenarios[scenarioIndex].data,
		arrayLength = scenarios[scenarioIndex].years.length,
		dataMetrics = {};

		for(var query in keys){

			// console.log(query);
			
			dataMetrics[query] = new Array(scenarioData[query].length);
			for(var dataIndex = 0; dataIndex < scenarioData[query].length; dataIndex++){

				var queryData = scenarioData[query][dataIndex];

				dataMetrics[query][dataIndex] = {};

				for(var keyIndex = 0; keyIndex < keys[query].length; keyIndex++){

					var key = keys[query][keyIndex];
					var dataMetric = "N/V";

					if(!queryData[key] || queryData[key][0] == "No data"){
						// queryData[key] = Array.apply(null, new Array(arrayLength)).map(Number.prototype.valueOf, 0);
						queryData[key] = new Array(arrayLength).fill(0);
					}
					else{
						dataMetric = queryData[key].pop();
					}

					// Testing for all the same values
					/*if(count > 0){
						for (var i = 0; i < queryData[key].length; i++) {
							if(scenarios[baseScenario].data[query][dataIndex][key][i] != queryData[key][i]){
								// console.log('diff: ' + scenarios[baseScenario].data[query][dataIndex][key][i] + ', ' + queryData[key][i])
								diff++;
							}
						};
					}*/
					// End Testing

					// dataMetrics[query][dataIndex][key] = dataMetric;
					if(key != "data" && dataMetric != "N/V"){
						clusterMetrics[key] = dataMetric;
					}
					else if(dataMetric != "N/V"){
						clusterMetrics[query] = dataMetric;
					}

					if(!clusterMetrics[query] && dataMetric != "N/V"){
						clusterMetrics[query] = dataMetric;
					}
					
				}
			}
		}

		scenarios[scenarioIndex]['dataMetrics'] = dataMetrics;
		// console.log(dataMetrics);
		// count++;
	}
	// console.log('diff: ' + diff);
	console.log('processDataLocal end', new Date())
	// console.log(clusterMetrics)
}

function processScenarioYear(year){
	console.log('processScenarioYear', new Date())

	var labels = d3.keys(clusterData).sort(),
	keys = clusterKeys;

	var scenarioVector = new Array(labels.length);

	var keyCount = 0,
	queryKeys = d3.keys(keys).sort();

	for(var key in keys){
		keyCount += keys[key].length;
	}

	for(var si = 0; si < labels.length; si++){
	  var scenarioIndex = labels[si];
	  var scenarioData = clusterData[scenarioIndex].data;
	  var vector = new Array(keyCount * scenarioData[queryKeys[0]].length),
	  vectorCount = 0;
	  
	  for(var queryKeyIndex = 0; queryKeyIndex < queryKeys.length; queryKeyIndex++){

	    var queryKey = queryKeys[queryKeyIndex],
	    queryElements = scenarioData[queryKey];


	    for(var elementIndex = 0; elementIndex < queryElements.length; elementIndex++){
	      var queryElement = queryElements[elementIndex],
	      keyArray = keys[queryKey];

	      for(var keyIndex = 0; keyIndex < keyArray.length; keyIndex++){
	        vector[vectorCount] = queryElement[keyArray[keyIndex]][year];
	        vectorCount++;
	      }
	    }
	  }
	  scenarioVector[si] = vector;
	}

	console.log('processScenarioYear end', new Date())
	return scenarioVector;
}

// Input processing from scenarios
function processInputs(inputs){
	var result = {};
	for(var input in inputs){
		result[input] = {};
		result[input][inputs[input]] = 1;
	}
	return result;
}

// Be careful, need to make deep copies of objects
function combineInputs(inputs0, inputs1) {
	var result = {};
	var types = d3.keys(inputs0).concat(d3.keys(inputs1)).unique();
	for(var i = 0; i < types.length; i++){
		var type = types[i];
		result[type] = {};
		if(typeof(inputs0[type]) != "undefined"){
			for(var value in inputs0[type]){
				result[type][value] = inputs0[type][value];
			}

			if(typeof(inputs1[type]) != "undefined"){
				for(var value in inputs1[type]){
					if(result[type][value])
						result[type][value] += inputs1[type][value];
					else
						result[type][value] = inputs1[type][value];
				}
			}
		}
		else if(typeof(inputs1[type]) != "undefined"){
			for(var value in inputs1[type]){
				result[type][value] = inputs1[type][value];
			}
		}
		else{
			console.log('this is odd')
		}
	}
	return result;
}

function diffInputs(inputs0, inputs1){
	var types = d3.keys(inputs0).concat(d3.keys(inputs1)).unique();

	var maxType = '',
	max = 0;
	for(var i = 0; i < types.length; i++){
		var type = types[i];
		var sum = 0;		

		if(typeof(inputs0[type]) != "undefined"){
			if(typeof(inputs1[type]) != "undefined"){
				var values = d3.keys(inputs0[type]).concat(d3.keys(inputs1[type])).unique();

				for(var j = 0; j < values.length; j++){
					var value = values[j];
					if(inputs0[type][value]){
						if(inputs1[type][value]){
							sum += Math.abs(inputs0[type][value] - inputs1[type][value]);
						}
						else{
							sum += inputs0[type][value];
						}
					}
					else{
						sum += inputs1[type][value];
					}
				}
			}
			else{
				for(var value in inputs0[type]){
					sum += inputs0[type][value];
				}
			}
		}
		else if(typeof(inputs1[type]) != "undefined"){
			for(var value in inputs1[type]){
				sum += inputs1[type][value];
			}
		}
		else{
			console.log('this is odd')
		}
		// console.log('type: ' + type + ', sum: ' + sum);

		if(sum > max){
			maxType = type;
			max = sum;
		}
	}
	// console.log('type: ' + maxType + ', count: ' + max);
	return maxType;
}

var scenarioInputs = {}, inputs = [];
function processAllInputs(){
	for(var scenario in clusterData){
		scenarioInputs[scenario] = processInputs(clusterData[scenario].scenario.inputs);
		inputs.push(processInputs(clusterData[scenario].scenario.inputs));
	}
}

function printInputs(inputs){
	console.log(JSON.stringify(inputs));
}