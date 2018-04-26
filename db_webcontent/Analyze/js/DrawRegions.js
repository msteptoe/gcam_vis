//code block for extracting and drawing geojson contour given a region id or name 
function drawImages(regions){
  var base64 = '';
  // var reqData = data;
  // fs.readFile(data.filePath, (err, data)=>{
    // if(err) throw err;
    var features = clusterShapefile.parsedJson.features;
    var geometry = {};
    var uniqRegionNames = regions;
    // if(uniqRegionNames.length == 1){//return the polygon of a single region only
       var singleRegionName = uniqRegionNames[0];
       //get all geometry for selected regions with the same singleRegionName
       for(var i =0; i<features.length; i++){
        var feat = features[i];
        var  regionName = feat.properties["REGION_NAME"],
          _geometry = feat["geometry"];
        if(uniqRegionNames.indexOf(regionName)>-1){
        // if(singleRegionName.length == regionName.length && regionName.indexOf(singleRegionName)>-1){
          // we will neede to copy the format (all members) of the feature by directly using the first geometry
          if(_geometry.type == "Polygon"){
            _geometry.coordinates = [_geometry.coordinates];
            _geometry.type = "MultiPolygon";
          }

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
      var canvas = document.createElement("CANVAS");
      canvas.width = parseInt(width);
      canvas.height = parseInt(height);
      var context = canvas.getContext('2d');
      drawCanvas(canvas, context, geometry, bounds, width, height);
      base64 = canvas.toDataURL();
      return base64;
  
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