function degrees(angle) {
  return angle * (180 / Math.PI);
}

function radians(angle) {
  return angle * (Math.PI / 180);
}

function randint(a, b) {
  return game.rnd.integerInRange(a, b);
}

window.addEventListener("keydown", function(e) {
  // space and arrow keys
  if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
      e.preventDefault();
  }
}, false);

var receivedMessage;
var hasMaze = false;
messages = document.createElement('ul');
document.body.appendChild(messages);
var connectedToWS = false;
var clientId = 0;

function doConnect()
{
  websocket = new WebSocket("ws://192.168.31.206:7755/");
  websocket.onopen = function(evt) { onOpen(evt) };
  websocket.onclose = function(evt) { onClose(evt) };
  websocket.onmessage = function(evt) { onMessage(evt) };
  websocket.onerror = function(evt) { onError(evt) };
}
function onOpen(evt)
{
  writeToScreen("connected\n");
  connectedToWS = true;
}
function onClose(evt)
{
  writeToScreen("disconnected\n");
  connectedToWS = false;
}
function onMessage(evt) {
  //writeToScreen(evt.data);
  receivedMessage = JSON.parse(evt.data);
  //writeToScreen(receivedMessage.mapVertical[3]);
  if(receivedMessage.dataType==1) {
    clientId = receivedMessage.clientId;
    player.body.x = receivedMessage.positionIndex[0]*100+55;
    player.body.y = receivedMessage.positionIndex[1]*100+55;
    for (var i = 0; i < receivedMessage.mapHorizontal.length; i++) {
      var wallall = new Wall(receivedMessage.mapHorizontal[i][0]*100,receivedMessage.mapHorizontal[i][1]*100,10,110);
    }
    for (var i = 0; i < receivedMessage.mapVertical.length; i++) {
      var wallall = new Wall(receivedMessage.mapVertical[i][0]*100,receivedMessage.mapVertical[i][1]*100,100,10);
    }
  } else if(receivedMessage.dataType==0) {
    // match other players
    for (var i = 0; i < receivedMessage.playersX.length; i++) {
      if(receivedMessage.clientId[i]==clientId) {
        receivedMessage.clientId.splice(i,1);
        receivedMessage.playersX.splice(i,1);
        receivedMessage.playersY.splice(i,1);
        receivedMessage.playersRot.splice(i,1);
        receivedMessage.playersBullets.splice(i,1);
        receivedMessage.playersColour.splice(i,1);
        break;
      }
    }
    if(otherPlayers.length > receivedMessage.playersX.length) {
      for (var i = otherPlayers.length; i >= receivedMessage.playersX.length; i--) {
        otherPlayers[i].playerSprite.destroy();
      }
      otherPlayers.splice(receivedMessage.playersX.length, otherPlayers.length-receivedMessage.playersX.length);
    }else if(otherPlayers.length < receivedMessage.playersX.length) {
      for (var i = 0; i < receivedMessage.playersX.length-otherPlayers.length; i++) {
        var otherPlayer = new OtherPlayer(0,0);
        otherPlayers.push(otherPlayer);
      }
    }
    for (var i = 0; i < otherPlayers.length; i++) {
      otherPlayers[i].updatePos(receivedMessage.playersX[i],receivedMessage.playersY[i]);
      otherPlayers[i].playerSprite.body.angle = receivedMessage.playersRot[i];
    }
    // match other bullets
    var allOtherBullets = [];
    for (var i = 0; i < receivedMessage.playersBullets.length ; i++) {
      if(receivedMessage.clientId[i]==clientId) {
        continue;
      }
      allOtherBullets = allOtherBullets.concat(receivedMessage.playersBullets[i]);
    }
    if(otherbullets.length > allOtherBullets.length) {
      for (var i = otherbullets.length; i >= allOtherBullets.length ; i--) {
        otherbullets[i].sprite.destroy();
      }
      otherbullets.splice(allOtherBullets.length, otherbullets.length-allOtherBullets.length);
    }else if(otherbullets.length < allOtherBullets.length) {
      for (var i = 0; i < allOtherBullets.length-otherbullets.length; i++) {
        var otherBullet = new Bullet(0,0,0,50,0xFF99FF);
        otherbullets.push(otherBullet);
      }
    }
    for (var i = 0; i < otherbullets.length; i++) {
      otherbullets[i].updatePos(allOtherBullets[i].x,allOtherBullets[i].y);
      otherbullets[i].sprite.body.velocity.x = allOtherBullets.velx;
      otherbullets[i].sprite.body.velocity.y = allOtherBullets.vely;
    }
  }
}
function onError(evt)
{
  writeToScreen('error: ' + evt.data + '\n');
  websocket.close();
}
function doSend(mess)
{
  //writeToScreen("sent: " + mess + '\n'); 
  websocket.send(mess);
}
function writeToScreen(mess)
{
  var messages = document.getElementsByTagName('ul')[0],
  message = document.createElement('li'),
  content = document.createTextNode(mess);
  message.appendChild(content);
  messages.appendChild(message);  
}
window.addEventListener("load", doConnect, false);

 function doDisconnect() {
  websocket.close();
 }

