const Jimp = require("jimp");
const {
  Worker
} = require('worker_threads');

const workerRestartCounter = {};
const workerRestartTimeout = 1000;
const workerRestartLimit = 20;

const STRATEGIES = ['vertical', 'horizontal', 'random'];
const totalWidth = 1920;
const totalHeight = 1080;
const host = '151.217.40.82';
const port = 1234;

const workers = 20;
const bulkSize = 1;
const strategy = STRATEGIES[2];
const imageScale = 2;
const originX = totalWidth/2 - Math.floor(95 * imageScale)
const originY = totalHeight - Math.floor(379 * imageScale);
const imageFilename = 'chaos.png'

function generateRectTasks(originX, originY, size, color) {
  const tasks = []
  for (let x = originX; x < originX+size; x++) {
    for (let y = originY; y < originY+size; y++) {
      tasks.push(`PX ${x} ${y} ${color}\n`)
    }
  }
  return tasks
}

async function generatePictureTasks(originX, originY, imageScale, filename) {
  let pixels = []
  const image = await Jimp.read(filename)
  image
    .scale(imageScale)
    .rotate(-15)
    .scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      let red   = this.bitmap.data[ idx + 0 ];
      let green = this.bitmap.data[ idx + 1 ];
      let blue  = this.bitmap.data[ idx + 2 ];
      let alpha = this.bitmap.data[ idx + 3 ];
      pixels.push({x: x + originX, y: y + originY, red, green, blue, alpha})
    });
  if (strategy === STRATEGIES[0]) {
    pixels.sort((p1, p2) => {
      if (p1.x > p2.x) return 1
      if (p1.x === p2.x) return p1.y > p2.y ? 1 : -1
      return -1
    })
  } else if (strategy === STRATEGIES[1]) {
    pixels.sort((p1, p2) => {
      if (p1.y > p2.y) return 1
      if (p1.y === p2.y) return p1.x > p2.x ? 1 : -1
      return -1
    })
  } else {
    pixels = pixels.map(a => [Math.random(), a])
      .sort((a, b) => a[0] - b[0])
      .map(a => a[1]);
  }
  const tasks = pixels.map(({x, y, red, green, blue, alpha}) => `PX ${x} ${y} ${rgbToHex(red, green, blue, alpha)}\n`)
  // bulk together
  if (bulkSize > 1) {
    let bulkTasks = tasks.reduce((bulkTasks, task, index) => {
      const bulkIndex = Math.floor(index / bulkSize);
      if(!bulkTasks[bulkIndex]) bulkTasks[bulkIndex] = '';
      bulkTasks[bulkIndex] += task;
      return bulkTasks;
    }, [])
    return bulkTasks
  } else {
    return tasks
  }
}


(async function () {
  //const tasks = generateRectTasks(1900, 1000, 10, 'FF69B4')
  const tasks = await generatePictureTasks(originX, originY, imageScale, imageFilename)
  // console.log(JSON.stringify(tasks, null, 2))
  console.log(tasks.length)
  spawnWorkers(tasks)
})()

// Utilities
function spawnWorkers (tasks) {
  let taskChunks = chunkify(tasks, workers, true);
  taskChunks.forEach((taskChunk, index) => {
    const workerData = {
      worker: index,
      port,
      host,
      tasks: taskChunk
    };
    spawnWorker(workerData)
  })
}

function spawnWorker (workerData) {
  const program = './worker.js';
  const worker = new Worker(program, {
    workerData
  });
  worker.on('message', msg => console.log(`Worker ${workerData.worker} message`, msg));
  worker.on('error', error => console.log(`Worker ${workerData.worker}, error`, error));
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.log(`Worker ${workerData.worker} exit`, code)
      console.log(`restarting Worker ${workerData.worker}`)
      if (!workerRestartCounter[workerData.worker] || workerRestartCounter[workerData.worker] < workerRestartLimit) {
        setTimeout(() => spawnWorker(workerData), workerRestartTimeout)
      } else {
        console.log(`restartLimit for Worker ${workerData.worker} exeeded`)
      }
    };
  });
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(r, g, b, a) {
  return componentToHex(r) + componentToHex(g) + componentToHex(b) + componentToHex(a);
}

function chunkify(a, n, balanced) {

  if (n < 2)
    return [a];

  var len = a.length,
    out = [],
    i = 0,
    size;

  if (len % n === 0) {
    size = Math.floor(len / n);
    while (i < len) {
      out.push(a.slice(i, i += size));
    }
  }

  else if (balanced) {
    while (i < len) {
      size = Math.ceil((len - i) / n--);
      out.push(a.slice(i, i += size));
    }
  }

  else {

    n--;
    size = Math.floor(len / n);
    if (len % size === 0)
      size--;
    while (i < size * n) {
      out.push(a.slice(i, i += size));
    }
    out.push(a.slice(size * n));

  }
  return out
}