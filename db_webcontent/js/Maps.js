state.features = {};
$.each(REGIONS_GEOJSON.features, function (index, region) {
    if (state.features[region.properties.REGION_NAME] == undefined) {
        state.features[region.properties.REGION_NAME] = [];
    }
    state.features[region.properties.REGION_NAME].push(region);
});

state.maps = [];
function LeafletMaps(data, extent, years, query, variable, value) {
    var feature = getFeature(query, variable, value);
    var viewIndex = getFeatureViewIndex(query, variable, value);
    $('#map-row-' + viewIndex).visible();

    $.each(data, function (index, scenario) {
        var divIndex = (viewIndex * state.rowItemCount) + index;

        if (state.maps[divIndex]) {
            state.maps[divIndex].remove();
        }

        state.maps[divIndex] = LeafletMap('map-container-' + divIndex, scenario, extent, years, feature);
    });
}

function LeafletMap(divID, data, extent, years, query) {
    $('#' + divID).empty();
    var bounds = L.latLngBounds(L.latLng(90, 180), L.latLng(-60, -180));
    var map = L.map(divID, {
        center: [40, 0],
        zoom: 0,
        maxBounds: bounds,
        zoomControl: false
    });

    L.tileLayer(
        // "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 5,
            // minZoom: 1,
            tileSize: 256,
            noWrap: true,
            bounds: bounds
        }).addTo(map);

    var features2Add = [];
    var featureIndices = {};
    var max = 0;
    var maxMean = extent[1];
    var minMean = extent[0];

    if (data[0].region) {
        $.each(data, function (index, region) {

            var feature = region.region;
            featureIndices[feature] = index;
            features2Add = features2Add.concat(state.features[feature]);
        });
    }
    else {
        $.each(REGIONS_GEOJSON.features, function (index, feature) {
            features2Add.push(feature);
            featureIndices[feature.properties.REGION_NAME] = 0;
        })
    }

    var bin;
    var colorCount = 6;
    if (minMean != maxMean) {
        bin = d3.scale.quantize().domain([minMean, maxMean]).range(colorbrewer.Blues[colorCount].slice(1, colorCount));
    }
    else {
        bin = function () { return colorbrewer.Blues[colorCount][0] };
    }

    var timeRange = $("#time-slider").slider("option", "values");
    var layer = L.geoJson(features2Add, {
        filter: function (feature, layer) {
            if (feature.properties) {
                feature[query] = {};

                var yearRange = [];
                $.each(YEARS, function (i, d) {
                    if (i >= timeRange[0] && i <= timeRange[1])
                        yearRange.push(d);
                });

                feature[query].dataVal = d3.mean(data[featureIndices[feature.properties.REGION_NAME]].value, function (d, i) {
                    if (yearRange.indexOf(years[i]) > -1) {
                        return d;
                    }
                });

                gBin = bin;
                feature.binVal = bin(feature[query].dataVal);

                return true;
            }
            else
                return false;
        },
        onEachFeature: onEachFeature,
    });

    layer.addTo(map);

    return map;
}

function resizeMaps() {
    var width = $("#main-body-container").width() - $("#maps-row-header").width();
    // $("#view-container").width(width * (3 / 4));
    // $("#cluster-container").width(width * (1 / 4));
    $("#view-container").width(830);
    $("#cluster-container").width(265);
}

function clearMaps() {
    $("#view-container").empty();
    $("#maps-row-header").empty();
    maps.maps = [];
}

function addMap(id, data, query, minMax, years) {
    var width = $("#main-body-container").width() / 5,
        height = Math.floor(($("#view-container").height() / 3) - 20 - 20) - 5;

    // dynamically name the id so that we can get the handler of that div and remove it
    var containerId = "main-body-container-" + maps.maps.length;
    // insert the div
    $("#" + id).append($("<div>")
        .css("width", width > 255 ? width : 255)
        .css("height", height > 175 ? height : 175)
        .attr("id", containerId)
        .addClass("small-map")
    );
    // initialize the parameters in the line chart and return the object as the handler so that we can play with it in future
    var map = new Map(containerId, width, height, data, query, minMax, years);

    // push it to our global variables
    maps.maps.push(map);
}

