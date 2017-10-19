function degrees(angle) {
  return angle * (180 / Math.PI);
}

function radians(angle) {
  return angle * (Math.PI / 180);
}

function randint(a, b) {
  return game.rnd.integerInRange(a, b);
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
var spaceKey;

var playerAngle = 0;

var vec = new Phaser.Point();

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
    this.circleGraphics.beginFill(0x00ffff, 1);
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
    this.sprite.body.collides([bulletCollisionGroup, playerCollisionGroup, wallCollisionGroup]);
    //console.log("hay")
    //console.log(Phaser.Color.HSVColorWheel()[this.clr]);
    this.sprite.tint = Phaser.Color.HSVColorWheel()[this.clr].color;
    this.sprite.anchor.set(0.5);
    //this.sprite.animations.add("pop", [0, 1, 2, 3, 4, 5, 6], 5, true);
    //this.sprite.scale.setTo(0.2, 0.2);
  }

  updatePos(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  update() {

    vec.set(this.sprite.body.velocity.x, this.sprite.body.velocity.y);
    
    if (Math.abs(vec.getMagnitudeSq() - 90000) > 5) {
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

function writeToScreen(message) {
  textText.text = message;
}

window.addEventListener("load", init, false);

function create() {

  game.world.setBounds(0, 0, 800, 800);

  //  To make the sprite move we need to enable Arcade Physics
  game.physics.startSystem(Phaser.Physics.P2JS);

  game.physics.p2.defaultRestitution = 1;
  game.physics.p2.applyDamping = false;

  material1 = game.physics.p2.createMaterial();    
  material2 = game.physics.p2.createMaterial();        
  game.physics.p2.createContactMaterial(material1, material1, { friction: 0 , restitution: 1.0 });
  //sprite2.body.setMaterial(material1);

  //  Create our collision groups. One for the player, one for the pandas
  playerCollisionGroup = game.physics.p2.createCollisionGroup();
  bulletCollisionGroup = game.physics.p2.createCollisionGroup();
  wallCollisionGroup = game.physics.p2.createCollisionGroup();

  //  This part is vital if you want the objects with their own collision groups to still collide with the world bounds
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

  // World bounds
  var worldBoundLeft   = new Wall(-40,0,50,800);
  var worldBoundTop    = new Wall(0,-40,800,50);
  var worldBoundRight  = new Wall(790,0,50,800);
  var worldBoundBottom = new Wall(0,790,800,50);

  for (var i = 0; i < 20; i++) {
    var wallall = new Wall(randint(1,7)*100,randint(1,7)*100,100,10);
  }
  for (var i = 0; i < 20; i++) {
    var wallall = new Wall(randint(1,7)*100,randint(1,7)*100,10,100);
  }

  //  And enable the Sprite to have a physics body:
  //game.camera.follow(player);

  upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
  downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
  leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
  rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
  spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
}

function clickListener() {
 
  
}

var pointerDown = false;
var spaceDown = false;

function update() {
  player.body.setZeroVelocity();
  if (upKey.isDown) {
    //player.body.moveUp(200*Math.sin(radians(player.angle+90)));
    //player.body.moveLeft(200*Math.cos(radians(player.angle+90)));
    player.body.thrust(14000);
  }
  if (downKey.isDown) {
    //player.body.moveUp(-200*Math.sin(radians(player.angle+90)));
    //player.body.moveLeft(-200*Math.cos(radians(player.angle+90)));
    player.body.reverse(14000);
  }
  if (leftKey.isDown) {
    //playerAngle -= 0.06;
    player.body.rotateLeft(70);
  } else if (rightKey.isDown) {
    //playerAngle += 0.06;
    player.body.rotateRight(70);
  } else {
    player.body.setZeroRotation();
  }
  if (spaceKey.isDown) {
    if (!spaceDown) {
      spaceDown = true;
      if (bullets.length < 5) {
        bullets.push(
          new Bullet(
            0,
            player.x - 20 * Math.cos(radians(player.angle+90)),
            player.y - 20 * Math.sin(radians(player.angle+90)),
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

  scoreText.text = "";
  for (var i = 0; i < cursors.length; i++) {
    scoreText.text += "Player" + cursors[i].id + ": " + cursors[i].score + "\n";
    if (cursors[i].id == selfId) {
      idText.text = "Player" + cursors[i].id;
    }
  }

  /*player.body.angle =
    180 +
    degrees(
      Math.atan2(
        game.input.activePointer.worldY - player.body.y,
        game.input.activePointer.worldX - player.body.x
      )
    );*/
  

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
  }
}

function render() {
  game.debug.inputInfo(32, 32);
}
