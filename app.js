#! /usr/bin/env node
var http = require('http');
var fs = require('fs');
var _ = require('lodash');
var socket = require('socket.io')
var Player = require('player');
var loudness = require('loudness');
var dirTree = require('directory-tree');
var jsonfile = require('jsonfile')
var file_lib = './lib.json'

console.log('Carregando...')

if (!fs.existsSync(file_lib)) {
    console.log('Arquivo de biblioteca não existe.')

    fs.writeFileSync(file_lib, "[]")
    console.log('Criado.')
}

var lib = jsonfile.readFileSync(file_lib)

var player = new Player(lib);

player.on('error',function(item){
  player.stop()
  console.log('Erro do player:');
  console.log(item);
});

var server = http.createServer(function(req, res) {
});

// Loading socket.io
var io = socket.listen(server);

// When a client connects, we note it in the console
io.sockets.on('connection', function (socket) {
    socket.emit('connection', 'conectado');
    socket.emit('lib', lib);

    socket.on('status', function() {
      socket.broadcast.emit('status', 'status pedido');
      socket.emit('status', 'status pedido');
    });

    socket.on('play', function() {
      if(player.lameStream){
        player.pause();
      } else {
        player.play();
      }

      socket.broadcast.emit('status', player);
      socket.emit('status', player);
    });

    socket.on('next', function() {
      if(player.lameStream){
        player.next();
      }
      socket.broadcast.emit('status', player);
      socket.emit('status', player);
    });

    socket.on('shuffle', function() {
      if(player.lameStream){
        player.broadcast.enable('shuffle');
      }

      socket.broadcast.emit('status', player);
      socket.emit('status', player);
    });

    socket.on('volume', function(volume){
      loudness.setVolume(volume*100, function (err) {
          // Done
      });

      player.setVolume(volume)
      socket.broadcast.emit('status', player);
      socket.emit('status', player);
    })

    socket.on('read', function(path){
      var array = search_musics(path)

      socket.broadcast.emit('lib', array);
      socket.emit('lib', array);
    })

    socket.on('remove_from_lib', function (array){
      console.log('Removendo')
      console.log(array)
      _.pullAt(lib, array)

      jsonfile.writeFileSync(file_lib, lib)
      socket.broadcast.emit('lib', lib);
      socket.emit('lib', lib);
    })

    socket.on('select', function(item){
      var index = _.findIndex(lib, function(o) { return o === item; })

      var pre = _.slice(lib, index)
      var pos = _.slice(lib, 0, index)

      lib = _.concat(pre, pos)
      player.stop()
      player = new Player(lib)
      player.play()

      item = {"src": item, "_name": ""}

      socket.broadcast.emit('playing', item);
      socket.emit('playing', item);
      console.log('playing: ')
      console.log(item)
    })

    player.on('playing',function(item){
      console.log('Tocando: ')
      console.log(item)
      socket.broadcast.emit('playing', item);
      socket.emit('playing', item);
    });
});

function search_musics(path){
  console.log('Procurando')

  var tree = dirTree(path, {extensions:/\.mp3/});

  for (var i = 0; i < tree.children.length; i++) {
    item = tree.children[i]
    lib.push(item.path)
  }
  jsonfile.writeFileSync(file_lib, lib)

  console.log(lib)
  return lib
}

server.listen(8080);
console.log('Tudo pronto no servidor.')
