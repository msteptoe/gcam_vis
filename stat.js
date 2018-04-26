/*********************Addeed by Xing Liang, Aug 2016***************************/ 
process.on('message', (m) => {
  // console.log('CHILD got message:', m);
  // process.send(m);
  if(m.reqType){
    process.send(m.reqType );
    switch(m.reqType){
      case 'statData request':
        processClusterDataReq(m.data);
        break;
      // case 'contourIMG request':
      //   processContourIMGReq(m.data);
      //   break;
      default: break;
    }
  }
});
console.log(process.arch);


const d3 = require('d3'),
      fs = require('fs'),
      // Canvas = require('canvas'),
      jsdom = require('jsdom').jsdom,
      document = jsdom('hello world');


//all output message should first send to the main process which can print the message ou
process.send('invoked the process of computating of stat data...');

function processClusterDataReq(data){
  
  var ret = {};
  var regions = [], years = [], dataMetrics = {};
  var statRet = {};
  
  //get the amount of regions and years. Here I assume each scenario has the same available regions and years
  var firstKey = Object.keys(data.datatable)[0];
  years = data.datatable[firstKey]['years'];

  if( !data.datatable[firstKey]['properties'][0]["REGION_NAME"] )
    return;

  regionNames = data.datatable[firstKey]['properties'].map(function(d) {return d["REGION_NAME"];});
  // for(var key in ){
  //   var scenarioName = data.scenarios[key];
    
  //   break;
  // }

  // Compute the mean, start from the parent output. Result uses int index while original data uses string index
  // Put the mean of all countries in that time slice to the end of the array
  for(var i=0; i<data.queries.length; i++){
    var parentKey = data.queries[i];//such as "CO2 emissions by aggregate sector"
    for(var j=0; j<data.keys[parentKey].length; j++){
      var childKey = data.keys[parentKey][j];//string index, such as 'data' or "transportation"
      if(ret[parentKey]==undefined) ret[parentKey] = {};
      ret[parentKey][childKey] = [];//add 2 property for mean and std of all regions
      //first do the mean over the countries in each time slice
      for(var yearInd in years){
        //for each scenario
        for(var scenarioId in data.scenarios){
          var sumAllRegions = 0.0;
          var Regioncount = 0;
          var scenarioName = data.scenarios[scenarioId];
          data.datatable[scenarioName]['data'][parentKey].forEach(function(d, regionInd){
            // get the sum of all countries in all scenarios. Some of the childkey output is null and we take them as zer

            // Initialize the data arrays
            if(ret[parentKey][childKey] == undefined) ret[parentKey][childKey] = [];
            if(ret[parentKey][childKey][yearInd] == undefined) ret[parentKey][childKey][yearInd] = [];
            if(ret[parentKey][childKey][yearInd][regionInd] == null) ret[parentKey][childKey][yearInd][regionInd] = 0;

            //check if there is no value in the original data which means it is zero in number instead of other string type numbers
            if(d[childKey]!=undefined && d[childKey][yearInd]!=0){
              sumAllRegions+=parseFloat(d[childKey][yearInd]);
              Regioncount++;
              // get the sum of each country in all scenarios
              ret[parentKey][childKey][yearInd][regionInd] += parseFloat(d[childKey][yearInd]);
            }
            else{
              //if there is no value for some countries, we set them as MIN_VALUE and do not count them into the computation
              if(d[childKey]!=undefined) ret[parentKey][childKey][yearInd][regionInd] = Number.MIN_VALUE;
            }
            
            // process.send(ret[i][j][yearInd][regionInd])
            // if all scenarios are added, compute each country's average over all scenarios
            if(scenarioId == data.scenarios.length-1) ret[parentKey][childKey][yearInd][regionInd] /= data.scenarios.length;
          });
        }
        ret[parentKey][childKey][yearInd].push(Regioncount==0?Number.MIN_VALUE:sumAllRegions/Regioncount);//put the mean of all countries in that time slice to the end of the array
      }
    }
  }

  // Compute std using the mean and each sample value
  // Put the std at the end of array (right after the mean value), also insert the lower and upper range mean+-2*std
  for(var i=0; i<data.queries.length; i++){
    var parentKey = data.queries[i];//such as "CO2 emissions by aggregate sector"
    for(var j=0; j<data.keys[parentKey].length; j++){
      var childKey = data.keys[parentKey][j];//string index, such as 'data' or "transportation"
      for(var yearInd in years){//for each year from 1990 to ...
        var squareSum = 0, countRegions = 0, lastIndex = ret[parentKey][childKey][yearInd].length-1;
        var mean = ret[parentKey][childKey][yearInd][lastIndex];
        ret[parentKey][childKey][yearInd].forEach(function(d, regionInd){
          //Because we are going to manually concat some values after the original array, so here the lastIndex means the last index for countries. After that they are manually inserted stat values.
          if(regionInd<lastIndex && d!=Number.MIN_VALUE){
            squareSum += Math.pow(d-mean, 2.0);
            countRegions++;
          }
        });
        var std = countRegions==0?0:Math.sqrt(squareSum/(countRegions-1), 2);
        ret[parentKey][childKey][yearInd].push(std);
        ret[parentKey][childKey][yearInd].push(mean-3*std);
        ret[parentKey][childKey][yearInd].push(mean+3*std);

      }
    }
  }

  // Extract the two country with minimum and maximum value.
  for(var i=0; i<data.queries.length; i++){
    var parentKey = data.queries[i];//such as "CO2 emissions by aggregate sector"
    for(var j=0; j<data.keys[parentKey].length; j++){
      var childKey = data.keys[parentKey][j];//string index, such as 'data' or "transportation"
      for(var yearInd in years){//for each year from 1990 to ...
        var lastIndex = ret[parentKey][childKey][yearInd].length-1;
        var upper = ret[parentKey][childKey][yearInd][lastIndex];
        var lower = ret[parentKey][childKey][yearInd][lastIndex-1];
        var min = Number.MAX_VALUE, max = Number.MIN_SAFE_INTEGER;
        var minRegionStack = [], maxRegionStack = [];
        ret[parentKey][childKey][yearInd].forEach(function(d, regionInd){
          if(regionInd<lastIndex-4 && d!=Number.MIN_VALUE){//use stack to save the regionIDs
            
            if(d<=min){
              if(d==min && minRegionStack.length != 0){
                  var regionIds = minRegionStack.pop();
                  regionIds.push(regionInd);
                  minRegionStack.push(regionIds);
              }
              else{
                min = d;
                minRegionStack.push([regionInd]);
              }
            }
            if(d>=max){
              if(d==max && maxRegionStack.length != 0){
                  var regionIds = maxRegionStack.pop();
                  regionIds.push(regionInd);
                  maxRegionStack.push(regionIds);
              }
              else{
                max = d;
                maxRegionStack.push([regionInd]);
              }
            }
          }
        });
        // we not only record the country with the lowest value, but also record them if beyond the range mean-2*std by sign.
        if(minRegionStack.length==0) ret[parentKey][childKey][yearInd][lastIndex+1] = "";
        else ret[parentKey][childKey][yearInd][lastIndex+1] = (min<lower?'Neg-':'Pos-')+minRegionStack.pop().join(",");
        ret[parentKey][childKey][yearInd][lastIndex+2] = min;

        if(maxRegionStack.length==0) ret[parentKey][childKey][yearInd][lastIndex+3] = "";
        else ret[parentKey][childKey][yearInd][lastIndex+3] = (max>upper?'Neg-':'Pos-')+maxRegionStack.pop().join(",");
        ret[parentKey][childKey][yearInd][lastIndex+4] = max;
        // the order of the array will be 0-mean, 1-std, 2-lower, 3-upper, 4-country index with the lowest value, 5-the lowest value, 6-country index with the highest value and 7-the highest value.
        // for slice function, negative numbers means number of elements slicing from the end
        var obj = ret[parentKey][childKey][yearInd].slice(-8);
        if(obj[0] == null) process.send(obj);//jsut for debugging
        ret[parentKey][childKey][yearInd] = obj;

      }
    }
  }
  // fs.writeFileSync('test.txt', JSON.stringify({data: ret, years: years, regionNames: regionNames, unit: dataMetrics}));
  //send the message to the main process
  process.send({reqType: 'statData response', data: {data: ret, years: years, regionNames: regionNames, unit: dataMetrics}});
}

