function addLineChart(id, data, extent, query, years, units) {
    var width = $("#main-body-container").width() * 0.2,
        height = $("#view-container").height() * 0.2;

    // dynamically name the id so that we can get the handler of that div and remove it
    var containerId = "lc-container-" + linecharts.charts.length;
    width = width > 255 ? width : 255;
    height = height > 175 ? height : 175;

    // insert the div
    $("#" + id).append($("<div>")
        .css("width", width)
        .css("height", height)
        .attr("id", containerId)
        .addClass("small-lc")
    );
    // initialize the parameters in the line chart and return the object as the handler so that we can play with it in future
    var chart = new LineChart(containerId, width, height, data, extent, query, years, units);

    // push it to our global variables
    linecharts.charts.push(chart);
}

function addLineCharts(region) {
    $('.lc-row').remove();
    $('.map-row').each(function (i, d) {
        var mapRow = $(d);
        var query = mapRow.attr("_query");
        var variable = mapRow.attr("_variable");
        var value = mapRow.attr("_value");
        // var min = mapRow.attr("_min");
        // var max = mapRow.attr("_max");
        // var extent = [min, max];
        mapRow.hide();
        // console.log(query, variable, value);

        var headerText = query,
            rowID = query;

        if (variable) {
            headerText += ": " + variable + " - " + value;
            rowID += "____" + variable + "____" + value + "______lc";
        }
        else {
            rowID += "______lc";
        }

        rowID = rowID.replace(/ /g, "-");

        $("#view-container").append($("<div>")
            .attr("id", rowID)
            .addClass("lc-row")
            .attr("_query", query)
            .attr("_variable", variable)
            .attr("_value", value)
        );

        $("#" + rowID).append($("<div>")
            .attr("id", "scenario-names_" + rowID)
        );
        $.each(clusterData, function (name, scenario) {
            addScenarioName("scenario-names_" + rowID, name);
        });

        var dataExtent = [null, null];

        // If variable exists then must use value for match
        // Else just use values based on the query
        if (variable !== "") {
            var data2Pass = [];
            var years = [];
            var units;
            $.each(clusterData, function (index, scenario) {
                var chartData = [];
                years = scenario.data[query].years;
                units = scenario.data[query].units;

                $.each(scenario.data[query].data, function (i, d) {
                    if (d.region == region && d[variable] == value) {
                        chartData = d.value;
                        var extent = d3.extent(chartData);
                        if (dataExtent[0] == null || extent[0] < dataExtent[0])
                            dataExtent[0] = extent[0];
                        if (dataExtent[1] == null || extent[1] > dataExtent[1])
                            dataExtent[1] = extent[1];

                        data2Pass.push(chartData);
                        return false;
                    }
                });
            });
            console.log(data2Pass)
            $.each(data2Pass, function (index, chartData) {
                addLineChart(rowID, chartData, dataExtent, query, years, units);
            });
        }
        else {
            $.each(clusterData, function (index, scenario) {
                var chartData = [];
                $.each(scenario.data[query].data, function (i, d) {
                    if (d.region == region) {
                        chartData = d.value;
                        var extent = d3.extent(chartData);
                        if (dataExtent[0] == null || extent[0] < dataExtent[0])
                            dataExtent[0] = extent[0];
                        if (dataExtent[1] == null || extent[1] > dataExtent[1])
                            dataExtent[1] = extent[1];
                        return false;
                    }
                });
            });

            $.each(clusterData, function (index, scenario) {
                var chartData = [];
                $.each(scenario.data[query].data, function (i, d) {
                    if (d.region == region) {
                        chartData = d.value;
                        return false;
                    }
                });
                addLineChart(rowID, chartData, dataExtent, query, scenario.data[query].years, scenario.data[query].units);
            });
        }
    });
}

function drawLineCharts(divIndex, query, variable, value) {
    var dataExtent = [null, null];

    // If variable exists then must use value for match
    // Else just use values based on the query
    if (variable !== undefined && variable !== "") {
        var data2Pass = [];
        var years = [];
        var units;
        $.each(clusterData, function (index, scenario) {
            var chartData = [];
            years = scenario.data[query].years;
            units = scenario.data[query].units;

            $.each(scenario.data[query].data, function (i, d) {
                if (d.region == region && d[variable] == value) {
                    chartData = d.value;
                    var extent = d3.extent(chartData);
                    if (dataExtent[0] == null || extent[0] < dataExtent[0])
                        dataExtent[0] = extent[0];
                    if (dataExtent[1] == null || extent[1] > dataExtent[1])
                        dataExtent[1] = extent[1];

                    data2Pass.push(chartData);
                    return false;
                }
            });
        });
        console.log(data2Pass)
        $.each(data2Pass, function (index, chartData) {
            addLineChart(rowID, chartData, dataExtent, query, years, units);
            // LineChart(containerId, width, height, data, extent, query, years, units);
        });
    }
    else {
        $.each(clusterData, function (index, scenario) {
            var chartData = [];
            $.each(scenario.data[query].data, function (i, d) {
                if (d.region == region) {
                    chartData = d.value;
                    var extent = d3.extent(chartData);
                    if (dataExtent[0] == null || extent[0] < dataExtent[0])
                        dataExtent[0] = extent[0];
                    if (dataExtent[1] == null || extent[1] > dataExtent[1])
                        dataExtent[1] = extent[1];
                    return false;
                }
            });
        });

        $.each(clusterData, function (index, scenario) {
            var chartData = [];
            $.each(scenario.data[query].data, function (i, d) {
                if (d.region == region) {
                    chartData = d.value;
                    return false;
                }
            });
            addLineChart(rowID, chartData, dataExtent, query, scenario.data[query].years, scenario.data[query].units);
            // LineChart(containerId, width, height, data, extent, query, years, units);
        });
    }
}

function LineChart(divID, data, dataExtent, years, region, units, feature) {
    // console.log(divID, JSON.stringify(data), feature);
    var self = this;
    this.divID = divID;

    var container = $('#' + divID);
    container.empty();
    
    var pHeight = container.height();
    var pWidth = container.width();

    var margin = { top: 20, right: 10, bottom: 20, left: 50 },
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


    var svg = d3.select("#" + divID).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    x.domain([0, years.length - 1]);
    // x.domain(d3.extent(years, function (d) { return d; }));
    y.domain(dataExtent);

    svg.append("g")
        .attr("class", "lc-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "lc-axis")
        .call(yAxis);
    // .append("text")
    // .attr("transform", "rotate(-90)")
    // .attr("y", 6)
    // .attr("dy", ".71em")
    // .style("text-anchor", "end")
    // .text(units);

    svg.append("path")
        .datum(data)
        .attr("class", "lc-line")
        .attr("d", line);
}

function LineCharts(data, extent, years, region, units, query, variable, value) {
    // console.log(pWidth, pHeight, JSON.stringify(data), JSON.stringify(dataExtent), query, JSON.stringify(years), units);
    var feature = getFeature(query, variable, value);
    var viewIndex = getFeatureViewIndex(query, variable, value);
    $('#lc-row-' + viewIndex).visible();

    $.each(data, function (index, scenario) {
        LineChart('lc-container-' + ((viewIndex * state.rowItemCount) + index), scenario, extent, years, region, units, feature);
    });
}