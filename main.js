
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 450,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let ground;
let obstacles;
let collectibles;
let speed = 220;
let score = 0;
let scoreText;
let gameOver = false;
let spawnTimer = 0;
let sheetKey = 'girl';

function preload() {
  this.load.image('bg', 'data:image/png;base64,');
  this.load.image('hill', 'data:image/png;base64,');
  this.load.spritesheet(sheetKey, 'sprite_sheet.png', { frameWidth: 128, frameHeight: 128 });
  this.load.image('obstacle', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAAB49L1dAAAACXBIWXMAAAsTAAALEwEAmpwYAAABG0lEQVRYCe2XwQ3CMAxFf0o6gGzK+gA6gB6gA6oI6gDqgC6gDZgptV7U2k7uS9p8hGQh3u3jZJg0c2Z2gJ0kYgkI4m7hG7X7m6w5gH5i7kA3F52g9+z0GYYgJ3gQd7rQxGJb19z3e0QJ3iTq6sQJzq4sQJxq6sQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6mQKxv6uQ2oG7x3IYf4A3Qk7QH0T+8cQAAAABJRU5ErkJggg==' );
}

function create() {
  // background color and simple shapes to mimic pastel hills
  this.cameras.main.setBackgroundColor('#fff1f3');

  // ground
  ground = this.add.rectangle(400, 410, 1200, 80, 0xffe6e9);
  this.physics.add.existing(ground, true);

  // player
  player = this.physics.add.sprite(150, 300, sheetKey);
  player.setCollideWorldBounds(true);
  player.setSize(40, 100);
  player.setOffset(44, 24);

  // animations: run (frames 0-3), jump (4), slide (5)
  this.anims.create({
    key: 'run',
    frames: this.anims.generateFrameNumbers(sheetKey, { start:0, end:3 }),
    frameRate: 10,
    repeat: -1
  });
  this.anims.create({
    key: 'jump',
    frames: [{ key: sheetKey, frame: 4 }],
    frameRate: 1
  });
  this.anims.create({
    key: 'slide',
    frames: [{ key: sheetKey, frame: 5 }],
    frameRate: 1
  });

  player.play('run');

  // collisions
  this.physics.add.collider(player, ground);

  // input
  cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', () => {
    jumpPlayer(this);
  });
  this.input.on('pointerup', () => {});

  // groups
  obstacles = this.physics.add.group();
  collectibles = this.physics.add.group();

  this.physics.add.collider(obstacles, ground);
  this.physics.add.collider(player, obstacles, hitObstacle, null, this);
  this.physics.add.overlap(player, collectibles, collect, null, this);

  // score
  scoreText = this.add.text(16,16, 'Score: 0', { fontSize: '20px', fill: '#222' });

  // mobile swipe down detection for slide
  let startY = 0;
  this.input.on('pointerdown', function (pointer) {
    startY = pointer.y;
  });
  this.input.on('pointerup', function (pointer) {
    let dy = pointer.y - startY;
    if (dy > 50) {
      slidePlayer();
    }
  });
}

function update(time, delta) {
  if (gameOver) return;

  // auto-run: background and objects move left
  let moveX = (speed * delta) / 1000;

  // spawn obstacles periodically
  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnTimer = Phaser.Math.Between(800, 1400) - Math.min(score*2, 600);
    spawnObstacle(this);
  }

  obstacles.getChildren().forEach(o => {
    o.x -= moveX;
    if (o.x < -50) o.destroy();
  });
  collectibles.getChildren().forEach(c => {
    c.x -= moveX;
    if (c.x < -50) c.destroy();
  });

  // controls
  if ((cursors.up.isDown || cursors.space.isDown) && player.body.onFloor()) {
    jumpPlayer(this);
  }

  // landing check
  if (player.body.onFloor() && player.anims.currentAnim.key === 'jump') {
    player.play('run');
  }

  // slide timing handled by timer property
  if (player.isSliding) {
    player.slideTimer -= delta;
    if (player.slideTimer <= 0) {
      player.isSliding = false;
      player.setSize(40,100);
      player.setOffset(44,24);
      player.play('run');
    }
  }

  // increase difficulty over time
  score += delta * 0.01;
  scoreText.setText('Score: ' + Math.floor(score));
  speed += delta * 0.003; // gradually speed up
}

function jumpPlayer(scene) {
  if (player.body.onFloor() && !player.isSliding) {
    player.setVelocityY(-520);
    player.play('jump');
  }
}

function slidePlayer() {
  if (player.body.onFloor() && !player.isSliding) {
    player.isSliding = true;
    player.slideTimer = 700; // ms
    player.setSize(80,60);
    player.setOffset(24,54);
    player.play('slide');
  }
}

function spawnObstacle(scene) {
  let obsY = 360;
  let obs = obstacles.create(900, obsY, 'obstacle');
  obs.setImmovable(true);
  obs.body.allowGravity = false;
  obs.setScale(1.2);
  obs.setDepth(2);
}

function collect(player, item) {
  score += 30;
  item.destroy();
}

function hitObstacle(player, obs) {
  // simple game over: stop physics and show text
  gameOver = true;
  this.add.text(300, 180, 'Game Over', { fontSize: '40px', fill: '#800' });
  this.add.text(260, 230, 'Click to restart', { fontSize: '20px', fill: '#800' });
  this.input.once('pointerdown', () => {
    this.scene.restart();
    gameOver = false;
    score = 0;
    speed = 220;
  });
}
