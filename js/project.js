$(function() {

  "use strict";

  var GEC = GE.Comp,

      /* Constants */
      GAME_WIDTH = 1280,
      GAME_HEIGHT = 960,

      /* Bootstrap */
      canvas = $('#surface')[0],
      context = canvas.getContext("2d"),

      game = new GE.Game({
        canvas: canvas,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
      }),

      worldSystem = game.getDefaultWorld(),
      cameraSystem = game.getDefaultCamera(),
      renderSystem = game.getDefaultRenderer(),
      inputSystem = game.getDefaultInput();


  game.root.addObject(inputSystem);


  game.root.addObject(worldSystem);
  game.root.addObject(cameraSystem);
  game.root.addObject(renderSystem);

  game.start();

});
