$(function () {
	$("#dialog-sct").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		buttons: [
			{
				text: "Add Scatter Plot",
				click: addScatterPlot,
				"class": "ui-button-success"
			},
			{
				text: "Clear All Scatter Plots",
				click: clearScatterPlots,
				"class": "ui-button-warning"
			},
			{
				text: "Done",
				click: function () {
					$(this).dialog("close");
				},
				"class": "btn btn-default"
			}
		]
	});
	$('a[href="#sct-container"]').dblclick(function () {
		$("#dialog-sct").dialog('open');
	});
});

//prepare the Scatter Plot: 1) inserting the valid output types into the select box. 2) validating the input
function prepareScatterPlot(parentKeys, childKeys) {
	//empty the container
	// $("#lct-main-container").empty();
	//dynamically load the parent keys from the data user selected
	//x-axis
	$.each(parentKeys, function (index, value) {
		$("#sct-parentkey-select-x").append($("<option ></option>").attr("value", index).text(value));
	});
	$("#sct-parentkey-select-x option[value=0]").attr("selected", "selected");//set the first element in the parentKeys as the default value

	//set childKeys of the first parent key as the default value
	$.each(childKeys[parentKeys[0]], function (index, value) {
		$("#sct-childkey-select-x").append($("<option></option>").attr("value", index).text(value));
	});

	//dynamically load the child keys from the parent key user selected
	$("#sct-parentkey-select-x").change(function () {
		$("#sct-childkey-select-x").empty();
		var parentkey = $("#sct-parentkey-select-x option:selected").text();
		var validChildKeys = childKeys[parentkey];
		$.each(validChildKeys, function (index, value) {
			$("#sct-childkey-select-x").append($("<option></option>").attr("value", index).text(value));
		})
	});

	// set the first element of the child keys as the default option
	$("#sct-childkey-select-x option[value=0]").attr("selected", "selected");



	//y-axis
	$.each(parentKeys, function (index, value) {
		$("#sct-parentkey-select-y").append($("<option ></option>").attr("value", index).text(value));
	});
	$("#sct-parentkey-select-y option[value=0]").attr("selected", "selected");//set the first element in the parentKeys as the default value

	//set childKeys of the first parent key as the default value
	$.each(childKeys[parentKeys[0]], function (index, value) {
		$("#sct-childkey-select-y").append($("<option></option>").attr("value", index).text(value));
	});

	//dynamically load the child keys from the parent key user selected
	$("#sct-parentkey-select-y").change(function () {
		$("#sct-childkey-select-y").empty();
		var parentkey = $("#sct-parentkey-select-y option:selected").text();
		var validChildKeys = childKeys[parentkey];
		$.each(validChildKeys, function (index, value) {
			$("#sct-childkey-select-y").append($("<option></option>").attr("value", index).text(value));
		})
	});

	// set the first element of the child keys as the default option
	$("#sct-childkey-select-y option[value=0]").attr("selected", "selected");
}

function addScatterPlot() {
	var parentKeys = [$("#sct-parentkey-select-x option:selected").text(), $("#sct-parentkey-select-y option:selected").text()];
	var childrenKeys = [$("#sct-childkey-select-x option:selected").text(), $("#sct-childkey-select-y option:selected").text()];

	// set the width and height of the div for each line chart
	// var width = $("#sct-main-container").width()*0.4;
	// var width = 380;
	// var height = "325";
	var width = $("#sct-main-container").width() * 0.5 - 13 - 10,
		height = $("#sct-main-container").height() * 0.5;

	// dynamically name the id so that we can get the handler of that div and remove it
	var containerId = "sct-container-" + scatterplots.plots.length;
	// inser the div
	$("#sct-main-container").append($("<div></div>").attr("width", "50%").attr("height", "50%").attr("id", containerId).addClass("sct"));
	// initialize the parameters in the line chart and return the object as the handler so that we can play with it in future
	var sct = state.server ?
		new ScatterPlotNew(parentKeys, childrenKeys, containerId, width, height, clusterData) :
		new ScatterPlot(parentKeys, childrenKeys, containerId, width, height, clusterData);
	// begin to draw the line chart
	sct.addRemovalAndBoundary();
	// sct.drawLineChart();
	// push it to our global variables
	scatterplots.plots.push(sct);
}