/*****************************************Part II draw the region polygons *******************************************/

//code block for extracting and drawing geojson contour given a region id or name 
function processContourIMGReq(data){
  var base64 = '';
  var reqData = data;
  fs.readFile(data.filePath, (err, data)=>{
    if(err) throw err;
    var features = JSON.parse(data).features;
    var geometry = {};
    var uniqRegionNames = reqData.regionCode.split(',');
    // if(uniqRegionNames.length == 1){//return the polygon of a single region only
       var singleRegionName = uniqRegionNames[0];
       //get all geometry for selected regions with the same singleRegionName
       for(var i in features){
        var feat = features[i],
          regionName = feat.properties["REGION_NAME"];
          _geometry = feat["geometry"];
        if(uniqRegionNames.indexOf(regionName)>-1){
        // if(singleRegionName.length == regionName.length && regionName.indexOf(singleRegionName)>-1){
          // we will neede to copy the format (all members) of the feature by directly using the first geometry
          if(Object.keys(geometry).length == 0) 
              geometry = _geometry;
          else{// for the second geometry, we will only copy its coordinate value
            geometry.coordinates = geometry.coordinates.concat(_geometry.coordinates);
          }
        }
      }
    // }
      //draw the geometry on canvas
      var bounds = getBoundingBox(geometry);
      var width = 200,
          height = (bounds.yMax - bounds.yMin)/(bounds.xMax - bounds.xMin)*width;
      var canvas = new Canvas(parseInt(width), parseInt(height)),
          context = canvas.getContext('2d')
      drawCanvas(canvas, context, geometry, bounds, width, height);
      base64 = canvas.toDataURL();
      delete canvas;
      delete context;
    // }
    // else{//return the world map and highlight the involved regions

    // }
    process.send({reqType: 'contourIMG response', data: {base64: base64, lctId: reqData.lctId, index: reqData.index, boundIndex: reqData.boundIndex}});
  });
  
}

