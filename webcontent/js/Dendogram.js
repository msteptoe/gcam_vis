$(function() {
	$("#dialog-den").dialog({
		resizable: false,
		height: "auto",
		width: "auto",
		modal: false,
		autoOpen: false,
		buttons: [
			{
				text: "Done",
				click: function() {
					$( this ).dialog( "close" );
				}
			}
		]
	});
	$("#dialog-den button" ).button();
});

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
			console.log('this is odd')
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

	if (tree.left == null && tree.left == null) {
		var labelstr = String(tree.label);
		cluster.name = labelstr;
		cluster.centroid = tree.centroid;
		cluster.inputs = inputs[labelstr];
	} else {
		cluster.name = "dist: " + (tree.dist).toFixed(2);
		cluster.children = [];
		// Crucial
		// console.log(tree, tree.left, tree.right);
		cluster.children.push(generateDendogram(tree.left, inputs));
		cluster.children.push(generateDendogram(tree.right, inputs));
		// process.send(JSON.stringify(cluster.children));
		cluster.inputs = combineInputs(cluster.children);
		cluster.maxType = diffInputs(cluster.children);
	}
	return cluster;
}

function getAllChildren(childList, node) {
	node.children.forEach(function (child) {
		if (!child.hasOwnProperty('children')) {
			childList.push(child.name);
		}
		else {
			getAllChildren(childList, child);
		}
	});
	return childList;
}

