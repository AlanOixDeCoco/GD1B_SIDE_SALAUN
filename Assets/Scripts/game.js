// #region CONSTANTS
const DEBUG = false;

const INPUT_ZERO_TOLERANCE = 0.1;

const GRAVITY = 32 ; // (acceleration expressed in m.s-2)

const TILE_SIZE = 32;

const GAME_WIDTH = 480;
const GAME_HEIGHT = 320;

const FONT_SIZE_TITLE = 24;
const FONT_SIZE_PARAGRAPH = 12;

const CAMERA_VERTICAL_SMOOTH = 0.1; // value between 0 - 1(no smoothing)
const CAMERA_HORIZONTAL_SMOOTH = 0.1;

const PICK_FEEDBACK_TIMEOUT = 1 * 1000; // text feedback duration in miliseconds
const PICK_FEEDBACK_DISTANCE = 12; // text movement distance
const PICK_FEEDBACK_FRAMES = 6; // text movement frames

const COIN_FEEDBACK_TEXT = "+1";
// #endregion

// #region GAME VARIABLES
var player;
var accelerationForce = 1200;
var jumpForce = 11 * TILE_SIZE;
var dragForce = 800;
var maxSpeed = 150;

var inputX = 0;
var inputJump = false;

var canJump = false;
var isJumping = false;
var isMovingVertically = false;

var cameraGameplay, cameraHUD;

var keyboardKeys;

var gamepadConnected = false;
var gamepad;
var gamepadButtons;

var coinsAmount = 0;

// UI
var ui_coin;
var ui_hearths;
var ui_coinText;
// #endregion

// #region GAME SCENES

// This scene contains the gameplay this is the scene the player is interacting in
class GameScene extends Phaser.Scene {
    constructor (){
        super({key: 'Game', active: true});
    }

