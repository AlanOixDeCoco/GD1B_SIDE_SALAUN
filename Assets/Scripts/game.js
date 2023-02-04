// #region CONSTANTS
const DEBUG = false;

const INPUT_ZERO_TOLERANCE = 0.1;

const GRAVITY = 32 ; // (acceleration expressed in m.s-2)
const ON_WALL_VELOCITY = 10;

const TILE_SIZE = 32;
const MAP_WIDTH = 1600;
const MAP_HEIGHT = 1600;

const GAME_WIDTH = 480;
const GAME_HEIGHT = 320;

const FONT_SIZE_TITLE = 24;
const FONT_SIZE_PARAGRAPH = 12;

const CAMERA_VERTICAL_SMOOTH = 0.1; // value between 0 - 1(no smoothing)
const CAMERA_HORIZONTAL_SMOOTH = 0.1;

const PICK_FEEDBACK_TIMEOUT = 1 * 1000; // text feedback duration in miliseconds
const PICK_FEEDBACK_DISTANCE = 12; // text movement distance
const PICK_FEEDBACK_FRAMES = 6; // text movement frames

const INVINCIBLE_DURATION = 1.5 * 1000;

const COIN_FEEDBACK_TEXT = "+1";
const ENNEMY_FEEDBACK_TEXT = "-1HP"

const TINT_BACKGROUND = 0x666666;
const TINT_DAMAGE = 0xFF0000;

const COLORMASK_BACKGROUND_LAYER1 = 0x000000;
const COLORMASK_BACKGROUND_LAYER2 = 0x444444;
// #endregion

// #region VARIABLES
var player;
var accelerationForce = 1200;
var jumpForce = 10 * TILE_SIZE;
var dragForce = 800;
var maxSpeed = 150;

var inputX = 0;
var inputJump = false;

var canJump = false;
var isJumping = false;
var isMovingVertically = false;
var onWall = false;

var cameraGameplay, cameraHUD; // the 2 cameras

var keyboardKeys;

var isGamepadConnected = false;
var gamepad; // stores used controller
var gamepadButtons; // assigned when a device is connected

var backgroundStars; // stars background
var backgroundM1Bottom; // -1 layer background (bottom part)
var backgroundM1Top; // -1 layer background (top part)
var backgroundM2; // -2 layer background
var backgroundM0; // -0 layer background

var coinsAmount = 0;
var hearthAmount = 3;
var isInvincible = false;

// UI
var ui_coin;
var ui_hearths;
var ui_coinText;
var ui_diedText;
var ui_retryButton;
// #endregion

// #region GAME SCENES
// This scene contains the gameplay this is the scene the player is interacting in
class GameScene extends Phaser.Scene {
    constructor (){
        super({key: 'GameScene', active: true});
    }

