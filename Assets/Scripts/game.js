// #region CONSTANTS
const FONT_SIZE_TITLE = 24;
const FONT_SIZE_PARAGRAPH = 12;

const PALETTE_COLOR = 0x000000;
// #endregion

// #region GAME VARIABLES
var inputX = 0, inputY = 0;
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
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        // chargement de la carte
        const map = this.add.tilemap("map");

        // chargement des jeux de tuiles
        const tileset = map.addTilesetImage(
                "Tileset",
                "tileset"
        );
        const pickables = map.addTilesetImage(
            "Pickups",
            "pickables"
    );
        
        // chargement des calques walls 1-2-3
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

        // chargement du calque de plateformes
        const platformsLayer = map.createLayer(
            "Platforms",
            tileset
        );

        // chargement du calque des obstacles
        const obstaclesLayer = map.createLayer(
            "Obstacles",
            tileset
        );

        // chargement du calque des pickables
        const pickablesLayer = map.createLayer(
            "Pickups",
            pickables
        );

        this.cameras.main.scrollY = 100;

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
    }

    // This function is called one time after the preload scene, it is suitable for creating objects instances and generating the static environment
    create(){
        
    }

    update(time){
        // Input handling at first
        
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