    // This function is called one time at the beginning of scene start, it is suitable for assets loading
    preload(){
        console.log("Loading Game scene...");

        // importing custom fonts
        this.load.bitmapFont('CursedScript', 'Assets/Fonts/CursedScript.png', 'Assets/Fonts/CursedScript.fnt');

        // importing backgrounds
        this.load.image('background_m2', 'Assets/Sprites/background_-2.png');
        this.load.image('background_m1', 'Assets/Sprites/background_-1.png');

        // importing Tiled map ...
        this.load.tilemapTiledJSON('map', 'Assets/Maps/level_00.tmj');
        // and the corresponding tileset
        this.load.image('tileset', 'Assets/Maps/tileset.png');

        // importing spritesheets
        this.load.spritesheet('pickables','Assets/Sprites/pickablesSpritesheet.png', { frameWidth: 32, frameHeight: 32 }); // for the pickables
        this.load.spritesheet('player','Assets/Sprites/playerSpritesheet.png', { frameWidth: 32, frameHeight: 64 }); // for the player character
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // creating a new camera to render the gameplay
        cameraGameplay = this.cameras.main;
        cameraGameplay.setRoundPixels(true);
        cameraGameplay.setBounds(0, 0, 1600, 1600); // set the camera border to fit in the tilemap dimensions
        cameraGameplay.setBackgroundColor(0xFF0000);

        // #region ANIMATIONS
        // pickables
        this.anims.create({
            key: 'coin_0',
            frames: this.anims.generateFrameNumbers('pickables', {start:0,end:5}),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'coin_1',
            frames: this.anims.generateFrameNumbers('pickables', {start:6,end:11}),
            frameRate: 8,
            repeat: -1
        });
        this.anims.create({
            key: 'coin_2',
            frames: this.anims.generateFrameNumbers('pickables', {start:12,end:17}),
            frameRate: 8,
            repeat: -1
        });

        // player
        this.anims.create({
            key: 'player_move',
            frames: this.anims.generateFrameNumbers('player', {start: 0, end: 0})
        });
        this.anims.create({
            key: 'player_jump',
            frames: this.anims.generateFrameNumbers('player', {start: 2, end: 2})
        });
        this.anims.create({
            key: 'player_invincible',
            frames: this.anims.generateFrameNumbers('player', {start: 0, end: 1}),
            frameRate: 8,
            repeat: -1
        });
        // #endregion

        // setup the controller state events
        this.input.gamepad.on('connected', () => {
            gamepad = this.input.gamepad.pad1;
            onGamepadConnect();
        });
        this.input.gamepad.on('disconnected', onGamepadDisconnect);

        // setup the keys
        keyboardKeys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.Q, 
            left_arrow: Phaser.Input.Keyboard.KeyCodes.LEFT, 
            down: Phaser.Input.Keyboard.KeyCodes.S, 
            down_arrow: Phaser.Input.Keyboard.KeyCodes.DOWN, 
            right: Phaser.Input.Keyboard.KeyCodes.D, 
            right_arrow: Phaser.Input.Keyboard.KeyCodes.RIGHT, 
            jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
            jump_arrow: Phaser.Input.Keyboard.KeyCodes.UP, 
        });

        // #region MAP GENERATION
        // create the backgrounds
        const backgroundM2 = this.add.image(0, 0, 'background_m2'); // background (-2 layer)
        backgroundM2.setOrigin(0, 0);
        const backgroundM1 = this.add.image(0, 0, 'background_m1'); // background (-1 layer)
        backgroundM1.setOrigin(0, 0);

        // create the tilemap
        const map = this.add.tilemap("map");

        // create the tileset named "Tileset" in Tiled and naming it "tileset"
        const tileset = map.addTilesetImage(
                "Tileset",
                "tileset"
        );
        
        // create all the walls layers
        const wallsLayer1 = map.createLayer(
            "Walls/Walls_1",
            tileset
        );
        wallsLayer1.setCollisionBetween(0,255);
        const wallsLayer2 = map.createLayer(
            "Walls/Walls_2",
            tileset
        );
        wallsLayer2.setCollisionByExclusion();
        const wallsLayer3 = map.createLayer(
            "Walls/Walls_3",
            tileset
        );
        wallsLayer3.setCollisionBetween(0,255);

        // then the platforms layer
        const platformsLayer = map.createLayer(
            "Platforms",
            tileset
        );
        platformsLayer.setCollisionBetween(0,255);

        // and the obstacles
        const obstaclesLayer = map.createLayer(
            "Obstacles",
            tileset
        );
        obstaclesLayer.setCollisionBetween(0,255);

        this.physics.world.setBounds(0, 0, 1600, 1600);
        // #endregion

        // #region PICKABLES CREATION
        // spawning the pickables
        const pickables = map.createFromObjects("Pickables");
        pickables.forEach(pickable => {
            pickable.y += 32; // --> offset due to the Tiled origin
            pickable.anims.play(pickable.name); // --> display the right animation based on the object name
        });

        const coins = this.physics.add.staticGroup();
        pickables.forEach((pickable) => {
            coins.add(pickable);
            pickable.body.setSize(16, 16);
        });
        // #endregion

        // #region PLAYER CREATION
        player = this.physics.add.sprite(120, 1440, 'player', 0);
        player.setCollideWorldBounds(true);
        this.physics.add.collider(player, [wallsLayer1, wallsLayer2, wallsLayer3, platformsLayer], () => { // add colision between player and ground surfaces
            canJump = player.body.blocked.down;
        });
        this.physics.add.collider(player, obstaclesLayer, () => {
            if(DEBUG) DebugObstacle();
        });
        player.setMaxVelocity(maxSpeed, 9999);
        player.setDragX(dragForce);
        player.body.setSize(8, 56);
        player.body.setOffset(12, 8);

        // add colision between player and pickables
        this.physics.add.overlap(player, pickables, (player_ctx, pickable_ctx) => {
            pickable_ctx.destroy();
            var textFeedback = "";
            var feedbackColor = 0xFFFFFF;
            if(pickable_ctx.name.includes("coin")){
                textFeedback = "+1";
                coinsAmount++;
                UpdateCoinText();
            }
            switch(pickable_ctx.name){
                case "coin_0":
                    feedbackColor = 0xFBFF0D;
                    break;
                case "coin_1":
                    feedbackColor = 0xFF844F;
                    break;
                case "coin_2":
                    feedbackColor = 0xFAFF06;
                    break;
                default:
                    feedbackColor = 0xFFFFFF;
                    break;
            }
            this.DisplayTextFeedback(pickable_ctx.x, pickable_ctx.y, textFeedback, feedbackColor);
        });
        // #endregion

        // start HUD scene on top
        game.scene.start('GameHUD');

        // #region Debug
        if(DEBUG){
            game.scene.start('Debug');

            const debugGraphics = this.add.graphics().setAlpha(0.75);
            obstaclesLayer.renderDebug(debugGraphics, {
                tileColor: null, // Color of non-colliding tiles
                collidingTileColor: new Phaser.Display.Color(255, 0, 0, 64), // Color of colliding tiles
                faceColor: new Phaser.Display.Color(255, 0, 0, 255) // Color of colliding face edges
            });
        }
        // #endregion

        // keyboard events
        this.input.keyboard.on('keydown', onKey);
        this.input.keyboard.on('keyup', onKey);

        cameraGameplay.startFollow(player, false, CAMERA_HORIZONTAL_SMOOTH, CAMERA_VERTICAL_SMOOTH);
        cameraGameplay.setZoom(1);

        //#region GameplayScene functions
        // Displays a text feedback inside the scene to 
        this.DisplayTextFeedback = (x, y, text, color=0xFFFFFF) => {
            var new_textFeedback = this.add.bitmapText(x, y, 'CursedScript', text, FONT_SIZE_PARAGRAPH).setTint(color);
            new_textFeedback.setDropShadow(1, 1, 0x000000, 1);
            new_textFeedback.setDepth(10);
            // executed until destruction (see setTimeout)
            setInterval(() => {
                new_textFeedback.setY(new_textFeedback.y - (PICK_FEEDBACK_DISTANCE/PICK_FEEDBACK_FRAMES));
            }, PICK_FEEDBACK_TIMEOUT/PICK_FEEDBACK_FRAMES);
            // destroys the text feedback after some amount of time
            setTimeout(() => {
                new_textFeedback.destroy();
            }, PICK_FEEDBACK_TIMEOUT);
        }
        //#endregion
    }

    update(time){
        // Input handling through events
        
        // Horizontal movement
        player.body.setAccelerationX(inputX * accelerationForce);

        if(canJump){
            canJump = false;
            isJumping = true;
            player.body.setVelocityY(-inputJump * jumpForce);
        }

        isJumping = (-player.body.velocity.y > 0) && isJumping; // calculates if the player is still jumping
        
        HandlePlayerSprite();

        this.MoveParallax(player);
    }
}