function zDendogram(clusterParam) {

	// Calculate total nodes, max label length
	var totalNodes = 0;
	var maxLabelLength = 0;
	// variables for drag/drop
	var selectedNode = null;
	var draggingNode = null;
	// panning variables
	var panSpeed = 200;
	var panBoundary = 20; // Within 20px from edges will pan when dragging.
	// Misc. variables
	var i = 0;
	var duration = 750;
	var root;
	var tail = {level: -1};

	var nodeR = 4.5;
	var horizontalSeparationBetweenNodes = nodeR * 5;
	var verticalSeparationBetweenNodes = 18;

	// size of the diagram
	var viewerWidth = $('#den-container').width();
	var viewerHeight = $('#den-container').height();

	var tree = d3.layout.tree()
		// .size([viewerHeight, viewerWidth]);
		.nodeSize([nodeR + horizontalSeparationBetweenNodes, nodeR + verticalSeparationBetweenNodes])
		/*.separation(function (a, b) {
			return a.parent == b.parent ? 1 : 1.25;
		});*/

	// define a d3 diagonal projection for use by the node paths later on.
	var diagonal = d3.svg.diagonal()
		.projection(function (d) {
			return [d.y, d.x];
		});

	// define a d3 ordinal scale for coloring nodes
	var colors = d3.scale.ordinal()
	    .domain(d3.keys(clusterParam.inputs))
	    .range(colorbrewer.Set3[12]);

	state.den.colors = colors;

	// A recursive helper function for performing some setup by walking through all nodes

	function visit(parent, visitFn, childrenFn) {
		if (!parent) return;

		visitFn(parent);

		var children = childrenFn(parent);
		if (children) {
			var count = children.length;
			for (var i = 0; i < count; i++) {
				visit(children[i], visitFn, childrenFn);
			}
		}
	}

	// Call visit function to establish maxLabelLength
	visit(clusterParam, function (d) {
		totalNodes++;
		maxLabelLength = Math.max(d.name.length, maxLabelLength);
	}, function (d) {
		return d.children && d.children.length > 0 ? d.children : null;
	});

	// verticalSeparationBetweenNodes = maxLabelLength + 5;
	console.log('maxLabelLength: ' + maxLabelLength);

	// sort the tree according to the node names

	function sortTree() {
		tree.sort(function (a, b) {
			return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
		});
	}
	// Sort the tree initially incase the JSON isn't in a sorted order.
	sortTree();

	// TODO: Pan function, can be better implemented.

	function pan(domNode, direction) {
		var speed = panSpeed;
		if (panTimer) {
			clearTimeout(panTimer);
			translateCoords = d3.transform(svgGroup.attr("transform"));
			if (direction == 'left' || direction == 'right') {
				translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
				translateY = translateCoords.translate[1];
			} else if (direction == 'up' || direction == 'down') {
				translateX = translateCoords.translate[0];
				translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
			}
			scaleX = translateCoords.scale[0];
			scaleY = translateCoords.scale[1];
			scale = zoomListener.scale();
			svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
			d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
			zoomListener.scale(zoomListener.scale());
			zoomListener.translate([translateX, translateY]);
			panTimer = setTimeout(function () {
				pan(domNode, speed, direction);
			}, 50);
		}
	}

	// Define the zoom function for the zoomable tree

	function zoom() {
		svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
	}


	// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
	var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

	$('#den-container').empty();

	// define the baseSvg, attaching a class for styling and the zoomListener
	var baseSvg = d3.select("#den-container").append("svg")
		.attr("width", viewerWidth)
		.attr("height", viewerHeight)
		.attr("class", "overlay")
		.call(zoomListener);

	// Helper functions for collapsing and expanding nodes.

	function collapse(d) {
		if (d.children) {
			d._children = d.children;
			d._children.forEach(collapse);
			d.children = null;
		}
	}

	function expand(d) {
		if (d._children) {
			d.children = d._children;
			d.children.forEach(expand);
			d._children = null;
		}
	}

	// Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

	function centerNode(source) {
		scale = zoomListener.scale();
		x = -source.y0;
		y = -source.x0;
		x = x * scale + viewerWidth / 2;
		y = y * scale + viewerHeight / 2;
		d3.select('g').transition()
			.duration(duration)
			.attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
		zoomListener.scale(scale);
		zoomListener.translate([x, y]);
	}

	// Toggle children function

	function toggleChildren(d) {
		if (d.children) {
			d._children = d.children;
			d.children = null;
		} else if (d._children) {
			d.children = d._children;
			d._children = null;
		}
		return d;
	}

	// Toggle children on click.

	function click(d) {
		showLoading(true);
		var filename = [];
		if (d.hasOwnProperty('name') && !d.hasOwnProperty('children')) {
			filename = [d.name];
		}
		else if(d.hasOwnProperty('children') && d.children.every(function(child){filename.push(child.name); return !child.hasOwnProperty('children');})){
			filename.sort();
		}
		else{
			filename = [];
			getAllChildren(filename, d);
			filename.sort();
		}		
		state.parCoor.obj = state.server ? new parCoorNew(filename) : new parCoor(filename);
	}

	function update(source) {
		// Compute the new height, function counts total children of root node and sets tree height accordingly.
		// This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
		// This makes the layout more consistent.
		// Edit: Only used to find lowest child now
		var levelWidth = [1];
		var childCount = function (level, n) {
			if(level > tail.level) tail = {node: n, level: level};

			if (n.children && n.children.length > 0) {
				if (levelWidth.length <= level + 1) levelWidth.push(0);

				levelWidth[level + 1] += n.children.length;
				n.children.forEach(function (d) {
					childCount(level + 1, d);
				});
			}
		};
		childCount(0, root);
		// No need to resize tree when using nodeSize
		// var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line  
		// tree = tree.size([newHeight, viewerWidth]);

		// tree = tree.nodeSize([nodeR + horizontalSeparationBetweenNodes, nodeR + verticalSeparationBetweenNodes]);

		// Compute the new tree layout.
		var nodes = tree.nodes(root).reverse(),
			links = tree.links(nodes);

		// Set widths between levels based on maxLabelLength.
		nodes.forEach(function (d) {
			d.y = (d.depth * ((maxLabelLength + 2) * 10)); //maxLabelLength * 10px
			// alternatively to keep a fixed scale one can set a fixed depth per level
			// Normalize for fixed-depth by commenting out below line
			// d.y = (d.depth * 500); //500px per level.
		});

		// Update the nodes…
		node = svgGroup.selectAll("g.node")
			.data(nodes, function (d) {
				return d.id || (d.id = ++i);
			});

		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append("g")
			.attr("class", "node")
			.attr("transform", function (d) {
				return "translate(" + source.y0 + "," + source.x0 + ")";
			})
			.on('click', click);

		nodeEnter.append("circle")
			.attr('class', 'nodeCircle')
			.attr("r", nodeR)
			// .style("fill", function (d) {
			// 	return d._children ? "lightsteelblue" : "#fff";
			// });
			.style('fill', function(d, i) {
				// console.log(i, d);
				var color;
				if(d.maxType){
					color = colors(d.maxType);
				}
				return color;
			});

		nodeEnter.append("text")
			// .attr("x", function (d) {
			// 	return d.children || d._children ? -10 : 10;
			// })
			.attr("x", function(d) {
				return d.children || d._children ? 0 : 10;
			})
			.attr("y", function(d) {
				return d.children || d._children ? 12 : 0;
			})
			.attr("dy", ".35em")
			.attr('class', 'nodeText')
			.attr("text-anchor", function (d) {
				// return d.children || d._children ? "end" : "start";
				return d.children || d._children ? "middle" : "start";
			})
			.text(function (d) {
				return d.name;
			})
			.style("fill-opacity", 0);


		// Update the text to reflect whether node has children or not.
		/*node.select('text')
			// .attr("x", function (d) {
			// 	return d.children || d._children ? -10 : 10;
			// })
			// .attr("text-anchor", function (d) {
			// 	return d.children || d._children ? "end" : "start";
			// })
			.attr("x", function(d) {
				return d.children || d._children ? 0 : 10;
			})
			.attr("y", function(d) {
				return d.children || d._children ? 10 : 0;
			})
			.attr("text-anchor", function (d) {
				// return d.children || d._children ? "end" : "start";
				return d.children || d._children ? "middle" : "start";
			})
			.text(function (d) {
				return d.name;
			});*/

		// Change the circle fill depending on whether it has children and is collapsed
		/*node.select("circle.nodeCircle")
			.attr("r", 4.5)
			// .style("fill", function (d) {
			// 	return d._children ? "lightsteelblue" : "#fff";
			// });
			.style('fill', function(d) {
				var color;
				if(d.maxType){
					color = colors(d.maxType);
				}
				return color;
			});*/

		// Transition nodes to their new position.
		var nodeUpdate = node.transition()
			.duration(duration)
			.attr("transform", function (d) {
				return "translate(" + d.y + "," + d.x + ")";
			});

		// Fade the text in
		nodeUpdate.select("text")
			.style("fill-opacity", 1);

		// Transition exiting nodes to the parent's new position.
		var nodeExit = node.exit().transition()
			.duration(duration)
			.attr("transform", function (d) {
				return "translate(" + source.y + "," + source.x + ")";
			})
			.remove();

		nodeExit.select("circle")
			.attr("r", 0);

		nodeExit.select("text")
			.style("fill-opacity", 0);

		// Update the links…
		var link = svgGroup.selectAll("path.link")
			.data(links, function (d) {
				return d.target.id;
			});

		// Enter any new links at the parent's previous position.
		link.enter().insert("path", "g")
			.attr("class", "link")
			.attr("d", function (d) {
				var o = {
					x: source.x0,
					y: source.y0
				};
				return elbow({ source: o, target: o });
			});

		// Transition links to their new position.
		link.transition()
			.duration(duration)
			.attr("d", elbow);

		// Transition exiting nodes to the parent's new position.
		link.exit().transition()
			.duration(duration)
			.attr("d", function (d) {
				var o = {
					x: source.x,
					y: source.y
				};
				return elbow({ source: o, target: o });
			})
			.remove();

		// Stash the old positions for transition.
		nodes.forEach(function (d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});
	}

	function elbow(d) {
		var source = d.source;
		var target = d.target;
		var hy = (target.y - source.y) / 2;
		return "M" + source.y + "," + source.x
			+ "H" + (source.y + hy)
			+ "V" + target.x + "H" + target.y;
	}

	state.den.panTo = function(dest){
		if(dest)
			centerNode(tail.node);
		else
			centerNode(root);
	}

	state.den.toggle = function(){
		toggleChildren(root);
		update(root);
		centerNode(root);
	}

	// Append a group which holds all nodes and which the zoom Listener can act upon.
	var svgGroup = baseSvg.append("g");

	// Define the root
	root = clusterParam;
	root.x0 = viewerHeight / 2;
	root.y0 = 0;

	// Collapse all children of roots children before rendering.
	// root.children.forEach(function (child) {
	// 	collapse(child);
	// });

	// Layout the tree initially and center on the root node.
	update(root);
	centerNode(root);
}



