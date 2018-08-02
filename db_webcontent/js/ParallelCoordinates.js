$(function () {
	$("#dialog-par").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		buttons: [
			{
				text: "Add All PCA Axis",
				click: addAllPCAParAxis,
				"class": "ui-button-info"
			},
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

	$("#par-load-btn").click(function () {
		if (parCoorKeysValid()) {
			var feature = getSelectedFeature(idPrefix);
			socket.getParCoorAxis(feature[0], feature[1], feature[2]);
			// parCoorPlot.obj = state.server ? new parCoorNew(parCoorPlot.filenames, null, parCoorPlot.country) : new parCoor(parCoorPlot.filenames, null, parCoorPlot.country);
		}
	});

	$('#par-year-select').change(function (e) {
		state.parCoor.year = $(this).val();
		state.parCoor.yearValue = $("option:selected", this).text();
		if (state.parCoor.filenames.length) {
			state.parCoor.obj = state.server ? new parCoorNew(state.parCoor.filenames, true, state.parCoor.country) : new parCoor(state.parCoor.filenames, true, state.parCoor.country);
		}
	})

	$('#par-plot-select').change(function (e) {
		state.parCoor.plot = $(this).val();
		if (state.parCoor.plot == 1) {
			$('#par-year').hide();
		}
		else {
			$('#par-year').show();
		}
		if (state.parCoor.filenames.length) {
			state.parCoor.obj = state.server ? new parCoorNew(state.parCoor.filenames, true, state.parCoor.country) : new parCoor(state.parCoor.filenames, true, state.parCoor.country);
		}
	})

	$('#par-brush-select').change(function (e) {
		state.parCoor.brushType = $(this).val();
		parCoorPlot.setBrushType(+($(this).val()));
	})
});

function addAllPCAParAxis() {
	for (var i = 0; i < 5; i++) {
		parCoorPlot.addAxis('pca ' + i, 'na');
	}
	socket.getParCoorPCA();
}

function addParAxis() {
	var feature = getSelectedFeature('par');
	var query = feature[0];
	var variable = feature[1];
	var value = feature[2];

	var axis = variable == undefined ? query : query + " " + variable + " " + value;

	if (parCoorPlot.getAxisIndex(axis) == -1) {
		parCoorPlot.addAxis(axis, UNITS[query]);
		socket.getParCoorAxis(parCoorPlot.getFiles(), undefined, query, variable, value);
		console.log(axis, UNITS[query])
		console.log(query, variable, value);
	}
}

function clearPar() {
	// parCoorPlot.clear();
	parCoorPlot.reset();
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


function ParallelCoordinatesPlot(divID) {
	var self = this;
	this.divID = divID;
	this.files = [];
	this.allFiles = [];
	this.axes = [];
	this.plotData = [];
	this.data = {};
	this.extents = {};
	this.yearMaps = {};
	this.y = {};
	this.units = {};
	this.plotType = 0;
	this.brushType = 0;
	this.year = 0;
	this.height = 0;
	this.svg = d3.select("#" + divID).append("svg");
}

ParallelCoordinatesPlot.prototype.clear = function () {
	this.svg.select("g").remove();
	this.axes = [];
}

ParallelCoordinatesPlot.prototype.reset = function () {
	this.files = [];
	this.axes = [];
	this.extents = {};
	this.plotData = [];
	this.data = {};
	this.units = {};

	this.svg.select("g").remove();
}

ParallelCoordinatesPlot.prototype.setBrushType = function (brushType) {
	this.brushType = brushType;
	
	if (this.rebrush) {
		this.rebrush();
	}
}

ParallelCoordinatesPlot.prototype.addAxis = function (axis, units) {
	if (this.axes.indexOf(axis) == -1) {
		this.axes.push(axis);
		this.units[axis] = units;
	}
}

ParallelCoordinatesPlot.prototype.removeAxis = function (axis) {
	this.axes.splice(this.axes.indexOf(axis), 1);
	delete this.units[axis];
}

ParallelCoordinatesPlot.prototype.getAxisCount = function () {
	return this.axes.length;
}

ParallelCoordinatesPlot.prototype.getAxisIndex = function (axis) {
	return this.axes.indexOf(axis);
}

ParallelCoordinatesPlot.prototype.getFiles = function () {
	return this.files;
}

ParallelCoordinatesPlot.prototype.setFiles = function (files) {
	this.files = files;
}

ParallelCoordinatesPlot.prototype.setAllFiles = function (allFiles) {
	this.allFiles = allFiles;
}

ParallelCoordinatesPlot.prototype.setUnits = function (units) {
	this.units = units;
}

ParallelCoordinatesPlot.prototype.addData = function (data, axis) {
	var self = this;

	$.each(data, function (index, scenario) {
		if (self.data[index] == undefined) {
			self.data[index] = {};
		}

		self.data[index][axis] = scenario;
	});
	// console.log('addData:', this.data);
	window.requestAnimationFrame(this.plot.bind(this));
}

ParallelCoordinatesPlot.prototype.addExtent = function (data, axis) {
	if (this.extents[axis]) {
		this.extents[axis] = data;
	}
	else {
		this.extents[axis] = data;
	}
}

ParallelCoordinatesPlot.prototype.addYearMap = function (data, axis) {
	if (this.yearMaps[axis]) {
		this.yearMaps[axis] = data;
	}
	else {
		this.yearMaps[axis] = data;
	}
}

ParallelCoordinatesPlot.prototype.computeY = function () {
	var self = this;
	$.each(this.axes, function (i, d) {
		var data = self.data[d];
		var extent = self.extents[d];
		var domain = [];

		if (extent) {
			if (self.plotType == 0) {
				if (self.year == 0) {

					domain = [d3.mean(extent.min), d3.mean(extent.max)];
				}
			}

			self.y[d] = d3.scale.linear()
				.domain(domain)
				.range([self.height, 0]);
		}
	});
}

ParallelCoordinatesPlot.prototype.plot = function () {
	if (this.axes.length < 2 || d3.keys(this.extents).length < 2) {
		return;
	}

	var self = this;
	var files = this.files.length ? this.files : this.allFiles;

	$('#par-title').show();

	this.svg.select("g").remove();

	var margin =
		{
			top: 20,
			right: 20,
			bottom: 10,
			left: 20
		};
	var padding =
		{
			top: 10,
			right: 10,
			bottom: 10,
			left: 10
		};
	var svgWidth = $("#par-container").width() - margin.left - margin.right - padding.left - padding.right;
	var svgHeight = $("#par-container").height() * state.sizes.parCoor.main.height - margin.top - margin.bottom - padding.top - padding.bottom;
	var width = $("#par-container").height() - margin.left - margin.right - padding.left - padding.right;
	var height = $("#par-container").width() * state.sizes.parCoor.main.height - margin.top - margin.bottom - padding.top - padding.bottom;
	var difference = Math.abs($("#par-container").height() - $("#par-container").width()) / 2;

	if ($("#par-container").width() > $("#par-container").height()) {
		difference *= -1;
	}

	this.height = height;
	var svg = this.svg.attr("width", svgWidth + margin.left + margin.right)
		.attr("height", svgHeight + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + difference) + "," + (margin.top + difference) + ")" + "rotate(-90, " + (svgWidth / 2) + "," + (svgHeight / 2) + ")");

	var dimensions = this.axes;
	var y = this.y;
	var x = d3.scale.ordinal().rangePoints([0, width], 1);
	var dragging = {};

	var background;
	var foreground;
	var line = d3.svg.line().defined(function (d) { return d; });
	var axis = d3.svg.axis()
		.orient("left")
		.tickFormat(function (d) {
			var sign = d > 0 ? 1 : -1;
			d = Math.abs(d);
			var array = ['', 'k', 'M', 'G', 'T', 'P'];
			var i = 0;
			while (d >= 1000) {
				i++;
				d = d / 1000;
			}

			d = d.toFixed(2) + '' + array[i];

			return (sign == -1 ? '-' : '') + d;
		});

	// var color = COLOR;
	// var color = d3.scale.category10();
	var color = function (index) { return colorbrewer.Set1[8][index] };

	this.computeY();
	x.domain(this.axes);

	// Move to be computed each time a new axis is added instead
	var flattenedData = [];
	$.each(this.data, function (index, scenario) {
		let toReturn = { name: index };
		$.each(self.axes, function (axexIndex, axis) {
			if (self.plotType == 0) {
				if (self.year == 0) {
					if (scenario[axis]) {
						toReturn[axis] = d3.mean(scenario[axis]);
					}
				}
			}
		});

		flattenedData.push(toReturn);
	});

	// console.log(flattenedData);

	// Add grey background lines for context.
	background = svg.append("g")
		.attr("class", "background")
		.selectAll("path")
		.data(flattenedData)
		.enter().append("path")
		.attr("d", path);

	// Add blue foreground lines for focus.
	foreground = svg.append("g")
		.attr("class", "foreground")
		.selectAll("path")
		.data(flattenedData)
		.enter().append("path")
		.attr("name", function (d) {
			return d.name;
		})
		.attr("cluster", function (d, i) {
			return state.clu.kmeans[getDatabaseIndex(d.name)];
		})
		.attr("stroke", function (d, i) {
			return color(state.clu.kmeans[getDatabaseIndex(d.name)]);
		})
		.attr("d", path);

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function (d) { return "translate(" + x(d) + ")"; })
		.call(d3.behavior.drag()
			.origin(function (d) { return { x: x(d) }; })
			.on("dragstart", function (d) {
				dragging[d] = x(d);
				background.attr("visibility", "hidden");
			})
			.on("drag", function (d) {
				dragging[d] = Math.min(width, Math.max(0, d3.event.x));
				foreground.attr("d", path);
				dimensions.sort(function (a, b) { return position(a) - position(b); });
				x.domain(dimensions);
				g.attr("transform", function (d) { return "translate(" + position(d) + ")"; })
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
	var axisReference = g.append("g")
		.attr("class", "axis")
		.each(function (d) {
			if (y[d]) {
				d3.select(this).call(axis.scale(y[d]));
			}
		});

	axisReference.selectAll("text")
		.attr("y", 9)
		.attr("x", 0)
		.attr("dy", ".35em")
		.attr("transform", "rotate(90)")
		.style("text-anchor", "middle");

	axisReference.append("text")
		.style("text-anchor", "start")
		.attr("x", 0)
		.attr("y", -9)
		.attr("transform", "rotate(90)")
		.text(function (d) {
			var text = d;
			if (self.units[d] != "N/V" && self.units[d] != "N/A")
				text += " (" + self.units[d] + ")";
			return text;
		});

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function (d) {
			if (y[d]) {
				d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
			}
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);

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
			if (d[p]) {
				return [position(p), y[p](d[p])];
			}
		}));
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function (p) { return !y[p].brush.empty(); }),
			extents = actives.map(function (p) { return y[p].brush.extent(); });

		foreground.style("display", function (d) {
			var result = null;

			if (self.brushType == 0) {
				result = actives.every(function (p, i) {
					return extents[i][0] <= d[p] && d[p] <= extents[i][1];
				}) ? null : "none";
			}
			else {
				if (actives.length) {
					result = actives.some(function (p, i) {
						return extents[i][0] <= d[p] && d[p] <= extents[i][1];
					}) ? null : "none";
				}
			}
			// console.log("result" + result);
			return result;
		});
	}

	this.rebrush = brush;
}

var parCoorPlot = new ParallelCoordinatesPlot("par-svg-container");