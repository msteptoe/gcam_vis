// node --max-old-space-size=8192 combine.js
const fs = require("pn/fs");
const d3 = require('d3');
const path = require('path');
const jsdom = require('jsdom');

let $;

const baseDir = process.argv[2] ? process.argv[2] + path.sep : "jobs" + path.sep + "CombineTest" + path.sep;
const dataDir = baseDir + path.sep + 'ScenarioData' + path.sep;
const outputDir = baseDir + path.sep + 'CombinedData' + path.sep;

function combine(Files, Keys) {
    let queryExtent = {};

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



                    $.each(Files, (index, file) => {
                        let scenario = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;

                        $.each(scenario[query].data, function (i, d) {
                            if (d[variable] == variableValue) {
                                extentCalc(dataExtent[variable][variableValue], d.region, d.value);
                            }
                        });
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


    fs.writeFileSync(baseDir + path.sep + 'Extent.json', JSON.stringify(queryExtent), 'utf8');
}

function combineScenarios(scenarios, Files, Keys) {
    let queryData = {};

    // Determine the extent and max/min
    $.each(Keys, (query, variableObject) => {
        if (variableObject.length !== 0) {
            $.each(variableObject, (variable, valueArray) => {

                $.each(valueArray, (index, variableValue) => {
                    let toWrite = {};

                    $.each(Files, (fdx, file) => {
                        toWrite[file] = [];
                    });


                    $.each(scenarios, function (sdx, scenario) {
                        $.each(scenario[query].data, function (i, d) {
                            if (d[variable] == variableValue) {
                                toWrite[Files[sdx]].push({region: d.region, value: d.value});
                            }
                        });
                    });

                    fs.writeFileSync(outputDir + query + path.sep + variable + path.sep + variableValue + path.sep + 'data.json', JSON.stringify(toWrite), 'utf8');
                    console.log('Done: ' + query + path.sep + variable + path.sep + variableValue + path.sep);
                });
            });
        }
        else {
            let toWrite = {};
            $.each(Files, (fdx, file) => {
                toWrite[file] = [];
            });

            $.each(scenarios, function (sdx, scenario) {
                toWrite[Files[sdx]].push(scenario[query].data);
            });

            fs.writeFileSync(outputDir + query + path.sep + 'data.json', JSON.stringify(toWrite), 'utf8');
            console.log('Done: ' + query);
        }
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

        $ = require("jquery")(window);


        Promise.all([fs.readFile(baseDir + 'Files.json', 'utf8'), fs.readFile(baseDir + 'Keys.json', 'utf8')])
            .then(async res => {
                const Files = JSON.parse(res[0]);
                const Keys = JSON.parse(res[1]);

                let scenarios = [];

                $.each(Files, (index, file) => {
                    scenarios[index] = JSON.parse(fs.readFileSync(dataDir + file, 'utf8')).data;
                });

                console.log('Done reading files.');

                // combine(Files, Keys);
                combineScenarios(scenarios, Files, Keys);
            })
    }
});