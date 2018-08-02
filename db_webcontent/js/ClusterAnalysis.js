function updateClusterKValues() {
	$('#clu-kvalue-select').empty();

	for (var i = 3; i < FILES.length && i < 9; i++) {
		$('#clu-kvalue-select').append($('<option value="' + i + '">' + i + '</option>'));
	}

	state.clu.k = 3;
}

$(function () {
	$("#dialog-clu").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		buttons: [
			{
				text: "Show",
				click: function () {
					$(this).dialog("close");
					// scenarioClusterRequest();
					if ($('#clu-dim-select').val() == "1"){
						socket.getClusters3D(state.clu.k);
					}
					else{
						socket.getClusters2D(state.clu.k);
					}
					// socket.getClusters3D(state.clu.k);
				},
				"class": "ui-button-primary"
			},
			{
				text: "Done",
				click: function () {
					$(this).dialog("close");
				}
			}
		]
	});
	$('a[href="#clu-container"]').dblclick(function () {
		$("#dialog-clu").dialog('open');
	});
});

$(window).on("load", function () {
	$('#clu-kvalue-select').change(function (e) {
		state.clu.k = +$(this).val();
	});
	$('#clu-label-select').change(function (e) {
		if (state.clu.obj)
			state.clu.obj.drawLabels(+$(this).val());
	});
});

function ClusterPlot(kmeans, pca) {
	var self = this;
	var margin = { top: 40, right: 100, bottom: 20, left: 30 },
		padding = { top: 20, right: 20, bottom: 0, left: 10 },
		width = $('#clu-main-container').width() - margin.left - margin.right - padding.left - padding.right,
		height = $('#clu-main-container').height() - margin.top - margin.bottom - padding.top - padding.bottom;

	/* 
	 * value accessor - returns the value to encode for a given data object.
	 * scale - maps value to a visual display encoding, such as a pixel position.
	 * map function - maps from data value to display value
	 * axis - sets up axis
	 */

	// setup x 
	var xValue = function (d) { return d[0]; }, // data -> value
		xScale = d3.scale.linear().range([0, width]), // value -> display
		xMap = function (d) { return xScale(xValue(d)); }, // data -> display
		xAxis = d3.svg.axis()
			.scale(xScale)
			.orient("bottom")
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
		yScale = d3.scale.linear().range([height, 0]), // value -> display
		yMap = function (d) { return yScale(yValue(d)); }, // data -> display
		yAxis = d3.svg.axis()
			.scale(yScale)
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

				d = d + array[i];

				return (sign == -1 ? '-' : '') + d;
			});

	// setup fill color
	var cValue = function (d, i) { return kmeans[i]; };

	$('#clu-main-container').empty();

	// add the graph canvas to the body of the webpage
	var svg = d3.select('#clu-main-container').append("svg")
		.attr("id", "clu-graph-svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// don't want dots overlapping axis, so add in buffer to data domain
	xScale.domain([d3.min(pca, xValue) - 1, d3.max(pca, xValue) + 1]);
	yScale.domain([d3.min(pca, yValue) - 1, d3.max(pca, yValue) + 1]);

	// x-axis
	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)
		.append("text")
		.attr("class", "label")
		.attr("x", width)
		.attr("y", -6)
		.style("text-anchor", "end")
		.text("X");

	// y-axis
	svg.append("g")
		.attr("class", "y axis")
		.call(yAxis)
		.append("text")
		.attr("class", "label")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text("Y");

	var labels = FILES;

	// var color = COLOR;
	// var color = d3.scale.category10();
	var color = function (index) { return colorbrewer.Set1[8][index] };

	var hulls = svg.append("g");

	var filteredData = new Array(state.clu.k);
	for (var i = 0; i < kmeans.length; i++) {
		var clusterNum = kmeans[i];
		if (filteredData[clusterNum] == undefined) {
			filteredData[clusterNum] = [];
		}
		filteredData[clusterNum].push([xMap(pca[i]), yMap(pca[i]), labels[i]]);
	}

	var lineFunction = d3.svg.line()
		.x(function (d) { return xValue(d); })
		.y(function (d) { return yValue(d); })
		.interpolate("linear");

	function hullClick(d, i) {
		// var scenarios = d.map(element => element[2]);
		// state.parCoor.obj = state.server ? new parCoorNew(scenarios) : new parCoor(scenarios);
		$('.foreground').find("[cluster='" + state.clu.kmeans[getDatabaseIndex(d[0][2])] + "']").toggle();
	}

	for (var i = 0; i < filteredData.length; i++) {
		if (filteredData[i].length > 2) {
			var hull = hulls.append("path")
				.attr("class", "hull")
				.attr("fill", color(i))
				.attr("stroke", color(i))
				.attr("id", function (d, i) { return "k" + i; })
				.on('click', hullClick)
				.on('mouseover', function (d, i) {
					this.setAttribute('stroke-dasharray', '4.4');
				})
				.on('mouseout', function (d, i) {
					this.setAttribute('stroke-dasharray', '0');
				});

			hull.datum(d3.geom.hull(filteredData[i])).attr("d", function (d) {
				var coord = d.map(element => [xValue(element), yValue(element)]);
				return "M" + coord.join("L") + "Z";
			});
		}
		else if (filteredData[i].length > 1) {
			hulls.append("path")
				.datum(filteredData[i])
				.attr("d", lineFunction)
				.attr("class", "hull-line")
				.attr("fill", color(i))
				.attr("stroke", color(i))
				.attr("id", function (d, i) { return "k" + i; })
				.on('click', hullClick)
				.on('mouseover', function (d, i) {
					this.setAttribute('stroke-dasharray', '4.4');
				})
				.on('mouseout', function (d, i) {
					this.setAttribute('stroke-dasharray', '0');
				});// End changes by Xing Liang, 10-31-2016
		}
	}

	// console.log(filteredData);


	// remove the old tooltip and add a new tooltip area to the webpage
	$("#clu-tip").remove();
	var tooltip = d3.select("body").append("div")
		.attr("class", "tooltip")
		.attr("id", "clu-tip")
		.style("opacity", 0.9)
		.style("display", "none");

	var dots = svg.append("g")
		.attr("id", "clu-points");

	// draw dots
	dots.selectAll(".dot")
		.data(pca)
		.enter().append("circle")
		.attr("class", "dot")
		.attr("r", 3.5)
		.attr("cx", xMap)
		.attr("cy", yMap)
		.attr("id", function (d, i) { return "clu-point" + i; })
		.attr("name", function (d, i) { return labels[i].split('.json')[0]; })
		.style("fill", function (d, i) { return color(cValue(d, i)); })
		.on("mouseover", function (d, i) {
			if (!self.labelsShown) {
				tooltip.transition()
					.duration(200)
					// .style("opacity", .9);
					.style("display", "block");
				tooltip.html('<b>' + labels[i].split('.json')[0] + '</b>')
					.style("left", (d3.event.pageX + 5) + "px")
					.style("top", (d3.event.pageY - 18) + "px");
			}
		})
		.on("mouseout", function (d) {
			tooltip.transition()
				.duration(500)
				// .style("opacity", 0);
				.style("display", "none");
			$(tooltip).empty();
		})
		.on("click", function (d, i) {
			// state.parCoor.obj = state.server ? new parCoorNew([labels[i]]) : new parCoor([labels[i]]);
			// var scenarios = [labels[i]];

			// console.log(labels[i], d);

			$('.foreground').find("[name='" + labels[i] + "']").toggle();
		});

	this.drawLabels = function (draw) {
		if (!draw) {
			self.labelsShown = true;
			dots.selectAll(".clu__dot__labels")
				.data(pca)
				.enter().append("text")
				.attr("class", "clu__dot__labels")
				.attr("transform", function (d, i) { return "translate(" + (xMap(d) + 0) + ", " + (yMap(d) - 18) + ")" })
				.style("font-weight", "bold")
				.text(function (d, i) { return labels[i].split('.json')[0] });
		}
		else {
			dots.selectAll(".clu__dot__labels").remove();
			self.labelsShown = false;
		}
	}
	if ($('#clu-label-select').val() == 0)
		this.drawLabels(0);
}


