var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var PORT = 80;
var games = [];

var Game = function(id){
  this.id = id;
  this.loc1 = null;
  this.loc2 = null;
  this.player1 = null;
  this.player2 = null;
  this.starttime = null;
  this.createtime = null;
}

function randomId(n)
{
  var result = "";
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for(var i=0; i < n; i++){
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}

function newGameId(){
  var id = null;
  var retry = true;
  while(retry){
    id = randomId(5);
    retry = false;
    games.forEach(function(g){
      if(g.id == id) retry = true;
    });
  }
  return id;
}

app.use('/style', express.static('../client/style'));
app.get('/', function(req, res) {
  res.sendFile('client/index.html', {'root': '../'});
});

app.get('/game', function(req, res) {
  res.sendFile('client/game.html', {'root': '../'});
});

app.get('/reset', function(req, res) {
  res.redirect('/');
});

io.on('connection', function(socket) {
  console.log("client connected");
  var game = null;
  socket.on('new', function(){
    game = Game(newGameId());
    games.push(game);
    game.createtime = new Date();
  });
  socket.on('join', function(id){
    games.forEach(function(g){
      if(g.id == id){
        if(g.player1 == null) g.player1 = socket;
        else if(g.player2 == null) g.player2 = socket;
        //if(g.player1 != null && g.player2 != null) startGame();
      }
    });
  });
});

http.listen(PORT, function() {
  console.log('HTTP server listening on port ' + PORT);
});
