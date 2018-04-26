function updateLCTData(clusterQueries, clusterKeys, scenarios, clusterData){
	console.log('statData request', new Date());
	// var scenarios = d3.map(Object.keys(clusterData), functioN)
	var clusters = {};
	Object.keys(clusterData).reduce((prev, cur)=>{
		if(scenarios.indexOf(cur)>-1){
			prev[cur] = clusterData[cur];
		}
		return prev;
	}, clusters);
	socket.send('statData request', {queries: clusterQueries, keys: clusterKeys, scenarios: scenarios, datatable: clusters});
	$("#lct-main-container").empty();
}

//prepare the line chart: 1) inserting the valid output types into the select box. 2) validating the input
function prepareLineChart(parentKeys, childKeys){
	//empty the container
	// $("#lct-main-container").empty();
		//dynamically load the parent keys from the data user selected
	$.each(parentKeys, function(index, value){
		$("#lct-parentkey-select").append($("<option ></option>").attr("value", index).text(value));
	});
	$("#lct-parentkey-select option[value=0]").attr("selected", "selected");//set the first element in the parentKeys as the default value

	//set childKeys of the first parent key as the default value
	$.each(childKeys[parentKeys[0]], function(index, value){
		$("#lct-childkey-select").append($("<option></option>").attr("value", index).text(value));
	});

	//dynamically load the child keys from the parent key user selected
	$("#lct-parentkey-select").change(function(){
		$("#lct-childkey-select").empty();
		var parentkey = $("#lct-parentkey-select option:selected").text();
		var validChildKeys = childKeys[parentkey];
		$.each(validChildKeys, function(index, value){
			$("#lct-childkey-select").append($("<option></option>").attr("value", index).text(value));
		})
	});

	// set the first element of the child keys as the default option
	$("#lct-childkey-select option[value=0]").attr("selected", "selected");

	// listening the click event and add the line chart
	$("#lct-add-btn").click(function(){
		var parentkey = $("#lct-parentkey-select option:selected").text();
		var childKey = $("#lct-childkey-select option:selected").text();
		// set the width and height of the div for each line chart
		var width = $("#lct-main-container").width()*0.4;
		var height = "500";
		// get the time series data
		var timeseries = linecharts.data[parentkey][childKey];
		// the metric data is currently unavailable, so we leave them as undefined
		var metric = undefined;
		// dynamically name the id so that we can get the handler of that div and remove it
		var containerId = "lct-container-"+linecharts.charts.length;
		// inser the div
		$("#lct-main-container").append($("<div></div>").attr("width", width).attr("height", height).attr("id", containerId).addClass("lct"));
		// initialize the parameters in the line chart and return the object as the handler so that we can play with it in future
		var lct = new LineChart(parentkey, childKey, containerId, width, height, timeseries, linecharts.years, linecharts.regionNames, metric);
		// begin to draw the line chart
		lct.addRemovalAndBoundary();
		lct.drawLineChart();
		// push it to our global variables
		linecharts.charts.push(lct);
	});

	$("#lct-clear-btn").click(function(){
		$("#lct-main-container").empty();
	});
}



var LineChart = function(parentKey, childKey, containerId, width, height, data, years, regionNames, metric){
	this.parentKey = parentKey;
	this.childKey = childKey;
	this.containerId = containerId;
	this.width = width;
	this.height = height;
	this.data = data;
	// note that the int number from the server will be string, so we need to convert it first.
	this.years = years.map(function(d) { return parseInt(d);});
	this.regionNames = regionNames;
	this.metric = metric;
	this.upperline = [];
	this.lowerline = [];
	$("#"+this.containerId).width(this.width);
	$("#"+this.containerId).height(this.height);
}

