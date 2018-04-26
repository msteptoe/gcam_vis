function initControls() {
    showLoading(true);
    state.server = true;

    $('#par-controls-container').hide();

    if (clusterShapefile.layer) {
        map.removeLayer(clusterShapefile.layer);
        console.log("Should remove layer!!!!")
    }

    $('#par-controls-container').show();

    var yearSelect = $('#par-year-select');
    yearSelect.empty();
    yearSelect.append($("<option/>")
        .val(-1)
        .text('All'));

    $.each(YEARS, function (key, value) {
        yearSelect.append($("<option/>")
            .val(key)
            .text(value));
    });

    socket.getDendrogram();
    updateClusterKValues();

    var keysArray = d3.keys(KEYS);
    prepareFeatures('par', keysArray, KEYS);
    prepareFeatures('sct', keysArray, KEYS, 'x');
    prepareFeatures('sct', keysArray, KEYS, 'y');

    socket.getClusters2D(state.clu.k);
    parCoorPlot.setAllFiles(FILES);

    // hideLoading();
}

function Controller() {
}

Controller.prototype.addScatterPlot = function (data, extent, queries, variables, values) {
    var axes = [];

    if (variables && variables[0]) {
        axes[0] = variables[0] == "" ? queries[0] : queries[0] + " " + variables[0] + " " + values[0];
        axes[1] = variables[1] == "" ? queries[1] : queries[1] + " " + variables[1] + " " + values[1];
    }
    else {
        axes = queries;
    }

    // set the width and height of the div for each line chart
    var width = $("#sct-main-container").width() * 0.5 - 13 - 10,
        height = $("#sct-main-container").height() * 0.5;

    // dynamically name the id so that we can get the handler of that div and remove it
    var containerId = "sct-container-" + scatterplots.plots.length;
    // insert the div
    $("#sct-main-container").append($("<div></div>").attr("width", "50%").attr("height", "50%").attr("id", containerId).addClass("sct"));

    var sct = new ScatterPlot(data, extent, axes, containerId, width, height);
    // begin to draw the line chart
    sct.addRemovalAndBoundary();
    // push it to our global variables
    scatterplots.plots.push(sct);
}

var controller = new Controller();