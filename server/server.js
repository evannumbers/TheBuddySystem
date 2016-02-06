var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var cities = require('./cities.json');

var PORT = 80;
var EPSILON = 0
var DIST = {easy:75, medium:125, hard:250};
var games = {};

var Game = function(){
  this.id = null;
  this.loc1 = null;
  this.loc2 = null;
  this.player1 = null;
  this.player2 = null;
  this.starttime = null;
  this.createtime = null;
  this.history1 = [];
  this.history2 = [];
  this.started = false;
  this.difficulty = null;
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
    if(id in games) retry = true;
  }
  return id;
}

//Eff it, I'm not doing the actual ellipse math.
function getRandomPoint(lat, lng, meters) {
  var KILOSPERDEG = 111.2;
  var radius = meters / (KILOSPERDEG * 1000);
  var a = Math.random();
  var b = Math.random();
  if(b < a){
    var temp = a;
    a = b;
    b = temp;
  }
  var new_lat = lat+(b*radius*Math.cos(2*Math.PI*a/b));
  var new_lng = lng+(b*radius*Math.sin(2*Math.PI*a/b));
  return {"lat":new_lat, "lng":new_lng};
}

//Yes, I know it's actually not a circle.
function getNearbyPoint(lat, lng, meters) {
  var KILOSPERDEG = 111.2;
  var radius = meters / (KILOSPERDEG * 1000);
  var angle = Math.PI*Math.random();
  var new_lat = lat+radius*Math.cos(angle);
  var new_lng = lng+radius*Math.sin(angle);
  return {"lat":new_lat, "lng":new_lng};
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
  var playernum = 0;
  socket.on('new', function(prefs){
    // prefs includes prefs.difficulty (easy, medium hard)
    // and prefs.location (us, int)
    game = new Game();
    game.id = newGameId();
    games[game.id] = game;
    game.createtime = new Date();
    game.difficulty = prefs.difficulty;
    if(prefs.location == 'int'){
      var city = cities["international"][Math.floor(Math.random()*(cities["international"]).length)];
    }
    else{
      var city = cities["united_states"][Math.floor(Math.random()*(cities["united_states"]).length)];
    }
    var radius = city["radius"];
    var lat = city["lat"];
    var lng = city["lng"];
    var dist = DIST[prefs.difficulty];
    game.loc1 = getRandomPoint(lat, lng, radius);
    game.loc2 = getNearbyPoint(game.loc1["lat"], game.loc1["lng"], dist);
    socket.emit('gameid', game.id);
  });
  socket.on('join', function(id){
    id = id.toUpperCase();
    game = games[id];
    if(game != null){
      if(game.player1 == null){
        game.player1 = socket;
        playernum = 1;
      }
      else if(game.player2 == null) {
        game.player2 = socket;
        playernum = 2;
      }
      else{
        // fuck you, both spots have already been taken
        return;
      }
      if(game.player1 != null && game.player2 != null){
        var search_size = 1000;
        if(!game.started){
          game.player1.emit("start", game.loc1, search_size, game.difficulty);
          game.player2.emit("start", game.loc2, search_size, game.difficulty);
          game.starttime = new Date();
          game.started = true;
        }
        else{
          game['player'+playernum].emit("start", game['loc'+playernum], search_size, game.difficulty);
        }
      }
    }
  });

  socket.on('update', function(location) {
    var current_player;
    var other_player;

    if (playernum == 1) {
      current_player = game.player1;
      other_player = game.player2;
      game.loc1 = location;
      game.history1.push(location);
      console.log("UPDATE 1");

      if (game.history2.length > 0) {
        game.history2.push(game.history2[game.history2.length - 1]);
        console.log("2 NON EMPTY");
      } else {
        game.history2.push(null);
        console.log("2 EMPTY");
      }
    } else {
      other_player = game.player1;
      current_player = game.player2;
      game.loc2 = location;
      game.history2.push(location);
      console.log("UPDATE 2");

      if (game.history1.length > 0) {
        game.history1.push(game.history1[game.history1.length - 1]);
        console.log("1 NON EMPTY");
      } else {
        game.history1.push(null);
        console.log("1 EMPTY");
      }
    }

    x1 = game.loc1.lat;
    x2 = game.loc2.lat;
    y1 = game.loc1.lng;
    y2 = game.loc2.lng;

    dist = Math.sqrt(Math.pow((x1-x2),2) + Math.pow((y1-y2), 2));
    if (dist <= EPSILON) {
      var now = new Date();
      current_player.emit('stop', now-game.starttime, game.history1, game.history2);
      other_player.emit('stop', now-game.starttime, game.history1, game.history2);
    }
  });

  socket.on('disconnect', function(){
    if(game != null){
      game['player'+playernum] = null;
      if(game.player1 == null && game.player2 == null && game.started){
        delete games[game.id];
      }
    }
  });

  socket.on('getopengames', function(){
    socket.emit('opengames', Object.keys(games));
  });
});

http.listen(PORT, function() {
  console.log('HTTP server listening on port ' + PORT);
});
