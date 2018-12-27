const Jimp = require('jimp')

const STRATEGIES = ['vertical', 'horizontal', 'random'];
const totalWidth = 1920;
const totalHeight = 1080;
const host = '151.217.40.82';
const port = 1234;

const workers = 10;
const strategy = STRATEGIES[2];
const imageScale = 0.1;
const originX = totalWidth/2 - Math.floor(95 * imageScale)
const originY = totalHeight - Math.floor(379 * imageScale);
const imageFilename = 'Rakete.jpg'


function rgbToHex(r, g, b, a) {
  return componentToHex(r) + componentToHex(g) + componentToHex(b) + componentToHex(a);
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

async function generatePictureTasks(originX, originY, imageScale, filename) {
  let pixels = []
  const image = await Jimp.read(filename)
  image
    .scale(imageScale)
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
  return pixels.map(({x, y, red, green, blue, alpha}) => `PX ${x} ${y} ${rgbToHex(red, green, blue, alpha)}\n`)
}


async function generatePictureTimeTasks(startTime, waitTime, originX, originY, imageScale, filename) {
  let timeTasks = {}
  let tasks = await generatePictureTasks(originX, originY, imageScale, filename)

  return tasks.reduce((prev, cur, index) => {
    prev[startTime+(index*waitTime)] = cur
    return prev
  }, {})
}


(async function () {
  //const tasks = generateRectTasks(1900, 1000, 10, 'FF69B4')
  const tasks = await generatePictureTimeTasks(9000, 5, originX, originY, imageScale, imageFilename)
  console.log(JSON.stringify(tasks, null, 2))
})()



//Client kram

const client = net.Socket();
client.connect({port, host}, async function () {
  console.log('worker ' + worker + ' connected');
  // noinspection InfiniteLoopJS
  while (true) {
    for (let task of tasks) {
      await new Promise(resolve => client.write(task, resolve))
    }
  }
});