// one issue to solve is that the svg and img are not displayed inline
LineChart.prototype.addRemovalAndBoundary = function (){
	var img = document.createElement("img");
	img.className = "removeIcon";
    img.src = "css/removediv.png";
	document.getElementById(this.containerId).appendChild(img);
	var containerId = this.containerId;
	img.addEventListener("click", function(){//remove the div itself
		var itself = document.getElementById(containerId);
		itself.parentNode.removeChild(itself);
	});
}

LineChart.prototype.drawLineChart = function (){
	// initialize the parameters required in svg
	var margin = {top: 20, right: 20, bottom: 40, left: 40},
		chartWidth = this.width - margin.left - margin.right,
		chartHeight = this.height - margin.top - margin.bottom;

	// get the minval and maxval on y axis.
	var minVal = d3.min(this.data, function(d){ return d[2]<d[5]?d[2]:d[5];}),
		maxVal = d3.max(this.data, function(d){ return d[7]>d[3]?d[7]:d[3];});

	// to have a better visualization effect, we properly scale down or up the max/min data
	minVal = (minVal<0?1.2:0.8)*minVal;
	maxVal = (maxVal<0?0.8:1.2)*maxVal;
	var x = d3.scale.linear().range([0, chartWidth]).domain([d3.min(this.years), d3.max(this.years)]);
	var y = d3.scale.linear().range([chartHeight, 0]).domain([minVal, maxVal]);

	// note that we do not need comma in year so we need to convert the tick format
	var xAxis = d3.svg.axis().scale(x).orient('bottom').innerTickSize(-chartHeight).outerTickSize(0).tickPadding(10).tickFormat(d3.format("d")),
		yAxis = d3.svg.axis().scale(y).orient('left').innerTickSize(-chartWidth).outerTickSize(0).tickPadding(10)
				.tickFormat(function (d) {
						var sign = d>0?1:-1;
						d = Math.abs(d);
					    var array = ['','k','M','G','T','P'];
					    var i=0;
					    while (d > 1000)
					    {
					        i++;
					        d = d/1000;
					    }

					    d = d+' '+array[i];

					    return (sign==-1?'-':'')+d;});

	var svg = d3.select("#"+this.containerId).append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		// .style("display", "inline")
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// insert a clip for animation
	var rectClip = svg.append("clipPath")
		.attr("id", "rect-clip")
		.append("rect")
			.attr("width", 0)
			.attr("height", chartHeight);

	// render each element: axis, path, animation and title
	this.addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight);
	this.drawPaths(svg, x, y, margin);
	this.startTransition(svg, chartWidth, chartHeight, rectClip, x, y, margin);
	this.addTitle(svg, chartWidth, chartHeight, margin);

}

LineChart.prototype.addAxesAndLegend = function(svg, xAxis, yAxis, margin, chartWidth, chartHeight){
	var legendWidth = 100,
		legendHeight = 50;

	var axes = svg.append("g").attr("class", "lct-axis")
		.attr("transform", "translate(0," + chartHeight + ")")
		.call(xAxis);

	// note that this.metric is undefined currently and will be added in future.
	axes.append("g")
		.attr("class", "lct-axis")
		.attr("transform", "translate(0,-" + chartHeight + ")")
		.call(yAxis)
		.append("text")
			.attr("transform", 'rotate(-90)')
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text(this.metric);
}

LineChart.prototype.drawPaths = function(svg, x, y, margin){
	var that = this;
	var range = d3.svg.area()
		.interpolate('basis')
		.x(function(d, i) { return x(that.years[i]);})//year
		.y0(function(d) { return y(d[3]);})//upper limit
		.y1(function(d) { return y(d[2]);});//lower limit
	var meanline = d3.svg.line()
		.interpolate('linear')
		.x(function(d, i) { return x(that.years[i]);})//year
		.y(function(d) { return y(d[0]);});//mean value

	svg.datum(this.data);

	// draw the area chart in which the upper bound is mean+2std and lower bound is mean-2std
	svg.append("path")
		.attr("class", "lct-range")
		.attr("d", range)
		.attr("clip-path", 'url(#rect-clip)');

	// draw the line using mean value
	svg.append("path")
		.attr("class", "lct-meanline")
		.attr("d", meanline)
		.attr("clip-path", "url(#rect-clip)");
}

