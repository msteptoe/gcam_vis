state.k = 4;

$(function () {
    $("#dialog-clusters").dialog({
        resizable: false,
        height: "auto",
        width: "auto",
        modal: false,
        autoOpen: false,
        buttons: [{
            text: "Set",
            click: function () {
                var k = +$('#clusters-parentkey-select').val();

                if (state.k != k) {
                    state.k = k;
                    // Determine if there are features shown, if so update clusters
                    console.log('incomplete');
                }
            },
            "class": "ui-button-success"
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
});

function Cluster(data, query, variable, value) {
    var divIndex = getFeatureViewIndex(query, variable, value);

    var plotID = 'cluster-' + divIndex;
    var container = $('#cluster-' + divIndex);
    container.visible();

    var width = container.width(),
        height = container.height();

    var plotData = [];
    $.each(data, function (index, cluster) {
        plotData.push({
            x: cluster.x,
            y: cluster.y,
            z: cluster.z,
            mode: "markers",
            type: "scatter3d",
            text: cluster.text,
            hoverinfo: 'text',
            marker: {
                color: colorbrewer.Set1[8][index],
                size: 2
            }
        });
        plotData.push({
            opacity: 0.5,
            type: "mesh3d",
            name: "Cluster " + index,
            hoverinfo: 'name',
            color: colorbrewer.Set1[8][index],
            x: cluster.x,
            y: cluster.y,
            z: cluster.z
        });
    });

    var layout = {
        autosize: true,
        height: height,
        scene: {
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 1.25,
                    y: 1.25,
                    z: 1.25
                },
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                }
            },
            xaxis: {
                type: "linear",
                zeroline: false
            },
            yaxis: {
                type: "linear",
                zeroline: false
            },
            zaxis: {
                type: "linear",
                zeroline: false
            }
        },
        showlegend: false,
        width: width
    };

    Plotly.newPlot(plotID, plotData, layout, {
        displaylogo: false,
        fillFrame: true,
        modeBarButtonsToRemove: [
            "sendDataToCloud",
            "toImage",
            "zoom3d",
            "resetCameraLastSave3d"
        ]
    });
    var myScene = $('#' + plotID + ' #scene');

    myScene.width(width)
        .height(height - 20)
        .css("left", 0)
        .css("top", 20);

    $('#' + plotID + ' [data-attr="scene.dragmode"]').each((i, d) => {
        $(d).click(() => {
            myScene.width(width)
                .height(height - 20)
                .css("left", 0)
                .css("top", 20);
        });
    });

    var plot = document.getElementById(plotID);
    plot.on('plotly_click', function (data) {
        // plot the 'hover' trace as a permanent/colored trace on click
        console.log(data.points[0].data.type);
    });
}

function updateCluster(divIndex, plotData, query, variable, value) {
    var plotID = 'cluster-' + divIndex;
    var container = $('#cluster-' + divIndex);
    container.visible();
    
    var width = container.width(),
        height = container.height();

    var layout = {
        autosize: true,
        height: height,
        scene: {
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 1.25,
                    y: 1.25,
                    z: 1.25
                },
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                }
            },
            xaxis: {
                type: "linear",
                zeroline: false
            },
            yaxis: {
                type: "linear",
                zeroline: false
            },
            zaxis: {
                type: "linear",
                zeroline: false
            }
        },
        showlegend: false,
        width: width
    };

    Plotly.update(plotID, plotData, layout);
    var myScene = $('#' + plotID + ' #scene');

    myScene.width(width)
        .height(height - 20)
        .css("left", 0)
        .css("top", 20);

    $('#' + plotID + ' [data-attr="scene.dragmode"]').each((i, d) => {
        $(d).click(() => {
            myScene.width(width)
                .height(height - 20)
                .css("left", 0)
                .css("top", 20);
        });
    });

    /* var plot = document.getElementById(plotID);
    plot.on('plotly_click', function (data) {
        // plot the 'hover' trace as a permanent/colored trace on click
        console.log(data.points[0].data.type);
    }); */
}

