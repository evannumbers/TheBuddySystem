var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var PORT = 80;

app.use('/style', express.static('/style'));
app.get('/', function(req, res) {
  res.sendFile('client/index.html', {'root': '../'});
});

app.get('/game', function(req, res) {
  res.sendFile('client/game.html', {'root': '../'});
});

io.on('connection', function(socket) {
  console.log("client connected");
});

http.listen(PORT, function() {
  console.log('HTTP server listening on port ' + PORT);
});
