const inputManager = new InputManager();

var config = {
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
    scene: {
        preload: preload, 
        create: create, 
        update: update 
    },
};
var game = new Phaser.Game(config); // creates the game object

var lastFrameTime = 0;
var deltaTime = 0;

function preload(){
    // Placeholder bg
    this.load.image('placeholderBG', 'Assets/Images/backgroundPlaceholder.jpg');

    // Bitmap Fonts
    this.load.bitmapFont('CursedScript', 'Assets/Fonts/CursedScript.png', 'Assets/Fonts/CursedScript.fnt');
}

function create(){
    // Placeholder bg
    var placeholderBG = this.add.image(0,0, 'placeholderBG');
    placeholderBG.setScale(0.22);
    

    // Technical stats
    deltaTimeText = this.add.bitmapText(10, 10, 'CursedScript', 'Delta Time: ', 12).setTint(0xFFFFFF);
    fpsText = this.add.bitmapText(10, 24, 'CursedScript', 'FPS: ', 12).setTint(0xFFFFFF);
}

function update(time){
    // Technical stats
    deltaTime = time - lastFrameTime;
    lastFrameTime = time;
    deltaTimeText.setText(`Delta Time: ${Number.parseFloat(deltaTime).toFixed(2)}ms`);
    fpsText.setText(`FPS: ${Number.parseFloat(1/(deltaTime/1000)).toFixed()}`);
}