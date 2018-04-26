state.features = {};
$.each(REGIONS.features, function (index, region) {
    state.features[region.properties.REGION_NAME] = region;
});

$('#maps-main-container').on('scroll', function () {
    $('#maps-row-header').scrollTop($(this).scrollTop());
});

function resizeMaps(){
    $("#maps-main-container").width($("#maps-container").width() - $("#maps-row-header").width());
}

function clearMaps() {
    $("#maps-main-container").empty();
}

function addMap(id, data) {
    var width = $("#maps-main-container").width() * 0.2,
        height = $("#maps-main-container").height() * 0.2;

    // dynamically name the id so that we can get the handler of that div and remove it
    var containerId = "maps-container-" + maps.maps.length;
    // insert the div
    $("#" + id).append($("<div>")
        .css("width", width > 255 ? width : 255)
        .css("height", height > 175 ? height : 175)
        .attr("id", containerId)
        .addClass("small-map"));
    // initialize the parameters in the line chart and return the object as the handler so that we can play with it in future
    var map = new Map(containerId, width, height, data);

    // push it to our global variables
    maps.maps.push(map);
}

function addScenarioName(id, name) {
    var width = $("#maps-main-container").width() * 0.2;

    // insert the div
    $("#" + id).append($("<div>")
        .css("width", width > 255 ? width : 255)
        .addClass("scenario-name")
        .text(name));
}

function addRowHeaders(name){
    var height = $("#maps-row-header").height() * 0.2;
    height = height > 175 ? height : 175;

    // insert the div
    $("#maps-row-header").append($("<div>")
        .css("height", height)
        .css("line-height", height + "px")
        .addClass("row-name")
        .text(name));
}

function addMaps() {

    // Add row headers
    $("#maps-row-header").append($("<div>").css("height", 25));
    addRowHeaders("GDP by region");
    addRowHeaders("PPP GDP by region");
    addRowHeaders("Population by region");

    // Resize the main-container's width so that header and maps are side by side
    $("#maps-main-container").width($("#maps-container").width() - $("#maps-row-header").width());

    $("#maps-main-container").append($("<div>")
        .attr("id", "scenario-names")
        .addClass("map-row")
    );
    $.each(clusterData, function (name, scenario) {
        addScenarioName("scenario-names", name);
    });

    var gdpID = "GDP by region".replace(/ /g, "-"),
        pppID = "PPP GDP by region".replace(/ /g, "-"),
        popID = "Population by region".replace(/ /g, "-");

    $("#maps-main-container").append($("<div>")
        .attr("id", gdpID)
        .addClass("map-row")
    );

    $("#maps-main-container").append($("<div>")
        .attr("id", pppID)
        .addClass("map-row")
    );

    $("#maps-main-container").append($("<div>")
        .attr("id", popID)
        .addClass("map-row")
    );

    $.each(clusterData, function (index, scenario) {
        addMap(gdpID, scenario.data["GDP by region"]);
        addMap(pppID, scenario.data["PPP GDP by region"]);
        addMap(popID, scenario.data["Population by region"]);
    });
}

var colors = [colorbrewer.Blues["6"], colorbrewer.Reds["6"], ["#fff"]];

function onEachFeature(feature, layer) {
    var style = {
        "fillColor": colors[0][1 + feature.binVal],
        "weight": 1,
        "fillOpacity": .75,
        "color": "#003300"
    };
    layer.setStyle(style);
}

function calculateRanges(dataMax, binCount) {
    var max = binCount - (dataMax % binCount) + dataMax;
    var increment = max / binCount;

    var range = [0];
    for (var i = 1; i < binCount + 1; i++)
        range.push(range[i - 1] + increment);

    return range;
}

function Map(containerId, width, height, data) {
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
    var regionIndices = {};
    var max = 0;

    $.each(data.region, function (index, feature) {
        features2Add.push(state.features[feature]);
        regionIndices[feature] = index;
    });

    $.each(data.data, function (index, region) {
        var sum = d3.sum(region);
        if (sum > max) {
            max = sum;
        }
    });

    // console.log(features2Add);

    var bin = calculateRanges(max, 5);

    var layer = L.geoJson(features2Add, {
        filter: function (feature, layer) {
            if (feature.properties) {
                feature.dataVal = d3.sum(data.data[regionIndices[feature.properties.REGION_NAME]]);
                feature.dataMax = max

                for (var i = 0; i < bin.length - 1; i++) {
                    if (feature.dataVal >= bin[i] && feature.dataVal < bin[i + 1]) {
                        feature.binVal = i;
                        break;
                    }
                }

                return true;
            }
            else
                return false;
        },
        onEachFeature: onEachFeature,
    });

    layer.addTo(map);

    // render each element: title
    // this.addTitle(svg, plotWidth, plotHeight, margin);
}