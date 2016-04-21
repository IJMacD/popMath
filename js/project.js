$(function() {

  "use strict";

  var GEC = GE.Comp,

      /* Constants */
      GAME_WIDTH = 1280,
      GAME_HEIGHT = 960,

      FADE_TIME = 200,

      SIZE_SCALED = 1,
      SIZE_RANDOM = 2,

      MIN_BUBBLE_SIZE = 75,
      MAX_BUBBLE_SIZE = 150,

      BUBBLE_FONT = "bold 24px sans-serif",
      BUBBLE_COLOUR = "#000000",
      HUD_FONT = "bold 24px sans-serif",
      HUD_COLOUR = "#FFFF00",

      SCORE_ANSWER = 10,
      SCORE_TIME_BONUS = 1000 * 1000,

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
      inputSystem = game.getDefaultInput(),

      bubbleManager = new GE.GameObjectManager(),

      hudObject = new GE.GameObject(),

      selectedBubble,
      bubbleSize = SIZE_RANDOM,
      levelLoadTime = 0,

      /* Shared Components */
      moveComponent = new GEC.MoveComponent(),
      worldBounceComponent = new GEC.WorldBounceComponent(worldSystem),

      /* Sphere Collision Bounce Vectors */
      sCBVdelta = vec3.create(),
      sCBVmtd = vec3.create(),
      sCBVv = vec3.create(),
      sCBVmtdNorm = vec3.create(),
      sCBVimpulse = vec3.create(),
      cRestitution = 1,

      /* Random Colours */
      colourPicks = ["00", "66", "88", "aa", "ff"],

      /* Bubble Click Listener */
      bCLV = vec2.create();

  hudObject.score = game.score;
  hudObject.addComponent(function (parent, delta) {
    renderSystem.push(function (context) {
      context.fillStyle = HUD_COLOUR;
      context.font = HUD_FONT;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.shadowBlur = 10;
      context.shadowColor = "#111111";
      context.fillText("Level: " + game.level, 10, 50);
      var scoreText = "Score: " + Math.round(parent.score),
          scoreWidth = context.measureText(scoreText).width;
      context.fillText(scoreText, GAME_WIDTH - scoreWidth - 10, 50);
    }, -1);
  });
  // Provide some easing for score updates
  hudObject.addComponent(function (parent, update) {
    parent.score += (game.score - parent.score) / 10;
  });

  game.on("loadLevel", function (level) {
    levelLoadTime = game.time;

    bubbleManager.removeAll();

    if(level == 1){
      addAdditionPair(1,5);
      addAdditionPair(1,5);
      addAdditionPair(1,10);
    }
    else if(level < 3){
      addAdditionPair(1,5);
      addAdditionPair(1,10);
      addAdditionPair(1,10);
    }
    else if(level < 5){
      addAdditionPair(1,10);
      addAdditionPair(5,10);
      addSubtractionPair(1,10);
    }
    else if(level < 6){
      addAdditionPair(5,20);
      addAdditionPair(5,20);
      addSubtractionPair(1,20);
    }
    else if(level < 9){
      addAdditionPair(5,20);
      addSubtractionPair(5,20);
      addMultiplicationPair(1,5);
    }
    else if(level < 12){
      addAdditionPair(5,20);
      addSubtractionPair(5,20);
      addMultiplicationPair(1,10);
    }
    else if(level < 20){
      addAdditionPair(5,20);
      addSubtractionPair(5,20);
      addMultiplicationPair(2,15);
      addDivisionPair(1,10);
    }
    else if(level < 50){
      addAdditionPair(10,level);
      addSubtractionPair(10,level);
      addMultiplicationPair(5, level);
      addDivisionPair(5, level);
    }
    else if(level < 60) {
      addMultiplicationAdditionPair(1, 20);
      addMultiplicationSubtractionPair(1, 20);
      addMultiplicationAdditionPair(1, 20);
      addMultiplicationSubtractionPair(1, 20);
    }
    else if(level < 75) {
      addMultiplicationAdditionPair(1, level);
      addMultiplicationSubtractionPair(1, level);
      addMultiplicationAdditionPair(1, level);
      addMultiplicationSubtractionPair(1, level);
    }
     else if(level < 90) {
      addMultiplicationAdditionPair(1, 20);
      addMultiplicationSubtractionPair(1, 20);
      addMultiplicationSubtractionPair(1, 20);
      addMultiplicationMultiplicationPair(1, 20);
    }
    else {
      addMultiplicationAdditionPair(1, level);
      addMultiplicationSubtractionPair(1, level);
      addMultiplicationSubtractionPair(1, level);
      addMultiplicationMultiplicationPair(1, level);
    }
  });

  game.root.addObject(inputSystem);

  game.root.addObject(bubbleManager);

  game.root.addObject(hudObject);

  game.root.addObject(worldSystem);
  game.root.addObject(cameraSystem);
  game.root.addObject(renderSystem);

  game.start();

  function autosize() {
    var $canvas = $(canvas),
        scale = window.devicePixelRatio || 1,
        w = $canvas.width() * scale,
        h = $canvas.height() * scale;
    game.setSize(w, h);
    cameraSystem.setPosition(w/2,h/2);
    cameraSystem.setSize(w, h);
    worldSystem.setBounds([0,0,w,h]);
  }
  $(window).on("resize", autosize);
  autosize();

  /* export */
  window.popMath = game;

  /**
   * Generate a random int between 1 and max
   */
  function rand(min,max) {
    return Math.floor(Math.random()*(max-min))+min;
  }

  function randColour() {
    var r1 = colourPicks[rand(3,5)],
        r2 = colourPicks[rand(0,4)],
        r3 = colourPicks[rand(0,3)],
        r4 = rand(1,6);
    if(r4 == 1) return "#" + r1 + r2 + r3;
    if(r4 == 2) return "#" + r2 + r3 + r1;
    if(r4 == 3) return "#" + r3 + r1 + r2;
    if(r4 == 4) return "#" + r1 + r3 + r2;
    if(r4 == 5) return "#" + r2 + r1 + r3;
    return "#" + r3 + r2 + r1;
  }

  function addAdditionPair(min,max) {
    var r1 = rand(min,max),
        r2 = rand(min,max),
        v = r1 + r2;
    addBubble(r1 + " + " + r2, v);
    addBubble(v, v);
  }

  function addSubtractionPair(min, max) {
    var r1 = rand(min+1,max),
        r2 = rand(min,r1),
        v = r1 - r2;
    addBubble(r1 + " - " + r2, v);
    addBubble(v, v);
  }

  function addMultiplicationPair(min,max) {
    var r1 = rand(min+1,max),
        r2 = rand(min,max),
        v = r1 * r2;
    addBubble(r1 + " × " + r2, v);
    addBubble(v, v);
  }

  function addDivisionPair(min,max) {
    var v = rand(min,max),
        r2 = rand(min,max),
        r1 = v * r2;
    addBubble(r1 + " ÷ " + r2, v);
    addBubble(v, v);
  }

  function addMultiplicationAdditionPair(min,max) {
    var sqrt_max = Math.sqrt(max),
        r1 = rand(min+1,sqrt_max),
        r2 = rand(min,max),
        v = r1 * r2,
        r3 = rand(min, v),
        r4 = v - r3;
    addBubble(r1 + " × " + r2, v);
    addBubble(r3 + " + " + r4, v);
  }

  function addMultiplicationSubtractionPair(min, max) {
    var sqrt_max = Math.sqrt(max),
        r1 = rand(min+1,sqrt_max),
        r2 = rand(min,max),
        v = r1 * r2,
        r4 = rand(min, v),
        r3 = v + r4;
    addBubble(r1 + " × " + r2, v);
    addBubble(r3 + " - " + r4, v);
  }

  function addMultiplicationMultiplicationPair(min, max) {
    var sqrt_max = Math.sqrt(max),
        r1 = rand(min+1,sqrt_max),
        r2 = rand(min,sqrt_max),
        r3 = rand(min,sqrt_max),
        a = r1 * r2,
        b = r2 * r3,
        c = r1 * r3,
        v = a * b,
        d = v / c;
    addBubble(a + " × " + b, v);
    addBubble(c + " × " + d, v);
  }

  function addBubble(text, value, size, colour) {
    var bubble = new GE.GameObject();

    if(!size){
      size = bubbleSize == SIZE_SCALED ? MIN_BUBBLE_SIZE + Math.log(value)*20 : rand(MIN_BUBBLE_SIZE,MAX_BUBBLE_SIZE);
    }

    if(!colour){
      colour = randColour();
    }

    vec2.random(bubble.position, GAME_WIDTH);
    vec2.random(bubble.velocity, 0.1);

    bubble.text = text;
    bubble.value = value;
    bubble.size = size;
    bubble.colour = colour;
    bubble.opacity = 1;

    // Increase the bounds slightly so that shadows aren't cut off at the
    // true edges of the canvas
    bubble.bounds = boundsFromSize(size+20);

    bubble.addComponent(bubbleClickListener);
    bubble.addComponent(moveComponent);
    bubble.addComponent(sphereCollisionBouncer);
    bubble.addComponent(worldBounceComponent);
    bubble.addComponent(bubbleRender);

    bubbleManager.addObject(bubble)
  }

  function selectBubble(bubble) {
    if(selectedBubble){
      if(selectedBubble == bubble){
        selectedBubble = null;
        bubble.selected = false;
        return;
      }

      if(selectedBubble.value == bubble.value){

        selectedBubble.addComponent(new GEC.FadeDestroyComponent(FADE_TIME));
        bubble.addComponent(new GEC.FadeDestroyComponent(FADE_TIME));

        game.score += SCORE_ANSWER;

        // We're just about to kill the last to objects, so time to start
        // next level rolling
        if(bubbleManager.objects.length == 2){
          game.score += SCORE_TIME_BONUS / (game.time - levelLoadTime);
          game.nextLevel();
        }
      }
      else {
        selectedBubble.selected = false;
        bubble.selected = false;
      }
      selectedBubble = null;
    }
    else {
      selectedBubble = bubble;
      bubble.selected = true;
    }
  }

  /* Shorthand Component Update method */
  function bubbleRender(parent, delta){
    renderSystem.push(function (context) {
      var x = parent.position[0],
          y = parent.position[1],
          colour = parent.colour || "#000000";

      context.globalAlpha = parent.opacity;

      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.shadowBlur = 20;
      context.shadowColor = parent.selected ? "#FFFF00" : "#111111";

      context.fillStyle = colour;
      context.beginPath();
      context.arc(x,y,parent.size/2,0,Math.PI*2,false);
      context.fill();

      context.shadowColor = "transparent";

      context.fillStyle = BUBBLE_COLOUR;
      context.font = BUBBLE_FONT;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(parent.text, x, y);
    });
  }

  function boundsFromSize(size) {
    var s2 = size / 2;
    return [
      -s2, -s2, // MinX, MinY,
      s2, s2,   // MaxX, MaxY,
      -s2, s2   // MinZ, MaxZ
    ];
  }

  function sphereCollisionBouncer(parent, delta){

    // Only start looking for collisions after finding self in set
    // This means we don't double check for collisions
    var foundSelf = false;

    bubbleManager.objects.forEach(function (other) {
      if(parent == other){
        foundSelf = true;
        return;
      }

      if(foundSelf){
        var minDist = (parent.size + other.size) / 2,
            curDist = vec3.dist(parent.position, other.position);
        if(curDist < minDist){
          // http://stackoverflow.com/q/345838
          // get the mtd
          vec3.subtract(sCBVdelta, parent.position, other.position);

          // minimum translation distance to push balls apart after intersecting
          vec3.scale(sCBVmtd, sCBVdelta, (minDist-curDist)/curDist);

          // resolve intersection --
          // inverse mass quantities
          var im1 = 1 / parent.size; // / parent.value;
          var im2 = 1 / other.size; // / other.value;

          // push-pull them apart based off their mass
          vec3.scaleAndAdd(parent.position, parent.position, sCBVmtd, im1 / (im1 + im2));
          vec3.scaleAndAdd(other.position, other.position, sCBVmtd, -im2 / (im1 + im2));

          // impact speed
          vec3.subtract(sCBVv, parent.velocity, other.velocity);
          vec3.normalize(sCBVmtdNorm, sCBVmtd);
          var vn = vec3.dot(sCBVv, sCBVmtdNorm)

          // sphere intersecting but moving away from each other already
          if (vn > 0) return;

          // collision impulse
          var i = (-(1 + cRestitution) * vn) / (im1 + im2);
          vec3.scale(sCBVimpulse, sCBVmtdNorm, i);

          // change in momentum
          vec3.scaleAndAdd(parent.velocity, parent.velocity, sCBVimpulse, im1);
          vec3.scaleAndAdd(other.velocity, other.velocity, sCBVimpulse, -im2);
        }
      }
    });
  }

  function bubbleClickListener(parent, delta) {
    var lastClick = inputSystem.lastClick;

    if(lastClick[0]){
      vec2.subtract(bCLV, parent.position, lastClick);

      if(vec2.len(bCLV) < parent.size / 2){
        selectBubble(parent);
      }
    }
  }

  GE.GameComponent.create(function FadeDestroyComponent(duration){
    this.duration = duration;
    this.elapsed = 0;
  }, {
    update: function (parent, delta) {
      var t = this.elapsed/this.duration;
      if(t > 1){
        parent.parent.removeObject(parent);
        return;
      }
      parent.opacity = 1 - t;
      this.elapsed += delta;
    }
  });
});