function clearScatterPlots() {
	$("#sct-main-container").empty();
}

function ScatterPlot(parentKeys, childrenKeys, containerId, width, height, scenarios) {
	var self = this;

	this.parentKeys = parentKeys;
	this.childrenKeys = childrenKeys;
	this.containerId = containerId;
	this.width = width;
	this.height = height;
	this.metric = undefined;

	var margin = { top: 20, right: 20, bottom: 40, left: 40 },
		// width = $('#evo-right-container').width() - margin.left - margin.right,
		// height = $('#evo-container').height() - margin.top - margin.bottom;
		// padding = {top: 10,  right: 10,  bottom: 10,  left: 0},
		padding = { top: 0, right: 0, bottom: 0, left: 0 },
		plotWidth = width - margin.left - margin.right - padding.left - padding.right,
		plotHeight = height - margin.top - margin.bottom - padding.top - padding.bottom;

	/* 
	 * value accessor - returns the value to encode for a given data object.
	 * scale - maps value to a visual display encoding, such as a pixel position.
	 * map function - maps from data value to display value
	 * axis - sets up axis
	 */

	// setup x 
	var xValue = function (d) { return d[0]; }, // data -> value
		xScale = d3.scale.linear().range([0, plotWidth]), // value -> display
		xMap = function (d) { return xScale(xValue(d)); }, // data -> display
		xAxis = d3.svg.axis().scale(xScale).orient("bottom").innerTickSize(-plotHeight).outerTickSize(0).tickPadding(10).ticks(8)
			.tickFormat(function (d) {
				var sign = d > 0 ? 1 : -1;
				d = Math.abs(d);
				var array = ['', 'k', 'M', 'G', 'T', 'P'];
				var i = 0;
				while (d > 1000) {
					i++;
					d = d / 1000;
				}

				d = d + array[i];

				return (sign == -1 ? '-' : '') + d;
			});

	// setup y
	var yValue = function (d) { return d[1]; }, // data -> value
		yScale = d3.scale.linear().range([plotHeight, 0]), // value -> display
		yMap = function (d) { return yScale(yValue(d)); }, // data -> display
		yAxis = d3.svg.axis().scale(yScale).orient("left").innerTickSize(-plotWidth).outerTickSize(0).tickPadding(10)
			.tickFormat(function (d) {
				var sign = d > 0 ? 1 : -1;
				d = Math.abs(d);
				var array = ['', 'k', 'M', 'G', 'T', 'P'];
				var i = 0;
				while (d > 1000) {
					i++;
					d = d / 1000;
				}

				d = d + array[i];

				return (sign == -1 ? '-' : '') + d;
			});

	// setup fill color
	var cValue = function (d, i) { return i; },
		color = d3.scale.category10();

	var svg = d3.select("#" + containerId).append("svg")
		.attr("width", width)
		.attr("height", height)
		// .style("display", "inline")
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var data = [];
	var dataIndex = 0;
	for (var scenarioIndex in scenarios) {
		data[dataIndex] = [0, 0];
		var sumCount = 0;
		var scenario = scenarios[scenarioIndex];

		var featureX = scenario.data[parentKeys[0]];
		var featureY = scenario.data[parentKeys[1]];

		//Total Value for each scenario
		/*for(var countryIndex = 0; countryIndex < featureX.length; countryIndex++){
			data[dataIndex][0] += d3.sum(featureX[countryIndex][childrenKeys[0]]);
			data[dataIndex][1] += d3.sum(featureY[countryIndex][childrenKeys[1]]);
		}*/

		for (var countryIndex = 0; countryIndex < featureX.length; countryIndex++) {
			data[dataIndex][0] += d3.sum(featureX[countryIndex][childrenKeys[0]]);
			data[dataIndex][1] += d3.sum(featureY[countryIndex][childrenKeys[1]]);
			sumCount += featureX[countryIndex][childrenKeys[0]].length;
		}

		data[dataIndex][0] /= sumCount;
		data[dataIndex][1] /= sumCount;

		dataIndex++;
	}

	// remove the old tooltip and add a new tooltip area to the webpage
	// $("#scatter-tip").remove();
	/*var tooltip = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .attr("id", "scatterplot-tip")
	    .style("opacity", 0.9)
	    .style("display", "none");*/
	var tooltip = d3.select('#scatterplot-tip');

	// don't want dots overlapping axis, so add in buffer to data domain
	var min = d3.min(data, xValue);
	var max = d3.max(data, xValue);
	xScale.domain([(min < 0 ? 1.2 : 0.8) * min, (max < 0 ? 0.8 : 1.2) * max]);

	min = d3.min(data, yValue);
	max = d3.max(data, yValue);
	yScale.domain([(min < 0 ? 1.2 : 0.8) * min, (max < 0 ? 0.8 : 1.2) * max]);

	/*xScale.domain([d3.min(data, xValue)-1, d3.max(data, xValue)+1]);
	yScale.domain([d3.min(data, yValue)-1, d3.max(data, yValue)+1]);*/

	var dots = svg.append("g");

	var scenarioNames = d3.keys(clusterData),
		filteredData = [],
		labelInfo = [];
	for (var i = 0; i < data.length; i++) {
		var point = data[i],
			match = -1;

		var exists = filteredData.some(function (n, index) {
			match = index;
			return point[0] == n[0] && point[1] == n[1];
		});

		if (!exists) {
			filteredData.push(point);
			labelInfo.push([scenarioNames[i].split('.geojson')[0]]);
		}
		else {
			labelInfo[match].push(scenarioNames[i].split('.geojson')[0]);
		}
	}

	this.drawLabels = function (draw) {
		if (!draw) {
			self.labelsShown = true;
			dots.selectAll(".scatter__dot__labels")
				.data(filteredData)
				.enter().append("text")
				.attr("class", "scatter__dot__labels")
				.attr("transform", function (d, i) { return "translate(" + (xMap(d) + 7) + ", " + (yMap(d)) + ")" })
				// .style("left", function(d, i){ return (xMap(d) + 5) + "px"})
				// .style("top",  function(d, i){ return (yMap(d) + 28) + "px"})
				.style("font-weight", "bold")
				.text(function (d, i) { return labelInfo[i].join('\n') });
		}
		else {
			dots.selectAll(".scatter__dot__labels").remove();
			self.labelsShown = false;
		}
	}

	if ($('#sct-label-select').val() == 0)
		this.drawLabels(0);

	// draw dots
	dots.selectAll(".dot")
		.data(filteredData)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap)
		.style("fill", function (d, i) { return color(cValue(d, i)); })
		.on("mouseover", function (d, i) {
			if (!self.labelsShown) {
				tooltip.transition()
					.duration(200)
					// .style("opacity", .9);
					.style("display", "block");
				tooltip.html(scenarioNames[i])
					.style("left", (d3.event.pageX + 7) + "px")
					.style("top", (d3.event.pageY - 10) + "px");
			}
		})
		.on("mouseout", function (d) {
			tooltip.transition()
				.duration(500)
				// .style("opacity", 0);
				.style("display", "none");
		});

	// render each element: axis, path, animation and title
	this.addAxesAndLegend(svg, xAxis, yAxis, margin, plotWidth, plotHeight);
	this.addTitle(svg, plotWidth, plotHeight, margin);
}