// function drawWorldWith

function drawCanvas(canvas, context, geometry, bounds, width, height){
  // Get the drawing context from our <canvas> and
  // set the fill to determine what color our map will be.
  context.strokeStyle = '#000';
  context.lineWidth = 3;
  // Determine how much to scale our coordinates by
  var xScale = width / Math.abs(bounds.xMax - bounds.xMin);
  var yScale = height / Math.abs(bounds.yMax - bounds.yMin);
  scale = xScale < yScale ? xScale : yScale;

  // Again, we want to use the “features” key of
  // the FeatureCollection
  // Loop over the features…
  // …pulling out the coordinates…
  var point = {};
  for(var i=0; i<geometry.coordinates.length; i++){
      coords = geometry.coordinates[i];
    // …and for each coordinate…
    for (var j = 0; j < coords.length; j++) {
      for(var k=0; k<coords[j].length; k++){
        longitude = coords[j][k][0];
      latitude = coords[j][k][1];
      // Scale the points of the coordinate
      // to fit inside our bounding box
      point = mercator(longitude, latitude);
      var tmp = {
          x: (point.x - bounds.xMin) * scale,
          y: (bounds.yMax - point.y) * scale
      };
      point.x = tmp.x;
      point.y = tmp.y;


      // If this is the first coordinate in a shape, start a new path
      if (k === 0) {
        context.beginPath();
        context.moveTo(point.x, point.y);

      // Otherwise just keep drawing
      } else {
        context.lineTo(point.x, point.y); 
      }
      } 
      // Fill the path we just finished drawing with color
    context.stroke();
   }
  
  }
  
}


function mercator (longitude, latitude) {
  var radius = 6378137;
  var max = 85.0511287798;
  var radians = Math.PI / 180;
  var point = {};

  point.x = radius * longitude * radians;
  point.y = Math.max(Math.min(max, latitude), -max) * radians;
  point.y = radius * Math.log(Math.tan((Math.PI / 4) + (point.y / 2)));

  return point;
}

function getBoundingBox (data) {
  var bounds = {}, coords, point, latitude, longitude;

  // Loop through each “feature”
  for (var i = 0; i < data.coordinates.length; i++) {

    // Pull out the coordinates of this feature
    coords = data.coordinates[i];
    // For each individual coordinate in this feature's coordinates…
    for (var j = 0; j < coords.length; j++) {
      for (var k=0; k<coords[j].length; k++) {
      longitude = coords[j][k][0];
        latitude = coords[j][k][1];
        // Update the bounds recursively by comparing the current
        // xMin/xMax and yMin/yMax with the coordinate 
        // we're currently checking
        bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
        bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
        bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
        bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
        }
      
    }

  }
  // Returns an object that contains the bounds of this GeoJSON
  // data. The keys of this object describe a box formed by the
  // northwest (xMin, yMin) and southeast (xMax, yMax) coordinates.
  var xminymin = mercator(bounds.xMin, bounds.yMin);
  var xmaxymax = mercator(bounds.xMax, bounds.yMax);
  bounds.xMin = xminymin.x;
  bounds.yMin = xminymin.y;
  bounds.xMax = xmaxymax.x;
  bounds.yMax = xmaxymax.y;
  return bounds;
}