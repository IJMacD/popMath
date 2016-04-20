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
      inputSystem = game.getDefaultInput(),

      bubbleManager = new GE.GameObjectManager(),

      /* Shared Components */
      moveComponent = new GEC.MoveComponent(),
      worldBounceComponent = new GEC.WorldBounceComponent(worldSystem),

      sCBVdelta = vec3.create(),
      sCBVmtd = vec3.create(),
      sCBVv = vec3.create(),
      sCBVmtdNorm = vec3.create(),
      sCBVimpulse = vec3.create(),
      cRestitution = 1,

      colourPicks = ["00", "66", "88", "aa", "ff"];

  addAdditionPair(20);
  addSubtractionPair(20);
  addMultiplicationPair(20);
  addDivisionPair(20);

  game.root.addObject(inputSystem);

  game.root.addObject(bubbleManager);

  game.root.addObject(worldSystem);
  game.root.addObject(cameraSystem);
  game.root.addObject(renderSystem);

  game.start();

  /**
   * Generate a random int between 1 and max
   */
  function rand(max) {
    return Math.floor(Math.random()*(max-1))+1;
  }

  function randColour() {
    var r1 = colourPicks[rand(3)+2],
        r2 = colourPicks[rand(5)-1],
        r3 = colourPicks[rand(3)-1],
        r4 = rand(6);
    if(r4 == 1) return "#" + r1 + r2 + r3;
    if(r4 == 2) return "#" + r2 + r3 + r1;
    if(r4 == 3) return "#" + r3 + r1 + r2;
    if(r4 == 4) return "#" + r1 + r3 + r2;
    if(r4 == 5) return "#" + r2 + r1 + r3;
    return "#" + r3 + r2 + r1;
  }

  function addAdditionPair(max) {
    var r1 = rand(max),
        r2 = rand(max),
        v = r1 + r2;
    addBubble(r1 + " + " + r2, v, rand(100)+100, randColour());
    addBubble(v, v, rand(100)+100, randColour());
  }

  function addSubtractionPair(max) {
    var r1 = rand(max),
        r2 = rand(r1),
        v = r1 - r2;
    addBubble(r1 + " - " + r2, v, rand(100)+100, randColour());
    addBubble(v, v, rand(100)+100, randColour());
  }

  function addMultiplicationPair(max) {
    var r1 = rand(max),
        r2 = rand(max),
        v = r1 * r2;
    addBubble(r1 + " × " + r2, v, rand(100)+100, randColour());
    addBubble(v, v, rand(100)+100, randColour());
  }

  function addDivisionPair(max) {
    var r1 = rand(max),
        r2 = rand(max),
        v = r1 * r2;
    addBubble(v + " ÷ " + r2, v, rand(100)+100, randColour());
    addBubble(r1, r1, rand(100)+100, randColour());
  }

  function addBubble(text, value, size, colour) {
    var bubble = new GE.GameObject();

    vec2.random(bubble.position, GAME_WIDTH);
    vec2.random(bubble.velocity, 0.1);

    bubble.text = text;
    bubble.value = value;
    bubble.size = size;
    bubble.colour = colour;

    bubble.bounds = boundsFromSize(size);

    bubble.addComponent(moveComponent);
    bubble.addComponent(sphereCollisionBouncer);
    bubble.addComponent(worldBounceComponent);
    bubble.addComponent(bubbleRender);

    bubbleManager.addObject(bubble)
  }

  /* Shorthand Component Update method */
  function bubbleRender(parent, delta){
    renderSystem.push(function (context) {
      var x = parent.position[0],
          y = parent.position[1];
      context.fillStyle = parent.colour || "#000000";
      context.beginPath();
      context.arc(x,y,parent.size/2,0,Math.PI*2,false);
      context.fill();
      context.fillStyle = "#000000";
      context.font = "bold 32px sans-serif";
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
          // get the mtd
          // Vector2d delta = (position.subtract(ball.position));
          // float d = delta.getLength();
          vec3.subtract(sCBVdelta, parent.position, other.position);

          // minimum translation distance to push balls apart after intersecting
          // Vector2d mtd = delta.multiply(((getRadius() + ball.getRadius())-d)/d);
          vec3.scale(sCBVmtd, sCBVdelta, (minDist-curDist)/curDist);

          // resolve intersection --
          // inverse mass quantities
          // float im1 = 1 / getMass();
          // float im2 = 1 / ball.getMass();
          var im1 = 1 / parent.size; // / parent.value;
          var im2 = 1 / other.size; // / other.value;

          // push-pull them apart based off their mass
          // position = position.add(mtd.multiply(im1 / (im1 + im2)));
          // ball.position = ball.position.subtract(mtd.multiply(im2 / (im1 + im2)));
          vec3.scaleAndAdd(parent.position, parent.position, sCBVmtd, im1 / (im1 + im2));
          vec3.scaleAndAdd(other.position, other.position, sCBVmtd, -im2 / (im1 + im2));

          // impact speed
          // Vector2d v = (this.velocity.subtract(ball.velocity));
          // float vn = v.dot(mtd.normalize());
          vec3.subtract(sCBVv, parent.velocity, other.velocity);
          vec3.normalize(sCBVmtdNorm, sCBVmtd);
          var vn = vec3.dot(sCBVv, sCBVmtdNorm)

          // sphere intersecting but moving away from each other already
          if (vn > 0) return;

          // collision impulse
          // float i = (-(1.0f + Constants.restitution) * vn) / (im1 + im2);
          // Vector2d impulse = mtd.multiply(i);
          var i = (-(1 + cRestitution) * vn) / (im1 + im2);
          vec3.scale(sCBVimpulse, sCBVmtdNorm, i);

          // change in momentum
          // this.velocity = this.velocity.add(impulse.multiply(im1));
          // ball.velocity = ball.velocity.subtract(impulse.multiply(im2));
          var vp1 = vec3.len(parent.velocity),
              vo1 = vec3.len(other.velocity),
              u1 = vp1 * parent.size + vo1 * other.size,
              vp2, vo2, u2;
          vec3.scaleAndAdd(parent.velocity, parent.velocity, sCBVimpulse, im1);
          vec3.scaleAndAdd(other.velocity, other.velocity, sCBVimpulse, -im2);
          vp2 = vec3.len(parent.velocity);
          vo2 = vec3.len(other.velocity);
          u2 = vp2 * parent.size + vo2 * other.size;
          console.log("Momentum Before: ", u1, " After: ", u2, " Delta: ", (u2-u1));
        }
      }
    });
  }

});