function ScatterPlotNew(parentKeys, childrenKeys, containerId, width, height, scenarios) {
	var self = this;

	this.parentKeys = parentKeys;
	this.childrenKeys = childrenKeys;
	this.containerId = containerId;
	this.width = width;
	this.height = height;
	this.metric = undefined;

	var margin = { top: 20, right: 20, bottom: 40, left: 40 },
		padding = { top: 0, right: 0, bottom: 0, left: 0 },
		plotWidth = width - margin.left - margin.right - padding.left - padding.right,
		plotHeight = height - margin.top - margin.bottom - padding.top - padding.bottom;

	/* 
	 * value accessor - returns the value to encode for a given data object.
	 * scale - maps value to a visual display encoding, such as a pixel position.
	 * map function - maps from data value to display value
	 * axis - sets up axis
	 */

	// setup x 
	var xValue = function (d) { return d[0]; }, // data -> value
		xScale = d3.scale.linear().range([0, plotWidth]), // value -> display
		xMap = function (d) { return xScale(xValue(d)); }, // data -> display
		xAxis = d3.svg.axis().scale(xScale).orient("bottom").innerTickSize(-plotHeight).outerTickSize(0).tickPadding(10).ticks(8)
			.tickFormat(function (d) {
				var sign = d > 0 ? 1 : -1;
				d = Math.abs(d);
				var array = ['', 'k', 'M', 'G', 'T', 'P'];
				var i = 0;
				while (d > 1000) {
					i++;
					d = d / 1000;
				}

				d = d + array[i];

				return (sign == -1 ? '-' : '') + d;
			});

	// setup y
	var yValue = function (d) { return d[1]; }, // data -> value
		yScale = d3.scale.linear().range([plotHeight, 0]), // value -> display
		yMap = function (d) { return yScale(yValue(d)); }, // data -> display
		yAxis = d3.svg.axis().scale(yScale).orient("left").innerTickSize(-plotWidth).outerTickSize(0).tickPadding(10)
			.tickFormat(function (d) {
				var sign = d > 0 ? 1 : -1;
				d = Math.abs(d);
				var array = ['', 'k', 'M', 'G', 'T', 'P'];
				var i = 0;
				while (d > 1000) {
					i++;
					d = d / 1000;
				}

				d = d + array[i];

				return (sign == -1 ? '-' : '') + d;
			});

	// setup fill color
	var cValue = function (d, i) { return i; },
		color = d3.scale.category10();

	var svg = d3.select("#" + containerId).append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var data = [];
	var dataIndex = 0;
	for (var scenarioIndex in scenarios) {
		data[dataIndex] = [0, 0];
		var sumCount = 0;
		var scenario = scenarios[scenarioIndex];

		var featureX = scenario.data[parentKeys[0]];
		var featureY = scenario.data[parentKeys[1]];

		if (typeof (featureX[childrenKeys[0]][0]) == "number") {
			data[dataIndex][0] += d3.sum(featureX[childrenKeys[0]]);
			sumCount += featureX[childrenKeys[0]].length;
		}
		else {
			for (var subIndex = 0; subIndex < featureX[childrenKeys[0]].length; subIndex++) {
				data[dataIndex][0] += d3.sum(featureX[childrenKeys[0]][subIndex]);
				sumCount += featureX[childrenKeys[0]][subIndex].length;
			}
			// data[dataIndex][0] += d3.sum(featureX.scenarioData);
		}

		if (typeof (featureX[childrenKeys[0]][0]) == "number") {
			data[dataIndex][1] += d3.sum(featureY[childrenKeys[1]]);
		}
		else {
			for (var subIndex = 0; subIndex < featureX[childrenKeys[0]].length; subIndex++) {
				data[dataIndex][1] += d3.sum(featureY[childrenKeys[1]][subIndex]);
			}
			// data[dataIndex][1] += d3.sum(featureX.scenarioData);
		}


		data[dataIndex][0] /= sumCount;
		data[dataIndex][1] /= sumCount;

		dataIndex++;
	}

	var tooltip = d3.select('#scatterplot-tip');

	// don't want dots overlapping axis, so add in buffer to data domain
	var min = d3.min(data, xValue);
	var max = d3.max(data, xValue);
	xScale.domain([(min < 0 ? 1.2 : 0.8) * min, (max < 0 ? 0.8 : 1.2) * max]);

	min = d3.min(data, yValue);
	max = d3.max(data, yValue);
	yScale.domain([(min < 0 ? 1.2 : 0.8) * min, (max < 0 ? 0.8 : 1.2) * max]);

	var dots = svg.append("g");

	var scenarioNames = d3.keys(clusterData),
		filteredData = [],
		labelInfo = [];
	for (var i = 0; i < data.length; i++) {
		var point = data[i],
			match = -1;

		var exists = filteredData.some(function (n, index) {
			match = index;
			return point[0] == n[0] && point[1] == n[1];
		});

		if (!exists) {
			filteredData.push(point);
			labelInfo.push([scenarioNames[i].split('.geojson')[0]]);
		}
		else {
			labelInfo[match].push(scenarioNames[i].split('.geojson')[0]);
		}
	}

	this.drawLabels = function (draw) {
		if (!draw) {
			self.labelsShown = true;
			dots.selectAll(".scatter__dot__labels")
				.data(filteredData)
				.enter().append("text")
				.attr("class", "scatter__dot__labels")
				.attr("transform", function (d, i) { return "translate(" + (xMap(d) + 7) + ", " + (yMap(d)) + ")" })
				// .style("left", function(d, i){ return (xMap(d) + 5) + "px"})
				// .style("top",  function(d, i){ return (yMap(d) + 28) + "px"})
				.style("font-weight", "bold")
				.text(function (d, i) { return labelInfo[i].join('\n') });
		}
		else {
			dots.selectAll(".scatter__dot__labels").remove();
			self.labelsShown = false;
		}
	}

	if ($('#sct-label-select').val() == 0)
		this.drawLabels(0);

	// draw dots
	dots.selectAll(".dot")
		.data(filteredData)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap)
		.style("fill", function (d, i) { return color(cValue(d, i)); })
		.on("mouseover", function (d, i) {
			if (!self.labelsShown) {
				tooltip.transition()
					.duration(200)
					// .style("opacity", .9);
					.style("display", "block");
				tooltip.html(scenarioNames[i])
					.style("left", (d3.event.pageX + 7) + "px")
					.style("top", (d3.event.pageY - 10) + "px");
			}
		})
		.on("mouseout", function (d) {
			tooltip.transition()
				.duration(500)
				// .style("opacity", 0);
				.style("display", "none");
		});

	// render each element: axis, path, animation and title
	this.addAxesAndLegend(svg, xAxis, yAxis, margin, plotWidth, plotHeight);
	this.addTitle(svg, plotWidth, plotHeight, margin);
}