// This scene contains the game HUD, it is used to display informations to the player while keeping this logic away from the gameplay
class GameHUDScene extends Phaser.Scene {
    constructor (){
        super({key: 'GameHUD', active: false});
    }

    // This function is called one time at the beginning of scene start, it is suitable for assets loading
    preload(){
        console.log("Loading Game HUD scene...");

        // importing custom fonts
        this.load.bitmapFont('CursedScript', 'Assets/Fonts/CursedScript.png', 'Assets/Fonts/CursedScript.fnt');

        // importing the UI spritesheets
        this.load.spritesheet('ui_hearths','Assets/Sprites/ui_hearthSpinningSpritesheet.png', { frameWidth: 67, frameHeight: 18 }); // spinning hearths
        this.load.spritesheet('ui_coin','Assets/Sprites/ui_coinSpinningSpritesheet.png', { frameWidth: 32, frameHeight: 32 }); // spinning coin
        
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // creating a new camera to render the HUD
        cameraHUD = this.cameras.main;
        cameraHUD.setRoundPixels(true);

        //#region ANIMATIONS
        //#region Hearth UI
        this.anims.create({
            key: 'ui_hearths_3',
            frames: this.anims.generateFrameNumbers('ui_hearths', {start: 0, end: 3}),
            frameRate: 6,
            repeat: -1
        });
        this.anims.create({
            key: 'ui_hearths_2',
            frames: this.anims.generateFrameNumbers('ui_hearths', {start: 4, end: 7}),
            frameRate: 6,
            repeat: -1
        });
        this.anims.create({
            key: 'ui_hearths_1',
            frames: this.anims.generateFrameNumbers('ui_hearths', {start: 8, end: 11}),
            frameRate: 6,
            repeat: -1
        });
        //#endregion

        //#region Coin UI
        this.anims.create({
            key: 'ui_coin',
            frames: this.anims.generateFrameNumbers('ui_coin', {start: 0, end: 5}),
            frameRate: 8,
            repeat: -1
        });
        //#endregion

        //#endregion

        // #region UI SPRITES
        ui_coin = this.add.sprite(8, 8).play('ui_coin');
        ui_coin.setOrigin(0, 0);
        
        ui_hearths = this.add.sprite(96, 15).play('ui_hearths_3');
        ui_hearths.setOrigin(0, 0);
        // #endregion

        //#region UI TEXT
        ui_coinText = this.add.bitmapText(48, 10, 'CursedScript', '00', FONT_SIZE_TITLE).setTint(0xFFFFFF);
        ui_coinText.setOrigin(0, 0);
        ui_coinText.setDropShadow(2, 2, 0x000000, 1);
        //#endregion
    }

