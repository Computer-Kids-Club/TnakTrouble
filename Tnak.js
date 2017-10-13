function degrees(angle) {
  return angle * (180 / Math.PI);
}

function radians(angle) {
  return angle * (Math.PI / 180);
}

var game = new Phaser.Game(800, 800, Phaser.AUTO, "canvasholder", {
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

var back_layer;
var mid_layer;
var front_layer;

var selfId = 0;

var bullets = [];
var cursors = [];

var upKey;
var downKey;
var leftKey;
var rightKey;

var playerCollisionGroup;
var bulletCollisionGroup;

class Bullet {
  constructor(id, x, y, r, clr) {
    this.id = id;
    this.r = r;
    this.clr = clr;

    this.shouldExist = true;

    this.sprite = game.add.sprite(x, y, "balloon");
    //  And enable the Sprite to have a physics body:
    game.physics.p2.enable(this.sprite, false);
    this.sprite.body.velocity.x = 1500 * Math.cos(radians(r));
    this.sprite.body.velocity.y = 1500 * Math.sin(radians(r));
    this.sprite.body.angle = r + 90;
    this.sprite.body.clearShapes();
    this.sprite.body.loadPolygon("physicsData", "balloon");
    //this.sprite.body.setRectangle(40, 40);
    this.sprite.body.setCollisionGroup(bulletCollisionGroup);
    this.sprite.body.damping = 0.9;
    //  Pandas will collide against themselves and the player
    //  If you don't set this they'll not collide with anything.
    //  The first parameter is either an array or a single collision group.
    this.sprite.body.collides([bulletCollisionGroup, playerCollisionGroup]);
    //console.log("hay")
    this.sprite.frame = 0;
    //console.log(Phaser.Color.HSVColorWheel()[this.clr]);
    this.sprite.tint = Phaser.Color.HSVColorWheel()[this.clr].color;
    this.sprite.anchor.set(0.5);
    this.sprite.animations.add("pop", [0, 1, 2, 3, 4, 5, 6], 5, true);
    //this.sprite.scale.setTo(0.2, 0.2);
  }

  updatePos(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  update() {}
}

class Cursor {
  constructor(id, x, y, score) {
    this.id = id;
    this.x = x;
    this.y = y;

    this.score = score;

    this.shouldExist = true;

    this.sprite = game.add.sprite(x, y, "cursor");
    this.sprite.scale.setTo(0.77, 0.77);
    this.sprite.anchor.set(0.5);
  }

  updatePos(x, y) {
    this.x = x;
    this.y = y;
    this.sprite.x = x;
    this.sprite.y = y;
  }
}

function onError(evt) {
  writeToScreen("error: " + evt.data + "\n");

  websocket.close();
}

function doSend(message) {
  if (!isConnected) {
    return;
  }
  //writeToScreen("sent: " + message + '\n');
  websocket.send(message);
}

function writeToScreen(message) {
  textText.text = message;
}

window.addEventListener("load", init, false);

function doDisconnect() {
  websocket.close();
}

function create() {
  doConnect();

  game.world.setBounds(0, 0, 131072, 131072);

  //  To make the sprite move we need to enable Arcade Physics
  game.physics.startSystem(Phaser.Physics.P2JS);

  game.physics.p2.defaultRestitution = 0.8;

  //  Create our collision groups. One for the player, one for the pandas
  playerCollisionGroup = game.physics.p2.createCollisionGroup();
  bulletCollisionGroup = game.physics.p2.createCollisionGroup();

  //  This part is vital if you want the objects with their own collision groups to still collide with the world bounds
  //  (which we do) - what this does is adjust the bounds to use its own collision group.
  game.physics.p2.updateBoundsCollisionGroup();

  //game.physics.p2.gravity.y = 1000;

  //  The scrolling starfield background
  starfield = game.add.tileSprite(0, 0, 131072, 131072, "background");
  starfield.tileScale.set(0.7, 0.7);

  textText = game.add.text(10, 580, "", { fontSize: "14px", fill: "#0f0" });
  textText.fixedToCamera = true;

  idText = game.add.text(370, 10, "", { fontSize: "14px", fill: "#0f0" });
  idText.fixedToCamera = true;
  scoreText = game.add.text(700, 10, "", { fontSize: "14px", fill: "#0f0" });
  scoreText.fixedToCamera = true;

  player = game.add.sprite(500, 500, "phaser");
  //player.scale.setTo(0.3, 0.3);
  player.anchor.set(0.5);
  game.physics.p2.enable(player, false);
  //player.body.setCircle(28);
  player.body.clearShapes();
  player.body.loadPolygon("physicsData", "tetrisblock1");
  player.collideWorldBounds = true;
  //player.scale.setTo(0.3, 0.3);
  player.body.setCollisionGroup(playerCollisionGroup);
  player.body.collides([bulletCollisionGroup, playerCollisionGroup]);
  player.body.damping = 0.9;

  //  And enable the Sprite to have a physics body:
  game.camera.follow(player);

  upKey = game.input.keyboard.addKey(Phaser.Keyboard.W);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.S);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.A);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.D);
}

function clickListener() {
  //doSend("clicked:" + (game.input.activePointer.x + "," + game.input.activePointer.y))

  bullets.push(
    new Bullet(
      0,
      player.x - 40 * Math.cos(radians(player.angle)),
      player.y - 40 * Math.sin(radians(player.angle)),
      180 + player.angle,
      game.rnd.integer() % 360
    )
  );
}

var pointerDown = false;

function update() {
  player.body.setZeroVelocity();
  if (upKey.isDown) {
    player.body.moveUp(500);
  }
  if (downKey.isDown) {
    player.body.moveDown(500);
  }
  if (leftKey.isDown) {
    player.body.moveLeft(500);
  }
  if (rightKey.isDown) {
    player.body.moveRight(500);
  }

  //  Scroll the background
  //starfield.tilePosition.y += 2;

  doSend("p:" + (player.body.x + "," + player.body.y));
  if (game.input.activePointer.isDown && pointerDown == false) {
    clickListener();
    pointerDown = true;
  }
  if (game.input.activePointer.isDown == false) {
    pointerDown = false;
  }

  scoreText.text = "";
  for (var i = 0; i < cursors.length; i++) {
    scoreText.text += "Player" + cursors[i].id + ": " + cursors[i].score + "\n";
    if (cursors[i].id == selfId) {
      idText.text = "Player" + cursors[i].id;
    }
  }

  doSend("u");

  player.body.angle =
    180 +
    degrees(
      Math.atan2(
        game.input.activePointer.worldY - player.body.y,
        game.input.activePointer.worldX - player.body.x
      )
    );

  if (bullets.length > 0) {
    var bulletStr = "b:";
    bullets[0].update();
    bulletStr.concat(bullets[0].sprite.body.x + "," + bullets[0].sprite.body.y);
    for (var i = 1; i < bullets.length; i++) {
      bullets[i].update();
      bulletStr.concat(
        ";" + bullets[i].sprite.body.x + "," + bullets[i].sprite.body.y
      );
    }
    doSend(bulletStr);
  }
}

function render() {
  game.debug.inputInfo(32, 32);
}
