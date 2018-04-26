state.view = 'map';
state.selectedFeatures = [];
state.rowCount = 3;
state.rowItemCount = 3;

$(function () {
    $("#dialog-features").dialog({
        resizable: false,
        height: "auto",
        width: "auto",
        modal: false,
        autoOpen: false,
        buttons: [{
            text: "Add Feature",
            click: addFeature,
            "class": "ui-button-success"
        },
        // {
        //     text: "Add All Features",
        //     click: addAllFeatures,
        //     "class": "ui-button-warning"
        // },
        {
            text: "Clear All Features",
            click: clearFeatures,
            "class": "ui-button-danger"
        },
        {
            text: "Done",
            click: function () {
                $(this).dialog("close");
            },
            "class": "btn btn-default"
        }
        ]
    });
    // $('a[href="#main-body-container"]').dblclick(function () {
    // 	$("#dialog-maps").dialog('open');
    // });
});

function addFeature(queryP, variableP, valueP) {
    // console.log(queryP, variableP, valueP);
    if (queryP && queryP.type == "click")
        queryP = undefined;

    var query = queryP ? queryP : $("#features-parentkey-select option:selected").text();
    var variable = queryP ? variableP : $("#features-childkey-select option:selected").text();
    var value = queryP ? valueP : $("#features-grandchildkey-select option:selected").text();
    var headerText = query;
    var rowID = query;

    console.log(query, variable, value);

    var feature = query;
    if (variable) {
        feature += "____" + variable + "____" + value;
        headerText += ": " + variable + " - " + value;
    }

    if (state.selectedFeatures.indexOf(feature) == -1) {

        var featuresLength = state.selectedFeatures.length;
        if (featuresLength < 3) {
            // Add fundamental structure for maps and lcs
            addRowHeader(featuresLength, headerText + "<br>(" + UNITS[query] + ")");
            // setRowHeader(featuresLength, headerText + "<br>(" + UNITS[query] + ")");

            addRowCluster(featuresLength);
            addItemSlider(featuresLength);
            addRowNames(featuresLength);

            var viewState = state.view == 'map';

            addRowMap(featuresLength, viewState);
            addRowLC(featuresLength, !viewState);

            // Draw maps or lcs
            if (viewState) {
                // drawMaps(featuresLength, query, variable, value);
                socket.getMaps(FILES.slice(0, 3), getTimeSliderYears(), query, variable, value);
            }
            else {
                // drawLineCharts(featuresLength, query, variable, value);
                socket.getLineCharts(FILES.slice(0, 3), getTimeSliderYears(), $("#selected-region").text(), query, variable, value);
            }

            // drawClusters(featuresLength, query, variable, value);
            socket.getClusters3D(state.k, query, variable, value);
        }
        else {
            initFeatureSlider($("#feature-slider").slider('option', 'value'), $("#feature-slider").slider('option', 'min') - 1)
        }

        state.selectedFeatures.push(feature);
    }
}

function addRowHeader(index, text) {
    var height = getRowHeaderHeight();

    // insert the div
    $("#row-header").append(
        $('<div id="row-name-' + index + '">')
            .css("height", height)
            .css("line-height", height + "px")
            .addClass("row-name")
            .append($('<span id="row-name-text-' + index + '">').addClass("row-name-text").html(text))
    );
}

function setRowHeader(index, text) {
    $('#row-name-text-' + index).html(text);
}

function addRowNames(index) {
    var element = $('<div id="name-row-' + index + '">');
    var width = getViewWidth();
    var offset = index * state.rowItemCount;

    for (var i = 0; i < state.rowItemCount; i++) {
        element.append('<div id="scenario-name-' + (i + offset) + '" class="scenario-name" style="width:' + width + 'px;">' + FILES[i])
    }
    $('#view-container').append(element);
}

function setRowNames(index, scenarioIndex, names) {
    var offset = index * state.rowItemCount;
    var si = scenarioIndex == undefined ? 0 : scenarioIndex;

    for (var i = 0; i < state.rowItemCount; i++) {
        $('#scenario-name-' + (i + offset)).text(names[si + i])
    }
}

