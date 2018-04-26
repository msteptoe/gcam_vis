const fs = require("pn/fs");
const d3 = require('d3');
const path = require('path');
const jsdom = require('jsdom');

let $;

const baseDir = process.argv[2] ? process.argv[2] + path.sep : "jobs" + path.sep + "ExtentTest" + path.sep;
const dataDir = baseDir + path.sep + 'ScenarioData' + path.sep;

function findMaxArray(a, b) {
    let maxArray = [];
    for (var i = 0; i < a.length; i++) {
        if (a[i] > b[i]) {
            maxArray[i] = a[i];
        }
        else {
            maxArray[i] = b[i];
        }
    }
    return maxArray;
}

function findMinArray(a, b) {
    let minArray = [];
    for (var i = 0; i < a.length; i++) {
        if (a[i] < b[i]) {
            minArray[i] = a[i];
        }
        else {
            minArray[i] = b[i];
        }
    }
    return minArray;
}

// Extent Calculations
function extentCalc(dataExtent, region, dataValues) {
    if (dataExtent.min === undefined) {
        dataExtent.min = dataValues;
        dataExtent.max = dataValues;
    }
    else {
        dataExtent.min = findMinArray(dataExtent.min, dataValues);
        dataExtent.max = findMaxArray(dataExtent.max, dataValues);
    }

    if (region !== undefined) {
        if (dataExtent.regions === undefined) {
            dataExtent.regions = {};
        }

        if (dataExtent.regions[region] === undefined) {
            dataExtent.regions[region] = {
                min: dataValues,
                max: dataValues
            };
        }
        else {
            dataExtent.regions[region].min = findMinArray(dataExtent.regions[region].min, dataValues);
            dataExtent.regions[region].max = findMaxArray(dataExtent.regions[region].max, dataValues);
        }
    }

}

function extent(Files, Keys) {
    let queryExtent = {};

    $.each(Files, (index, file) => {
        let scenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;

        // Determine the extent and max/min
        $.each(Keys, (query, variableObject) => {
            if (variableObject.length !== 0) {
                if (queryExtent[query] == undefined) {
                    queryExtent[query] = {};
                }

                let dataExtent = queryExtent[query];
                $.each(variableObject, (variable, valueArray) => {
                    if (dataExtent[variable] == undefined) {
                        dataExtent[variable] = {};
                    }

                    $.each(valueArray, (index, variableValue) => {
                        if (dataExtent[variable][variableValue] == undefined) {
                            dataExtent[variable][variableValue] = {};
                        }

                        $.each(scenario[query].data, function (i, d) {
                            if (d[variable] == variableValue) {
                                extentCalc(dataExtent[variable][variableValue], d.region, d.value);
                            }
                        });
                    });
                });
                queryExtent[query] = dataExtent;
            }
            else {
                if (queryExtent[query] == undefined) {
                    queryExtent[query] = {};
                }

                let dataExtent = queryExtent[query];
                $.each(scenario[query].data, function (i, d) {
                    extentCalc(dataExtent, d.region, d.value);
                });
            }
        });
    });

    fs.writeFileSync(baseDir + path.sep + 'Extent.json', JSON.stringify(queryExtent), 'utf8');
}

jsdom.env({
    html: '',
    features: { QuerySelector: true }, //you need query selector for D3 to work
    done: function (err, window) {
        if (err) {
            console.error(err);
            return;
        }

        $ = require("jquery")(window);


        Promise.all([fs.readFile(baseDir + 'Files.json'), fs.readFile(baseDir + 'Keys.json')])
            .then(res => {
                const Files = JSON.parse(res[0]);
                const Keys = JSON.parse(res[1]);

                extent(Files, Keys);
            })
    }
});