LineChart.prototype.startTransition = function(svg, chartWidth, chartHeight, rectClip, x, y, margin){
	// set the time of line chart animation
	rectClip.transition()
		.duration(100*this.years.length)
		.attr("width", chartWidth);


	for(var i=0; i<this.data.length; i++){
		// note here the reason we write another function to package the setTimeout is that setTimeOut will use 
		animateDot(this, i);//pass the this context object to the function
	}

	function animateDot(thisobj, i){
		setTimeout(function(){
			var circle = this.data[i];
			var upMarker = {
				x: this['years'][i],
				y: circle[7],
				regionCode: circle[6]
			}
			var object = this.addMarkers(circle[0], upMarker, svg, x, y, 6);
			if(i!=0 && (object.indexOf('image')>-1 || i==this.years.length-1)){
				if(i==this.years.length-1) this.upperline.push(upMarker);
				this.connectMarkers(this.upperline, svg, x, y, 'lct-upperline');
				this.upperline = [];
			}
			else{
				this.upperline.push(upMarker);
			}
			var downMarker = {
				x: this['years'][i],
				y: circle[5],
				regionCode: circle[4]
			}
			var object = this.addMarkers(circle[0], downMarker, svg, x, y, 4);
			if(i!=0 && (object.indexOf('image')>-1 || i==this.years.length-1)){
				if(i==this.years.length-1) this.lowerline.push(downMarker);
				this.connectMarkers(this.lowerline, svg, x, y, 'lct-lowerline');
				this.lowerline = [];
			}
			else{
				this.lowerline.push(downMarker);
			}

		}.bind(thisobj), 110*i);// in default, the context of setTimeout is window, so we need to bind the thisobj context to the setTimeout function
	}
}

LineChart.prototype.connectMarkers = function(points, svg, x, y, className){
	var connectionline = d3.svg.line()
						.interpolate('basis')
						.x(d => x(d.x))
						.y(d => y(d.y));
	// svg.datum(points);
	svg.append('path')
		.datum(points)
		.attr('class', className)
		.transition()
        .duration(1000)
		.attrTween('d', getSmoothInterpolation);

	function getSmoothInterpolation() {
		var interpolate = d3.scale.quantile()
                .domain([0,1])
                .range(d3.range(1, points.length + 1));
        return function(t) {
            return connectionline(points.slice(0, interpolate(t)));
        };
	}
}


