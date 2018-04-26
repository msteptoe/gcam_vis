const fs = require("pn/fs");
const d3 = require('d3');
const path = require('path');
const jsdom = require('jsdom');
const svg2png = require("svg2png");
const colorbrewer = require('./lib/colorbrewer');
const gcamRegions = JSON.parse(fs.readFileSync('Regions.json', 'utf8'));

let $;
let gcamFeatures = [];
const queries = ["Population by region", "CO2 concentrations", "Building floorspace"];
const variables = ["", "", "building-node-input"];
const variableValues = ["", "", "comm_building"];
const testIndex = 2;
const startTime = new Date();

// Remove queries later, replace with ""
const query = process.argv[3] !== undefined ? process.argv[3] : queries[testIndex];
const variable = process.argv[4] !== undefined ? process.argv[4] : variables[testIndex];
const variableValue = process.argv[5] !== undefined ? process.argv[5] : variableValues[testIndex];

const baseDir = process.argv[2] ? process.argv[2] + path.sep : "jobs" + path.sep + "test" + path.sep;
const dataDir = baseDir + path.sep + 'ScenarioData' + path.sep;
let mapDirectory = baseDir + path.sep + 'Maps' + path.sep + query + path.sep;
let lineChartDirectory = baseDir + path.sep + 'LineCharts' + path.sep + query + path.sep;
let containsRegions = false;
if (variable !== "") {
    mapDirectory += variable + path.sep + variableValue + path.sep;
    lineChartDirectory += variable + path.sep + variableValue + path.sep;
}


// Map Calculations
function mapCalc(meanExtent, dataValues) {
    var dataMean = d3.mean(dataValues);

    if (meanExtent.max == null || meanExtent.max < dataMean) {
        meanExtent.max = dataMean;
    }
    if (meanExtent.min == null || meanExtent.min > dataMean) {
        meanExtent.min = dataMean;
    }
}

// Line Chart Calculations
function lcCalc(dataExtent, region, dataValues) {
    let extent = d3.extent(dataValues);
    if (region !== undefined) {
        if (dataExtent[region] === undefined) {
            dataExtent[region] = [null, null];
        }
        if (dataExtent[region][0] == null || extent[0] < dataExtent[region][0]) {
            dataExtent[region][0] = extent[0];
        }
        if (dataExtent[region][1] == null || extent[1] > dataExtent[region][1]) {
            dataExtent[region][1] = extent[1];
        }
    }
    else {
        if (dataExtent.value === undefined) {
            dataExtent.value = [null, null];
        }
        if (dataExtent.value[0] == null || extent[0] < dataExtent.value[0]) {
            dataExtent.value[0] = extent[0];
        }
        if (dataExtent.value[1] == null || extent[1] > dataExtent.value[1]) {
            dataExtent.value[1] = extent[1];
        }
    }

}

// Check if Query contains regions and extract all valid features to use
function getEnsembleRegions(file){
    let firstScenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8'));
    let fileRegions = firstScenario.scenario.regions;
    if(firstScenario.data[query].regions.length){
        containsRegions = true;
    }

    $.each(gcamRegions.features, function (index, region) {
        let regionName = region.properties.REGION_NAME;
        if (fileRegions.indexOf(regionName) > -1)
            gcamFeatures.push(region);
    });
}

