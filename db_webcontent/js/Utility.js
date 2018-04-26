var FEATURE_SEPARATOR = '____';

jQuery.fn.visible = function () {
    return this.css('visibility', 'visible');
};

jQuery.fn.invisible = function () {
    return this.css('visibility', 'hidden');
};

function getViewWidth() {
    return (($("#main-body-container").width() - 15) / (state.rowItemCount + 2)) - 4;
}

function getViewHeight() {
    return ($('#view-container').height() / state.rowCount) - 20 - 16;
}

function getClusterHeight() {
    return ($('#cluster-container').height() - 20) / state.rowCount;
}

function getRowHeaderHeight() {
    return ($("#row-header").height() - 20) / state.rowCount;
}

function getDatabaseIndex(name) {
    return FILES.indexOf(name);
}

function showView(view) {
    if (view == 'map') {
        $('.lc-row').hide();
        $('.map-row').show();
        $("#selected-region-container").hide();
    }
    else {
        $('.map-row').hide();
        $('.lc-row').show();
        $("#selected-region-container").show();
    }

    state.view = view;
}

function showAllFeatures(view) {
    if (view == 'map') {
        $('.map-row').visible();
    }
    else {
        $('.lc-row').visible();
    }

    $('.js-plotly-plot').visible();
}

function hideAllFeatureViews() {
    $('.map-row').invisible();
    $('.lc-row').invisible();
}

function hideAllFeatures() {
    $('.map-row').invisible();
    $('.lc-row').invisible();
    $('.js-plotly-plot').invisible();
}

function hideFeatureView(index) {
    $('#lc-row-' + viewIndex).invisible();
    $('#map-row-' + viewIndex).invisible();
}

function updateFeatureView(view, index, oldOffset, newOffset, names, updateSlider) {
    var featureComponents = getFeatureComponentsByIndex(index);
    // Draw maps or lcs
    if (view == 'map') {
        socket.getMaps(names.slice(newOffset, newOffset + 3), getTimeSliderYears(), featureComponents[0], featureComponents[1], featureComponents[2]);
    }
    else {
        socket.getLineCharts(names.slice(newOffset, newOffset + 3), getTimeSliderYears(), $("#selected-region").text(), featureComponents[0], featureComponents[1], featureComponents[2]);
    }

    if (updateSlider) {
        resetItemSlider(index, newOffset, names);
    }
}

function getFeature(query, variable, value) {
    var feature = query;
    if (variable) {
        feature += FEATURE_SEPARATOR + variable + FEATURE_SEPARATOR + value;
    }

    return feature;
}

function getFeatureOffset() {
    return -1 * $("#feature-slider").slider('option', 'value');
}

function getFeatureComponents(feature) {
    return feature.split(FEATURE_SEPARATOR);
}

function getFeatureComponentsByIndex(index) {
    var offset = getFeatureOffset();

    return state.selectedFeatures[offset + index].split(FEATURE_SEPARATOR);
}

function getFeatureViewItemOffset(index) {
    return $('#slider-' + index).slider('option', 'value');
}

function getFeatureViewIndex(query, variable, value) {
    var divIndex = -1;
    var offset = getFeatureOffset();

    var feature = getFeature(query, variable, value);

    var index = state.selectedFeatures.indexOf(feature);
    if (index > -1 && (index >= offset && index <= (offset + 2))) {
        divIndex = index - offset;
    }
    else {
        console.log('Feature Not Found || Out of Bounds: ' + feature + ' (' + index + ')');
    }

    return divIndex;
}

function getVisibleFeatures() {
    var offset = getFeatureOffset();
    var features = [];

    for (var i = 0; i < 3 && i < state.selectedFeatures.length; i++) {
        features.push(state.selectedFeatures[offset + i]);
    }

    return features;
}

function showDialog(view) {
    $(".ui-dialog-content").dialog("close");
    state.activeDialog = view;

    switch (view) {
        case 'fea':
            if (d3.keys(clusterKeys).length <= 0) {
                return;
            }
            break;
        case 'den':
            dendogramLegend();
            break;
        case 'map':
            if (!state.map.refreshed) {
                state.map._onResize();
                state.map.refreshed = true;
            }
        case 'clu':
            if (!$('#clu-container').hasClass('active')) {
                $('a[href="#clu-container"]').trigger('click');
            }
            break;
        case 'sct':
            if (!$('#sct-container').hasClass('active')) {
                $('a[href="#sct-container"]').trigger('click');
            }
            break;
        case 'completedJobs':
            return socket.getCompletedJobs();
            break;
        case 'processingJobs':
            return socket.getProcessingJobs();
            break;
        default:
            $('#dialog-' + view).dialog("open");
            break;
    }

    $('#dialog-' + view).dialog("open");
}