var game = new Phaser.Game(810, 810, Phaser.AUTO, "canvasholder", {
  preload: preload,
  create: create,
  update: update,
  render: render
});
//document.getElementById('canvasholder').style.cursor = "none";
function preload() {
  //  You can fill the preloader with as many assets as your game requires

  //  Here we are loading an image. The first parameter is the unique
  //  string by which we'll identify the image later in our code.

  //  The second parameter is the URL of the image (relative)
  game.load.image("phaser", "Assets/tetrisblock1.png");
  game.load.image("background", "Assets/grass01.png");
  game.load.image("cursor", "Assets/pin.png");
  game.load.spritesheet("balloon", "Assets/balloon_sheet.png", 63, 68);

  this.game.load.physics("physicsData", "Assets/sprites.json");

  game.scale.pageAlignHorizontally = true;
  game.scale.pageAlignVertically = true;
  game.scale.refresh();

  game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
  game.scale.setMinMax(1, 1, screen.height - 177, screen.height - 177);
  /*game.scale.setResizeCallback(function() {
        game.scale.setMaximum();
    });*/
}

var player;
var websocket;
var textText;
var scoreText;
var idText;
var isConnected = false;

var clrWhl = Phaser.Color.HSVColorWheel();

var back_layer;
var mid_layer;
var front_layer;

var selfId = 0;

var bullets = [];
var otherbullets = [];
var otherPlayers = [];

var upKey;
var downKey;
var leftKey;
var rightKey;
var spaceKey;

var playerAngle = 0;

var vec = new Phaser.Point();
var vecOrigin = new Phaser.Point(0, 0);

var playerCollisionGroup;
var bulletCollisionGroup;
var wallCollisionGroup;

var material1;
var material2;

class Bullet {
  constructor(id, x, y, r, clr) {
    this.id = id;
    this.r = r;
    this.clr = clr;

    this.shouldExist = true;

    this.lifeTime = 500;

    this.sprite = game.add.sprite(x, y);
    //  And enable the Sprite to have a physics body:
    game.physics.p2.enable(this.sprite, false);
    this.sprite.body.velocity.x = 300 * Math.cos(radians(r));
    this.sprite.body.velocity.y = 300 * Math.sin(radians(r));
    this.sprite.body.angle = r + 90;
    this.sprite.body.clearShapes();
    //this.sprite.body.loadPolygon("physicsData", "balloon");
    this.circleGraphics = game.add.graphics(0, 0);
    //this.wallRectGraphics.lineStyle(2, 0x000000);
    this.circleGraphics.beginFill(0xFFFFFF, 1);
    this.circleGraphics.drawCircle(0,0,15);
    this.circleGraphics.endFill();
    this.sprite.addChild(this.circleGraphics);
    this.sprite.body.setCircle(7.5);
    this.sprite.body.setCollisionGroup(bulletCollisionGroup);
    this.sprite.body.damping = 0;

    this.sprite.body.setMaterial(material1);
    //  Pandas will collide against themselves and the player
    //  If you don't set this they'll not collide with anything.
    //  The first parameter is either an array or a single collision group.
    this.sprite.body.collides([bulletCollisionGroup, wallCollisionGroup]);
    this.sprite.body.collides(playerCollisionGroup, hitPlayer, this);
    //console.log("hay")
    //console.log(Phaser.Color.HSVColorWheel()[this.clr]);
    //this.sprite.tint = Phaser.Color.HSVColorWheel()[this.clr].color;
    this.sprite.anchor.set(0.5);
    //this.sprite.animations.add("pop", [0, 1, 2, 3, 4, 5, 6], 5, true);
    //this.sprite.scale.setTo(0.2, 0.2);
  }

  updatePos(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.body.x = x;
    this.sprite.body.y = y;
  }

  update() {

    this.lifeTime -= 1;

    vec.set(this.sprite.body.velocity.x, this.sprite.body.velocity.y);

    this.circleGraphics.tint = clrWhl[(parseInt(vec.angle(vecOrigin, true))%360+720)%360].color;
    
    if (Math.abs(vec.getMagnitudeSq() - 90000) > 50) {
        vec.setMagnitude(300);
    
        this.sprite.body.velocity.x = vec.x;
        this.sprite.body.velocity.y = vec.y;
    }

  }
}