jsdom.env({
    html: '',
    features: { QuerySelector: true }, //you need query selector for D3 to work
    done: function (err, window) {
        if (err) {
            console.error(err);
            return;
        }

        if(!query){
            console.log('No Query Provided: ' + query);
            return;
        }

        $ = require("jquery")(window);

        // $.each(gcamRegions.features, function (index, region) {
        //     gcamFeatures[region.properties.REGION_NAME] = region;
        // });

        fs.readFile(baseDir + 'Files.json')
            .then(res => {
                let files = JSON.parse(res);
                let meanExtent = { min: null, max: null };
                let dataExtent = {};
                let entireRange = true;

                getEnsembleRegions(files[0]);
                
                // Determine the extent and max/min
                if (variable) {
                    $.each(files, (index, file) => {
                        let scenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;
                        $.each(scenario[query].data, function (i, d) {
                            if (d[variable] == variableValue) {
                                mapCalc(meanExtent, d.value);
                                lcCalc(dataExtent, d.region, d.value);
                            }
                        });
                    });
                }
                else {
                    $.each(files, (index, file) => {
                        let scenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;
                        $.each(scenario[query].data, function (i, d) {
                            mapCalc(meanExtent, d.value);
                            lcCalc(dataExtent, d.region, d.value);
                        });
                    });
                }
                // console.log(meanExtent, dataExtent);

                window.d3 = d3.select(window.document); //get d3 into the dom

                if (variable) {
                    $.each(files, (index, file) => {
                        let scenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;
                        let years = scenario[query].years;
                        let units = scenario[query].units;
                        let mapData = [];
                        $.each(scenario[query].data, function (i, d) {
                            if (d[variable] == variableValue) {
                                mapData.push(d);
                                if (containsRegions) {
                                    drawLineChart(window, index, 255, 175, d.value, dataExtent[d.region], d.region, years, units); //data, dataExtent, query, years, units
                                }
                                else {
                                    drawLineChart(window, index, 255, 175, d.value, dataExtent.value, '', years, units); //data, dataExtent, query, years, units
                                }
                            }
                        });
                        drawMap(window, index, 625, 270, mapData, meanExtent, years);
                    });
                }
                else {
                    $.each(files, (index, file) => {
                        let scenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;
                        let years = scenario[query].years;
                        let units = scenario[query].units;
                        drawMap(window, index, 625, 270, scenario[query].data, meanExtent, years);
                        if (containsRegions) {
                            $.each(scenario[query].data, function (i, d) {
                                drawLineChart(window, index, 255, 175, d.value, dataExtent[d.region], d.region, years, units); //data, dataExtent, query, years, units
                            });
                        }
                        else {
                            $.each(scenario[query].data, function (i, d) {
                                drawLineChart(window, index, 255, 175, d.value, dataExtent.value, '', years, units); //data, dataExtent, query, years, units
                            });
                        }
                    });
                }
            })
    }
});

function drawMap(window, index, pWidth, pHeight, data, extent, years) {
    let showLabels = false;

    const scaleFactor = 1;
    const svgWidth = pWidth * scaleFactor;
    const svgHeight = pHeight * scaleFactor;

    const maxMean = extent.max;
    const minMean = extent.min;

    let features2Add = [];
    let featureIndices = [];
    let bin = d3.scale.quantize().domain([minMean, maxMean]).range(colorbrewer.Blues["6"].slice(1, -1));

    if (data[0].region) {
        $.each(data, function (dataIndex, region) {
            let regionName = region.region;
            $.each(gcamFeatures, function (featureIndex, feature) {
                if (regionName == feature.properties.REGION_NAME && features2Add.indexOf(feature) == -1) {
                    features2Add.push(feature);
                    featureIndices[featureIndex] = dataIndex;
                }
            });
        });
    }
    else {
        $.each(gcamRegions.features, function (index, feature) {
            features2Add.push(feature);
            featureIndices[index] = 0;
        })
    }

    let projection = d3.geo.equirectangular()
        .scale(100 * scaleFactor)
        .translate([svgWidth / 2, 147 * scaleFactor]);

    let path = d3.geo.path()
        .projection(projection);

    let id = 'map-' + index;

    // Set svg width & height
    let baseSVG = window.d3.select('body')
        .append('div')
        .attr('class', 'map-container') //make a container div to ease the saving process
        .attr('id', id)
        .append('svg')
        .attr({
            xmlns: 'http://www.w3.org/2000/svg',
            width: svgWidth,
            height: svgHeight
        });

    // Add background
    // baseSVG.append('rect')
    //     .attr('class', 'background')
    //     .style('fill', '#b5d0d0')
    //     .attr('width', svgWidth)
    //     .attr('height', svgHeight - 10)
    //     .attr("transform", "translate(" + 0 + "," + 25 + ")");


    let svg = baseSVG.append('g')
        .attr("transform", "translate(" + 0 + "," + 25 + ")");

    let mapLayer = svg.append('g')
        .classed('map-layer', true)
        .style('stroke', '#aaa');

    let textLayer = svg.append('g')
        .classed('text-layer', true);

    // Get province name
    function nameFn(d) {
        return d && d.properties ? d.properties.REGION_NAME : null;
    }
    // Get province name length
    function nameLength(d) {
        let n = nameFn(d);
        return n ? n.length : 0;
    }

    // Get province color
    function fillFn(feature, index) {
        // return color(nameLength(d));
        return bin(d3.mean(data[featureIndices[index]].value));
    }

    // Load map data
    // let features = gcamRegions.features;
    let features = features2Add;

    // Update color scale domain based on data
    // color.domain([0, d3.max(features, nameLength)]);

    // Draw each province as a path
    mapLayer.selectAll('path')
        .data(features)
        .enter().append('path')
        .attr('d', path)
        .attr('vector-effect', 'non-scaling-stroke')
        .style('fill', fillFn);

    if (showLabels) {
        textLayer.selectAll(".subunit-label")
            .data(features)
            .enter().append("text")
            .attr("class", function (d, i) { return "subunit-label " + i; })
            .attr("transform", function (d) { return "translate(" + path.centroid(d) + ")"; })
            .attr("dy", ".35em")
            .style('fill', '#777')
            .style('fill-opacity', '.5')
            .style('font-size', '10px')
            .style('font-weight', '300')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .text(function (d) { return d.properties.REGION_NAME; });
    }

    baseSVG.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (svgWidth / 2) + "," + 19 + ")")
        .attr("font-size", "22px")
        .style('font-family', "sans-serif")
        .text("db_" + index);

    //write out the children of the container div
    let toWrite = window.d3.select('#' + id).html();
    let dbName = 'db_' + index;
    // console.log(new Date());
    // console.log('Begin: ' + mapDirectory + dbName + ".png");

    const buffer = svg2png.sync(toWrite);
    fs.writeFileSync(mapDirectory + dbName + ".png", buffer);
    window.d3.select('#' + id).remove()

    // console.log('Done: ' + mapDirectory + dbName + ".png");
    console.log('Done: ' + dbName);
    let endTime = new Date();
    console.log((endTime - startTime) / 60000 + ' minutes');
}

