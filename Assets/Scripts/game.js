// #region CONSTANTS
const GAME_WIDTH = 480;
const GAME_HEIGHT = 320;

const FONT_SIZE_TITLE = 24;
const FONT_SIZE_PARAGRAPH = 12;

const PALETTE_COLOR = 0x000000;
// #endregion

// #region GAME VARIABLES
var player;
var inputX = 0;
var inputJump = false;

var cameraGameplay, cameraHUD;

var keyboardKeys;

var gamepadConnected = false;
var gamepad;
var gamepadButtons;
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

        // importing Tiled map ...
        this.load.tilemapTiledJSON('map', 'Assets/Maps/level_00.tmj');
        // and the corresponding tileset
        this.load.image('tileset', 'Assets/Maps/tileset.png');

        // importing spritesheets
        this.load.spritesheet('pickables','Assets/Sprites/pickables.png', { frameWidth: 32, frameHeight: 32 }); // for the pickables
        this.load.spritesheet('player','Assets/Sprites/player.png', { frameWidth: 32, frameHeight: 48 }); // for the player character
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // deactivating the scene's main camera
        this.cameras.main.setVisible(false);
        
        // creating a new camera to render the gameplay and assign it to the current scene camera filter
        cameraGameplay = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
        cameraGameplay.setRoundPixels(true);
        this.cameraFilter = cameraGameplay.id;
        cameraGameplay.setBounds(0, 0, 1600, 1600); // set the camera border to fit in the tilemap dimensions

        // setup the controller state events
        this.input.gamepad.on('connected', () => {
            gamepad = this.input.gamepad.pad1;
            onGamepadConnect();
        });
        this.input.gamepad.on('disconnected', onGamepadDisconnect);

        // setup the keys
        keyboardKeys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP, 
            left: Phaser.Input.Keyboard.KeyCodes.LEFT, 
            down: Phaser.Input.Keyboard.KeyCodes.DOWN, 
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT, 
            jump: Phaser.Input.Keyboard.KeyCodes.SPACE
        });

        // #region MAP GENERATION
        // loading the tilemap
        const map = this.add.tilemap("map");

        // loading the tileset named "Tileset" in Tiled and naming it "tileset"
        const tileset = map.addTilesetImage(
                "Tileset",
                "tileset"
        );
        
        // loading all the walls layers
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

        // creating the pickables animations
        this.anims.create({
            key: 'coin_0',
            frames: this.anims.generateFrameNumbers('pickables', {start:0,end:5}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'coin_1',
            frames: this.anims.generateFrameNumbers('pickables', {start:6,end:11}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'coin_2',
            frames: this.anims.generateFrameNumbers('pickables', {start:12,end:17}),
            frameRate: 10,
            repeat: -1
        });

        // spawning the pickables
        const pickables = map.createFromObjects("Pickables");
        pickables.forEach(pickable => {
            pickable.y += 32; // --> offset due to the Tiled origin
            pickable.anims.play(pickable.name); // --> display the right animation based on the object name
        });

        const stars = this.physics.add.staticGroup();
        pickables.forEach((pickable) => {
            stars.add(pickable);
        });

        // #endregion

        // #region PLAYER CREATION
        player = this.physics.add.sprite(120, 1300, 'player');
        player.setBounce(0.2);
        player.setCollideWorldBounds(true);
        this.physics.add.collider(player, [wallsLayer1, wallsLayer2, wallsLayer3, platformsLayer]); // add colision between player and ground surfaces
        this.physics.add.collider(player, obstaclesLayer, DebugObstacle); // add colision between player and obstacles
        this.physics.add.overlap(player, pickables, () => {console.log("Take coin!")});
        // #endregion

        // start HUD scene on top
        game.scene.start('GameHUD');

        //cameraGameplay.setZoom(.2);
        cameraGameplay.startFollow(player);

        // #region DEBUG
        const debugGraphics = this.add.graphics().setAlpha(0.75);
        obstaclesLayer.renderDebug(debugGraphics, {
            tileColor: null, // Color of non-colliding tiles
            collidingTileColor: new Phaser.Display.Color(255, 0, 0, 64), // Color of colliding tiles
            faceColor: new Phaser.Display.Color(255, 0, 0, 255) // Color of colliding face edges
        });
        // #endregion

        // keyboard events
        this.input.keyboard.on('keydown', onKey);
        this.input.keyboard.on('keyup', onKey);

        
    }

    update(time){
        // Input handling through events

        // Then apply inputs
        console.log(`X: ${inputX}, JUMP: ${inputJump}`);
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
    
        // deactivating the scene's main camera
        this.cameras.main.setVisible(false);

        // creating a new camera to render the HUD and assign it to the current scene camera filter
        cameraHUD = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
        cameraHUD.setRoundPixels(true);
        this.cameraFilter = cameraHUD.id;
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        this.fpsText = this.add.bitmapText(10, 10, 'CursedScript', 'FPS: ', FONT_SIZE_TITLE).setTint(0xFFFFFF);
    }

    update(time){
        // Input handling at first
        // --> The HUD scene focuses on UI controls (pause, settings buttons, ...)

        // Then calling the desired functions
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
    inputJump = gamepadButtons.jump.pressed;
}

function onKey(){
    inputX = keyboardKeys.right.isDown - keyboardKeys.left.isDown;
    inputJump = keyboardKeys.jump.isDown;
}

//function onKeyDown()
// #endregion

// #region GAME CONFIGURATION
const config = {
    type: Phaser.AUTO,
    width: 480, height: 320,
    parent: 'game_viewport',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 981 }, // 9,81 m.s-2 sur Terre
            debug: true
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