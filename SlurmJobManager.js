"use strict"

const child_process = require('child_process');

class SlurmJobManager {
  constructor() {
    this.local = true;
  }

  checkQueue() {
    const squeue = child_process.spawn('squeue', ['-u', 'step625'])

    squeue.on('close', (code) => {
      /* console.log(`child process exited with code ${code}`); */
    });

    squeue.stdout.on('data', (data) => {
      /* console.log(`stdout: ${data}`); */
      let dataStr = data.toString();
      if (dataStr.indexOf('step625') > -1) {
        var dataSplit = dataStr.split('step625');
        dataSplit.forEach((d, i) => {
          if (i % 2) {
            let time = d.trim().split(/(\s+)/)[2];
            console.log('time: ' + time);
            time = time.split(':');

            let hour, min, sec;
            switch (time.length) {
              case 2:
                min = +time[0];
                sec = +time[1];
                break;
              case 3:
                hour = +time[0];
                min = +time[1];
                sec = +time[2];
                break;
            }
          }
        });
      }
    });

    squeue.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });
  }

  cancelJobs(){
    if(this.local) return;

    const scancel = child_process.spawn('scancel', ['-u', 'step625']);
    scancel.on('close', (code) => {
      /* console.log(`child process exited with code ${code}`); */
    });
  }

  submitJob(mode, args) {
    let processArgs = [mode + '-job.sh'];
    if (args) processArgs = processArgs.concat(args);

    const sbatch = child_process.spawn('sbatch', processArgs);

    sbatch.on('close', (code) => {
      /* console.log(`child process exited with code ${code}`); */
    });

    sbatch.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
      let dataStr = data.toString();
      if (dataStr.indexOf('Submitted batch job ') > -1) {
        let jobID = dataStr.split('Submitted batch job ')[1];
        console.log(`jobID: ${jobID}`)
      }
    });

    sbatch.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });

    console.log('submitted to sbatch:', processArgs);
  }

  submitJobLocal(mode, args) {
    let processArgs = ['Process.js'];
    if (args) processArgs = processArgs.concat(args);

    const nodeP = child_process.spawn('node', processArgs);

    nodeP.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });

    nodeP.stdout.on('data', (data) => {
      console.log(`nodeP stdout: ${data}`);
    });

    nodeP.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
    });
  }
}

module.exports = SlurmJobManager;

// const SlurmJobManager = require('./SlurmJobManager'); const jobScheduler = new SlurmJobManager();