class Wall {
  constructor(x, y, w, h) {

    this.wallRect = game.add.sprite(x+w/2, y+h/2);
    this.wallRect.anchor.set(0,0);
    this.wallRectGraphics = game.add.graphics(0, 0);
    //this.wallRectGraphics.lineStyle(2, 0x000000);
    this.wallRectGraphics.beginFill(0x333366, 1);
    this.wallRectGraphics.drawRect(-w/2, -h/2, w, h);
    this.wallRectGraphics.endFill();
    game.physics.p2.enable(this.wallRect, false);
    this.wallRect.body.setRectangle(w, h);
    this.wallRect.body.static = true;
    this.wallRect.body.setCollisionGroup(wallCollisionGroup);
    this.wallRect.body.collides([bulletCollisionGroup, playerCollisionGroup]);
    this.wallRect.body.setMaterial(material1);
    this.wallRect.addChild(this.wallRectGraphics);
  }

  updatePos(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.body.x = x;
    this.sprite.body.y = y;
  }

  update() {}
}

class OtherPlayer {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.score = 0;

    this.playerSprite = game.add.sprite(x, y);
    this.playerSprite.anchor.set(0.5, 0.5);
    game.physics.p2.enable(this.playerSprite, false);
    this.playerSprite.body.setRectangle(40,60);
    this.playerGraphics = game.add.graphics(0, 0);
    this.playerGraphics.beginFill(0xff8800, 1);
    this.playerGraphics.drawRect(-20,-30,40,60);
    this.playerGraphics.endFill();
    this.playerSprite.addChild(this.playerGraphics);
    this.playerSprite.body.setCollisionGroup(playerCollisionGroup);
    this.playerSprite.body.collides([playerCollisionGroup,bulletCollisionGroup, wallCollisionGroup]);
    this.playerSprite.body.mass = 1;
    this.playerSprite.body.setMaterial(material1);
  }

  updatePos(x, y) {
    this.x = x;
    this.y = y;
    this.playerSprite.x = x;
    this.playerSprite.y = y;
    this.playerSprite.body.x = x;
    this.playerSprite.body.y = y;
  }
}

/*function writeToScreen(message) {
  textText.text = message;
}*/

function create() {

  game.world.setBounds(0, 0, 810, 810);

  //  To make the sprite move we need to enable Arcade Physics
  game.physics.startSystem(Phaser.Physics.P2JS);

  game.physics.p2.defaultRestitution = 1;
  game.physics.p2.applyDamping = false;

  material1 = game.physics.p2.createMaterial();    
  material2 = game.physics.p2.createMaterial();        
  game.physics.p2.createContactMaterial(material1, material1, { friction: 0, restitution: 1 });
  //sprite2.body.setMaterial(material1);

  game.physics.p2.setImpactEvents(true);

  //  Create our collision groups. One for the player, one for the pandas
  playerCollisionGroup = game.physics.p2.createCollisionGroup();
  bulletCollisionGroup = game.physics.p2.createCollisionGroup();
  wallCollisionGroup = game.physics.p2.createCollisionGroup();

  //  This part is vital if you want the receivedMessageects with their own collision groups to still collide with the world bounds
  //  (which we do) - what this does is adjust the bounds to use its own collision group.
  game.physics.p2.updateBoundsCollisionGroup();

  //game.physics.p2.gravity.y = 1000;

  //  The scrolling starfield background
  starfield = game.add.tileSprite(0, 0, 800, 800, "background");
  starfield.tileScale.set(0.7, 0.7);

  textText = game.add.text(10, 580, "", {
    fontSize: "14px",
    fill: "#0f0"
  });
  textText.fixedToCamera = true;

  idText = game.add.text(370, 10, "", {
    fontSize: "14px",
    fill: "#0f0"
  });
  idText.fixedToCamera = true;
  scoreText = game.add.text(700, 10, "", {
    fontSize: "14px",
    fill: "#0f0"
  });
  scoreText.fixedToCamera = true;

  player = game.add.sprite(500, 500);
  //player.scale.setTo(0.3, 0.3);
  player.anchor.set(0.5, 0.5);
  game.physics.p2.enable(player, false);
  player.body.setRectangle(40,60);
  //player.body.clearShapes();
  //layer.body.loadPolygon("physicsData", "tetrisblock1");
  var playerGraphics = game.add.graphics(0, 0);
  //this.wallRectGraphics.lineStyle(2, 0x000000);
  playerGraphics.beginFill(0xff8800, 1);
  playerGraphics.drawRect(-20,-30,40,60);
  playerGraphics.endFill();
  player.addChild(playerGraphics);
  //player.collideWorldBounds = true;
  //player.scale.setTo(0.3, 0.3);
  player.body.setCollisionGroup(playerCollisionGroup);
  player.body.collides([bulletCollisionGroup, playerCollisionGroup, wallCollisionGroup]);
  //player.body.damping = 0.9;
  player.body.mass = 1;
  player.body.setMaterial(material1);
  //player.body.collides(bulletCollisionGroup, hitPlayer, this);

  // World bounds
  var worldBoundLeft   = new Wall(-40,0,50,800);
  var worldBoundTop    = new Wall(0,-40,800,50);
  var worldBoundRight  = new Wall(800,0,50,800);
  var worldBoundBottom = new Wall(0,800,800,50);

  /*for (var i = 0; i < 20; i++) {
    var wallall = new Wall(randint(1,7)*100,randint(1,7)*100,100,10);
  }
  for (var i = 0; i < 20; i++) {
    var wallall = new Wall(randint(1,7)*100,randint(1,7)*100,10,100);
  }*/

  //  And enable the Sprite to have a physics body:
  //game.camera.follow(player);

  /*upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
  spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);*/

  //ship.body.collides(playerCollisionGroup, hitPlayer, this);
}

