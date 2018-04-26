var pouchDBs = {};

function initDB(scenario, query) {
    return new Promise(function (resolve, reject) {
        var db = new PouchDB(scenario + '_' + query);
        if (!pouchDBs[scenario]) {
            pouchDBs[scenario] = {};
        }
        pouchDBs[scenario][query] = db;

        db.info().then(function (details) {
            if (details.doc_count != 0) {
                db.destroy().then(function () {
                    pouchDBs[scenario][query] = new PouchDB(scenario + '_' + query);
                    resolve('Deleting DB: ' + scenario + '_' + query + ', before creation!')
                });
            }
            else
                resolve('No prexisting DB: ' + scenario + '_' + query);
        }).catch(function (err) {
            console.log('error: ' + err);
            reject(err);
        });
    });
}

function dbInsertData(scenario, query, data) {
    return new Promise(function (resolve, reject) {
        var db = pouchDBs[scenario][query];
        var fields = d3.keys(data[0]);
        fields.splice(fields.indexOf('value'), 1);

        db.bulkDocs(data).then(function (result) {
            return db.createIndex({
                index: {
                    fields: fields
                }
            });
        }).then(function (result) {
            resolve('Success!')
        }).catch(function (err) {
            console.log(err);
            reject(err)
        });
    });
}

function deleteDB(scenario, query) {
    var db = new PouchDB(scenario + '_' + query);
    db.destory().then(function () {
        // database destroyed
    }).catch(function (err) {
        // error occurred
    })
}

/* function initAllDBs() {
    $.each(clusterData, function (name, scenario) {
        $.each(scenario.data, function (query, data) {
            initDB(name, query);
        });
    });
} */
function initAllDBs() {
    $.each(clusterData, function (name, scenario) {
        $.each(scenario.data, function (query, data) {
            initDB(name, query).then(function (result) {
                console.log(result);
                return dbInsertData(name, query, data.data);
            }).catch(function (err) {
                // error occurred
                console.log(err);
            })
        });
    });
}

function dbInsertAllData() {
    $.each(clusterData, function (name, scenario) {
        $.each(scenario.data, function (query, data) {
            dbInsertData(name, query, data.data);
        });
    });
}

function deleteAllDBs() {
    $.each(clusterData, function (name, scenario) {
        $.each(scenario.data, function (query, data) {
            deleteDB(name, query);
        });
    });
}