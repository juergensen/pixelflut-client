const Jimp = require("jimp");
const chunkify = require('../lib/chunkify')

const STRATEGIES = ['vertical', 'horizontal', 'random'];
const totalWidth = 1920;
const totalHeight = 1080;

const host = '151.217.41.151';
const port = 8080;

const bulkSize = 10;
const strategy = STRATEGIES[2];
const imageScale = 1/10;
const originX = 0
const originY = 0;
const imageFilepath = __dirname + '/chaos.png'

async function generatePictureTasks(originX, originY, imageScale, filename) {
  let pixels = []
  const image = await Jimp.read(filename)
  image
    .scale(imageScale)
    // .rotate(-15)
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

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(r, g, b, a) {
  return componentToHex(r) + componentToHex(g) + componentToHex(b) + componentToHex(a);
}

async function distributeTasks(io, tasks) {
  // console.log(JSON.stringify(tasks, null, 2))
  console.log(tasks.length)

  const socketIds = Object.keys(io.sockets.sockets)
  
  console.log(`Distribute to ${socketIds.length} Clients`)

  let taskChunks = chunkify(tasks, socketIds.length, true);
  for (let i = 0; i < socketIds.length; i++) {
    const taskChunk = taskChunks[i]
    const socket = io.sockets.sockets[socketIds[i]]
    socket.emit('task', { host, port, tasks: taskChunk})
  }
} 

(async function setup() {
  let tasks = await generatePictureTasks(originX, originY, imageScale, imageFilepath)

  var app = require('http').createServer()
  var io = require('socket.io')(app);

  io.on('connection', async function (socket) {
    console.log('New Client')
    distributeTasks(io, tasks)
    socket.on('disconnect', () => {
      console.log('Disconnected')
      distributeTasks(io, tasks)
    })
  });

  app.listen(3333);
  console.log('server started')
})()