// let pWidth = 255;
// let pHeight = 175;
// let data = [134233, 148244, 143843, 142958, 142671, 141969, 140910, 139632, 138489, 137792, 137238, 136715, 136087, 135424, 134504, 133427, 132158, 130636, 128882, 126968, 124905, 122622];
// let dataExtent = [88372, 149032];
// let query = "Population by region";
// let years = [1975, 1990, 2005, 2010, 2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075, 2080, 2085, 2090, 2095, 2100];
// let units = "thous";

function drawLineChart(window, index, pWidth, pHeight, data, dataExtent, region, years, units) {
    var margin = { top: 15, right: 10, bottom: 20, left: 50 },
        width = pWidth - margin.left - margin.right,
        height = pHeight - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .innerTickSize(-height)
        .outerTickSize(0)
        .tickPadding(10)
        .ticks(Math.ceil(years.length / 4))
        .tickFormat(function (d) { return years[d] });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(8)
        .innerTickSize(-width)
        .outerTickSize(0)
        .tickPadding(10)
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

    var line = d3.svg.line()
        .x(function (d, i) { return x(i); })
        // .x(function (d, i) { return x(d); })
        .y(function (d, i) { return y(d); });

    let id = 'lc-' + index;
    // Set svg width & height
    let svg = window.d3.select('body')
        .append('div')
        .attr('class', 'lc-container') //make a container div to ease the saving process
        .attr('id', id)
        .append('svg')
        .style('font-size', "10px")
        .style('font-family', "sans-serif")
        .attr({
            xmlns: 'http://www.w3.org/2000/svg',
            width: pWidth,
            height: pHeight
        })
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain([0, years.length - 1]);
    y.domain(dataExtent);

    svg.append("g")
        .attr("class", "lc-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "lc-axis")
        .call(yAxis);

    svg.append("path")
        .datum(data)
        .attr("class", "lc-line")
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("stroke-width", "1.5px")
        .attr("d", line);

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (width / 2) + "," + 0 + ")")
        .attr("font-size", "15px")
        .text("db_" + index);

    $('.lc-axis path').css('fill', 'none');
    $('.lc-axis path').css('stroke', '#000');
    $('.lc-axis path').css('shape-rendering', 'crispEdges');

    $('.lc-axis line').css('fill', 'none');
    $('.lc-axis line').css('stroke', '#000');
    $('.lc-axis line').css('shape-rendering', 'crispEdges');

    $('.lc-axis text').css('fill', '#000');
    $('.lc-axis .tick line').css('stroke', 'rgba(0, 0, 0, 0.1)');

    //write out the children of the container div
    let toWrite = window.d3.select('#' + id).html();
    let dbName = 'db_' + index;
    let writePath = lineChartDirectory + region + path.sep;
    // console.log(new Date());

    if (index == 0 && !fs.existsSync(writePath)) {
        fs.mkdirSync(writePath);
    }
    // console.log('Begin: ' + writePath + dbName + ".png");
    const buffer = svg2png.sync(toWrite);
    fs.writeFileSync(writePath + dbName + ".png", buffer);
    window.d3.select('#' + id).remove()
    // console.log('Done: ' + writePath + dbName + ".png");

    /* svg2png(toWrite)
        .then(buffer => fs.writeFile(writePath + dbName + ".png", buffer))
        .then(() => {
            window.d3.select('#' + id).remove()
            console.log('Done: ' + writePath + dbName + ".png");
        })
        // .then(result => console.log(new Date()))
        .catch(e => console.error(e)); */
}