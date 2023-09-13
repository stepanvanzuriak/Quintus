import Quintus from "./quintus.ts";

let Q;

describe("Quintus", () => {
  beforeEach(() => {
    Q = Quintus();
  });

  describe("Q", () => {
    describe("Class", () => {
      test("it extends correctly", () => {
        const log = "Flying";
        const nameVal = "Frank";

        Q.Class.extend("Bird", {
          init(name) {
            this.name = name;
          },
          speak() {
            return this.name;
          },
          fly() {
            return log;
          },
        });

        const randomBird = new Q.Bird(nameVal);

        expect(randomBird.fly()).toBe(log);
        expect(randomBird.speak()).toBe(nameVal);
      });
    });

    describe("Evented", () => {
      let source;
      let target;
      let target2;

      beforeEach(() => {
        source = new Q.Evented();
        target = new Q.Evented();
        target2 = new Q.Evented();

        target.firstTrigger = function () {
          this.triggered = true;
        };
        target2.secondTrigger = function () {
          this.triggered = true;
        };
      });

      it("should be able to trigger events", () => {
        let triggered = false;
        source.on("someEvent", () => {
          triggered = true;
        });

        source.trigger("someEvent");
        expect(triggered).toBe(true);
      });

      it("should be able to trigger callbacks on a target object passed as a string", () => {
        source.on("someEvent", target, "firstTrigger");
        source.trigger("someEvent");

        expect(target.triggered).toBe(true);
      });

      it("should be able to trigger callbacks on a target object passed as a method", () => {
        function someTrigger() {
          this.triggered = true; // this should still be target
        }

        source.on("someEvent", target, someTrigger);
        source.trigger("someEvent");

        expect(target.triggered).toBe(true);
      });

      it("should be able to trigger multiple listeners", () => {
        source.on("someEvent", target, "firstTrigger");
        source.on("someEvent", target2, "secondTrigger");

        source.trigger("someEvent");

        expect(target2.triggered && target.triggered).toBe(true);
      });

      it("should be able to turn off a specific trigger", () => {
        source.on("someEvent", target, "firstTrigger");
        source.on("someEvent", target2, "secondTrigger");

        source.off("someEvent", target, "firstTrigger");

        source.trigger("someEvent");

        expect(target2.triggered).toBe(true);
        expect(target.triggered).toBe(undefined);
      });

      it("should be able to turn off all triggers", () => {
        source.on("someEvent", target, "firstTrigger");
        source.on("someEvent", target2, "secondTrigger");

        source.off("someEvent");
        source.trigger("someEvent");

        expect(target2.triggered).toBe(undefined);
        expect(target.triggered).toBe(undefined);
      });

      it("should be able to debind an objecct", () => {
        source.on("someEvent", target, "firstTrigger");
        source.on("someEvent", target2, "secondTrigger");

        target.debind(); // Remove all the things target is listening for

        source.trigger("someEvent");

        expect(target2.triggered).toBe(true);
        expect(target.triggered).toBe(undefined);
      });
    });
  });
});