function clickListener() {
 
  
}

var pointerDown = false;
var spaceDown = false;

function update() {
  player.body.setZeroVelocity();
  if (game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
    //player.body.moveUp(200*Math.sin(radians(player.angle+90)));
    //player.body.moveLeft(200*Math.cos(radians(player.angle+90)));
    player.body.thrust(14000);
  }
  if (game.input.keyboard.isDown(Phaser.Keyboard.DOWN)) {
    //player.body.moveUp(-200*Math.sin(radians(player.angle+90)));
    //player.body.moveLeft(-200*Math.cos(radians(player.angle+90)));
    player.body.reverse(14000);
  }
  if (game.input.keyboard.isDown(Phaser.Keyboard.LEFT)) {
    //playerAngle -= 0.06;
    player.body.rotateLeft(90);
  } else if (game.input.keyboard.isDown(Phaser.Keyboard.RIGHT)) {
    //playerAngle += 0.06;
    player.body.rotateRight(90);
  } else {
    player.body.setZeroRotation();
  }
  if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR)) {
    if (!spaceDown) {
      spaceDown = true;
      if (bullets.length < 7) {
        bullets.push(
          new Bullet(
            0,
            player.x - 40 * Math.cos(radians(player.angle+90)),
            player.y - 40 * Math.sin(radians(player.angle+90)),
            180 + player.angle+90,
            game.rnd.integer() % 360
          )
        );
      }
    }
  } else {
    spaceDown = false;
  }

  //player.body.rotation = playerAngle;

  //  Scroll the background
  //starfield.tilePosition.y += 2;

  if (game.input.activePointer.isDown && pointerDown == false) {
    clickListener();
    pointerDown = true;
  }
  if (game.input.activePointer.isDown == false) {
    pointerDown = false;
  }

  /*scoreText.text = "";
  for (var i = 0; i < cursors.length; i++) {
    scoreText.text += "Player" + cursors[i].id + ": " + cursors[i].score + "\n";
    if (cursors[i].id == selfId) {
      idText.text = "Player" + cursors[i].id;
    }
  }*/

  /*player.body.angle =
    180 +
    degrees(
      Math.atan2(
        game.input.activePointer.worldY - player.body.y,
        game.input.activePointer.worldX - player.body.x
      )
    );*/

  for (var i = 1; i < otherPlayers.length; i++) {
      
  }

  for (var i = 0; i < otherbullets.length; i++) {
    //otherbullets[i].sprite.body.velocity.x = 1;
    //otherbullets[i].sprite.body.velocity.y = 1;
    otherbullets[i].update();
  }

  var bulletInfo = [];

  for (var i = bullets.length-1; i >= 0; i--) {
    bullets[i].update();
    bulletInfo.push({
                     "x":Math.round(bullets[i].sprite.body.x),
                     "y":Math.round(bullets[i].sprite.body.y),
                     "velx":Math.round(bullets[i].sprite.body.velocity.x),
                     "vely":Math.round(bullets[i].sprite.body.velocity.y)
                    });
    if(bullets[i].lifeTime<0) {
      bullets[i].sprite.destroy();
      bullets.splice(i,1);
    }
  }
  
  if(connectedToWS) {
  doSend(JSON.stringify({
                        "posX":Math.round(player.body.x),
                        "posY":Math.round(player.body.y),
                        "rot":Math.round(player.body.angle),
                        "bullets":bulletInfo,
                        "colour":[7,7,7]
                      }));
  }
}

function render() {
  //game.debug.inputInfo(32, 32);
}

function hitPlayer(body1, body2) {
  
      //  body1 is the space ship (as it's the body that owns the callback)
      //  body2 is the body it impacted with, in this case our panda
      //  As body2 is a Phaser.Physics.P2.Body object, you access its own (the sprite) via the sprite property:
      body2.x = 60;
      body2.y = 60;
      //writeToScreen("HIT!!!");
  
}