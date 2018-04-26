$(function () {
	$("#dialog-par").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		buttons: [
			{
				text: "Add Axis",
				click: addParAxis,
				"class": "ui-button-success"
			},
			{
				text: "Clear Plot",
				click: clearPar,
				"class": "ui-button-warning"
			},
			{
				text: "Done",
				click: function () {
					$(this).dialog("close");
				}
			}
		]
	});
});

//prepare the parallel coordinate plot: 1) inserting the valid output types into the select box. 2) validating the input
function prepareParCoor(parentKeys, childKeys) {
	console.log(parentKeys, childKeys);
	//empty the container
	// $("#lct-main-container").empty();
	//dynamically load the parent keys from the data user selected
	$.each(parentKeys, function (index, value) {
		$("#par-parentkey-select").append($("<option ></option>").attr("value", index).text(value));
	});
	$("#par-parentkey-select option[value=0]").attr("selected", "selected");//set the first element in the parentKeys as the default value

	//set childKeys of the first parent key as the default value
	$.each(childKeys[parentKeys[0]], function (index, value) {
		$("#par-childkey-select").append($("<option></option>").attr("value", index).text(value));
	});

	//dynamically load the child keys from the parent key user selected
	$("#par-parentkey-select").change(function () {
		$("#par-childkey-select").empty();
		var parentkey = $("#par-parentkey-select option:selected").text();
		var validChildKeys = childKeys[parentkey];
		$.each(validChildKeys, function (index, value) {
			$("#par-childkey-select").append($("<option></option>").attr("value", index).text(value));
		})
	});

	// set the first element of the child keys as the default option
	$("#par-childkey-select option[value=0]").attr("selected", "selected");

	$("#par-load-btn").click(function () {
		if (parCoorKeysValid()) {
			state.parCoor.obj = state.server ? new parCoorNew(state.parCoor.filenames, null, state.parCoor.country) : new parCoor(state.parCoor.filenames, null, state.parCoor.country);
		}
	});

	state.parCoor.axisKeys = getSelectedFeatures();
}

function addParAxis() {
	var parentkey = $("#par-parentkey-select option:selected").text();
	var childKey = $("#par-childkey-select option:selected").text();
	// console.log(parentkey, childKey);
	if (!state.parCoor.axisKeys[parentkey])
		state.parCoor.axisKeys[parentkey] = [childKey];
	else if (state.parCoor.axisKeys[parentkey].indexOf(childKey) == -1) {
		state.parCoor.axisKeys[parentkey].push(childKey);
	}

	if (parCoorKeysValid()) {
		state.parCoor.obj = state.server ? new parCoorNew(state.parCoor.filenames, null, state.parCoor.country) : new parCoor(state.parCoor.filenames, null, state.parCoor.country);
	}
}

function clearPar() {
	d3.select("#par-svg-container").select("svg").remove();
	state.parCoor.axisKeys = {};
}

function parCoorKeysValid() {
	var keys = d3.keys(state.parCoor.axisKeys);
	if (keys.length > 1) {
		return true;
	}

	var featureCount = 0;
	for (var axisKey in state.parCoor.axisKeys) {
		featureCount += state.parCoor.axisKeys[axisKey].length;
	}

	if (featureCount > 1) {
		return true;
	}

	return false;
}

function linearRegression(y, x) {
	var lr = {};
	var n = y.length;
	var sum_x = 0;
	var sum_y = 0;
	var sum_xy = 0;
	var sum_xx = 0;
	var sum_yy = 0;

	for (var i = 0; i < y.length; i++) {

		sum_x += x[i];
		sum_y += y[i];
		sum_xy += (x[i] * y[i]);
		sum_xx += (x[i] * x[i]);
		sum_yy += (y[i] * y[i]);
	}

	lr['slope'] = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
	lr['intercept'] = (sum_y - lr.slope * sum_x) / n;
	lr['r2'] = Math.pow((n * sum_xy - sum_x * sum_y) / Math.sqrt((n * sum_xx - sum_x * sum_x) * (n * sum_yy - sum_y * sum_y)), 2);

	return lr;
}

