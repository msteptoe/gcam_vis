function EvoScatterPlot(data){
	var self = this;
	var margin = {top: 40, right: 80, bottom: 30, left: 40},
    // width = $('#evo-right-container').width() - margin.left - margin.right,
    // height = $('#evo-container').height() - margin.top - margin.bottom;
    padding = {top: 50,  right: 40,  bottom: 10,  left: 10},
    width = $('#evo-right-container').width() - margin.left - margin.right - padding.left - padding.right,
    height = $('#evo-container').height() - margin.top - margin.bottom - padding.top - padding.bottom - 40;

	/* 
	 * value accessor - returns the value to encode for a given data object.
	 * scale - maps value to a visual display encoding, such as a pixel position.
	 * map function - maps from data value to display value
	 * axis - sets up axis
	 */ 

	// setup x 
	var xValue = function(d) { return d[0];}, // data -> value
	    xScale = d3.scale.linear().range([0, width]), // value -> display
	    xMap = function(d) { return xScale(xValue(d));}, // data -> display
	    xAxis = d3.svg.axis().scale(xScale).orient("bottom");

	// setup y
	var yValue = function(d) { return d[1];}, // data -> value
	    yScale = d3.scale.linear().range([height, 0]), // value -> display
	    yMap = function(d) { return yScale(yValue(d));}, // data -> display
	    yAxis = d3.svg.axis().scale(yScale).orient("left");

	// setup fill color
	var cValue = function(d, i) { return i;},
	    color = d3.scale.category10();

	$('#evo-scatter-svg').remove();

	// add the graph canvas to the body of the webpage
	var svg = d3.select('#evo-right-container').append("svg")
		.attr("id", "evo-scatter-svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// remove the old tooltip and add a new tooltip area to the webpage
	$("#scatter-tip").remove();
	var tooltip = d3.select("body").append("div")
	    .attr("class", "tooltip")
	    .attr("id", "scatter-tip")
	    .style("opacity", 0.9)
	    .style("display", "none");

	// don't want dots overlapping axis, so add in buffer to data domain
	xScale.domain([d3.min(data, xValue)-1, d3.max(data, xValue)+1]);
	yScale.domain([d3.min(data, yValue)-1, d3.max(data, yValue)+1]);

	var dots = svg.append("g");

	var scenarioNames = d3.keys(clusterData),
	filteredData = [],
	labelInfo = [];
	for(var i = 0; i < data.length; i++){
		var point = data[i],
		match = -1;

		var exists = filteredData.some(function(n, index){
		  match = index;
		  return point[0] == n[0] && point[1] == n[1];
		});

		if(!exists){      
		  filteredData.push(point);
		  labelInfo.push([scenarioNames[i].split('.geojson')[0]]);
		}
		else{
		  labelInfo[match].push(scenarioNames[i].split('.geojson')[0]);
		}
	}

	this.drawLabels = function(draw){
		if(!draw){
		  self.labelsShown = true;
		  dots.selectAll(".evo_scatter__dot__labels")
		    .data(filteredData)
		  .enter().append("text")
		    .attr("class", "evo_scatter__dot__labels")
		    .attr("transform", function(d, i){ return "translate(" + (xMap(d) + 7) + ", " + (yMap(d)) + ")"})
		    // .style("left", function(d, i){ return (xMap(d) + 5) + "px"})
		    // .style("top",  function(d, i){ return (yMap(d) + 28) + "px"})
		    .style("font-weight", "bold") 
		    .text(function(d,i){return labelInfo[i].join(', ')});
		}
		else{
		  dots.selectAll(".evo_scatter__dot__labels").remove();
		  self.labelsShown = false;
		}
	}

	if($('#evo-label-select').val() == 0)
	this.drawLabels(0);

	// draw dots
	dots.selectAll(".dot")
	  .data(filteredData)
	.enter().append("circle")
	  .attr("class", "dot")
	  .attr("r", 3.5)
	  .attr("cx", xMap)
	  .attr("cy", yMap)
	  .style("fill", function(d, i) { return color(cValue(d, i));}) 
	  .on("mouseover", function(d, i) {
	  	if(!self.labelsShown){
	      tooltip.transition()
	           .duration(200)
	           // .style("opacity", .9);
	           .style("display", "block");
	      tooltip.html(scenarioNames[i])
	           .style("left", (d3.event.pageX + 5) + "px")
	           .style("top", (d3.event.pageY - 28) + "px");
	    }
	  })
	  .on("mouseout", function(d) {
	      tooltip.transition()
	           .duration(500)
	           // .style("opacity", 0);
	           .style("display", "none");
	  });
}