    update(time){
        // Input handling at first
        // --> The HUD scene focuses on UI controls (pause, settings buttons, ...)
        // Then calling the desired functions
    }

    
}

// This scene contains the game HUD, it is used to display informations to the player while keeping this logic away from the gameplay
class DebugScene extends Phaser.Scene {
    constructor (){
        super({key: 'Debug', active: false});

        this.lastFrameTime = 0;
        this.deltaTime = 0;
    }

    // This function is called one time at the beginning of scene start, it is suitable for assets loading
    preload(){
        console.log("Loading debug scene...");
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        this.fpsText = this.add.bitmapText(8, GAME_HEIGHT - 32, 'CursedScript', 'FPS: ', FONT_SIZE_TITLE).setTint(0xFFFFFF);
    }

    update(time){
        this.deltaTime = time - this.lastFrameTime;
        this.lastFrameTime = time;
        
        this.fpsText.setText(`FPS: ${Number.parseFloat(1/(this.deltaTime/1000)).toFixed()}`);
    }
}
// #endregion

// #region FUNCTIONS
function DebugObstacle(){
    console.log("Collides with obstacle!");
}

// configure the controller when it is connected
function onGamepadConnect(){
    console.log("Controller connected!");

    // see https://phaser.io/examples/v3/view/input/gamepad/gamepad-debug to identify the buttons indexes
    gamepadButtons = {
        'left': gamepad.buttons[14],
        'right': gamepad.buttons[15],
        'jump': gamepad.buttons[0],
        'pause': gamepad.buttons[9]
    };

    // register to the button press & release events to optimize input handling
    gamepad.on('down', onButton);
    gamepad.on('up', onButton);

    gamepadConnected = true;
}

function onGamepadDisconnect(){
    console.log("Controller disconnected!");
    gamepadConnected = false;

    inputX = 0; // reset the x input
}

function onButton(){
    inputX = gamepadButtons.right.pressed - gamepadButtons.left.pressed;
    inputJump = gamepadButtons.jump.pressed; // + converts bool to int
    isJumping = false; // resets the isJumping value --> If we are jumping, we released the button, if we were about to jump, the jump will turn it back true
}

function onKey(){
    inputX = (keyboardKeys.right.isDown || keyboardKeys.right_arrow.isDown) - (keyboardKeys.left.isDown || keyboardKeys.left_arrow.isDown);
    inputJump = (keyboardKeys.jump.isDown || keyboardKeys.jump_arrow.isDown); // + converts bool to int
    isJumping = false;
}

function HandlePlayerSprite(){
    isMovingVertically = player.body.velocity.y != 0; // calculates if the player is moving on the y axis
    if(isMovingVertically){
        player.anims.play("player_jump", true);
    }
    else {
        player.anims.play("player_move", true);
    }

    if(player.body.velocity.x < 0){
        player.setFlipX(true);
    }
    else if(player.body.velocity.x > 0){
        player.setFlipX(false);
    }
}

function UpdateCoinText() {
    var coinText = "";
    if(String(coinsAmount).length < 2) coinText += "0";
    coinText += String(coinsAmount);
    ui_coinText.setText(coinText);
}


// #endregion

// #region GAME CONFIGURATION
const config = {
    type: Phaser.AUTO,
    width: 480, height: 320,
    parent: 'game_viewport',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: GRAVITY * TILE_SIZE }, // gravity (m.s-2) * tile size (px.m-1) --> px.s-2
            debug: DEBUG
        }
    },
    render: {
        antialias: false
    },
    scene: [
        GameScene,
        GameHUDScene,
        DebugScene
    ],
    input: {
        gamepad: true,
    },
};
var game = new Phaser.Game(config); // creates the game object
// #endregion