function parCoor(filenames, update, country) {
	var self = this;
	this.names = [];

	state.parCoor.filenames = filenames.slice();
	state.parCoor.country = country;
	var axisKeys = state.parCoor.axisKeys;

	if (!parCoorKeysValid() || filenames.length == 0)
		return;

	var filename = filenames[0];

	$('#par-title').show();

	var title = filename.split('.geojson')[0];

	if (country) {
		title = country.name + ': ' + title;
		console.log(country, country.index);
	}

	var margin = {
		top: 20,
		right: 20,
		bottom: 10,
		left: 20
	},
		padding = {
			top: 10,
			right: 10,
			bottom: 10,
			left: 10
		},
		svgWidth = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right,
		svgHeight = $("#par-container").height() * state.sizes.parCoor.main.height - margin.top - margin.bottom - padding.top - padding.bottom,
		width = $("#par-container").height() - margin.left - margin.right - padding.left - padding.right,
		height = $("#par-container").width() * state.sizes.parCoor.main.height - margin.top - margin.bottom - padding.top - padding.bottom,
		difference = Math.abs($("#par-container").height() - $("#par-container").width()) / 2;

	if ($("#par-container").width() > $("#par-container").height()) {
		difference *= -1;
	}

	d3.select("#par-svg-container").select("svg").remove();

	var svg = d3.select("#par-svg-container").append("svg")
		.attr("width", svgWidth + margin.left + margin.right)
		.attr("height", svgHeight + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + difference) + "," + (margin.top + difference) + ")" + "rotate(-90, " + (svgWidth / 2) + "," + (svgHeight / 2) + ")");

	var x = d3.scale.ordinal().rangePoints([0, width], 1),
		y = {},
		dragging = {};

	var line = d3.svg.line(),
		axis = d3.svg.axis()
			.orient("left")
			.tickFormat(function (d) {
				var sign = d > 0 ? 1 : -1;
				d = Math.abs(d);
				var array = ['', 'k', 'M', 'G', 'T', 'P'];
				var i = 0;
				while (d > 1000) {
					i++;
					d = d / 1000;
				}

				d = d + '' + array[i];

				return (sign == -1 ? '-' : '') + d;
			}),
		background,
		foreground;

	var continents = {
		"Africa": [],
		"Europe": [],
		"Asia": [],
		"North America": [],
		"South America": [],
		"Antarctica": [],
		"Australia": []
	};

	var color = d3.scale.ordinal()
		.domain(d3.keys(continents))
		.range(colorbrewer.Set1[7]);

	/*var dedup = [0],
	dedupData = [],
	tableIndex = 0;*/

	// console.log("pcData: ", pcData.length);
	var pcData = clusterData[filename].data,
		scenarioData = clusterData[filename],
		idMode = 0,
		dataMode = 1;

	var tableData = new Array();

	if (filenames.length == 1 && typeof (country) == "undefined") {
		// console.log('filenames.length == 1: ', filenames);

		scenarioData["properties"].forEach(function (obj, i) {
			if (scenarioData["hasData"][i]) {
				tableData.push([
					scenarioData["ids"][i],
					obj.REGION_NAME
				]);
			}
		});
	}
	else if (filenames.length > 2 || typeof (country) != "undefined" || (filenames.length == 2 && state.parCoor.plot == "1")) {
		// console.log('filenames.length > 2: ', filenames);

		idMode = 1,
			pcData = filenames;
		var stop = false;

		for (var pIndex = 0; pIndex < filenames.length; pIndex++) {
			var name = filenames[pIndex];

			tableData.push([
				name.split('.geojson')[0],
				clusterData[name].scenario.name
			]);

			if (pIndex && pIndex < 10)
				title += " vs " + name.split('.geojson')[0];
			else if (pIndex && !stop) {
				stop = true;
				title += "...";
			}
		}
	}
	else {
		pcData = filenames;

		title += " vs " + filenames[1].split('.geojson')[0];

		scenarioData["properties"].forEach(function (obj, i) {
			if (scenarioData["hasData"][i]) {
				tableData.push([
					scenarioData["ids"][i],
					obj.REGION_NAME
				]);
			}
		});
	}

	// console.log("tableData: ", tableData);

	function computeY(dimension, key, query, data) {
		var extent = 0;
		if (filenames.length == 1) {
			var queryData = data[query];
			if (state.parCoor.plot == "0") {
				extent = d3.extent(queryData, function (p, i) {
					var value = state.parCoor.year == -1 ? d3.sum(p[key]) + "" : p[key][state.parCoor.year];

					// console.log('index: ' + i);
					if (!dedupData[i])
						dedupData[i] = { GCAM_ID: tableData[i][0] };

					dedupData[i][dimension] = value;
					tableData[i].push(value);
					return +value;
				});
			}
			else {
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				queryData.forEach(function (p, i) {
					var yLinear = [];
					state.yearsScaled.forEach(function (n, i) { yLinear.push(+p[key][i]); });

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					if (!dedupData[i]) {
						dedupData[i] = { GCAM_ID: tableData[i][0] };
					}

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if (typeof (max) == "undefined") {
						max = value;
						min = value;
					}
					else {
						if (max < value)
							max = value;

						if (min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function (p, i) {
					var scale = d3.scale.linear().domain([-range, range]).range([-1, 1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});

			}
		}
		else if (filenames.length > 2 || typeof (country) != "undefined") {
			if (state.parCoor.plot == "0") {
				extent = d3.extent(data, function (file, i) {
					var value = 0,
						// scenarioData = clusterData[p];
						// queryData is the specified file's query array, which has an element for each country and a key for each query type
						queryData = clusterData[file].data[query];

					if (!dedupData[i])
						dedupData[i] = { name: tableData[i][0] };

					/*for(var countryIndex = 0; countryIndex < scenarioData["hasData"].length; countryIndex++){
						if(scenarioData["hasData"][i]){
							value += state.parCoor.year == -1 ? d3.sum(scenarioData.data[query][i][key]) : +scenarioData.data[query][i][key][state.parCoor.year];
						}
					}*/

					if (typeof (country) != "undefined") {
						value = state.parCoor.year == -1 ? d3.sum(queryData[country.index][key]) : +queryData[country.index][key][state.parCoor.year];
					}
					else {
						for (var countryIndex = 0; countryIndex < queryData.length; countryIndex++) {
							value += state.parCoor.year == -1 ? d3.sum(queryData[countryIndex][key]) : +queryData[countryIndex][key][state.parCoor.year];
						}
					}


					dedupData[i][dimension] = value;
					tableData[i].push(value);
					return +value;
				});
			}
			else {
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				data.forEach(function (p, i) {

					var queryData = clusterData[p].data[query];

					if (!dedupData[i])
						dedupData[i] = { name: tableData[i][0] };

					var yLinear = [];
					state.yearsScaled.forEach(function (n, i) {
						var value = 0;

						for (var countryIndex = 0; countryIndex < queryData.length; countryIndex++) {
							value += +queryData[countryIndex][key][i];
						}

						yLinear.push(value);
					});

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if (typeof (max) == "undefined") {
						max = value;
						min = value;
					}
					else {
						if (max < value)
							max = value;

						if (min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function (p, i) {
					var scale = d3.scale.linear().domain([-range, range]).range([-1, 1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});
			}
		}
		else {
			extent = [-1, 1];

			var filename2 = filenames[1];
			var d1 = clusterData[filename].data[query],
				d2 = clusterData[filename2].data[query];

			if (state.parCoor.plot == "0") {
				for (var countryIndex = 0; countryIndex < d1.length; countryIndex++) {
					var value = 0;

					if (!dedupData[countryIndex])
						dedupData[countryIndex] = { GCAM_ID: tableData[countryIndex][0] };

					if (state.parCoor.year == -1) {
						var d1Sum = d3.sum(d1[countryIndex][key]),
							d2Sum = d3.sum(d2[countryIndex][key]);

						var max = d3.max([d1Sum, d2Sum]);
						var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
						value = scale((+d1Sum) - (+d2Sum));
					}
					else {

						var max = d3.max([(+d1[countryIndex][key][state.parCoor.year]), (+d2[countryIndex][key][state.parCoor.year])]);
						var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
						value = scale((+d1[countryIndex][key][state.parCoor.year]) - (+d2[countryIndex][key][state.parCoor.year]));
					}

					dedupData[countryIndex][dimension] = value;
					tableData[countryIndex].push(value);
				}
			}
			else {
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				data.forEach(function (p, i) {

					var queryData = clusterData[p].data[query];

					if (!dedupData[i])
						dedupData[i] = { name: tableData[i][0] };

					var yLinear = [];
					state.yearsScaled.forEach(function (n, i) {
						var value = 0;

						for (var countryIndex = 0; countryIndex < queryData.length; countryIndex++) {
							value += +queryData[countryIndex][key][i];
						}

						yLinear.push(value);
					});

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if (typeof (max) == "undefined") {
						max = value;
						min = value;
					}
					else {
						if (max < value)
							max = value;

						if (min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function (p, i) {
					var scale = d3.scale.linear().domain([-range, range]).range([-1, 1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});

			}
		}

		// console.log("extent(", dimension, "): ", extent);
		y[dimension] = d3.scale.linear()
			.domain(extent)
			.range([height, 0]);
	}

	var dimensions = [],
		dedupData = [];

	for (var query in axisKeys) {
		if (axisKeys[query].length == 1 && axisKeys[query][0] == "data") {
			dimensions.push(query);
			computeY(query, "data", query, pcData);
		}
		else {
			for (var keyIndex = 0; keyIndex < axisKeys[query].length; keyIndex++) {
				var key = axisKeys[query][keyIndex];
				dimensions.push(key);
				computeY(key, key, query, pcData);
			}
		}
	}

	x.domain(dimensions);

	pcData = dedupData;

	// console.log('pcData: ', pcData);

	$('#par-title label').html(title);

	// Add grey background lines for context.
	background = svg.append("g")
		.attr("class", "background")
		.selectAll("path")
		.data(pcData)
		.enter().append("path")
		.attr("d", path)
		.on('mouseover', pathMouseOver)
		.on('mouseout', pathMouseOut);

	// Add blue foreground lines for focus.
	foreground = svg.append("g")
		.attr("class", "foreground")
		.selectAll("path")
		.data(pcData)
		.enter().append("path")
		.attr("d", path)
		.attr("id", function (d) {
			if (idMode)
				return 'path_GCAM_ID_' + d.name;
			else
				return 'path_GCAM_ID_' + d.GCAM_ID;
		})
		.on('mouseover', pathMouseOver)
		.on('mouseout', pathMouseOut);

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function (d) {
			return "translate(" + x(d) + ")";
		})
		.call(d3.behavior.drag()
			.origin(function (d) {
				return {
					x: x(d)
				};
			})
			.on("dragstart", function (d) {
				dragging[d] = x(d);
				background.attr("visibility", "hidden");
			})
			.on("drag", function (d) {
				dragging[d] = Math.min(width, Math.max(0, d3.event.x));
				foreground.attr("d", path);
				dimensions.sort(function (a, b) {
					return position(a) - position(b);
				});
				x.domain(dimensions);
				g.attr("transform", function (d) {
					return "translate(" + position(d) + ")";
				})
			})
			.on("dragend", function (d) {
				delete dragging[d];
				transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
				transition(foreground).attr("d", path);
				background
					.attr("d", path)
					.transition()
					.delay(500)
					.duration(0)
					.attr("visibility", null);
			}));

	// Add an axis and title.
	var tempAxis = g.append("g")
		.attr("class", "axis")
		.each(function (d) {
			d3.select(this).call(axis.scale(y[d]));
		});

	tempAxis.selectAll("text")
		.attr("y", 9)
		.attr("x", 0)
		.attr("dy", ".35em")
		.attr("transform", "rotate(90)")
		.style("text-anchor", "middle");

	tempAxis.append("text")
		.style("text-anchor", "start")
		.attr("x", 0)
		.attr("y", -9)
		.attr("transform", "rotate(90)")
		.text(function (d) {
			var text = d;
			if (clusterMetrics[d] != "N/V" && clusterMetrics[d] != "N/A")
				text += " (" + clusterMetrics[d] + ")";
			return text;
		});

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function (d) {
			d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush).on("brushend", brushend));
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);

	// dataTable(dimensions, tableData, false, idMode);
	// redrawTable();

	function position(d) {
		var v = dragging[d];
		return v == null ? x(d) : v;
	}

	function transition(g) {
		return g.transition().duration(500);
	}

	// Returns the path for a given data point.
	function path(d) {
		return line(dimensions.map(function (p) {
			// console.log(p, ': ', d[p])
			// console.log([position(p), y[p](d[p][state.parCoor.year])]);
			if (state.parCoor.plot == "0" && !dataMode)
				return [position(p), state.parCoor.year == "-1" ? y[p](d3.sum(d[p])) : y[p](d[p][state.parCoor.year])];
			else
				return [position(p), y[p](d[p])];
			/*var value;
			if(state.parCoor.plot == "0" && !dataMode)
				value = [position(p), state.parCoor.year == "-1" ? y[p](d3.sum(d[p])) : y[p](d[p][state.parCoor.year])];
			else
				value = [position(p), y[p](d[p])];

			console.log(p, ': ',value);
			return value;*/
		}));
	}

	function pathMouseOver(path, index) {
		d3.selectAll('.foreground path').style('display', function (d, i) {
			if (index == i) {
				// dataTable(dimensions, [tableData[i]], true, idMode);
				// redrawTable();

				$("circle[name*='denver']").each(function (i, d) {
					var element = $(d);
					element.addClass('not-selected');
				});

				var el = $("circle[name='" + tableData[i][0] + "']");
				el.removeClass('not-selected');
				el.addClass('selected');

				return null;
			}
			else
				return 'none';
		});
	}

	function pathMouseOut(path) {
		if (!self.highlightActive()) {
			d3.selectAll('.foreground path').style('display', null);
			// dataTable(dimensions, tableData, false, idMode);
			// redrawTable();

			$("circle[name*='denver']").each(function (i, d) {
				var element = $(d);
				element.removeClass('not-selected');
				element.removeClass('selected');
			});
		}
		else {
			// dataTable(dimensions, self.filterData, true, idMode);
			// redrawTable();

			if (self.names.length) {
				// console.log('remove', self.names);

				$("circle[name*='denver']").each(function (i, d) {
					var element = $(d);
					if (self.names.indexOf(element.attr('name')) == -1) {
						element.removeClass('selected');
						element.addClass('not-selected');
					}
					else {
						element.addClass('selected');
						element.removeClass('not-selected');
					}
				})
			}
		}
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		}),
			extents = actives.map(function (p) {
				return y[p].brush.extent();
			});
		foreground.style("display", function (d) {
			return actives.some(function (p, i) {
				if (state.parCoor.plot == "0" && !dataMode) {
					var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
					return extents[i][0] <= value && value <= extents[i][1];
				}
				else
					return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}) ? null : "none";
		});
	}

	function brushend() {
		var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		}),
			extents = actives.map(function (p) {
				return y[p].brush.extent();
			});
		var data = [];
		foreground.each(function (d, i) {
			if (actives.some(function (p, i) {
				if (state.parCoor.plot == "0" && !dataMode) {
					var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
					return extents[i][0] <= value && value <= extents[i][1];
				}

				else
					return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}))
				data.push(tableData[i]);
		});

		if (data.length > 0) {
			self.filterData = data;
			// console.log(data);
			var names = [];
			$.each(data, function (index, point) {
				// console.log(point[0]);
				// $( "circle[name='" + point[0] + "']" ).addClass('selected');
				names.push(point[0]);
			});

			$("circle[name*='denver']").each(function (i, d) {
				var element = $(d);
				if (names.indexOf(element.attr('name')) == -1) {
					element.addClass('not-selected');
				}
				else {
					element.addClass('selected');
					element.removeClass('not-selected');
				}
			})
			self.names = names;
			// dataTable(dimensions, data, true, idMode);
			// redrawTable();
		}
		else {
			// console.log(tableData);
			d3.selectAll('.foreground path').style('display', function (d, i) { return null; });
			if (self.names.length) {
				// console.log('remove', self.names);

				$("circle[name*='denver']").each(function (i, d) {
					var element = $(d);
					if (self.names.indexOf(element.attr('name')) == -1) {
						element.removeClass('not-selected');
					}
					else {
						element.removeClass('selected');
					}
				});
				self.names = [];
			}

			// dataTable(dimensions, tableData, false, idMode);
			// redrawTable();
		}

	}

	this.highlightActive = function () {
		var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		});
		if (actives.length > 0) {
			var extents = actives.map(function (p) {
				return y[p].brush.extent();
			});
			foreground.style("display", function (d) {
				return actives.some(function (p, i) {
					if (state.parCoor.plot == "0" && !dataMode) {
						var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
						return extents[i][0] <= value && value <= extents[i][1];
					}
					else
						return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				}) ? null : "none";
			});
			// console.log("highlightActive: ", true);
			return true;
		}
		// console.log("highlightActive: ", false);
		return false;
	}

	hideLoading();
}
function parCoorNew(filenames, update, country) {
	var self = this;
	this.names = [];

	state.parCoor.filenames = filenames.slice();
	state.parCoor.country = country;
	var axisKeys = state.parCoor.axisKeys;

	if (!parCoorKeysValid() || filenames.length == 0)
		return;

	var filename = filenames[0];

	$('#par-title').show();

	var title = filename.split('.geojson')[0];

	if (country) {
		title = country.name + ': ' + title;
		console.log(country, country.index);
	}

	var margin = {
		top: 20,
		right: 20,
		bottom: 10,
		left: 20
	},
		padding = {
			top: 10,
			right: 10,
			bottom: 10,
			left: 10
		},
		svgWidth = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right,
		svgHeight = $("#par-container").height() * state.sizes.parCoor.main.height - margin.top - margin.bottom - padding.top - padding.bottom,
		width = $("#par-container").height() - margin.left - margin.right - padding.left - padding.right,
		height = $("#par-container").width() * state.sizes.parCoor.main.height - margin.top - margin.bottom - padding.top - padding.bottom,
		difference = Math.abs($("#par-container").height() - $("#par-container").width()) / 2;

	if ($("#par-container").width() > $("#par-container").height()) {
		difference *= -1;
	}

	d3.select("#par-svg-container").select("svg").remove();

	var svg = d3.select("#par-svg-container").append("svg")
		.attr("width", svgWidth + margin.left + margin.right)
		.attr("height", svgHeight + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + difference) + "," + (margin.top + difference) + ")" + "rotate(-90, " + (svgWidth / 2) + "," + (svgHeight / 2) + ")");

	var x = d3.scale.ordinal().rangePoints([0, width], 1),
		y = {},
		dragging = {};

	var line = d3.svg.line().defined(function (d) { return d; }),
		axis = d3.svg.axis()
			.orient("left")
			.tickFormat(function (d) {
				var sign = d > 0 ? 1 : -1;
				d = Math.abs(d);
				var array = ['', 'k', 'M', 'G', 'T', 'P'];
				var i = 0;
				while (d > 1000) {
					i++;
					d = d / 1000;
				}

				d = d + '' + array[i];

				return (sign == -1 ? '-' : '') + d;
			}),
		background,
		foreground;

	var continents = {
		"Africa": [],
		"Europe": [],
		"Asia": [],
		"North America": [],
		"South America": [],
		"Antarctica": [],
		"Australia": []
	};

	var color = d3.scale.ordinal()
		.domain(d3.keys(continents))
		.range(colorbrewer.Set1[7]);

	/*var dedup = [0],
	dedupData = [],
	tableIndex = 0;*/

	// console.log("pcData: ", pcData.length);
	var pcData = clusterData[filename].data,
		scenarioData = clusterData[filename],
		idMode = 0,
		dataMode = 1;

	var tableData = new Array();

	if (filenames.length == 1 && typeof (country) == "undefined") {
		// console.log('filenames.length == 1: ', filenames);

		/*scenarioData["properties"].forEach(function (obj, i) {
			if (scenarioData["hasData"][i]) {
				tableData.push([
					scenarioData["ids"][i],
					obj.REGION_NAME
				]);
			}
		});*/
	}
	else if (filenames.length > 2 || typeof (country) != "undefined" || (filenames.length == 2 && state.parCoor.plot == "1")) {
		// console.log('filenames.length > 2: ', filenames);

		idMode = 1,
			pcData = filenames;
		var stop = false;

		for (var pIndex = 0; pIndex < filenames.length; pIndex++) {
			var name = filenames[pIndex];

			tableData.push([
				name.split('.geojson')[0],
				clusterData[name].scenario.name
			]);

			if (pIndex && pIndex < 6)
				title += " vs " + name.split('.geojson')[0];
			else if (pIndex && !stop) {
				stop = true;
				title += "...";
			}
		}
	}
	else {
		pcData = filenames;

		title += " vs " + filenames[1].split('.geojson')[0];

		/*scenarioData["properties"].forEach(function (obj, i) {
			if (scenarioData["hasData"][i]) {
				tableData.push([
					scenarioData["ids"][i],
					obj.REGION_NAME
				]);
			}
		});*/
	}

	// console.log("tableData: ", tableData);

	function computeY(dimension, key, query, data) {
		var extent = 0;
		if (filenames.length == 1) {
			var queryData = data[query][key];
			if (state.parCoor.plot == "0") {
				if (typeof (queryData[0]) == "number") {
					var value = state.parCoor.year == -1 ? d3.sum(queryData) + "" : queryData[data[query].yearMap[state.parCoor.yearValue]];
					extent = d3.extent([0, value]);

					if (!dedupData[0])
						dedupData[0] = {};

					dedupData[0][dimension] = value;
				}
				else {
					extent = d3.extent(queryData, function (p, i) {
						var value = state.parCoor.year == -1 ? d3.sum(p) + "" : p[data[query].yearMap[state.parCoor.yearValue]];

						if (!dedupData[i])
							dedupData[i] = {};

						dedupData[i][dimension] = value;

						return +value;
					});
				}
			}
			else {
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				queryData.forEach(function (p, i) {
					var yLinear = [];
					state.yearsScaled.forEach(function (n, i) { yLinear.push(+p[key][i]); });

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					if (!dedupData[i]) {
						dedupData[i] = { GCAM_ID: tableData[i][0] };
					}

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if (typeof (max) == "undefined") {
						max = value;
						min = value;
					}
					else {
						if (max < value)
							max = value;

						if (min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function (p, i) {
					var scale = d3.scale.linear().domain([-range, range]).range([-1, 1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});

			}
		}
		else if (filenames.length > 2 || typeof (country) != "undefined") {
			if (state.parCoor.plot == "0") {
				extent = d3.extent(data, function (file, i) {
					var value = 0,
						// queryData is the specified file's query array, which has an element for each country and a key for each query type
						queryData = clusterData[file].data[query];

					if (!dedupData[i])
						dedupData[i] = { name: tableData[i][0] };

					if (typeof (country) != "undefined") {
						value = state.parCoor.year == -1 ? d3.sum(queryData[country.index][key]) : +queryData[country.index][key][state.parCoor.year];
					}
					else {
						value = state.parCoor.year == -1 ?
							d3.sum(
								queryData.scenarioData ?
									queryData.scenarioData :
									queryData[key]
							) :
							(
								queryData.scenarioData ?
									queryData.scenarioData[queryData.yearMap[state.parCoor.yearValue]] :
									queryData[key][queryData.yearMap[state.parCoor.yearValue]]
							);
					}


					dedupData[i][dimension] = value;
					tableData[i].push(value);
					return +value;
				});
			}
			else {
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				data.forEach(function (p, i) {

					var queryData = clusterData[p].data[query];

					if (!dedupData[i])
						dedupData[i] = { name: tableData[i][0] };

					var yLinear = [];
					state.yearsScaled.forEach(function (n, i) {
						var value = 0;

						for (var countryIndex = 0; countryIndex < queryData.length; countryIndex++) {
							value += +queryData[countryIndex][key][i];
						}

						yLinear.push(value);
					});

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if (typeof (max) == "undefined") {
						max = value;
						min = value;
					}
					else {
						if (max < value)
							max = value;

						if (min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function (p, i) {
					var scale = d3.scale.linear().domain([-range, range]).range([-1, 1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});
			}
		}
		else {
			extent = [-1, 1];

			var filename2 = filenames[1];
			var d1 = clusterData[filename].data[query],
				d2 = clusterData[filename2].data[query];

			if (state.parCoor.plot == "0") {
				if (typeof (d1[key][0]) == "number") {
					var value = 0;

					if (!dedupData[0])
						dedupData[0] = {};

					if (state.parCoor.year == -1) {
						var d1Sum = d3.sum(d1[key]),
							d2Sum = d3.sum(d2[key]);

						var max = d3.max([d1Sum, d2Sum]);
						var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
						value = scale((+d1Sum) - (+d2Sum));
					}
					else {
						var max = d3.max([(+d1[key][d1.yearMap[state.parCoor.yearValue]]), (+d2[key][d2.yearMap[state.parCoor.yearValue]])]);
						var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
						value = scale((+d1[key][d1.yearMap[state.parCoor.yearValue]]) - (+d2[key][d2.yearMap[state.parCoor.yearValue]]));
					}

					dedupData[0][dimension] = value;
					// tableData[0].push(value);
				}
				else {
					var value = 0;

					if (state.parCoor.year == -1) {
						for (var subIndex = 0; subIndex < d1[key].length; subIndex++) {
							if (!dedupData[subIndex])
								dedupData[subIndex] = {};

							var d1Sum = d3.sum(d1[key][subIndex]),
								d2Sum = d3.sum(d2[key][subIndex]);

							var max = d3.max([d1Sum, d2Sum]);
							var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
							value = scale((+d1Sum) - (+d2Sum));

							dedupData[subIndex][dimension] = value;
							// tableData[subIndex].push(value);
						}
					}
					else {
						for (var subIndex = 0; subIndex < d1[key].length; subIndex++) {
							if (!dedupData[subIndex])
								dedupData[subIndex] = {};

							var max = d3.max([(+d1[key][subIndex][d1.yearMap[state.parCoor.yearValue]]), (+d2[key][subIndex][d2.yearMap[state.parCoor.yearValue]])]);
							var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
							value = scale((+d1[key][subIndex][d1.yearMap[state.parCoor.yearValue]]) - (+d2[key][subIndex][d2.yearMap[state.parCoor.yearValue]]));

							dedupData[subIndex][dimension] = value;
							// tableData[subIndex].push(value);
						}
					}
				}
				// for (var countryIndex = 0; countryIndex < d1.length; countryIndex++) {
				// 	var value = 0;

				// 	if (!dedupData[countryIndex])
				// 		dedupData[countryIndex] = { GCAM_ID: tableData[countryIndex][0] };

				// 	if (state.parCoor.year == -1) {
				// 		var d1Sum = d3.sum(d1[countryIndex][key]),
				// 			d2Sum = d3.sum(d2[countryIndex][key]);

				// 		var max = d3.max([d1Sum, d2Sum]);
				// 		var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
				// 		value = scale((+d1Sum) - (+d2Sum));
				// 	}
				// 	else {

				// 		var max = d3.max([(+d1[countryIndex][key][state.parCoor.year]), (+d2[countryIndex][key][state.parCoor.year])]);
				// 		var scale = d3.scale.linear().domain([-max, max]).range([-1, 1]);
				// 		value = scale((+d1[countryIndex][key][state.parCoor.year]) - (+d2[countryIndex][key][state.parCoor.year]));
				// 	}

				// 	dedupData[countryIndex][dimension] = value;
				// 	tableData[countryIndex].push(value);
				// }
			}
			else {
				extent = [-1, 1];

				//Do linearRegression
				var min,
					max;

				data.forEach(function (p, i) {

					var queryData = clusterData[p].data[query];

					if (!dedupData[i])
						dedupData[i] = { name: tableData[i][0] };

					var yLinear = [];
					state.yearsScaled.forEach(function (n, i) {
						var value = 0;

						for (var countryIndex = 0; countryIndex < queryData.length; countryIndex++) {
							value += +queryData[countryIndex][key][i];
						}

						yLinear.push(value);
					});

					var value = linearRegression(yLinear, state.yearsScaled).slope;

					// console.log(tableData[i][0] + '(' + dimension + ')' + ': ' + value + ", ", yLinear);

					dedupData[i][dimension] = value;
					// tableData[i].push(value);

					if (typeof (max) == "undefined") {
						max = value;
						min = value;
					}
					else {
						if (max < value)
							max = value;

						if (min > value)
							min = value;
					}
				})

				// Feature Scaling
				var range = Math.abs(max) >= Math.abs(min) ? Math.abs(max) : Math.abs(min);
				dedupData.forEach(function (p, i) {
					var scale = d3.scale.linear().domain([-range, range]).range([-1, 1]);

					p[dimension] = scale(p[dimension]);
					tableData[i].push(p[dimension]);
				});

			}
		}

		// console.log("extent(", dimension, "): ", extent);
		y[dimension] = d3.scale.linear()
			.domain(extent)
			.range([height, 0]);
	}

	var dimensions = [],
		dedupData = [];

	for (var query in axisKeys) {
		if (axisKeys[query].length == 1 && axisKeys[query][0] == "data") {
			dimensions.push(query);
			computeY(query, "data", query, pcData);
		}
		else {
			for (var keyIndex = 0; keyIndex < axisKeys[query].length; keyIndex++) {
				var key = axisKeys[query][keyIndex];
				dimensions.push(key);
				computeY(key, key, query, pcData);
			}
		}
	}

	x.domain(dimensions);

	pcData = dedupData;

	// console.log('pcData: ', pcData);

	$('#par-title label').html(title);

	// Add grey background lines for context.
	background = svg.append("g")
		.attr("class", "background")
		.selectAll("path")
		.data(pcData)
		.enter().append("path")
		.attr("d", path)
		.on('mouseover', pathMouseOver)
		.on('mouseout', pathMouseOut);

	// Add blue foreground lines for focus.
	foreground = svg.append("g")
		.attr("class", "foreground")
		.selectAll("path")
		.data(pcData)
		.enter().append("path")
		.attr("d", path)
		.attr("id", function (d) {
			if (idMode)
				return 'path_GCAM_ID_' + d.name;
			else
				return 'path_GCAM_ID_' + d.GCAM_ID;
		})
		.on('mouseover', pathMouseOver)
		.on('mouseout', pathMouseOut);

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function (d) {
			return "translate(" + x(d) + ")";
		})
		.call(d3.behavior.drag()
			.origin(function (d) {
				return {
					x: x(d)
				};
			})
			.on("dragstart", function (d) {
				dragging[d] = x(d);
				background.attr("visibility", "hidden");
			})
			.on("drag", function (d) {
				dragging[d] = Math.min(width, Math.max(0, d3.event.x));
				foreground.attr("d", path);
				dimensions.sort(function (a, b) {
					return position(a) - position(b);
				});
				x.domain(dimensions);
				g.attr("transform", function (d) {
					return "translate(" + position(d) + ")";
				})
			})
			.on("dragend", function (d) {
				delete dragging[d];
				transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
				transition(foreground).attr("d", path);
				background
					.attr("d", path)
					.transition()
					.delay(500)
					.duration(0)
					.attr("visibility", null);
			}));

	// Add an axis and title.
	var tempAxis = g.append("g")
		.attr("class", "axis")
		.each(function (d) {
			d3.select(this).call(axis.scale(y[d]));
		});

	tempAxis.selectAll("text")
		.attr("y", 9)
		.attr("x", 0)
		.attr("dy", ".35em")
		.attr("transform", "rotate(90)")
		.style("text-anchor", "middle");

	tempAxis.append("text")
		.style("text-anchor", "start")
		.attr("x", 0)
		.attr("y", -9)
		.attr("transform", "rotate(90)")
		.text(function (d) {
			var text = d;
			if (clusterMetrics[d] != "N/V" && clusterMetrics[d] != "N/A")
				text += " (" + clusterMetrics[d] + ")";
			return text;
		});

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function (d) {
			d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush).on("brushend", brushend));
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);

	// dataTable(dimensions, tableData, false, idMode);
	// redrawTable();

	function position(d) {
		var v = dragging[d];
		return v == null ? x(d) : v;
	}

	function transition(g) {
		return g.transition().duration(500);
	}

	// Returns the path for a given data point.
	function path(d) {
		return line(dimensions.map(function (p) {
			console.log(p, ':', d[p])
			if (d[p] == undefined)
				return null;
			// console.log([position(p), y[p](d[p][state.parCoor.year])]);
			if (state.parCoor.plot == "0" && !dataMode) {
				return [position(p), state.parCoor.year == "-1" ? y[p](d3.sum(d[p])) : y[p](d[p][state.parCoor.year])];
			}
			else
				return [position(p), y[p](d[p])];
			/*var value;
			if(state.parCoor.plot == "0" && !dataMode)
				value = [position(p), state.parCoor.year == "-1" ? y[p](d3.sum(d[p])) : y[p](d[p][state.parCoor.year])];
			else
				value = [position(p), y[p](d[p])];

			console.log(p, ': ',value);
			return value;*/
		}));
	}

	function pathMouseOver(path, index) {
		d3.selectAll('.foreground path').style('display', function (d, i) {
			if (index == i) {
				// dataTable(dimensions, [tableData[i]], true, idMode);
				// redrawTable();

				$("circle[id*='clu-point']").each(function (i, d) {
					var element = $(d);
					element.addClass('not-selected');
				});

				if (tableData[i]) {
					var el = $("circle[name='" + tableData[i][0] + "']");
					el.removeClass('not-selected');
					el.addClass('selected');
				}

				return null;
			}
			else
				return 'none';
		});
	}

	function pathMouseOut(path) {
		if (!self.highlightActive()) {
			d3.selectAll('.foreground path').style('display', null);
			// dataTable(dimensions, tableData, false, idMode);
			// redrawTable();

			$("circle[id*='clu-point']").each(function (i, d) {
				var element = $(d);
				element.removeClass('not-selected');
				element.removeClass('selected');
			});
		}
		else {
			// dataTable(dimensions, self.filterData, true, idMode);
			// redrawTable();

			if (self.names.length) {
				// console.log('remove', self.names);

				$("circle[id*='clu-point']").each(function (i, d) {
					var element = $(d);
					if (self.names.indexOf(element.attr('name')) == -1) {
						element.removeClass('selected');
						element.addClass('not-selected');
					}
					else {
						element.addClass('selected');
						element.removeClass('not-selected');
					}
				})
			}
		}
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		}),
			extents = actives.map(function (p) {
				return y[p].brush.extent();
			});
		foreground.style("display", function (d) {
			return actives.some(function (p, i) {
				if (state.parCoor.plot == "0" && !dataMode) {
					var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
					return extents[i][0] <= value && value <= extents[i][1];
				}
				else
					return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}) ? null : "none";
		});
	}

	function brushend() {
		var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		}),
			extents = actives.map(function (p) {
				return y[p].brush.extent();
			});
		var data = [];
		foreground.each(function (d, i) {
			if (actives.some(function (p, i) {
				if (state.parCoor.plot == "0" && !dataMode) {
					var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
					return extents[i][0] <= value && value <= extents[i][1];
				}

				else
					return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}))
				data.push(tableData[i]);
		});

		if (data.length > 0) {
			self.filterData = data;
			// console.log(data);
			var names = [];
			$.each(data, function (index, point) {
				// console.log(point[0]);
				// $( "circle[name='" + point[0] + "']" ).addClass('selected');
				names.push(point[0]);
			});

			$("circle[id*='clu-point']").each(function (i, d) {
				var element = $(d);
				if (names.indexOf(element.attr('name')) == -1) {
					element.addClass('not-selected');
				}
				else {
					element.addClass('selected');
					element.removeClass('not-selected');
				}
			})
			self.names = names;
			// dataTable(dimensions, data, true, idMode);
			// redrawTable();
		}
		else {
			// console.log(tableData);
			d3.selectAll('.foreground path').style('display', function (d, i) { return null; });
			if (self.names.length) {
				// console.log('remove', self.names);

				$("circle[id*='clu-point']").each(function (i, d) {
					var element = $(d);
					if (self.names.indexOf(element.attr('name')) == -1) {
						element.removeClass('not-selected');
					}
					else {
						element.removeClass('selected');
					}
				});
				self.names = [];
			}

			// dataTable(dimensions, tableData, false, idMode);
			// redrawTable();
		}

	}

	this.highlightActive = function () {
		var actives = dimensions.filter(function (p) {
			return !y[p].brush.empty();
		});
		if (actives.length > 0) {
			var extents = actives.map(function (p) {
				return y[p].brush.extent();
			});
			foreground.style("display", function (d) {
				return actives.some(function (p, i) {
					if (state.parCoor.plot == "0" && !dataMode) {
						var value = state.parCoor.year == "-1" ? d3.sum(d[p]) : d[p][state.parCoor.year];
						return extents[i][0] <= value && value <= extents[i][1];
					}
					else
						return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				}) ? null : "none";
			});
			// console.log("highlightActive: ", true);
			return true;
		}
		// console.log("highlightActive: ", false);
		return false;
	}

	hideLoading();
}