function dendogramLegend() {
	if (state.den.colors == null)
		return;

	var color = state.den.colors;
	var legendRectSize = 18;
	var legendSpacing = 4;
	var lineHeight = legendRectSize + legendSpacing;
	var height = color.domain().length * lineHeight + legendSpacing + 20;

	/*if ($('#dialog-legend-div').length == 0) {
		$('body').append('<div id="dialog-den" title="Legend"><div id="dialog-legend-div" style="width:' + ($('body').width() * .2) + ';height:' + height + ';">');
		$("#dialog-den").dialog({
			autoOpen: false
		});
	}*/
	
	$("#dialog-legend-div").empty();

	var svg = d3.select("#dialog-legend-div").append("svg")
		.attr("width", ($('body').width() * .2))
		.attr("height", height);

	var legend = svg.selectAll('.legend')
		.data(color.domain())
		.enter()
		.append('g')
		.attr('class', 'legend')
		.attr('transform', function (d, i) {
			var height = legendRectSize + legendSpacing;
			// var offset =  height * color.domain().length / 2;    
			var horz = legendRectSize;
			// var vert = i * height + legendSpacing + 20;
			var vert = i * height + legendSpacing;
			return 'translate(' + horz + ',' + vert + ')';
		});

	legend.append('rect')
		.attr('width', legendRectSize)
		.attr('height', legendRectSize)
		.style('fill', color)
		.style('stroke', color);

	legend.append('text')
		.attr('x', legendRectSize + legendSpacing)
		.attr('y', legendRectSize - legendSpacing)
		.text(function (d) { return d; });

	// $( "#dialog-legend" ).dialog("open");
}