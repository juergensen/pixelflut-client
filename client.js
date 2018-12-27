var socket = require('socket.io-client')('http://localhost:3333');
socket.on('connect', function(){
    console.log("connected")
});
socket.on('news', function(data){
    console.log(data)
});
socket.on('disconnect', function(){
    console.log('disconnect')
});