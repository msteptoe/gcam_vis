$(function() {
	$( "#dialog-map" ).dialog({
		height: $('body').height()*.75,
		width: $('body').width()*.75,
		resizable: false,
		modal: true,
		autoOpen: false,
		buttons: {
			"Done": function() {
				$( this ).dialog( "close" );			
			},
			Cancel: function() {
				$( this ).dialog( "close" );
			}			
		}
	});
});

function showMapDialog(){
	$( "#dialog-map" ).dialog( "open" );
	if(!state.map.refreshed){
		state.map._onResize();
	}
}

function onEachFeature(feature, layer) {
	var popupContent = "<p>I started out as a GeoJSON " +
			feature.geometry.type + ", but now I'm a Leaflet vector!</p>";

	if (feature.properties && feature.properties.popupContent) {
		popupContent += feature.properties.popupContent;
	}

	if(feature.properties){
		for (var parameter in feature.primary_energy) {
			var result = addParameter(parameter);
			if(result){
				console.log("paramter added: " + parameter);
				console.log(feature)
			}
		};
	}

	layer.on({
        click: appendTimeline
    });
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
	    "weight": 1,
	    "fillOpacity": 0.7
	});

    if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
    }
}

function resetHighlight(e) {
	if(!e.target.selected)
    	clusterShapefile.layer.resetStyle(e.target);
}

function onEachFeatureNew(feature, layer) {
	layer.on({
        click: function (e) {
        	appendTimelineNew(e);

			var layer = e.target;
			var feature = layer.feature;

        	if(state.map.selectedLayer){
        		// console.log('state.map.selectedLayer: valid!');
        		clusterShapefile.layer.resetStyle(state.map.selectedLayer);
        		state.map.selectedLayer.selected = false;
        		// state.map.selectedLayer.setStyle({
				//     "weight": 1,
				//     "fillOpacity": 0.5
				// });
        	}
        	state.map.selectedLayer = layer;
        	layer.selected = true;

        	layer.setStyle({
			    "weight": 1,
			    "fillOpacity": 0.7
			});
        },
		mouseover: highlightFeature,
			mouseout: resetHighlight,
    });
}

function onEachFeatureParCoor(feature, layer){
	layer.on({
        click: function (e) {
			var layer = e.target;
			var feature = layer.feature;

        	if(state.map.selectedLayer){
        		clusterShapefile.layer.resetStyle(state.map.selectedLayer);
        		state.map.selectedLayer.selected = false;
        	}
        	state.map.selectedLayer = layer;
        	layer.selected = true;

        	layer.setStyle({
			    "weight": 1,
			    "fillOpacity": 0.7
			});
        	/*changeView('#par', function(){
				state.parCoor.obj = new parCoor(d3.keys(clusterData).sort(), false, {index: feature.id, name: feature.properties.REGION_NAME});
			});*/

			$( "#dialog-map" ).dialog( "close" );
			state.parCoor.obj = new parCoor(d3.keys(clusterData).sort(), false, {index: feature.id, name: feature.properties.REGION_NAME});
			
        },
		mouseover: highlightFeature,
		mouseout: resetHighlight,
    });
}

function loadGeoJSON (obj, geoJson, visible) {
	console.log(obj.scenario);
	obj.layer = L.geoJson(geoJson, {

		filter: function (feature, layer) {
			if (feature.properties) {
				feature.scenario = obj.scenario
				feature.years = obj.years
			}
			return true;
		},
		onEachFeature: onEachFeature,
		style: {
			"color": "black",
			"fillColor": "grey",
		    "weight": 1,
		    "opacity": 0.4,
		    "fillOpacity": 0.2
		},
	});
	if(visible){
		obj.layer.addTo(map);
		currentFile = obj;
	}
}

function getSummationColor(feature){
	var id = feature.properties.GCAM_ID;

	var fileIndex = -1;
	fileNames.every(function(n, i){
		if(n.indexOf('master') == -1){
			fileIndex = i;
			return false;
		} 
		return true;
	});

	if(fileIndex == -1){
		console.log(fileNames);
		return;
	}

	var scenarioName = fileNames[fileIndex];
	// console.log(scenarioName)
	var countryIndex = 0;

	// console.log(clusterData[scenarioName]);

	while(clusterData[scenarioName].properties[countryIndex].GCAM_ID != id){
		countryIndex++;
	}

	var energy = clusterData[scenarioName].data['primary_energy'][countryIndex];

	// console.log(layer);
	var localParameters = d3.keys(energy);
	var index = localParameters.indexOf("GCAM_ID");
	if(index > -1){
		localParameters.splice(index, 1);
	}

	var color = d3.scale.ordinal()
	    .domain(localParameters)
	    .range(colorbrewer.Set3[12]);

	var sums = [];

	for(var i = 0; i < localParameters.length; i++){
		sums.push(
			energy[localParameters[i]].reduce(function(a, b) {
				return (+a) + (+b);
			})
		);
		// console.log(localParameters[i], sums[sums.length-1])
	}
	// console.log(clusterData[scenarioName].properties[countryIndex].REGION_NAME, localParameters[sums.indexOf(d3.max(sums))]);
	return color(localParameters[sums.indexOf(d3.max(sums))]);
}

