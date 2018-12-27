var socket = require('socket.io-client')('http://localhost:3333');
socket.on('connect', function(){
  console.log("connected")
});
socket.on('disconnect', function(){
  console.log('disconnect')
});
socket.on('tasks', function(data){
  console.log(data)
});