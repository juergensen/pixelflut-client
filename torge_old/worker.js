const net = require('net');
const fs = require('fs');
const [,,worker, port, host, localAddress] = process.argv;
const tasks = require(`./tasks/task${worker}.json`);
const client = net.Socket({allowHalfOpen: true});
client.connect({port, host, localAddress}, async function () {
  console.log('worker ' + worker + ' connected');
  // noinspection InfiniteLoopJS
  while (true) {
    for (let task of tasks) {
      await new Promise(resolve => client.write(task, resolve))
    }
  }
});