    // This function is called one time at the beginning of scene start, it is suitable for assets loading
    preload(){
        console.log("Loading Game scene...");

        // importing custom fonts
        this.load.bitmapFont('CursedScript', 'Assets/Fonts/CursedScript.png', 'Assets/Fonts/CursedScript.fnt');

        // importing backgrounds
        this.load.image('background_stars', 'Assets/Sprites/background_stars.png');
        this.load.image('background_m2', 'Assets/Sprites/background_-2.png');
        this.load.image('background_m1_bottom', 'Assets/Sprites/background_-1_bottom.png');
        this.load.image('background_m1_top', 'Assets/Sprites/background_-1_top.png');
        this.load.image('background_0', 'Assets/Sprites/background_0.png')

        // importing Tiled map ...
        this.load.tilemapTiledJSON('map', 'Assets/Maps/level_00.tmj');
        // and the corresponding tileset
        this.load.image('tileset', 'Assets/Maps/tileset.png');

        // importing spritesheets
        this.load.spritesheet('pickables','Assets/Sprites/pickablesSpritesheet.png', { frameWidth: 32, frameHeight: 32 }); // for the pickables
        this.load.spritesheet('player','Assets/Sprites/playerSpritesheet.png', { frameWidth: 32, frameHeight: 64 }); // for the player character
        this.load.spritesheet('ennemies','Assets/Sprites/ennemiesSpritesheet.png', { frameWidth: 22, frameHeight: 19 }); // for the ennemy
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // creating a new camera to render the gameplay
        cameraGameplay = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT, true, "Camera Gameplay");
        cameraGameplay.setRoundPixels(true);
        cameraGameplay.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT); // set the camera border to fit in the tilemap dimensions
        cameraGameplay.setBackgroundColor(TINT_BACKGROUND);

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

        // ennemy
        this.anims.create({
            key: 'ennemy_0',
            frames: this.anims.generateFrameNumbers('ennemies', {start: 0, end: 3}),
            frameRate: 5,
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
        //#region BACKGROUNDS
        backgroundStars = this.add.image(0, 0, 'background_stars').setOrigin(0, 0); // background (-3 layer)

        backgroundM2 = this.add.image(0, 0, 'background_m2').setOrigin(0, 0); // background (-2 layer)
        backgroundM2.setTint(COLORMASK_BACKGROUND_LAYER2);
        backgroundM2.setBlendMode("MULTIPLY");
        var backgroundM2Mask = backgroundM2.createBitmapMask();
        backgroundM2Mask.invertAlpha = true;
        
        backgroundM1Bottom = this.add.image(0, MAP_HEIGHT/2 + GAME_HEIGHT/2, 'background_m1_bottom').setOrigin(0, 1); // background (-1 layer)
        backgroundM1Bottom.setTint(COLORMASK_BACKGROUND_LAYER1);
        backgroundM1Bottom.setBlendMode("MULTIPLY");
        
        backgroundM1Top = this.add.image(0, 0, 'background_m1_top').setOrigin(0, 0); // background (-1 layer)
        backgroundM1Top.setTint(COLORMASK_BACKGROUND_LAYER1);
        backgroundM1Top.setBlendMode("NORMAL");

        backgroundM0 = this.add.image(0, 0, 'background_0').setOrigin(0, 0); // background (-0 layer)

        backgroundStars.setMask(backgroundM2Mask);
        //#endregion

        //#region TILEMAP
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
        wallsLayer2.setCollisionBetween(0,255);
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
        //#endregion

        this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        //#endregion

        //#region PICKABLES CREATION
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

        //#region ENNEMIES CREATION
        var ennemies = this.physics.add.staticGroup();
        var ennemy = this.physics.add.staticSprite(320, 1456, 'ennemies', 0);
        ennemies.add(ennemy);
        ennemy.play('ennemy_0');
        //#endregion
        
        // #region PLAYER CREATION
        player = this.physics.add.sprite(120, 1440, 'player', 0);
        player.setCollideWorldBounds(true);
        player.setMaxVelocity(maxSpeed, 9999);
        player.setDragX(dragForce);
        player.body.setSize(8, 54);
        player.body.setOffset(12, 10);
        //#endregion

        //#region COLLISIONS
        // add colision between player and ground surfaces
        this.physics.add.collider(player, [wallsLayer1, wallsLayer2, wallsLayer3, platformsLayer], () => {
            if(player.body.onFloor()){
                canJump = true;
            }
            onWall = player.body.onWall();
        });
        this.physics.add.collider(player, obstaclesLayer, () => {
            Die();
        });

        // add colision between player and pickables
        this.physics.add.overlap(player, coins, (player_ctx, coin_ctx) => {
            coin_ctx.destroy();
            PickCoin();
            
            var feedbackColor = 0xFFFFFF;
            switch(coin_ctx.name){
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
                    break;
            }
            this.DisplayTextFeedback(coin_ctx.x, coin_ctx.y - 16, COIN_FEEDBACK_TEXT, feedbackColor);
        });

        // add colision between player and ennemies
        this.physics.add.collider(player, ennemies, (player_ctx, ennemy_ctx) => {
            this.DisplayTextFeedback(player_ctx.x, player_ctx.y - player.height/2, ENNEMY_FEEDBACK_TEXT, TINT_DAMAGE);
            TakeDamage();
        }, () => {
            return !isInvincible;
        });
        // #endregion

        // make the camera follow the player
        cameraGameplay.startFollow(player, false, CAMERA_HORIZONTAL_SMOOTH, CAMERA_VERTICAL_SMOOTH);
        //cameraGameplay.setZoom(.2);

        // set parallax backgrounds scroll factors and initial positions
        backgroundStars.setScrollFactor(0);
        backgroundM2.setScrollFactor(0);
        backgroundM1Bottom.setScrollFactor(.5);
        backgroundM1Top.setScrollFactor(.5);

        // start HUD scene on top
        game.scene.start('GameHUDScene');

        // #region Debug
        if(DEBUG){
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
        // Horizontal movement
        if(!onWall){
            player.body.setAccelerationX(inputX * accelerationForce);
        }
        
        if(onWall){
            player.body.setAccelerationX(player.body.acceleration.x);
        }

        if(inputJump){
            if(canJump){
                canJump = false;
                player.body.setVelocityY(-jumpForce);
            }
            if(onWall){
                player.body.setVelocityY(-jumpForce);
                player.body.setAccelerationX((player.body.blocked.left-player.body.blocked.right) * 10000);
                onWall = false;
            }
        }

        
        
        HandlePlayerSprite();

        // deactivate gravity if on wall
        player.body.setAllowGravity(!player.body.onWall());
        if(onWall){
            player.body.setVelocityY(ON_WALL_VELOCITY);
        }

        onWall = player.body.onWall();
    }
}

// This scene contains the game HUD, it is used to display informations to the player while keeping this logic away from the gameplay
class GameHUDScene extends Phaser.Scene {
    constructor (){
        super({key: 'GameHUDScene', active: false});
    }

    // This function is called one time at the beginning of scene start, it is suitable for assets loading
    preload(){
        console.log("Loading Game HUD scene...");

        // importing custom fonts
        this.load.bitmapFont('CursedScript', 'Assets/Fonts/CursedScript.png', 'Assets/Fonts/CursedScript.fnt');

        // importing the UI spritesheets
        this.load.spritesheet('ui_hearths','Assets/Sprites/ui_hearthSpinningSpritesheet.png', { frameWidth: 67, frameHeight: 18 }); // spinning hearths
        this.load.spritesheet('ui_coin','Assets/Sprites/ui_coinSpinningSpritesheet.png', { frameWidth: 32, frameHeight: 32 }); // spinning coin
        this.load.spritesheet('ui_btn_retry','Assets/Sprites/ui_retryButton.png', { frameWidth: 52, frameHeight: 36 }); // spinning coin
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // creating a new camera to render the HUD
        cameraHUD = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT, true, "Camera HUD");
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
        this.anims.create({
            key: 'ui_hearths_0',
            frames: this.anims.generateFrameNumbers('ui_hearths', {start: 12, end: 15}),
            frameRate: 6,
            repeat: -1
        });
        //#endregion Hearth UI

        //#region Coin UI
        this.anims.create({
            key: 'ui_coin',
            frames: this.anims.generateFrameNumbers('ui_coin', {start: 0, end: 5}),
            frameRate: 8,
            repeat: -1
        });
        //#endregion Coin UI

        //#region Buttons UI
        this.anims.create({
            key: 'ui_btn_retry_released',
            frames: this.anims.generateFrameNumbers('ui_btn_retry', {start: 0, end: 0})
        });
        this.anims.create({
            key: 'ui_btn_retry_pressed',
            frames: this.anims.generateFrameNumbers('ui_btn_retry', {start: 1, end: 1})
        });
        //#endregion Buttons UI
        //#endregion ANIMATIONS

        // #region UI SPRITES
        ui_coin = this.add.sprite(8, 8).play('ui_coin');
        ui_coin.setOrigin(0, 0);
        
        ui_hearths = this.add.sprite(96, 15).play(`ui_hearths_${hearthAmount}`);
        ui_hearths.setOrigin(0, 0);
        // #endregion UI SPRITES

        //#region UI TEXT
        ui_coinText = this.add.bitmapText(48, 10, 'CursedScript', '00', FONT_SIZE_TITLE)
            .setOrigin(0, 0)
            .setTint(0xFFFFFF)
            .setDropShadow(2, 2, 0x000000, 1);

        ui_diedText = this.add.bitmapText(GAME_WIDTH/2, GAME_HEIGHT/2 - TILE_SIZE/2, 'CursedScript', 'YOU DIED!', FONT_SIZE_TITLE)
            .setOrigin(.5, .5)
            .setDropShadow(2, 2, 0x000000, 1)
            .setVisible(false);
        //#endregion UI TEXT

        //#region UI BUTTONS
        ui_retryButton = this.add.sprite(GAME_WIDTH/2, GAME_HEIGHT/2 + TILE_SIZE/2).play('ui_btn_retry_released').setInteractive().setVisible(false);
        ui_retryButton.on("pointerdown", () => {
            ui_retryButton.play("ui_btn_retry_pressed");
        });
        ui_retryButton.on("pointerup", () => {
            ui_retryButton.play("ui_btn_retry_released");
            location.reload();
        });
        //#endregion UI BUTTONS
    }

    update(time){
        // Input handling at first
        // --> The HUD scene focuses on UI controls (pause, settings buttons, ...)
        // Then calling the desired functions
    }

    
}
// #endregion GAME SCENES