function layerStyle(feature) {
    return {
        // fillColor: getSummationColor(feature),
        color: "black",
		fillColor: "grey",
	    weight: 1,
	    opacity: 0.4,
	    fillOpacity: 0.2
    };
}

function loadNewGeoJSON (obj, geoJson, visible) {
	// console.log(obj.scenario);
	obj.layer = L.geoJson(geoJson, {
		// onEachFeature: onEachFeatureNew,
		onEachFeature: onEachFeatureParCoor,
		style: layerStyle,
	});
	if(visible){
		obj.layer.addTo(map);
		currentFile = obj;
	}
}

function removeTimeline(){
	d3.select("#info").select('svg').remove();
}		

function appendLegend(color){
	d3.select("#legend").select('svg').remove();

	var width = $("#legend").width() - 20,
   	height = $("#legend").height() - 50;

	var svg = d3.select("#legend").append("svg")
	    .attr("width", width + 20)
	    .attr("height", height + 50)

	var legendRectSize = 18;
	var legendSpacing = 4;

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
}

// Define 'div' for tooltips
var div = d3.select('#info').append("div") // declare the properties for the div used for the tooltips
  .attr("class", "tooltip")       // apply the 'tooltip' class
  .style("opacity", 0);         //


function appendTimelineNew(e) {
	var layer = e.target;
	var feature = layer.feature;
	// console.log(layer);
	console.log(feature.properties.GCAM_ID);
	var id = feature.properties.GCAM_ID;

	var scenarioName = $('#fileSelected').val();
	var countryIndex = 0;

	while(clusterData[scenarioName].properties[countryIndex].GCAM_ID != id){
		countryIndex++;
	}

	var energy =  clusterData[scenarioName].data['primary_energy'][countryIndex];
	var years = state.years;

	currentLayerData = energy;

	// console.log(layer);
	var localParameters = d3.keys(energy);
	var index = localParameters.indexOf("GCAM_ID");
	if(index > -1){
		localParameters.splice(index, 1);
	}


	var margin = {top: 20, right: 20, bottom: 30, left: 30},
    width = $("#info").width() - margin.left - margin.right,
    height = $("#info").height() - margin.top - margin.bottom - 20;

	var parseDate = d3.time.format("%Y").parse,
	bisectDate = d3.bisector(function(d) { return d; }).left;

	var x = d3.time.scale()
	    .range([0, width]);

	var y = d3.scale.linear()
	    .range([height, 0]);

	// var color = d3.scale.category20();
	// color.domain(localParameters);

	var color = d3.scale.ordinal()
	    .domain(localParameters)
	    .range(colorbrewer.Set3[12]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var line = d3.svg.line()
	    .interpolate("basis")
	    .x(function(d, i) { return x(parseDate(years[i] + '')); })
	    .y(function(d, i) { return y(parseFloat(d)); });

	removeTimeline();

	var svg = d3.select("#info").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// console.log(localParameters);

	// console.log(years);
	x.domain(d3.extent(years, function(d) { return parseDate(d + ''); }));

	var max = 0;
	var energies = [];
	for (var key in energy) {
		if(key != "GCAM_ID"){
			max = d3.max([max, d3.max(energy[key], function(d) { return +d;} )]);
			energies.push({values: energy[key], name: key});
		}
		// console.log(key);
	};
	console.log(max);
	y.domain([0, Math.ceil(max)]);

	svg.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + height + ")")
	.call(xAxis);

	svg.append("g")
	.attr("class", "y axis")
	.call(yAxis)
	.append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", ".71em")
	.style("text-anchor", "end")
	.text("Energy");

	var energy = svg.selectAll(".energy")
      .data(energies)
    .enter().append("g")
      .attr("class", "energy");

  	var path = energy.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d.values); })
      .style("stroke", function(d, i) { return color(d.name); })
      .style("stroke-width", '2px');

 //    svg.selectAll("g.dot")
 //    .data(energies)
 //    .enter().append("g")
 //    .attr("class", "dot")
 //    .selectAll("circle")
 //    .data(function(d) { return d.values; })
 //    .enter().append("circle")
 //    .attr("r", 5)
 //    .attr("cx", function(d, i) {  return x(parseDate(years[i] + '')); })
 //    .attr("cy", function(d, i) { return y(parseFloat(d)); })

	// // Tooltip stuff after this
	// .on("mouseover", function(d, i) {              // when the mouse goes over a circle, do the following
	// 	div.transition()                  // declare the transition properties to bring fade-in div
	// 		.duration(200)                  // it shall take 200ms
	// 		.style("opacity", .9);              // and go all the way to an opacity of .9
	// 	div.html(d.label + "<br/>" + energies[i].name + "<br/>"  + d)  // add the text of the tooltip as html 
	// 		.style("left", (d3.event.pageX) + "px")     // move it in the x direction 
	// 		.style("top", (d3.event.pageY - 28) + "px");  // move it in the y direction
	// })                          // 
	// .on("mouseout", function(d) {             // when the mouse leaves a circle, do the following
	// 	div.transition()                  // declare the transition properties to fade-out the div
	// 		.duration(500)                  // it shall take 500ms
	// 		.style("opacity", 0);             // and go all the way to an opacity of nil
	// }); 

	appendLegend(color);
	var filename = d3.keys(clusterData).sort();
	state.parCoor.obj = new parCoor(filename, false, {index: countryIndex, name: feature.properties.REGION_NAME});
	redrawTable();
}