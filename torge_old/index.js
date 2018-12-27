const fork = require('child_process').fork;
const Jimp = require("jimp");
const fs = require('fs');
const interfaces = ['94.45.224.243']
const host = '94.45.224.9';
const port = 1337;
const totalWidth = 1024;
const totalHeight = 768;
let width = totalWidth/5;
let height = totalHeight/5;
const offsetX = 0;
const offsetY = 0;
const workers = 30;
const STRATEGIES = ['vertical', 'horizontal', 'random'];
const strategy = STRATEGIES[0];

Jimp.read('chaos.png', function (err, image) {
  if (err) throw err;
  let pixels = [];
  image.contain(width, height)
    .scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    let red   = this.bitmap.data[ idx + 0 ];
    let green = this.bitmap.data[ idx + 1 ];
    let blue  = this.bitmap.data[ idx + 2 ];
    let alpha = this.bitmap.data[ idx + 3 ];
    pixels.push({x: x + offsetX, y: y + offsetY, red, green, blue, alpha})
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
  let tasks = pixels.map(({x, y, red, green, blue, alpha}) => `PX ${x} ${y} ${rgbToHex(red, green, blue, alpha)}\n`)
  spawnWorkers(tasks)
})

function spawnWorkers (tasks) {
  let taskChunks = chunkify(tasks, workers, true);
  const program = './worker.js';
  const options = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
  };
  taskChunks.forEach((taskChunk, index) => {
    if (index % 3 === 2) return;
    let filepath = `./tasks/task${index}.json`;
    let localAddress = interfaces[index % interfaces.length];
    const parameters = [index, port, host, localAddress];
    fs.writeFile(filepath, JSON.stringify(taskChunk), 'utf8', () => {
      const workerProcess = fork(program, parameters, options);

      workerProcess.stdout.on('data', function(data) {
        console.log(data.toString());
      });

      workerProcess.stderr.on('data', function(err) {
        console.log(err.toString());
      });
    })
  })
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