// #region GLOBAL FUNCTIONS
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
    
    gamepadAxis = {
        'leftStick': gamepad.axes[0]
    };

    // register to the button press & release events to optimize input handling
    gamepad.on('down', onButton);
    gamepad.on('up', onButton);

    isGamepadConnected = true;
}

// called when the gamepad is disconnected
function onGamepadDisconnect(){
    console.log("Controller disconnected!");

    // clear the gamepad
    gamepad = null;
    isGamepadConnected = false;

    inputX = 0; // avoid forever moving player when disconnecting the controller while button pressed
}

// called when any button is pressed/released
function onButton(){
    // avoid using conditions to gain performance --> inputX is a calculation between left & right inputs
    inputX = (gamepadButtons.right.pressed) - gamepadButtons.left.pressed;
    inputJump = gamepadButtons.jump.pressed; // + converts bool to int
}

// called when any key is pressed/released
function onKey(){
    // avoid using conditions to gain performance --> inputX is a calculation between left & right inputs
    inputX = (keyboardKeys.right.isDown || keyboardKeys.right_arrow.isDown) - (keyboardKeys.left.isDown || keyboardKeys.left_arrow.isDown);
    inputJump = (keyboardKeys.jump.isDown || keyboardKeys.jump_arrow.isDown); // + converts bool to int
}

