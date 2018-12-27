var app = require('http').createServer(handler)
var io = require('socket.io')(app);

app.listen(3333);

function handler (req, res) {}

io.on('connection', function (socket) {
  console.log('New Client')
  console.log(Object.keys(io.sockets.sockets))
});