function openDialog(view) {
    $('#dialog-' + view).dialog("open");
}

function closeDialog(view) {
    $(".ui-dialog-content").dialog("close");
    state.activeDialog = '';

    $('#dialog-' + view).dialog("close");
}

function getSelectedFeature(idPrefix, idSuffix) {
    var suffix = idSuffix ? "-" + idSuffix : "";

    var query = $("#" + idPrefix + "-parentkey-select" + suffix + " option:selected").text();
    var variable = $("#" + idPrefix + "-childkey-select" + suffix + " option:selected").text();
    var value = $("#" + idPrefix + "-grandchildkey-select" + suffix + " option:selected").text();

    return [query, variable == "" ? undefined : variable, value == "" ? undefined : value];
}

// Prepare the Features: 1) inserting the valid output types into the select box. 2) validating the input
function prepareFeatures(idPrefix, parentKeys, childKeys, idSuffix) {
    var suffix = idSuffix ? "-" + idSuffix : "";

    $("#" + idPrefix + "-prepare").hide();
    $("#" + idPrefix + "-parentkey" + suffix).show();

    $.each(parentKeys, function (index, value) {
        $("#" + idPrefix + "-parentkey-select" + suffix).append($("<option ></option>").attr("value", index).text(value));
    });
    $("#" + idPrefix + "-parentkey-select" + suffix + " option[value=0]").attr("selected", "selected"); //set the first element in the parentKeys as the default value

    //set childKeys of the first parent key as the default value
    $.each(childKeys[parentKeys[0]], function (index, value) {
        $("#" + idPrefix + "-childkey" + suffix).show();
        $("#" + idPrefix + "-childkey-select" + suffix).append($("<option></option>").attr("value", index).text(value));
    });

    //dynamically load the child keys from the parent key user selected
    $("#" + idPrefix + "-parentkey-select" + suffix).change(function () {
        $("#" + idPrefix + "-childkey" + suffix).hide();
        $("#" + idPrefix + "-grandchildkey" + suffix).hide();

        $("#" + idPrefix + "-childkey-select" + suffix).empty();
        $("#" + idPrefix + "-grandchildkey-select" + suffix).empty();

        var parentkey = $("#" + idPrefix + "-parentkey-select" + suffix + " option:selected").text();
        var validChildKeys = childKeys[parentkey];
        var validChild = false,
            firstChild = [];

        $.each(validChildKeys, function (index, value) {
            if (validChild == false) {
                $("#" + idPrefix + "-childkey" + suffix).show();
                validChild = true;
                firstChild = value;
            }

            $("#" + idPrefix + "-childkey-select" + suffix).append($("<option></option>").attr("value", index).text(index));
        });

        if (validChild && firstChild) {
            $("#" + idPrefix + "-grandchildkey" + suffix).show();
            $.each(firstChild, function (index, value) {
                $("#" + idPrefix + "-grandchildkey-select" + suffix).append($("<option></option>").attr("value", index).text(value));
            })
        }
    });

    //dynamically load the grandchild keys from the child key user selected
    $("#" + idPrefix + "-childkey-select" + suffix).change(function () {
        $("#" + idPrefix + "-grandchildkey" + suffix).hide();
        $("#" + idPrefix + "-grandchildkey-select" + suffix).empty();

        var parentkey = $("#" + idPrefix + "-parentkey-select" + suffix + " option:selected").text();
        var childkey = $("#" + idPrefix + "-childkey-select" + suffix + " option:selected").text();
        var validGrandchildKeys = childKeys[parentkey][childkey];
        var validGrandchild = false;

        $.each(validGrandchildKeys, function (index, value) {
            if (validGrandchild == false) {
                $("#" + idPrefix + "-grandchildkey" + suffix).show();
                validGrandchild = true;
            }

            $("#" + idPrefix + "-grandchildkey-select" + suffix).append($("<option></option>").attr("value", index).text(value));
        });

    });
}