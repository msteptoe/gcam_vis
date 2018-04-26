function initControls(){
    prepareFeatures('features', d3.keys(KEYS), KEYS);
    
    initTimeSlider();
    initControlMapLayers();
    $('#main-controls-container').visible();
    hideLoading();
}

function initTimeSlider() {
    var max = YEARS.length - 1;
    $("#time-slider").slider({
        range: true,
        min: 0,
        max: max,
        values: [0, max],
        slide: function (event, ui) {
            $("#date-range").text(YEARS[ui.values[0]] + " - " + YEARS[ui.values[1]]);
        }
    });
    $("#date-range").text(YEARS[0] + " - " + YEARS[max]);
}

function getTimeSliderYears() {
    var sliderRange = $("#time-slider").slider("option", "values");
    var yearRange = [];
    $.each(YEARS, function (i, d) {
        if (i >= sliderRange[0] && i <= sliderRange[1])
            yearRange.push(d);
    });

    return yearRange;
}

function selectRegion(region) {
    $("#selected-region-container").show();
    $("#selected-region").text(region);
    showView('lc');
    $('.item-slider').each(function (index, value) {
        $("#show-maps").attr('_itemIndex' + index, $(value).slider('option', 'value'));
    })
    
}

function initShowMaps() {
    var button = $("#show-maps");
    for (var i = 0; i < state.rowItemCount; i++) {
        button.attr('_itemIndex' + i, -1);
    }

    button.button().click(function (event) {
        var self = this;
        showView('map');
        
        $('.item-slider').each(function (index, value) {
            var startValue = +button.attr('_itemIndex' + index);
            var val = $(value).slider('option', 'value');
            if(val != startValue){
                $('#map-row-' + index).invisible();
                updateFeatureView(state.view, index, startValue, val, $(value).slider('option', 'names'));
            }
        })
    });
}

function initFeatureSlider(value, min) {
    var startValue = 0;

    $("#feature-slider").slider({
        orientation: "vertical",
        range: "max",
        min: min == undefined ? 0 : min,
        max: 0,
        value: value == undefined ? 0 : value,
        step: 1,
        slide: function (event, ui) {
            // console.log(ui.value);

            if (startValue != ui.value) {
                hideAllFeatures();
            }
            else {
                showAllFeatures(state.view);
            }

            var index = -1 * ui.value;
            for (var i = 0; i < state.rowCount; i++) {
                var selectedFeature = state.selectedFeatures[index + i].split("____");
                var query = selectedFeature[0];
                var headerText = query;

                if (selectedFeature.length > 1) {
                    headerText += ": " + selectedFeature[1] + " - " + selectedFeature[2];
                }

                setRowHeader(i, headerText + "<br>(" + UNITS[query] + ")");
            }
        },
        start: function (event, ui) {
            startValue = ui.value;
        },
        stop: function (event, ui) {
            // If the stop value is different then update rows
            // Else unhide all rows
            if (startValue != ui.value) {
                var features = getVisibleFeatures();
                var dif = Math.abs(ui.value - startValue);
                var index = -1 * ui.value;

                if (dif < state.rowCount) {
                    $.each(features, function (index, feature) {
                        var components = getFeatureComponents(feature);
                        if (index < (state.rowCount - dif)) {
                            updateCluster(index, document.getElementById('cluster-' + index).data, components[0], components[1], components[2]);
                        }
                        else {
                            socket.getClusters3D(state.k, components[0], components[1], components[2]);
                        }
                    });
                }
                else {
                    $.each(features, function (index, feature) {
                        var components = getFeatureComponents(feature);
                        socket.getClusters3D(state.k, components[0], components[1], components[2]);
                    });
                }

                updateFeatureView(state.view, 0, 0, 0, FILES, true);
                updateFeatureView(state.view, 1, 0, 0, FILES, true);
                updateFeatureView(state.view, 2, 0, 0, FILES, true);
            }
            else {
                showAllFeatures(state.view);
            }
        }
    });
}

$(function () {
    initShowMaps();
    initFeatureSlider();
});


function initControlMapLayers() {
    // Setup Line Charts Leaflet map
    var bounds = L.latLngBounds(L.latLng(90, 180), L.latLng(-60, -180));
    var map = L.map('main-controls-map', {
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

    state.map = map;
    state.map.refreshed = false;

    var features2Add = [];

    $.each(REGIONS_GEOJSON.features, function (index, region) {
        if (REGIONS.indexOf(region.properties.REGION_NAME) > -1) {
            features2Add.push(region);
        }
    });

    var layer = L.geoJson(features2Add, {
        filter: function (feature, layer) {
            if (feature.properties) {
                return true;
            }
            else
                return false;
        },
        onEachFeature: function (feature, layer) {
            layer.on({
                mouseover: function (e) {
                    var layer = e.target;

                    layer.setStyle({
                        "weight": 1,
                        "fillOpacity": 0.7
                    });

                    if (!L.Browser.ie && !L.Browser.opera) {
                        layer.bringToFront();
                    }
                },
                mouseout: function (e) {
                    var layer = e.target;

                    if (!e.target.selected) {
                        layer.setStyle({
                            "weight": 1,
                            "fillOpacity": 0.2
                        });
                    }
                },
                click: function (e) {
                    var layer = e.target;
                    var feature = layer.feature;
                    var region = feature.properties.REGION_NAME;
                    // console.log(name, feature);

                    selectRegion(region);
                    var features = getVisibleFeatures();
                    $.each(features, function (index, feature) {
                        var components = getFeatureComponents(feature);
                        var offset = getFeatureViewItemOffset(index);
                        socket.getLineCharts(FILES.slice(offset, offset + 3), getTimeSliderYears(), $("#selected-region").text(), components[0], components[1], components[2]);
                    });
                    // addLineCharts(region);
                }
            });
        },
        style: {
            "color": "black",
            "fillColor": "grey",
            "weight": 1,
            "opacity": 0.4,
            "fillOpacity": 0.2
        }
    });

    layer.addTo(map);
}