function HandlePlayerSprite(){
    // flip sprite depending on horizontal speed
    if(player.body.velocity.x < 0){
        player.setFlipX(true);
    }
    else if(player.body.velocity.x > 0){
        player.setFlipX(false);
    }

    // skip vertical speed calculation if invincible
    if(isInvincible){
        player.anims.play("player_invincible", true);
        return;
    }
    
    // calculate if the player is moving on the y axis & play animation
    isMovingVertically = player.body.velocity.y != 0; 
    if(isMovingVertically){
        player.anims.play("player_jump", true);
    }
    else {
        player.anims.play("player_move", true);
    }
}

function PickCoin() {
    // add a coin to the coinsAmount & make sure the UI displays 2 digits (ex: "1" -> "01")
    coinsAmount++;
    var coinText = "";
    if(String(coinsAmount).length < 2) coinText += "0";
    coinText += String(coinsAmount);
    ui_coinText.setText(coinText);
}

function TakeDamage(){
    // remove a hearth and check if player is still alive
    hearthAmount--;
    if(hearthAmount <= 0){
        Die();
        return;
    }

    // update the hearths ui
    ui_hearths.play(`ui_hearths_${hearthAmount}`);

    // if still alive, make player invincible for INVINCIBLE_DURATION seconds
    isInvincible = true;
    player.setTint(TINT_DAMAGE);
    setTimeout(() => {
        isInvincible = false; // reset invincible state
        player.setTint(0xFFFFFF); // reset tint
        if(hearthAmount <= 0){
            player.setTint(TINT_DAMAGE);
        }
    }, INVINCIBLE_DURATION);
}

function Die(){
    // remove all hearths
    hearthAmount = 0;
    ui_hearths.play(`ui_hearths_0`);

    // resets player anim & apply a death color tint
    player.anims.play("player_move", true);
    player.setTint(TINT_DAMAGE);
    
    // pause gamescene
    game.scene.pause("GameScene");
    
    // show the retry button & informations
    ui_retryButton.setVisible(true);
    ui_diedText.setVisible(true);

    console.log('Died!');
}
// #endregion GLOBAL FUNCTIONS

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
        GameHUDScene
    ],
    input: {
        gamepad: true,
    },
};
var game = new Phaser.Game(config); // creates the game object
// #endregion