import Quintus from '../lib/quintus';
import quintusScenes from '../lib/quintus_scenes';
import quintusSprites from '../lib/quintus_sprites';

quintusScenes(Quintus);
quintusSprites(Quintus);

var Q, canvas, gameObject, stage;

describe('Quintus Scenes a sprite', function () {
  beforeEach(function () {
    canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;

  
    Q = Quintus().include('Scenes, Sprites').setup(canvas);
    Q.clearColor = '#CCC';
    Q.clear();

    gameObject = new Q.Sprite({ h: 20, w: 10, x: 0, y: 0 });
    Q.scene('dummy_scene', function (stage) {
      stage.insert(gameObject);
    });
    Q.stageScene('dummy_scene');
    stage = Q.stage();
  });

  afterEach(function () {
    Q.clearStages();
    cancelAnimationFrame(Q.loop);
  });

  it('can be located in a scene given a point at the center of the object', function () {
    expect(stage.locate(0, 0)).toBeTruthy();
  });

  it('can be located in a scene given a point a on the inner edge', function () {
    expect(stage.locate(4, 8)).toBeTruthy();
  });

  it('can be located in a scene given a point on the edge', function () {
    expect(stage.locate(5, 10)).toBeTruthy();
  });

  it('can not be located in a scene given a point outside the object', function () {
    expect(stage.locate(12, 4)).toBeFalsy();
  });
  it('can not be located in a scene given a point within the object', function () {
    expect(stage.locate(-1, -1)).toBeTruthy();
  });
});