function addRowCluster(index) {
    var width = getViewWidth();
    var height = getClusterHeight();

    if (index == 0) {
        $('#cluster-container').append('<div class="scenario-name" style="width:' + width + 'px;">Clusters K = ' + state.k)
    }

    $('#cluster-container').append('<div id="cluster-' + index + '" style="width:' + width + 'px;height:' + height + 'px;">');
}

function addItemSlider(index) {
    var container = $('<div id="slider-row-' + index + '" class="slider-row">');
    var slider = $('<div id="slider-' + index + '" class="item-slider">');
    container.append(slider);
    $('#view-container').append(container);

    // var names = [];
    // var i = FILES.length;
    // while (i--) names[i] = FILES[i];

    initItemSlider(index, 0, d3.max([0, FILES.length - 3]), FILES);
}

function initItemSlider(index, value, max, names) {
    var startValue = 0;

    $('#slider-' + index).slider({
        value: value,
        min: 0,
        max: max,
        range: "min",
        step: 1,
        slide: function (event, ui) {
            if (startValue != ui.value) {
                $('#' + state.view + '-row-' + index).invisible();
            }
            else {
                $('#' + state.view + '-row-' + index).visible();
            }

            setRowNames(index, ui.value, names);
        },
        start: function (event, ui) {
            startValue = ui.value;
        },
        stop: function (event, ui) {
            // If the stop value is different then update items
            // Else unhide all items
            if (startValue != ui.value) {
                updateFeatureView(state.view, index, startValue, ui.value, names);
            }
            else {
                showView(state.view);
            }
        },
        names: names
    });
}

function resetItemSlider(index, value, names) {
    var startValue = 0;

    setRowNames(index, value, names);

    $('#slider-' + index).slider({
        value: value,
        slide: function (event, ui) {
            if (startValue != ui.value) {
                $('#' + state.view + '-row-' + index).invisible();
            }
            else {
                $('#' + state.view + '-row-' + index).visible();
            }

            setRowNames(index, ui.value, names);
        },
        start: function (event, ui) {
            startValue = ui.value;
        },
        stop: function (event, ui) {
            // If the stop value is different then update items
            // Else unhide all items
            if (startValue != ui.value) {
                updateFeatureView(state.view, index, startValue, ui.value, names);
            }
            else {
                showView(state.view);
            }
        }
    });
}

function addRowMap(index, visible) {
    var element = $('<div id="map-row-' + index + '" class="map-row" style="display:' + (visible ? 'inline' : 'none') + ';">');
    var width = getViewWidth();
    var height = getViewHeight();
    var names = d3.keys(clusterData).sort();
    var offset = index * state.rowItemCount;

    for (var i = 0; i < state.rowItemCount; i++) {
        element.append(
            '<div id="map-container-' + (i + offset) + '" ' +
            'class="small-map" style="width:' + width + 'px; ' +
            'height:' + height + 'px;">'
        );
    }
    element.append('<div style="clear: both;">')
    $('#view-container').append(element);
}

function addRowLC(index, visible) {
    var element = $('<div id="lc-row-' + index + '" class="lc-row" style="display:' + (visible ? 'inline' : 'none') + ';">');
    var width = getViewWidth();
    var height = getViewHeight();
    var names = d3.keys(clusterData).sort();
    var offset = index * state.rowItemCount;

    for (var i = 0; i < state.rowItemCount; i++) {
        element.append(
            '<div id="lc-container-' + (i + offset) + '" ' +
            'class="small-lc" style="width:' + width + 'px; ' +
            'height:' + height + 'px;">'
        );
    }
    element.append('<div style="clear: both;">')
    $('#view-container').append(element);
}

function addAllFeatures() {

}

function clearFeatures() {
    state.selectedFeatures = [];
    $('#cluster-container').empty();
    $('#view-container').empty();
    $('[id^=row-name-]').remove();
}