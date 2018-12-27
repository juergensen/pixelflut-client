const net = require('net');

const {
  workerData
} = require('worker_threads');

const {worker, port, host, tasks} = workerData;

const client = net.Socket({allowHalfOpen: true});
client.connect({port, host}, async function () {
  console.log('worker ' + worker + ' connected');
  // noinspection InfiniteLoopJS
  while (true) {
    for (let task of tasks) {
      await new Promise(resolve => client.write(task, resolve))
    }
  }
});