LineChart.prototype.addMarkers = function(meanVal, circle, svg, x, y, boundIndex){
	// initialize the circle parameters
	var r = 3,
		xPos = x(circle.x)-r,
		yPos = y(circle.y)-r,
		yPosStart = y(meanVal);//the animation starts from the meanline


	var marker = svg.append("g")
		.attr("transform", "translate(" + (xPos) + "," + yPosStart + ")")
		.attr("opacity", 0);

	// set the time of the circle
	marker.transition()
		.duration(500)
		.attr("transform", "translate(" + (xPos) + "," + yPos + ")")
		.attr("opacity", 1);

	var index = this['years'].indexOf(circle.x);
	var curRegions = this.data[index][boundIndex].substring(this.data[index][boundIndex].indexOf('-')+1).split(',');//[4] represents only query the maximum values
	var prevRegions = index==0?[]:this.data[index-1][boundIndex].substring(this.data[index-1][boundIndex].indexOf('-')+1).split(',');
	if(curRegions.equals(prevRegions)){//note here it invokes the customized prototype function Array.equals(arr)
		// insert the circle in each g element
		marker.append("circle")
			.attr("r", r)
			.attr("cx", r)
			.attr("cy", r)
			.style("fill", color.bind(this, circle.regionCode))
			.on("mouseover", mouseover.bind(this, circle))
			.on("mousemove", function(d){
				// note that tooltip here is a global variable in global.js file
				return tooltip.style("top",(event.pageY-10)+"px").style("left", (event.pageX+10)+"px");
			})
			.on("mouseout", function(d){
				return tooltip.style("visibility", "hidden");
			});
		return 'circle';
	}
	else{// draw the region polygon
		var containerId = this.containerId;
		var regionHash = this.regionNames;
		// get the region names corresponded to those ID. Note we ver very likely to have repeated region names.
		var regionNames = curRegions.map(d => regionHash[parseInt(d)]);
		//	find the unique region names in the region codes array
		var uniqueRegionNames = regionNames.reduce(function(a, b){
			if(a.length != b.length && a.indexOf(b) < 0) a.push(b);
			return a;
		}, []);
		//fake image as place holder. We will change the base64 url after retrieving the data from the main process
		marker.append("svg:image")
			.attr('id', containerId+"-"+index+'-'+boundIndex)
			.attr('x', -25)
			.attr('y', -25)
			.attr('width', 50)
			.attr('height', 50)
			.attr('href', drawImages(uniqueRegionNames));
		marker.append('rect')
		  .attr('class', 'lct-image-border')
		  .attr('x', -25)
		  .attr('y', -25)
		  .attr('width', 50)
		  .attr('height', 50)
		  .on("mouseover", mouseover.bind(this, circle))
          .on("mousemove", function(d){
          	// note that tooltip here is a global variable in global.js file
          	return tooltip.style("top",(event.pageY-10)+"px").style("left", (event.pageX+10)+"px");
          })
          .on("mouseout", function(d){
          	return tooltip.style("visibility", "hidden");
          });
		// socket.send('contourIMG request', {filePath: shapeFilePath, regionCode: uniqueRegionNames.join(','), lctId: containerId, index: index, boundIndex: boundIndex});
		return 'image';
	}

	

	function color(text){//thisobj will not appear in the arguments list
		return boundIndex==6?'#e41a1c':'#377eb8';
		// if(text.indexOf("Neg")>-1) return "red";
		// else return "darkgoldenrod";		
	}

	function mouseover(circle){
		// get the region code in the data
		var codes = circle.regionCode.substring(circle.regionCode.indexOf("-")+1).split(",");
		// generate the tip text information, here this pointer is passed through bind() function
		var text = codes.length>1?(codes.length + " regions ("+ this.regionNames[codes[0]] +", etc.)"):this.regionNames[codes[0]];
		tooltip.html("<strong>Region: </strong>" + text 
			+ "<br><strong>Value: </strong>" + parseFloat(circle.y).toFixed(2)
			+ "<br><strong>Year: </strong>" + parseInt(circle.x));
		// turn on the visibility of the tooltip
		return tooltip.style("visibility", "visible");
	}



}

LineChart.prototype.addTitle = function(svg, chartWidth, chartHeight, margin){
	svg.append("text")
		.attr("text-anchor", "middle")
		.attr("transform", "translate(" +(chartWidth/2)+ ","+ (margin.top*1.5+chartHeight) + ")")
		.attr("font-size", "15px")
		.text("Year");

	svg.append("text")
		.attr("text-anchor", "left")
		.attr("transform", "translate(0" + ","+ (margin.top) + ")")
		.attr("font-size", "12px")
		.text(this.parentKey + " ( "+ this.childKey + " ) (" + clusterMetrics[this.childKey==='data'?this.parentKey:this.childKey]+ ")" );
}

//warn if overridding existing method
if(Array.prototype.equals)
	console.log("Overridding existing Array equals method!!!");

Array.prototype.equals = function(array){
	if(!array)	return false;
	if(array.length != this.length) return false;
	for(var i=0; i<this.length; i++){
		if(this[i] instanceof Array && array[i] instanceof Array){
			if(!this[i].equals(array[i])) return false;
		}
		else if(this[i] != array[i]){
			return false;
		}
	}
	return true;
}