function addMaps(queryP, variableP, valueP) {
    console.log(queryP, variableP, valueP)
    var query = queryP ? queryP : $("#maps-parentkey-select option:selected").text();
    var variable = queryP ? variableP : $("#maps-childkey-select option:selected").text();
    var value = queryP ? valueP : $("#maps-grandchildkey-select option:selected").text();
    var headerText = query,
        rowID = query;

    if (variable) {
        headerText += ": " + variable + " - " + value;
        rowID += "____" + variable + "____" + value + "______map";
    }
    else {
        rowID += "______map";
    }

    // Add inital header spacing and scenario name row
    /* if (maps.maps.length == 0) {
        $("#maps-row-header").append($("<div>").css("height", 20));

        $("#view-container").append($("<div>")
            .attr("id", "scenario-names")
        );
        $.each(clusterData, function (name, scenario) {
            addScenarioName("scenario-names", name);
        });
    } */

    addRowHeader(headerText + "<br>(" + UNITS[query] + ")");

    // Resize the view-container's width so that header and maps are side by side
    resizeMaps();

    rowID = rowID.replace(/ /g, "-");

    var timeRange = $("#time-slider").slider("option", "values");
    var entireRange = false;
    if (timeRange[0] == 0 && timeRange[1] == (YEARS.length - 1))
        entireRange = true;

    // var maxSum = clusterMaxSum[query] && entireRange ? clusterMaxSum[query] : null,
    //     minSum = clusterMinSum[query] && entireRange ? clusterMinSum[query] : null,
    //     maxMean = clusterMaxMean[query] && entireRange ? clusterMaxMean[query] : null,
    //     minMean = clusterMinMean[query] && entireRange ? clusterMinMean[query] : null;

    var maxSum = null,
        minSum = null,
        maxMean = null,
        minMean = null;

    var variableMapdata = [];
    var years = [];


    var yearRange = [];
    $.each(YEARS, function (i, d) {
        if (i >= timeRange[0] && i <= timeRange[1])
            yearRange.push(d);
    });
    if (variable) {
        $.each(clusterData, function (index, scenario) {
            variableMapdata[index] = [];
            years = scenario.data[query].years;

            $.each(scenario.data[query].data, function (i, d) {
                if (d[variable] == value) {
                    variableMapdata[index].push(d);

                    var mapData = [];
                    var dataMean = d3.mean(d.value, function (d, i) {
                        if (yearRange.indexOf(years[i]) > -1) {
                            return d;
                        }
                    });

                    if (maxMean == null || maxMean < dataMean) {
                        maxMean = dataMean;
                    }
                    if (minMean == null || minMean > dataMean) {
                        minMean = dataMean;
                    }
                }
            });
        });
    }
    else {
        $.each(clusterData, function (index, scenario) {
            $.each(scenario.data[query].data, function (i, d) {
                var mapData = [];
                years = scenario.data[query].years;

                var dataMean = d3.mean(d.value, function (d, i) {
                    if (yearRange.indexOf(years[i]) > -1) {
                        return d;
                    }
                });

                if (maxMean == null || maxMean < dataMean) {
                    maxMean = dataMean;
                }
                if (minMean == null || minMean > dataMean) {
                    minMean = dataMean;
                    // console.log(d.value);
                }
            });
        });
    }
    $('#view-container').append(
        $('<div id="slider">')
            .attr("id", rowID)
            .addClass("map-row")
            .attr("_query", query)
            .attr("_variable", variable)
            .attr("_value", value)
    );

    $("#view-container").append(
        $("<div>")
            .attr("id", rowID)
            .addClass("map-row")
            .attr("_query", query)
            .attr("_variable", variable)
            .attr("_value", value)
            .attr("_min", minMean)
            .attr("_max", maxMean)
    );

    $("#" + rowID).append(
        $("<div>")
            .attr("id", "scenario-names_" + rowID)
    );
    $.each(clusterData, function (name, scenario) {
        addScenarioName("scenario-names_" + rowID, name);
    });

    console.log(query, variable, value);
    var minMax = { maxMean: maxMean, minMean: minMean };
    console.log(minMax);
    if (variable) {
        $.each(clusterData, function (index, scenario) {
            // var mapData = [];
            // if (!entireRange) {
            //     mapData = variableMapdata[index];
            // }
            // else {
            //     $.each(scenario.data[query].data, function (i, d) {
            //         if (d[variable] == value) {
            //             mapData.push(d);
            //         }
            //     });
            // }
            var mapData = variableMapdata[index];
            addMap(rowID, mapData, rowID, minMax, years);
        });
    }
    else {
        $.each(clusterData, function (index, scenario) {
            addMap(rowID, scenario.data[query].data, query, minMax, years);
        });
    }

    gIndex++;
}

function addScenarioName(id, name) {
    var width = $("#main-body-container").width() / 5;

    // insert the div
    $("#" + id).append($("<div>")
        .css("width", width > 255 ? width : 255)
        .addClass("scenario-name")
        .text(name));
}

function addAllMaps() {
    addMaps("GDP by region");
    addMaps("PPP GDP by region");
    addMaps("Population by region");
    // showClusters();
}