function drawClusters(divIndex, query, variable, value) {
    var plotID = 'cluster-' + divIndex;
    var container = $('#cluster-' + divIndex);
    var width = container.width(),
        height = container.height();

    var assignments = [];
    // Need to find and remove duplicate points and combine names
    $.each(state.cluAssigns[query], function (index, assign) {
        if (!assignments[assign]) {
            assignments[assign] = { x: [], y: [], z: [], text: [] };
        }
        assignments[assign].x.push(state.pca[query].x[index]);
        assignments[assign].y.push(state.pca[query].y[index]);
        assignments[assign].z.push(state.pca[query].z[index]);
        // Commented out until real
        // assignments[assign].text.push(fileNames[index].split('.json')[0]);
        assignments[assign].text.push('db_' + index);
    });
    console.log(assignments);

    var data = [];
    $.each(assignments, function (index, cluster) {
        data.push({
            x: cluster.x,
            y: cluster.y,
            z: cluster.z,
            mode: "markers",
            type: "scatter3d",
            text: cluster.text,
            hoverinfo: 'text',
            marker: {
                color: colorbrewer.Set1[8][index],
                size: 2
            }
        });
        data.push({
            opacity: 0.5,
            type: "mesh3d",
            name: "Cluster " + index,
            hoverinfo: 'name',
            color: colorbrewer.Set1[8][index],
            x: cluster.x,
            y: cluster.y,
            z: cluster.z
        });
    });

    console.log(data);

    var layout = {
        autosize: true,
        height: height,
        scene: {
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 1.25,
                    y: 1.25,
                    z: 1.25
                },
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                }
            },
            xaxis: {
                type: "linear",
                zeroline: false
            },
            yaxis: {
                type: "linear",
                zeroline: false
            },
            zaxis: {
                type: "linear",
                zeroline: false
            }
        },
        showlegend: false,
        width: width
    };

    Plotly.newPlot(plotID, data, layout, {
        displaylogo: false,
        fillFrame: true,
        modeBarButtonsToRemove: [
            "sendDataToCloud",
            "toImage",
            "zoom3d",
            "resetCameraLastSave3d"
        ]
    });
    var myScene = $('#' + plotID + ' #scene');
    myScene.width(width);
    myScene.height(height - 20);
    myScene.css("left", 0);
    myScene.css("top", 20);
    $('#' + plotID + ' [data-attr="scene.dragmode"]').each((i, d) => {
        $(d).click(() => {
            myScene.width(width);
            myScene.height(height - 20);
            myScene.css("left", 0);
            myScene.css("top", 20);
        });
    });

    var plot = document.getElementById(plotID);
    plot.on('plotly_click', function (data) {
        // plot the 'hover' trace as a permanent/colored trace on click
        console.log(data.points[0].data.type);
    });
}

function showClusters() {
    var container = $('#cluster-container');
    var width = container.width(),
        height = Math.floor((container.height() - 20) / 3);

    $('#cluster-container').append('<div class="scenario-name" style="width:' + width + 'px;">Clusters K = ' + state.k)

    $('.map-row').each(function (divIndex, div) {
        var plotID = 'plot-' + divIndex;

        var mapRow = $(div);
        $('#cluster-container').append('<div id="' + plotID + '" style="width:' + width + 'px;">');

        var query = mapRow.attr('_query');
        var assignments = [];
        $.each(state.cluAssigns[query], function (index, assign) {
            if (!assignments[assign]) {
                assignments[assign] = { x: [], y: [], z: [], text: [] };
            }
            assignments[assign].x.push(state.pca[query].x[index]);
            assignments[assign].y.push(state.pca[query].y[index]);
            assignments[assign].z.push(state.pca[query].z[index]);
            assignments[assign].text.push('db_' + index);
        });
        console.log(assignments);

        var data = [];
        $.each(assignments, function (index, cluster) {
            data.push({
                x: cluster.x,
                y: cluster.y,
                z: cluster.z,
                mode: "markers",
                type: "scatter3d",
                text: cluster.text,
                hoverinfo: 'text',
                marker: {
                    color: colorbrewer.Set1[8][index],
                    size: 2
                }
            });
            data.push({
                opacity: 0.5,
                type: "mesh3d",
                name: "Cluster " + index,
                hoverinfo: 'name',
                color: colorbrewer.Set1[8][index],
                x: cluster.x,
                y: cluster.y,
                z: cluster.z
            });
        });

        console.log(data);

        var layout = {
            autosize: true,
            height: height,
            scene: {
                aspectratio: {
                    x: 1,
                    y: 1,
                    z: 1
                },
                camera: {
                    center: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    eye: {
                        x: 1.25,
                        y: 1.25,
                        z: 1.25
                    },
                    up: {
                        x: 0,
                        y: 0,
                        z: 1
                    }
                },
                xaxis: {
                    type: "linear",
                    zeroline: false
                },
                yaxis: {
                    type: "linear",
                    zeroline: false
                },
                zaxis: {
                    type: "linear",
                    zeroline: false
                }
            },
            showlegend: false,
            width: width
        };

        Plotly.newPlot(plotID, data, layout, {
            displaylogo: false,
            fillFrame: true,
            modeBarButtonsToRemove: [
                "sendDataToCloud",
                "toImage",
                "zoom3d",
                "resetCameraLastSave3d"
            ]
        });
        var myScene = $('#' + plotID + ' #scene');
        myScene.width(width);
        myScene.height(height - 20);
        myScene.css("left", 0);
        myScene.css("top", 20);
        $('#' + plotID + ' [data-attr="scene.dragmode"]').each((i, d) => {
            $(d).click(() => {
                myScene.width(width);
                myScene.height(height - 20);
                myScene.css("left", 0);
                myScene.css("top", 20);
            });
        });

        var plot = document.getElementById(plotID);
        plot.on('plotly_click', function (data) {
            // plot the 'hover' trace as a permanent/colored trace on click
            console.log(data.points[0].data.type);
        });
    });
}