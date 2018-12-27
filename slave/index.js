var program = require('commander');
program
  .option('-h, --host', 'Websocket Server URI')
  .option('-w, --workers', 'Worker-Count')
  .parse(process.argv);

const port = 3333
const host = program.host || 'http://151.217.35.113'
console.log(host)
var socket = require('socket.io-client')(`${host}:${port}`);

const chunkify = require('../lib/chunkify')
const {Worker} = require('worker_threads');

const workerCount = Number.parseInt(program.workers || 20);
const workerRestartCounter = {};
const workerRestartTimeout = 1000;
const workerRestartLimit = 20;

let workers = []

socket.on('connect', function(){
  console.log("connected")
});
socket.on('disconnect', function(){
  console.log('disconnect')
});
socket.on('task', function({host, port, tasks}) {
  console.log(`spawning workers with ${tasks.length} tasks`)
  spawnWorkers({host, port, tasks})
});

socket.on('error', console.log)

async function spawnWorkers ({host, port, tasks}) {
  workers.forEach(worker => worker.unref())
  // await Promise.all(workers.map(worker => new Promise(resolve => worker.terminate(resolve))));

  let taskChunks = chunkify(tasks, workerCount, true);
  taskChunks.forEach((taskChunk, index) => {
    const workerData = {
      worker: index,
      port,
      host,
      tasks: taskChunk
    };
    workers[index] = spawnWorker(workerData)
  })
}

function spawnWorker (workerData) {
  const program = __dirname + '/worker.js';
  const worker = new Worker(program, {
    workerData
  });
  worker.on('message', msg => console.log(`Worker ${workerData.worker} message`, msg));
  worker.on('error', error => {
    console.log(`Worker ${workerData.worker}, error`, error)
    console.log(`restarting Worker ${workerData.worker}`)
    if (!workerRestartCounter[workerData.worker] || workerRestartCounter[workerData.worker] < workerRestartLimit) {
      setTimeout(() => workers[workerData.worker] = spawnWorker(workerData), workerRestartTimeout)
    } else {
      console.log(`restartLimit for Worker ${workerData.worker} exeeded`)
    }
  });
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.log(`Worker ${workerData.worker} exit`, code)
    };
  });
  return worker
}