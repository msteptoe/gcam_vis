function combineInputs(children){
  var inputs0 = children[0].inputs,
  inputs1 = children[1].inputs;

  // process.send('inputs0: ' + JSON.stringify(inputs0));
  // process.send('inputs1: ' + JSON.stringify(inputs1));
  
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

function diffInputs(children){
  var inputs0 = children[0].inputs,
  inputs1 = children[1].inputs;

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

function buildD3Cluster(cluster,  inputs){
  var d3Cluster = {name: "Scenarios", children: []};
  d3Cluster.children = generateDendogram(cluster, inputs).children;
  
  // Remove later, should happen on front end while processing all inputs
  d3Cluster.inputs = combineInputs(d3Cluster.children);
  // Remove later, should happen on front end while processing all inputs
  
  d3Cluster.maxType = diffInputs(d3Cluster.children);
  return d3Cluster;
}


function generateDendogram(tree, inputs){
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

function getAllChildren(childList, node){
	node.children.forEach(function(child){
		if(!child.hasOwnProperty('children')){
			childList.push(child.name);
		}
		else{
			getAllChildren(childList, child);
		}
	});
	return childList;
}

function zDendogram(cluster) {

	// console.log(cluster);

	var width = $('#den-container').width() - 25,
		height = $('#den-container').height() - 15;

	var i = 0,
		duration = 750,
		circleR = 10;

	var scaledWidth = 400,
	scaledHeight = 400;
	var clusterCount = state.scenariosLoaded - 10;

	while(clusterCount > 0){
		scaledWidth += 40;
		scaledHeight += 40;

		clusterCount--;
	}

	if(scaledWidth > (width - 25))
		scaledWidth = (width - 25);

	if(scaledHeight > (height / 2))
		scaledHeight = (height / 2);

	var cluster1 = d3.layout.tree()
		// .size([scaledWidth, scaledHeight]);
		.size([width - 25, height / 2]);

	// Setup zoom and pan
	var zoom = d3.behavior.zoom()
		.scaleExtent([.1, 10])
		.on('zoom', function() {
			svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
		})
		// Offset so that first pan and zoom does not jump back to the origin
		// .translate([50, height / 2]);

	$('#den-container').empty();

	// $('#den-container').append('<a href="#" onclick="dendogramLegend()" style="display: block;">Legend</a>');

	var svg = d3.select("#den-container").append("svg")
		.attr("name", 'dendro')
		.attr("width", width)
		.attr("height", height)
		.call(zoom)
		.append("g")
		.attr("transform", "translate(40,40)");

	var colors = d3.scale.ordinal()
	    .domain(d3.keys(cluster.inputs))
	    .range(colorbrewer.Set3[12]);

	state.den.colors = colors;

	update(cluster);

	d3.select(self.frameElement).style("height", height + "px");




	function updatelinks(links) {
		svg.selectAll('path').remove();

		var link = svg.selectAll("path.link")
			.data(links, function(d) {
				return d.target.id;
			});

		// Enter any new links at the parent's previous position.
		link.enter()
			//			  		.insert("path", "g")
			.append('path')
			.attr("class", "link")
			// .attr('d', elbow);
			.attr("d", function(d) {
                var o = {
                    x: links.x0,
                    y: links.y0
                };
                /*return diagonal({
                    source: o,
                    target: o
                });*/
                return connector({source: o, target: o});
            });
	}

	function update(source) {

		// console.log(cluster);
		// console.log(cluster1.nodes(cluster));

		// Compute the new tree layout.
		var nodes = cluster1.nodes(cluster).reverse();
		var links = cluster1.links(nodes);

		// Normalize for fixed-depth.
		nodes.forEach(function(d) {
			d.y = (d.depth * 110);
			d.R = circleR
		});

		// Update the nodes…
		var node = svg.selectAll("g.node")
			.data(nodes, function(d) {
				return d.id || (d.id = ++i);
			});

		// Enter any new nodes at the parent's previous position.
		var nodeEnter = node.enter().append("g")
			.attr('id', function(d) {
				return d.id;
			})
			.attr("class", "node")
			.on("click", function(d) {
				showLoading(true);
				var filename = [];
				// console.log('d: ', d);

				if (d.hasOwnProperty('name') && !d.hasOwnProperty('children')) {
					filename = [d.name];
					/*changeView('#par', function(){
						state.parCoor.obj = new parCoor([filename]);
					});*/
				}
				else if(d.hasOwnProperty('children') && d.children.every(function(child){filename.push(child.name); return !child.hasOwnProperty('children');})){
					/*changeView('#par', function(){
						state.parCoor.obj = new parCoor(filename);
					});*/
				}
				else{
					filename = [];
					getAllChildren(filename, d);
					filename.sort();
					
					/*changeView('#par', function(){
						state.parCoor.obj = new parCoor(filename);
					});*/
				}
				// Moved this down here since no longer changing view
				state.parCoor.obj = new parCoor(filename);

				// changes from Xing Liang - 10/01/2016
				var scenarios = typeof(filename)==='string'?[filename]:filename;
				// except the scenarios, all of other variables are global variables
				// updateLCTData(clusterQueries, clusterKeys, scenarios, clusterData);
				// end changes
			});

		nodeEnter.append("circle")
			.attr("r", circleR)
			//					  .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });
			.style("stroke", function(d) {
				return d._children ? "lightsteelblue" : d.color;
			})
			.style('fill', function(d, i) {
				// console.log(i, d);
				var color;
				if(d.maxType){
					color = colors(d.maxType);
				}
				return color;
			});

		nodeEnter.append("text")
			// .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
			.attr("x", function(d) {
				return d.children || d._children ? 0 : 13;
			})
			.attr("y", function(d) {
				return d.children || d._children ? 20 : 0;
			})
			.attr("dy", ".35em")
			.attr("text-anchor", function(d) {
				return d.children || d._children ? "middle" : "start";
			})
			.text(function(d) {
				var conditions = [false, false];
				if(!state.den.show.names){
					conditions[0] = d.name.indexOf('.geojson') > -1;
				}
				if(!state.den.show.dist){
					conditions[1] = d.name.indexOf('dist:') > -1;
				}
				return ( conditions[0] || conditions[1] ) ? null : d.name;
			})
			.style("fill-opacity", 1e-6);

		var nodeUpdate = node.attr("transform", function(d) {
			return "translate(" + d.y + "," + d.x + ")";
		});

		nodeUpdate.select("circle")
			.attr("r", circleR)
			.style("stroke", function(d) {
				return d._children ? "lightsteelblue" : d.color;
			})
			.style('fill', function(d) {
				var color;
				if(d.maxType){
					color = colors(d.maxType);
				}
				return color;
			});

		nodeUpdate.select("text")
			.style("fill-opacity", 1.5);

		// Update the links…
		updatelinks(links);

		// Stash the old positions for transition.
		nodes.forEach(function(d) {
			d.x0 = d.x;
			d.y0 = d.y;
		});

		//  var legend= svg.selectAll('.legend')
		// .data(parNames)
		// .enter().append('g')
		// .attr('class','legend')
		// .attr('transform',function(d,i){
		// 	return 'translate(-'+(width*1.2)+','+(height-i*31)+')';
		// });

		// legend.append("rect")
		//     .attr("x", width - 110)
		//     .attr("width", 30)
		//     .attr("height", 30)
		//     .style("fill", function(d,i){
		//   	  return relatedColor[i];
		//     });

		// legend.append("text")
		//     .attr("x", width-70)
		//     .attr("y", 9)
		//     .attr("dy", ".35em")
		//     .style("text-anchor", "start")
		//     .text(function(d) { return d; })
		//     .style('font-size','30px');
	}

	// Toggle children on click.
	function click(d) {
		if (d.children) {
			d._children = d.children;
			d.children = null;
		} else {
			d.children = d._children;
			d._children = null;
		}
		update(d);
	}

	/*function elbow(d) {
		//				console.log(d);
		var sourceX = d.source.x,
			sourceY = d.source.y + d.source.R,
			targetX = d.target.x,
			targetY = d.target.y - d.target.R;

		return "M" + sourceY + "," + sourceX +
			"H" + (sourceY + (targetY - sourceY) / 2) +
			"V" + targetX +
			"H" + targetY;
	}*/

	function elbow(d) {
        var source = d.source;
        var target = d.target;
        var hy = (target.y-source.y)/2;
        return "M" + source.y + "," + source.x
                + "H" + (source.y+hy)
                + "V" + target.x + "H" + target.y;
	}
    var connector = elbow;


	function transitionElbow(d) {
		return "M" + d.source.y + "," + d.source.x +
			"H" + d.source.y +
			"V" + d.source.x +
			"H" + d.source.y;
	}
}

function dendogramLegend(){
	if(state.den.colors == null)
		return;

	var color = state.den.colors;
	var legendRectSize = 18;
	var legendSpacing = 4;
	var lineHeight = legendRectSize + legendSpacing;
	var height = color.domain().length * lineHeight + legendSpacing + 20;

	if($('#dialog-legend-div').length == 0){
		$('body').append('<div id="dialog-den" title="Legend"><div id="dialog-legend-div" style="width:' + ($('body').width() * .2) + ';height:' + height +';">');
		$( "#dialog-den" ).dialog({
			autoOpen: false
		});
	}
	$("#dialog-legend-div").empty();

	var svg = d3.select("#dialog-legend-div").append("svg")
	    .attr("width", ($('body').width() * .2))
	    .attr("height", height);

	var legend = svg.selectAll('.legend')                    
      .data(color.domain())                                  
      .enter()                                               
      .append('g')                                           
      .attr('class', 'legend')                               
      .attr('transform', function(d, i) {                    
        var height = legendRectSize + legendSpacing;         
        // var offset =  height * color.domain().length / 2;    
        var horz =  legendRectSize;                      
        // var vert = i * height - offset;  
        var vert = i * height + legendSpacing + 20;                    
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
      .text(function(d) { return d; });

    // $( "#dialog-legend" ).dialog("open");
}