import Quintus from "../lib/quintus";

describe("Quintus Core Engine", () => {
  let Q;

  beforeEach(() => {
    Q = Quintus();
  });

  // Don't forget the loop needs to be killed if it exists
  afterEach(() => {
    cancelAnimationFrame(Q.loop);
  });

  describe("Quintus Base", () => {
    describe("Utility Methods", () => {
      describe("Argument Normalizations", () => {
        it("should turn a string into an array", () => {
          expect(Q._normalizeArg(" Tester")).toEqual(["Tester"]);
        });

        it("should take a comma separate list of strings and turn them into an array", () => {
          expect(
            Q._normalizeArg("  Something,   Else,   Andanother   "),
          ).toEqual(["Something", "Else", "Andanother"]);
        });
      });

      describe("Extend", () => {
        let obj1;
        let obj2;
        let obj3;

        beforeEach(() => {
          obj1 = { a: "Test1", b: "Test2" };
          obj2 = { c: "Test3", d: "Test4" };
          obj3 = { b: "TestNew", c: "TestNew" };
        });

        it("should extend one object with the properties of another", () => {
          const obj4 = Q._extend(obj1, obj2);

          expect(obj4).toEqual(obj1);

          expect(obj4.c).toEqual("Test3");
          expect(obj4.d).toEqual("Test4");
        });

        it("shouldn't affect the second object", () => {
          Q._extend(obj1, obj2);
          expect(obj2.a).toBeUndefined();
          expect(obj2.b).toBeUndefined();
        });

        it("should overwrite properties in the first object", () => {
          expect(obj1.b).toEqual("Test2");

          Q._extend(obj1, obj3);

          expect(obj1.b).toEqual("TestNew");
          expect(obj1.c).toEqual("TestNew");
        });
      });

      describe("Defaults", () => {
        let obj1;
        let obj2;

        beforeEach(() => {
          obj1 = { a: "Test1", b: "Test2" };
          obj2 = { c: "Test3", d: "Test4" };
          obj3 = { b: "TestNew", c: "TestNew" };
        });

        it("Should add on properties to the first object", () => {
          const obj4 = Q._defaults(obj1, obj2);

          expect(obj4).toEqual(obj1);

          expect(obj4.c).toEqual("Test3");
          expect(obj4.d).toEqual("Test4");
        });

        it("Shouldn't overwrite existing properties", () => {
          expect(obj1.b).toEqual("Test2");

          Q._defaults(obj1, obj3);

          expect(obj1.b).toEqual("Test2");
          expect(obj1.c).toEqual("TestNew");
        });
      });

      describe("isString", () => {
        it("Should identify strings", () => {
          expect(Q._isString("My String")).toBe(true);
        });

        it("Should return false for objects", () => {
          expect(Q._isString({})).toBe(false);
        });

        it("Should return false for numbers", () => {
          expect(Q._isString(1231)).toBe(false);
        });

        it("Should (sadly) return false for non-primitive strings", () => {
          expect(Q._isString(String("Tester"))).toBe(true);
        });
      });

      describe("isFunction", () => {
        it("Should identify function", () => {
          expect(Q._isFunction(() => {})).toBe(true);
        });

        it("Should return false for objects", () => {
          expect(Q._isFunction({})).toBe(false);
        });

        it("Should return false for numbers", () => {
          expect(Q._isFunction(1231)).toBe(false);
        });

        it("Should return false for strings", () => {
          expect(Q._isFunction("Tester")).toBe(false);
        });
      });

      describe("isObject", () => {
        it("Should identify objects", () => {
          expect(Q._isObject({})).toBe(true);
        });

        it("Should return false for functions", () => {
          expect(Q._isObject(() => {})).toBe(false);
        });

        it("Should return false for arrays", () => {
          expect(Q._isObject([])).toBe(false);
        });

        it("Should return false for numbers", () => {
          expect(Q._isObject(1231)).toBe(false);
        });

        it("Should return false for strings", () => {
          expect(Q._isObject("Tester")).toBe(false);
        });
      });

      describe("isArray", () => {
        it("Should identify arrays", () => {
          expect(Q._isArray([])).toBe(true);
        });

        it("Should return false for functions", () => {
          expect(Q._isArray(() => {})).toBe(false);
        });

        it("Should return false for numbers", () => {
          expect(Q._isArray(1231)).toBe(false);
        });

        it("Should return false for strings", () => {
          expect(Q._isArray("Tester")).toBe(false);
        });

        it("Should return false for objects", () => {
          expect(Q._isArray({})).toBe(false);
        });
      });

      describe("each", () => {
        let a;
        let b;

        beforeEach(() => {
          a = { a: 1, b: 2, c: 3 };
          b = [1, 2, 3];
        });

        it("should loop over objects", () => {
          const output = [];
          Q._each(a, (val, key) => {
            output.push(key);
            output.push(val);
          });
          expect(output).toEqual(["a", 1, "b", 2, "c", 3]);
        });

        it("should loop over arrays", () => {
          const output = [];
          Q._each(b, (val, idx) => {
            output.push(idx);
            output.push(val);
          });
          expect(output).toEqual([0, 1, 1, 2, 2, 3]);
        });
      });

      describe("keys", () => {
        it("should be able to return a list of keys", () => {
          const a = { a: 1, b: 2, c: 3 };
          expect(Q._keys(a)).toEqual(["a", "b", "c"]);
        });
      });

      describe("uniqueId", () => {
        it("Should generate a unique id", () => {
          const first = Q._uniqueId();
          expect(Q._uniqueId()).not.toEqual(first);
          expect(Q._uniqueId()).not.toEqual(first);
          expect(Q._uniqueId()).not.toEqual(Q._uniqueId());
        });
      });
    });

    describe("Engine Options", () => {
      it("should define some base options", () => {
        expect(Q.options.imagePath).toBe("images/");
        expect(Q.options.audioPath).toBe("audio/");
        expect(Q.options.dataPath).toBe("data/");
      });

      it("should allow option overrides", () => {
        Q = Quintus({
          imagePath: "assets/images/",
          audioPath: "assets/audio/",
        });

        expect(Q.options.imagePath).toBe("assets/images/");
        expect(Q.options.audioPath).toBe("assets/audio/");
        // make sure other options aren't affected
        expect(Q.options.dataPath).toBe("data/");
      });
    });

    describe("Engine extension", () => {
      beforeEach(() => {
        Quintus.Tester = function (Q) {
          Q.Testerama = function () {};
        };

        Quintus.Tester2 = function (Q) {
          Q.Testerama2 = function () {};
        };
      });

      it("should allow passing in a string of modules", () => {
        expect(Q.Testerama).not.toBeDefined();
        expect(Q.Testerama2).not.toBeDefined();
        Q.include("Tester, Tester2");
        expect(Q.Testerama).toBeDefined();
        expect(Q.Testerama2).toBeDefined();
      });

      it("should allow passing in the modules themselves", () => {
        Q.include([Quintus.Tester, Quintus.Tester2]);
        expect(Q.Testerama).toBeDefined();
        expect(Q.Testerama2).toBeDefined();
      });
    });
  });

  describe("Class", () => {
    let TestClass;

    beforeEach(() => {
      TestClass = Q.Class.extend("TestClass", { a: 200 });
    });

    it("should create a new Class on Q with extend", () => {
      expect(Q.TestClass).toBe(TestClass);
    });

    it("should create properties on new classes ", () => {
      const tester = new TestClass();
      expect(tester.a).toBe(200);
    });

    it("should set the classname", () => {
      expect(TestClass.className).toBe("TestClass");
      expect(new TestClass().className).toBe("TestClass");
    });

    it("should allow further extension", () => {
      const NewClass = TestClass.extend("NewClass");

      const newInstance = new NewClass();

      expect(Q.NewClass).toBe(NewClass);
      expect(NewClass.className).toBe("NewClass");
      expect(newInstance instanceof Q.NewClass).toBe(true);
      expect(newInstance instanceof Q.TestClass).toBe(true);
      expect(newInstance.a).toBe(200);
    });
  });



  describe("Component and GameObject", () => {
    let gameObject;

    beforeEach(() => {
      gameObject = new Q.GameObject();
    });

    it("should be able to register a compnent", () => {
      const ComponentClass = Q.component("tester", {});
      expect(Q.component("tester")).toBe(ComponentClass);
    });

    it("should be able to add a component", () => {
      const ComponentClass = Q.component("tester", {});

      expect(gameObject.has("tester")).toBeFalsy();
      gameObject.add("tester");
      expect(gameObject.has("tester")).toBeTruthy();
    });

    it("should call the added method when added", () => {
      let wasAdded = false;
      const ComponentClass = Q.component("tester", {
        added() {
          wasAdded = true;
        },
      });

      gameObject.add("tester");
      expect(wasAdded).toBe(true);
    });

    it("should add a property with the name of the component", () => {
      const ComponentClass = Q.component("tester", {});

      gameObject.add("tester");
      expect(gameObject.tester instanceof ComponentClass).toBe(true);
    });

    it("should added component properties and extend methods onto the object", () => {
      const ComponentClass = Q.component("tester", {
        methodOne() {},
        methodTwo() {},
        extend: {
          entityMethod() {},
        },
      });

      expect(gameObject.tester).toBeUndefined();
      gameObject.add("tester");

      expect(gameObject.tester.methodOne).toBeDefined();
      expect(gameObject.tester.methodTwo).toBeDefined();

      expect(gameObject.entityMethod).toBeDefined();
    });

    it("should allow binding of events to the the object", () => {
      let wasTriggered = false;
      const ComponentClass = Q.component("tester", {
        added() {
          this.entity.on("someEvent", this, "mrListener");
        },
        mrListener() {
          wasTriggered = true;
        },
      });

      gameObject.add("tester");
      expect(wasTriggered).toBe(false);

      gameObject.trigger("someEvent");
      expect(wasTriggered).toBe(true);
    });

    it("should allow the removal of components and debinding", () => {
      let wasTriggered = false;
      const ComponentClass = Q.component("tester", {
        added() {
          this.entity.on("someEvent", this, "mrListener");
        },
        mrListener() {
          wasTriggered = true;
        },
      });

      gameObject.add("tester");
      expect(gameObject.has("tester")).toBeTruthy();
      expect(gameObject.tester).toBeDefined();

      gameObject.del("tester");
      expect(gameObject.tester).toBeUndefined();
      expect(gameObject.has("tester")).toBeFalsy();

      gameObject.trigger("someEvent");
      expect(wasTriggered).toBeFalsy();
    });

    it("should allow adding multiple components", () => {
      const ComponentClass1 = Q.component("tester1", {});
      const ComponentClass2 = Q.component("tester2", {});

      gameObject.add("tester1, tester2 ");

      expect(gameObject.has("tester1")).toBeTruthy();
      expect(gameObject.has("tester2")).toBeTruthy();
    });

    it("should allow removing multiple components", () => {
      const ComponentClass1 = Q.component("tester1", {});
      const ComponentClass2 = Q.component("tester2", {});

      gameObject.add("tester1, tester2 ");
      gameObject.del("tester1, tester2 ");

      expect(gameObject.has("tester1")).toBeFalsy();
      expect(gameObject.has("tester2")).toBeFalsy();
    });
  });

  describe("Matrix Functionality", () => {
    let matrix;

    beforeEach(() => {
      matrix = new Q.Matrix2D();
    });

    it("should be able to use and release matrixes", () => {
      matrix.rotateDeg(45);
      const m2 = Q.matrix2d().translate(20, 20).scale(15);
      expect(Q.matrices2d.length).toBe(0);

      m2.release();
      expect(Q.matrices2d.length).toBe(1);

      matrix.release();
      expect(Q.matrices2d.length).toBe(2);

      const m3 = Q.matrix2d();
      expect(Q.matrices2d.length).toBe(1);
      expect(m3.m).toEqual([1, 0, 0, 0, 1, 0]);

      // Make sure we can get one even if there isn't one
      const m4 = Q.matrix2d();
      expect(Q.matrices2d.length).toBe(0);
      expect(m4.m).toEqual([1, 0, 0, 0, 1, 0]);

      // Make sure we can get one even if there isn't one
      const m5 = Q.matrix2d();
      expect(Q.matrices2d.length).toBe(0);
    });

    it("not modify a point with the default matrix", () => {
      expect(matrix.transform(10, 40)).toEqual([10, 40]);
    });

    it("should be able to translate a point", () => {
      expect(matrix.translate(20, 20).transform(10, 40)).toEqual([
        20 + 10,
        20 + 40,
      ]);
    });

    it("should be able to rotate a point by 90 degrees", () => {
      const result = matrix.rotateDeg(90).transform(10, 40);

      expect(result[0]).toBeCloseTo(-40, 0.001);
      expect(result[1]).toBeCloseTo(10, 0.001);
    });

    it("should be able to rotate a point by 45 degrees", () => {
      const result = matrix.rotateDeg(45).transform(100, 0);

      // 'Ol pythagoras
      expect(result[0]).toBeCloseTo(Math.sqrt((100 * 100) / 2), 0.001);
      expect(result[1]).toBeCloseTo(Math.sqrt((100 * 100) / 2), 0.001);
    });

    it("should be able to scale up a point", () => {
      const result = matrix.scale(2, 1.75).transform(10, 10);

      expect(result[0]).toBeCloseTo(10 * 2, 0.001);
      expect(result[1]).toBeCloseTo(10 * 1.75, 0.001);
    });

    it("should be able to multiply two matrices", () => {
      const m2 = new Q.Matrix2D();
      m2.translate(10, 20).rotateDeg(45);

      matrix.scale(5).translate(30, 40).multiply(m2);

      const result = matrix.transform(50, 0);
      // rotated 45 deg:  [ Math.sqrt(50*50/2), Math.sqrt(50*50/2) ]
      // translated 10,20: [ 10 + Math.sqrt(50*50/2), 20 + Math.sqrt(50*50/2) ]
      // translated 30,40: [ 30 + 10 + Math.sqrt(50*50/2), 40 + 20 + Math.sqrt(50*50/2) ]
      // scaled: [ 5 * (30 + 10 + Math.sqrt(50*50/2)), 5 * (40 + 20 + Math.sqrt(50*50/2)) ]

      expect(result[0]).toBeCloseTo(
        5 * (30 + 10 + Math.sqrt((50 * 50) / 2)),
        0.0001,
      );
      expect(result[1]).toBeCloseTo(
        5 * (40 + 20 + Math.sqrt((50 * 50) / 2)),
        0.0001,
      );
    });
  });
});