function Cluster(data) {
	var parent = $("#clu-main-container");
	parent.empty();
	
	d3.select('#clu-main-container').append("div")
		.attr("id", "clu-graph-container")
		.style("width", '100%')
		.style("height", '100%');

	var plotID = 'clu-graph-container';
	var container = $('#' + plotID);

	var width = container.width(),
		height = container.height();

	var plotData = [];
	$.each(data, function (index, cluster) {
		plotData.push({
			x: cluster.x,
			y: cluster.y,
			z: cluster.z,
			mode: "markers",
			type: "scatter3d",
			text: cluster.text,
			hoverinfo: 'text',
			marker: {
				color: colorbrewer.Set1[8][index],
				size: 2
			}
		});
		plotData.push({
			opacity: 0.5,
			type: "mesh3d",
			name: "Cluster " + index,
			hoverinfo: 'name',
			color: colorbrewer.Set1[8][index],
			x: cluster.x,
			y: cluster.y,
			z: cluster.z
		});
	});

	var layout = {
		autosize: true,
		height: height,
		scene: {
			aspectratio: {
				x: 1,
				y: 1,
				z: 1
			},
			camera: {
				center: {
					x: 0,
					y: 0,
					z: 0
				},
				eye: {
					x: 1.25,
					y: 1.25,
					z: 1.25
				},
				up: {
					x: 0,
					y: 0,
					z: 1
				}
			},
			xaxis: {
				type: "linear",
				zeroline: false
			},
			yaxis: {
				type: "linear",
				zeroline: false
			},
			zaxis: {
				type: "linear",
				zeroline: false
			}
		},
		showlegend: false,
		width: width
	};

	Plotly.newPlot(plotID, plotData, layout, {
		displaylogo: false,
		fillFrame: true,
		modeBarButtonsToRemove: [
			"sendDataToCloud",
			"toImage",
			"zoom3d",
			"resetCameraLastSave3d"
		]
	});
	var myScene = $('#' + plotID + ' #scene');

	myScene.width(width)
		.height(height - 20)
		.css("left", 0)
		.css("top", 20);

	$('#' + plotID + ' [data-attr="scene.dragmode"]').each((i, d) => {
		$(d).click(() => {
			myScene.width(width)
				.height(height - 20)
				.css("left", 0)
				.css("top", 20);
		});
	});

	var plot = document.getElementById(plotID);
	plot.on('plotly_click', function (data) {
		// plot the 'hover' trace as a permanent/colored trace on click
		console.log(data.points[0].data.type);
	});
}