ScatterPlot.prototype.addAxesAndLegend = function (svg, xAxis, yAxis, margin, plotWidth, plotHeight) {
	// var legendWidth = 100,
	// 	legendHeight = 50;

	var axes = svg.append("g").attr("class", "sct-axis")
		.attr("transform", "translate(0," + plotHeight + ")")
		.call(xAxis);

	// note that this.metric is undefined currently and will be added in future.
	axes.append("g")
		.attr("class", "sct-axis")
		.attr("transform", "translate(0,-" + plotHeight + ")")
		.call(yAxis)
		.append("text")
		.attr("transform", 'rotate(-90)')
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text(this.metric);
}

ScatterPlot.prototype.addTitle = function (svg, plotWidth, plotHeight, margin) {
	var self = this;
	svg.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" + (plotWidth / 2) + "," + (margin.top * 1.5 + plotHeight) + ")")
		.attr("font-size", "11px")
		.text(function () {
			var text = self.parentKeys[0];
			if (self.childrenKeys[0] != 'data') {
				text += " ( " + self.childrenKeys[0] + " )";
			}
			return text + " (" + clusterMetrics[self.childrenKeys[0] === 'data' ? self.parentKeys[0] : self.childrenKeys[0]] + ")";
		});

	svg.append("text")
		.attr("text-anchor", "left")
		.attr("transform", "translate(0" + "," + (margin.top / 2) + ")")
		.attr("font-size", "11px")
		.text(function () {
			var text = self.parentKeys[1];
			if (self.childrenKeys[1] != 'data') {
				text += " ( " + self.childrenKeys[1] + " )";
			}
			return text + " (" + clusterMetrics[self.childrenKeys[1] === 'data' ? self.parentKeys[1] : self.childrenKeys[1]] + ")";
		});
}

// one issue to solve is that the svg and img are not displayed inline
ScatterPlot.prototype.addRemovalAndBoundary = function () {
	var img = document.createElement("img");
	img.className = "removeIcon";
	img.src = "css/removediv.png";
	document.getElementById(this.containerId).appendChild(img);
	var containerId = this.containerId;
	img.addEventListener("click", function () {//remove the div itself
		var itself = document.getElementById(containerId);
		itself.parentNode.removeChild(itself);
	});
}
// Copy all prototypes to the new Scatter Plot version
for(f in ScatterPlot.prototype){
	ScatterPlotNew.prototype[f] = ScatterPlot.prototype[f];
}

$(window).on("load", function () {
	$('#sct-label-select').change(function (e) {
		var plots = scatterplots.plots;
		for (var i = 0; i < plots.length; i++) {
			plots[i].drawLabels(+$(this).val());
		}
	});

	d3.select("body").append("div")
		.attr("class", "tooltip")
		.attr("id", "scatterplot-tip")
		.style("opacity", 0.9)
		.style("display", "none");
});