var colors = [colorbrewer.Blues["6"], colorbrewer.Reds["6"], ["#fff"]];

function onEachFeature(feature, layer) {
    var style = {
        // "fillColor": colors[0][1 + feature.binVal],
        "fillColor": feature.binVal,
        "weight": 1,
        "fillOpacity": .75,
        "color": "#003300"
    };
    layer.setStyle(style);

    layer.on({
        // mouseover: highlightFeature,
        // mouseout: resetHighlight,
        click: function (e) {
            console.log(e.target);
        }
    });
}

function calculateRanges(dataMax, binCount) {
    var max = binCount - (dataMax % binCount) + dataMax;
    var increment = max / binCount;

    var range = [0];
    for (var i = 1; i < binCount + 1; i++)
        range.push(range[i - 1] + increment);

    return range;
}

var gIndex = 0;
function Map(containerId, width, height, data, query, minMax, years) {
    var self = this;

    this.containerId = containerId;
    this.width = width;
    this.height = height;
    this.metric = undefined;

    var bounds = L.latLngBounds(L.latLng(90, 180), L.latLng(-60, -180));
    var map = L.map(containerId, {
        center: [40, 0],
        zoom: 0,
        maxBounds: bounds,
        zoomControl: false
    });
    this.map = map;

    L.tileLayer(
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            // attribution: '&copy; ' + '<a href="https://openstreetmap.org">OpenStreetMap</a>' + ' Contributors',
            maxZoom: 5,
            // minZoom: 1,
            tileSize: 256,
            noWrap: true,
            bounds: bounds
        }).addTo(map);

    // add a base layer
    // L.tileLayer('http://tile.stamen.com/toner/{z}/{x}/{y}.png', {
    //     attribution: 'Stamen'
    // }).addTo(map);

    var features2Add = [];
    var featureIndices = {};
    var max = 0;
    var maxMean = minMax.maxMean,
        minMean = minMax.minMean;

    if (data[0].region) {
        $.each(data, function (index, region) {
            // var sum = d3.sum(region.value);
            // if (sum > max) {
            //     max = sum;
            // }

            var feature = region.region;
            featureIndices[feature] = index;
            features2Add.push(state.features[feature]);
        });
    }
    else {
        // var sum = d3.sum(data[0].value);
        // if (sum > max) {
        //     max = sum;
        // }
        // console.log(sum)
        $.each(state.features, function (index, feature) {
            features2Add.push(feature);
            featureIndices[index] = 0;
        })
    }

    // var bin = calculateRanges(max, 5);
    var bin = d3.scale.quantize().domain([minMean, maxMean]).range(colorbrewer.Blues["6"].slice(1, -1));
    var timeRange = $("#time-slider").slider("option", "values");

    var layer = L.geoJson(features2Add, {
        filter: function (feature, layer) {
            if (feature.properties) {
                feature[query] = {};
                // feature[query].dataVal = d3.sum(data[featureIndices[feature.properties.REGION_NAME]].value);

                // var entireRange = false;
                // if (timeRange[0] == 0 && timeRange[1] == (YEARS.length - 1))
                //     entireRange = true;

                var yearRange = [];
                $.each(YEARS, function (i, d) {
                    if (i >= timeRange[0] && i <= timeRange[1])
                        yearRange.push(d);
                });

                feature[query].dataVal = d3.mean(data[featureIndices[feature.properties.REGION_NAME]].value, function (d, i) {
                    if (yearRange.indexOf(years[i]) > -1) {
                        return d;
                    }
                });

                // if (!entireRange) {
                //     var yearRange = [];
                //     $.each(YEARS, function (i, d) {
                //         if (i >= timeRange[0] && i <= timeRange[1])
                //             yearRange.push(d);
                //     });

                //     feature[query].dataVal = d3.mean(data[featureIndices[feature.properties.REGION_NAME]].value, function (d, i) {
                //         if (yearRange.indexOf(years[i]) > -1) {
                //             return d;
                //         }
                //     });
                // }
                // else {
                //     feature[query].dataVal = d3.mean(data[featureIndices[feature.properties.REGION_NAME]].value);
                // }

                // feature[query].dataMax = max

                /* for (var i = 0; i < bin.length - 1; i++) {
                    if (feature[query].dataVal >= bin[i] && feature[query].dataVal < bin[i + 1]) {
                        feature.binVal = i;
                        break;
                    }
                } */
                gBin = bin;
                feature.binVal = bin(feature[query].dataVal);
                // if(!gIndex){
                //     console.log('feature.binVal: ', feature.binVal);
                // }

                return true;
            }
            else
                return false;
        },
        onEachFeature: onEachFeature,
    });

    layer.addTo(map);
}