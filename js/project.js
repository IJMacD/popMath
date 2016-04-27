$(function() {
  "FadeDestroyComponent: nomunge";

  "use strict";

  var GEC = GE.Comp,

      /* Constants */
      GAME_WIDTH = 1280,
      GAME_HEIGHT = 960,

      FADE_TIME = 200,

      SIZE_SCALED = 1,
      SIZE_RANDOM = 2,

      MIN_BUBBLE_SIZE = 100,
      MAX_BUBBLE_SIZE = 200,

      BUBBLE_VELOCITY = 0.05,

      BUBBLE_TEXT_SIZE = 32,
      BUBBLE_FONT = "bold "+BUBBLE_TEXT_SIZE+"px sans-serif",
      BUBBLE_COLOUR = "#000000",
      HUD_FONT = "bold 32px sans-serif",
      HUD_COLOUR = "#FFFF00",

      SCORE_ANSWER = 10,
      SCORE_TIME_BONUS = 1000 * 1000,

      /* Bootstrap */
      canvas = $('#surface')[0],
      canvas2 = $('#surface2')[0],
      context = canvas.getContext("2d"),
      context2 = canvas2.getContext("2d"),

      game = new GE.Game({
        canvas: canvas,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
      }),

      worldSystem = game.getDefaultWorld(),
      camera1System = game.getDefaultCamera(),
      render1System = game.getDefaultRenderer(),
      camera2System = new GE.CameraSystem(GAME_WIDTH, GAME_HEIGHT),
      render2System = new GE.CanvasRenderSystem(context2, camera2System),
      renderSystem = new GE.MultiRenderSystem(),
      inputSystem = game.getDefaultInput(),

      bubbleManager = new GE.GameObjectManager(),

      hudObject = new GE.GameObject(),

      selectedBubble,
      bubbleSize = SIZE_RANDOM,
      levelLoadTime = 0,
      fps = 0,

      /* Shared Components */
      moveComponent = new GEC.MoveComponent(),
      worldBounceComponent = new GEC.WorldBounceComponent(worldSystem),
      gravityComponent = new GEC.GravityComponent(),
      rotationComponent = new GEC.RotationComponent(),
      realWordSwitchComponent = new GEC.SwitchComponent(),

      /* Sphere Collision Bounce Vectors */
      sCBVdelta = vec3.create(),
      sCBVmtd = vec3.create(),
      sCBVv = vec3.create(),
      sCBVmtdNorm = vec3.create(),
      sCBVimpulse = vec3.create(),
      cRestitution = 1.0,
      cFriction = 1.0,

      /* Random Colours */
      colourPicks = ["00", "66", "88", "aa", "ff"],

      /* Bubble Click Listener */
      bCLV = vec2.create();

  camera2System.setPosition(GAME_WIDTH/2, GAME_HEIGHT/2);
  renderSystem.addRenderSystem(render1System);
  renderSystem.addRenderSystem(render2System);
  canvas2.width = GAME_WIDTH;
  canvas2.height = GAME_HEIGHT;
  worldSystem.bounds[4] = -100;
  worldSystem.bounds[5] = 100;

  realWordSwitchComponent.addComponent(gravityComponent);
  realWordSwitchComponent.addComponent(rotationComponent);
  realWordSwitchComponent.addComponent(function RotateOnBounceComponent(parent, delta) {
    if(parent.hasBounced == 1){
      parent.rotationSpeed = parent.velocity[1] / parent.size;
    }

    if(parent.hasBounced == 2){
      parent.rotationSpeed = parent.velocity[0] / parent.size;
    }
  });
  realWordSwitchComponent.addComponent(function RotationSpeedDecayComponent(parent, delta) {
    parent.rotationSpeed *= 1 - (0.0001 * delta);
    if(Math.abs(parent.rotationSpeed) < 0.0001){ parent.rotationSpeed = 0; }
  });
  realWordSwitchComponent.setActive(false);

  worldBounceComponent.cRestitution = cRestitution;
  worldBounceComponent.cFriction = cFriction;

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
      context.fillText(scoreText, camera1System.width - scoreWidth - 10, 50);
      if(GE.DEBUG && delta){
        fps += ((1000/delta) - fps) / 50;
        context.font = "bold 16px sans-serif";
        context.fillText("fps: " + Math.round(fps), 10, 70);
      }
    }, -1);
  });
  // Provide some easing for score updates
  hudObject.addComponent(function (parent, update) {
    parent.score += (game.score - parent.score) / 10;
  });

  // CompleteLevelOnEmptyComponent tells the game that it should
  // consider this level to have been completed when its parent
  // *GameManagerObject* is empty. It will only trigger once until
  // new objects have been added to its parent again.
  bubbleManager.addComponent(function CompleteLevelOnEmptyComponent(parent, delta) {
    if(parent.objects.length == 0 && !this._triggered){
      game.completeLevel();
      this._triggered = true;
    }
    else if(this._triggered){
      this._triggered = (parent.objects.length == 0);
    }
  });

  bubbleManager.addComponent(function (parent, delta) {
    if(this.count == undefined){ this.count = 3; }
    if(inputSystem.lastKey == GE.InputSystem.Keys.r){
      this.count --;
      if(this.count <= 0){
        realWordSwitchComponent.flip();
        this.count = 3;
      }
    }
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
      addSubtractionPair(1,10);
    }
    else if(level < 9){
      addAdditionPair(5,20);
      addAdditionPair(5,20);
      addSubtractionPair(1,20);
      addSubtractionPair(5,20);
    }
    else if(level < 12){
      addAdditionPair(5,20);
      addSubtractionPair(5,20);
      addSubtractionPair(5,20);
      addMultiplicationPair(2,5);
    }
    else if(level < 15){
      addAdditionPair(5,20);
      addAdditionPair(10,20);
      addMultiplicationPair(2,5);
      addMultiplicationPair(2,12);
    }
    else if(level < 20){
      addAdditionPair(10,20);
      addSubtractionPair(10,20);
      addMultiplicationPair(2,10);
      addMultiplicationPair(2,12);
    }
    else if(level < 25){
      addAdditionPair(10,20);
      addSubtractionPair(10,20);
      addMultiplicationPair(2,12);
      addDivisionPair(1,10);
    }
    else if(level < 30){
      addAdditionPair(10,level);
      addSubtractionPair(10,level);
      addMultiplicationPair(5, 12);
      addDivisionPair(5, 12);
    }
    else if(level < 40){
      addMultiplicationPair(2, 12);
      addDivisionPair(2, 12);
      addMultiplicationPair(5, 12);
      addDivisionPair(5, 12);
    }
    else if(level < 50){
      addMultiplicationPair(5, level - 25);
      addDivisionPair(5, level - 25);
      addMultiplicationPair(5, level - 25);
      addDivisionPair(5, level - 25);
    }
    else if(level < 60) {
      addMultiplicationAdditionPair(1, 20);
      addMultiplicationSubtractionPair(1, 20);
      addMultiplicationAdditionPair(1, 20);
      addMultiplicationSubtractionPair(1, 20);
    }
    else if(level < 75) {
      addMultiplicationAdditionPair(1, level - 30);
      addMultiplicationSubtractionPair(1, level - 30);
      addMultiplicationAdditionPair(1, level - 30);
      addMultiplicationSubtractionPair(1, level - 30);
    }
     else if(level < 90) {
      addMultiplicationAdditionPair(10, 50);
      addMultiplicationSubtractionPair(5, 20);
      addMultiplicationSubtractionPair(5, 30);
      addMultiplicationMultiplicationPair(1, level - 39); // Range 36 - 50 (6^2 - 7^2)
    }
    else if(level < 100) {
      addMultiplicationAdditionPair(1, level - 40);
      addMultiplicationSubtractionPair(1, level - 50);
      addMultiplicationSubtractionPair(1, level - 60);
      addMultiplicationMultiplicationPair(1, level - 35); // Range 55 - 64 (7^2 - 8^2)
    }
    else {
      addMultiplicationAdditionPair(1, level);
      addMultiplicationSubtractionPair(1, level);
      addMultiplicationSubtractionPair(1, level);
      addMultiplicationMultiplicationPair(1, level - 36); // Range 64+

      var count = (level - 100) / 5,
          i,
          r;
      for(i=0;i<count; i++){
        r = rand(0,count);
        if(r == 0) addMultiplicationAdditionPair(1, level);
        else if(r == 1) addMultiplicationSubtractionPair(1, level);
        else if(r == 2) addMultiplicationMultiplicationPair(1, level);
        else if(r == 3) addAdditionAdditionPair(1, level);
        else if(r == 4) addAdditionSubtractionPair(1, level);
        else if(r == 5) addSubtractionSubtractionPair(1, level);
        else addMultiplicationAdditionPair(1, level);
      }
    }
  });

  game.root.addObject(inputSystem);

  game.root.addObject(bubbleManager);

  game.root.addObject(hudObject);

  game.root.addObject(worldSystem);
  game.root.addObject(camera1System);
  game.root.addObject(camera2System);
  game.root.addObject(renderSystem);

  game.start();

  function autosize() {
    var $canvas = $(canvas),
        scale = window.devicePixelRatio || 1,
        w = $canvas.width() * scale,
        h = $canvas.height() * scale;
    game.setSize(w, h);
    camera1System.setPosition(w/2,h/2);
    camera1System.setSize(w, h);
    camera2System.setPosition(w/2,h/2);
    camera2System.setSize(w, h);
    worldSystem.setBounds([0,0,w,h]);

    canvas2.width = w;
    canvas2.height = h;
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
        v = r1;
    addBubble((r1 + r2) + " - " + r2, v);
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
        r2 = rand(min+1,sqrt_max),
        r3 = rand(min,sqrt_max),
        a = r1 * r2,
        b = r2 * r3,
        c = r1 * r3,
        v = a * b,
        d = v / c;
    addBubble(a + " × " + b, v);
    addBubble(c + " × " + d, v);
  }

  function addAdditionAdditionPair(min,max) {
    var r1 = rand(min,max),
        r2 = rand(min,max),
        v = r1 + r2,
        r3 = rand(min, v),
        r4 = v - r3;
    addBubble(r1 + " + " + r2, v);
    addBubble(r3 + " + " + r4, v);
  }

  function addAdditionSubtractionPair(min,max) {
    var r1 = rand(min,max),
        r2 = rand(min,max),
        v = r1,
        r3 = rand(min, v-1),
        r4 = v - r3;
    addBubble((r1 + r2) + " - " + r2, v);
    addBubble(r3 + " + " + r4, v);
  }

  function addSubtractionSubtractionPair(min,max) {
    var r1 = rand(min,max),
        r2 = rand(min,max),
        v = r1,
        r3 = rand(min, v-1);
    addBubble((r1 + r2) + " - " + r2, v);
    addBubble((r3 + r1) + " - " + r3, v);
  }

  function addBubble(text, value, size, colour) {
    var bubble = new GE.GameObject();

    if(!size){
      size = bubbleSize == SIZE_SCALED ? MIN_BUBBLE_SIZE + Math.log(value)*20 : rand(MIN_BUBBLE_SIZE,MAX_BUBBLE_SIZE);
    }

    if(!colour){
      colour = randColour();
    }

    vec3.set(bubble.position, Math.random()*game.width, Math.random()*game.height, Math.random()*10);
    vec3.random(bubble.velocity, BUBBLE_VELOCITY);

    bubble.text = text;
    bubble.value = value;
    bubble.size = size;
    bubble.colour = colour;
    bubble.opacity = 0.8;

    // Increase the bounds slightly so that shadows aren't cut off at the
    // true edges of the canvas
    bubble.bounds = boundsFromSize(size);

    bubble.addComponent(bubbleClickListener);
    bubble.addComponent(realWordSwitchComponent);
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

  game.on("levelComplete", function (level) {
    game.score += SCORE_TIME_BONUS / (game.time - levelLoadTime);
    game.nextLevel();
  });

  /* Shorthand Component Update method */
  function bubbleRender(parent, delta){
    renderSystem.push(function (context, camera) {
      var x = parent.position[0],
          y = parent.position[1],
          z = parent.position[2],
          dx = camera == camera2System ? z*0.01 : 0,
          size = parent.size/2 + parent.size * 0.1,
          colour = parent.colour || "#000000";

      context.translate(x + dx, y);

      context.rotate(parent.rotation);

      context.globalAlpha = parent.opacity;

      context.shadowBlur = 20;
      context.shadowColor = parent.selected ? "#FFFF00" : "#111111";

      context.fillStyle = colour;
      context.beginPath();
      context.arc(0,0,size,0,Math.PI*2,false);
      context.fill();

      context.shadowColor = "transparent";

      context.fillStyle = BUBBLE_COLOUR;
      context.font = BUBBLE_FONT;
      context.textAlign = "center";
      context.textBaseline = "middle";
      var textWidth = context.measureText(parent.text).width;
      if(textWidth > parent.size){
        context.font = "bold "+(BUBBLE_TEXT_SIZE*parent.size/textWidth)+"px sans-serif";
      }
      context.fillText(parent.text, 0, 0);
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

  GE.GameComponent.create(function SortByZComponent() {}, {
    update: function (parent, delta) {
      var children = parent.objects;
      if(children){
        children.sort(function (a, b) {
          return (a.position[2] < b.position[1] ? -1 : (a.position[2] > b.position[2] ? 1 : 0));
        });
      }
    }
  });

  bubbleManager.addComponent(new GEC.SortByZComponent());
});
