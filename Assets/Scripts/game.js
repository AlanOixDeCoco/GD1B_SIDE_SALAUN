// #region CONSTANTS
const GAME_WIDTH = 480;
const GAME_HEIGHT = 320;

const FONT_SIZE_TITLE = 24;
const FONT_SIZE_PARAGRAPH = 12;

const PALETTE_COLOR = 0x000000;
// #endregion

// #region GAME VARIABLES
var inputX = 0, inputY = 0;

var cameraGameplay, cameraHUD;

var score = 0;
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
        // and the corresponding tilesets
        this.load.image('tileset', 'Assets/Maps/tileset.png');
        this.load.image('pickables', 'Assets/Maps/pickables.png');

        // deactivating the scene's main camera
        this.cameras.main.setVisible(false);
        
        // creating a new camera to render the gameplay and assign it to the current scene camera filter
        cameraGameplay = this.cameras.add(0, 0, GAME_WIDTH, GAME_HEIGHT);
        cameraGameplay.setBackgroundColor(0xFF0000);
        cameraGameplay.setRoundPixels(true);
        this.cameraFilter = cameraGameplay.id;
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // loading the tilemap
        const map = this.add.tilemap("map");

        // loading the tileset named "Tileset" in Tiled and naming it "tileset"
        const tileset = map.addTilesetImage(
                "Tileset",
                "tileset"
        );
        // same for the pickables
        const pickables = map.addTilesetImage(
            "Pickups",
            "pickables"
        );
        
        // loading all the walls layers
        const wallsLayer1 = map.createLayer(
            "Walls/Walls_1",
            tileset
        );
        const wallsLayer2 = map.createLayer(
            "Walls/Walls_2",
            tileset
        );
        const wallsLayer3 = map.createLayer(
            "Walls/Walls_3",
            tileset
        );

        // then the platforms layer
        const platformsLayer = map.createLayer(
            "Platforms",
            tileset
        );

        // and the obstacles
        const obstaclesLayer = map.createLayer(
            "Obstacles",
            tileset
        );

        // loading the pickables locations
        const pickablesLayer = map.createLayer(
            "Pickups",
            pickables
        );

        game.scene.start('GameHUD');
    }

    update(time){
        // Input handling at first
        
        // Then calling the desired functions
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
        cameraGameplay.scrollY = (300);
    }

    update(time){
        // Input handling at first
        // --> The HUD scene focuses on UI controls (pause, settings buttons, ...)

        // Then calling the desired functions
    }
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
            gravity: { y: 981 }, // 9,81 m.s-2 sur Terre
            debug: false
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