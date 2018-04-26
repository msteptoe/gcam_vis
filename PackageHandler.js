const child_process = require('child_process');

function echo(msg) {
    console.log(msg);
}

function changeModule(subCmd, package, callback, param) {
    const moduleProc = child_process.spawn('sh', ['module', 'load', 'R/3.3.3']);

    /* moduleProc.on('close', (code) => {
        echo('stdout module-' + subCmd + '-' + package + ': ' + 'close');
        if (callback) {
            callback(param);
        }
    }); */

    moduleProc.stdout.on('data', (data) => {
        echo('stdout module-' + subCmd + '-' + package + ': ' + data.toString());
    });

    moduleProc.stderr.on('data', (data) => {
        echo('stderr module-' + subCmd + '-' + package + ': ' + data.toString());
    });
}

function checkWhichPython(stop) {
    const whichP = child_process.spawn('which', ['python']);

    whichP.on('close', (code) => {
        echo('whichP close')
    });

    whichP.stdout.on('data', (data) => {
        var str = data.toString();
        echo('stdout whichP: ' + str);
        /* if (!stop && str.indexOf('/share/apps/python/anaconda2.7/bin/python') > -1) {
            changeModule('unload', 'python/anaconda2.7', checkWhichPython, true);
        } */
    });

    whichP.stderr.on('data', (data) => {
        echo('stderr whichP: ' + data.toString());
    });
}

function checkWhichR(stop) {
    const whichR = child_process.spawn('which', ['R']);

    whichR.on('close', (code) => {
        echo('whichR close')
    });

    whichR.stdout.on('data', (data) => {
        echo('stdout whichR: ' + data.toString());
    });

    whichR.stderr.on('data', (data) => {
        var str = data.toString();
        echo('stderr whichR: ' + str);
        /* if(!stop && str.indexOf('no R') > -1){
            changeModule('load', 'R/3.3.3', checkWhichR, true);
        } */
    });
}

function setupEnvR(env) {
    env.PATH = '/share/apps/R/3.3.3//bin:' + (env.PATH == undefined ? '' : env.PATH);
    env.MANPATH = '/share/apps/R/3.3.3//share/man:' + (env.MANPATH == undefined ? '' : env.MANPATH);
    env.LD_LIBRARY_PATH = '/share/apps/R/3.3.3//lib:' +
        '/share/apps/R/3.3.3//lib64/R/lib:/share/apps/libxml2/2.9.4/lib:' +
        (env.LD_LIBRARY_PATH == undefined ? '' : env.LD_LIBRARY_PATH) +
        ':/share/apps/R/3.3.3//lib64/R/lib/' + ':/share/apps/R/3.3.3//lib64/R/library/rJava/jri/' +
        ':/share/apps/R/3.3.3//lib64/R/library/rJava/libs/';
}

function setupEnvPython(env) {
    env.PYTHONHOME = '/share/apps/python/anaconda2.7';
    env.HDF5_DISABLE_VERSION_CHECK = 2;
    env.PATH = '/share/apps/python/anaconda2.7/bin:' + (env.PATH == undefined ? '' : env.PATH);
    env.MANPATH = '/share/apps/python/anaconda2.7/man:' + (env.MANPATH == undefined ? '' : env.MANPATH);
    env.LD_LIBRARY_PATH = (env.LD_LIBRARY_PATH == undefined ? '' : env.LD_LIBRARY_PATH) +
        ':/usr/lib64/:/share/apps/python/anaconda2.7/lib';
}

checkWhichR();
setupEnvR(process.env);
checkWhichR();

checkWhichPython();
setupEnvPython(process.env);
checkWhichPython();

