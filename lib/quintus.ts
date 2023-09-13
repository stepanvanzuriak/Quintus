//     Quintus Game Engine
//     (c) 2012 Pascal Rettig, Cykod LLC
//     Quintus may be freely distributed under the MIT license or GPLv2 License.
//     For all details and documentation:
//     http://html5quintus.com
//
/**
Quintus HTML5 Game Engine

The code in `quintus.js` defines the base `Quintus()` method
which create an instance of the engine. The basic engine doesn't
do a whole lot - it provides an architecture for extension, a
game loop, and a method for creating or binding to an exsiting
canvas context. The engine has dependencies on Underscore.js and jQuery,
although the jQuery dependency will be removed in the future.

Most of the game-specific functionality is in the
various other modules:

* `quintus_input.js` - `Input` module, which allows for user input via keyboard and touchscreen
* `quintus_sprites.js` - `Sprites` module, which defines a basic `Q.Sprite` class along with spritesheet support in `Q.SpriteSheet`.
* `quintus_scenes.js` - `Scenes` module. It defines the `Q.Scene` class, which allows creation of reusable scenes, and the `Q.Stage` class, which handles managing a number of sprites at once.
* `quintus_anim.js` - `Anim` module, which adds in support for animations on sprites along with a `viewport` component to follow the player around and a `Q.Repeater` class that can create a repeating, scrolling background.

@module Quintus
*/

type SingleValIterator<T> = (val: T) => void;
type ArrayIterator<T> = (val?: T, index?: number) => void;
type ObjectIterator<T> = (
  val?: T | number,
  index?: string | number,
  list?: Record<string, number | T>,
) => void;

const each = <T>(
  obj: T[] | Record<string, T | number>,
  iterator: SingleValIterator<T> | ArrayIterator<T> | ObjectIterator<T>,
  context?: any,
) => {
  if (!obj) {
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach(iterator as ArrayIterator<T> | SingleValIterator<T>, context);
  } else if (obj.length === Number(obj.length) && length in obj) {
    for (let i = 0, l = obj.length as number; i < l; i += 1) {
      (iterator as ObjectIterator<T>).call(context, obj[i], i, obj);
    }
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      (iterator as ObjectIterator<T>).call(context, value, key, obj);
    });
  }
};

const isString = (obj: unknown) => typeof obj === "string";

const isFunction = (obj: unknown) =>
  Object.prototype.toString.call(obj) === "[object Function]";

const normalizeArg = (arg: string) => {
  let result;

  if (typeof arg === "string") {
    result = arg.replace(/\s+/g, "").split(",");
  } else {
    result = arg;
  }

  if (!Array.isArray(result)) {
    result = [result];
  }

  return result;
};

const extend = (
  dest: Record<string, unknown>,
  source: Record<string, unknown>,
) => {
  const result = dest;

  if (!source) {
    return dest;
  }

  Object.entries(source).forEach(([key, value]) => {
    result[key] = value;
  });

  return result;
};

/**
 Top-level Quintus engine factory wrapper,
 creates new instances of the engine by calling:

      var Q = Quintus({  ...  });

 Any initial setup methods also all return the `Q` object, allowing any initial
 setup calls to be chained together.

      var Q = Quintus()
              .include("Input, Sprites, Scenes")
              .setup('quintus', { maximize: true })
              .controls();

 `Q` is used internally as the object name, and is used in most of the examples,
 but multiple instances of the engine on the same page can have different names.

     var Game1 = Quintus(), Game2 = Quintus();

@class Quintus
*/

type QOptions = {
  imagePath: string;
  audioPath: string;
  dataPath: string;
  audioSupported: string[];
  sound: boolean;
  frameTimeLimit: number;
  autoFocus: boolean;
};

type SubClass = {
  (...args: unknown[]): void;
  extend: (name: string, props: Record<string, any>) => void;
};

const Quintus = (opts?: Partial<QOptions>) => {
  // TODO:
  const QuintusStore: Record<string, (qType: any) => void> = {};

  class Q {
    lastGameLoopFrame?: number;
    loop?: number;
    _loopFrame?: number;
    gameLoopCallbackWrapper?: VoidFunction;
    _subClassesStore: Record<string, SubClass> = {};
    components: Record<string, any> = {};

    constructor() {
      const Evented = this.extend("Evented", {
        /**
        Binds a callback to an event on this object. If you provide a
        `target` object, that object will add this event to it's list of
        binds, allowing it to automatically remove it when it is destroyed.
    
        @method on
        @for Q.Evented
        @param {String} event - name or comma separated list of events
        @param {Object} [target] - optional context for callback, defaults to the Evented
        @param {Function} [callback] - callback (optional - defaults to name of event on context
        */
        on(
          event: string,
          target?: Record<string, unknown>,
          callback?: VoidFunction,
        ) {
          let modifiedEvent: string | string[] = event;
          let modifiedCallback:
            | VoidFunction
            | string
            | Record<string, unknown> = callback!;
          let modifiedTarget: Record<string, unknown> | null = target!;

          if (
            Array.isArray(modifiedEvent) ||
            modifiedEvent.indexOf(",") !== -1
          ) {
            modifiedEvent = normalizeArg(event);
            for (let i = 0; i < modifiedEvent.length; i++) {
              this.on(modifiedEvent[i], target, modifiedCallback);
            }
            return;
          }

          // Handle the case where there is no target provided,
          // swapping the target and callback parameters.
          if (!modifiedCallback) {
            modifiedCallback = target ? target : modifiedEvent;
            modifiedTarget = null;
          }

          // Handle case for callback that is a string, this will
          // pull the callback from the target object or from this
          // object.
          if (typeof modifiedCallback === "string") {
            modifiedCallback = (modifiedTarget || this)[modifiedCallback];
          }

          // To keep `Q.Evented` objects from needing a constructor,
          // the `listeners` object is created on the fly as needed.
          // `listeners` keeps a list of callbacks indexed by event name
          // for quick lookup.
          this.listeners = this.listeners || {};
          this.listeners[modifiedEvent] = this.listeners[modifiedEvent] || [];
          this.listeners[modifiedEvent].push([
            modifiedTarget || this,
            modifiedCallback,
          ]);

          // With a provided target, the target object keeps track of
          // the events it is bound to, which allows for automatic
          // unbinding on destroy.
          if (modifiedTarget) {
            if (!modifiedTarget.binds) {
              modifiedTarget.binds = [];
            }
            (
              modifiedTarget.binds as [
                Record<string, any>,
                typeof modifiedEvent,
                typeof callback,
              ]
            ).push([this, modifiedEvent, callback]);
          }
        },

        /**
         Triggers an event, passing in some optional additional data about
         the event.
    
        @method trigger
        @for Q.Evented
        @param {String} event - name of event
        @param {Object} [data] - optional data to pass to the callback
        */
        trigger(event: string, data: unknown) {
          // First make sure there are any listeners, then check for any listeners
          // on this specific event, if not, early out.
          if (this.listeners && this.listeners[event]) {
            // Call each listener in the context of either the target passed into
            // `on` or the object itself.
            for (let i = 0, len = this.listeners[event].length; i < len; i++) {
              const [eventName, callback] = this.listeners[event][i];
              callback.call(eventName, data);
            }
          }
        },

        /**
          Unbinds an event. Can be called with 1, 2, or 3 parameters, each
           of which unbinds a more specific listener.
    
        @method off
        @for Q.Evented
        @param {String} event - name of event
        @param {Object} [target] - optionally limit to a specific target
        @param {Function} [callback] - optionally limit to one specific callback
        */
        off(event: string, target?: unknown, callback?: VoidFunction) {
          // Without a target, remove all the listeners.
          if (!target) {
            if (this.listeners[event]) {
              delete this.listeners[event];
            }
          } else {
            // If the callback is a string, find a method of the
            // same name on the target.
            if (typeof callback === "string" && target[callback]) {
              callback = target[callback];
            }
            const l = this.listeners && this.listeners[event];
            if (l) {
              // Loop from the end to the beginning, which allows us
              // to remove elements without having to affect the loop.
              for (let i = l.length - 1; i >= 0; i--) {
                if (l[i][0] === target) {
                  if (!callback || callback === l[i][1]) {
                    this.listeners[event].splice(i, 1);
                  }
                }
              }
            }
          }
        },

        /**
         `debind` is called to remove any listeners an object had
         on other objects. The most common case is when an object is
         destroyed you'll want all the event listeners to be removed
         for you.
    
        @method debind
        @for Q.Evented
        */
        debind() {
          if (this.binds) {
            for (let i = 0, len = this.binds.length; i < len; i++) {
              const boundEvent = this.binds[i];
              const source = boundEvent[0];
              const event = boundEvent[1];
              source.off(event, this);
            }
          }
        },
      });

      /**
   Components
   ==============

   Components are self-contained pieces of functionality that can be added onto and removed
   from objects. The allow for a more dynamic functionality tree than using inheritance (i.e.
   by favoring composition over inheritance) and are added and removed on the fly at runtime.
   (yes, I know everything in JS is at runtime, but you know what I mean, geez)

   Combining components with events makes it easy to create reusable pieces of
   functionality that can be decoupled from each other.

   The base class for components. These are usually not derived directly but are instead
   created by calling `Q.register` to register a new component given a set of methods the
   component supports. Components are created automatically when they are added to a
   `Q.GameObject` with the `add` method.

   Many components also define an `added` method, which is called automatically by the
   `init` constructor after a component has been added to an object. This is a good time
   to add event listeners on the object.

   @class Q.Component
   @events Q.Evented
   @for Quintus
  */
      Evented.extend("Components", {
        // Components are created when they are added onto a `Q.GameObject` entity. The entity
        // is directly extended with any methods inside of an `extend` property and then the
        // component itself is added onto the entity as well.
        init(entity: unknown) {
          this.entity = entity;
          if (this.extend) {
            extend(entity, this.extend);
          }
          entity[this.name] = this;

          entity.activeComponents.push(this.componentName);

          if (entity.stage && entity.stage.addToList) {
            entity.stage.addToList(this.componentName, entity);
          }
          if (this.added) {
            this.added();
          }
        },

        /**
   `destroy` is called automatically when a component is removed from an entity. It is
   not called, however, when an entity is destroyed (for performance reasons).

   It's job is to remove any methods that were added with `extend` and then remove and
   debind itself from the entity. It will also call `destroyed` if the component has
   a method by that name.

   @method destroy
   @for Q.Component
  */
        destroy() {
          if (this.extend) {
            const extensions = Object.keys(this.extend);
            for (let i = 0, len = extensions.length; i < len; i++) {
              delete this.entity[extensions[i]];
            }
          }
          delete this.entity[this.name];
          const idx = this.entity.activeComponents.indexOf(this.componentName);
          if (idx !== -1) {
            this.entity.activeComponents.splice(idx, 1);

            if (this.entity.stage && this.entity.stage.addToList) {
              this.entity.stage.addToLists(this.componentName, this.entity);
            }
          }
          this.debind();
          if (this.destroyed) {
            this.destroyed();
          }
        },
      });
    }

    /**
    Options

    Default engine options defining the paths
    where images, audio and other data files should be found
    relative to the base HTML file. As well as a couple of other
    options.

    These can be overriden by passing in options to the `Quintus()`
    factory method, for example:

       // Override the imagePath to default to /assets/images/
       var Q = Quintus({ imagePath: "/assets/images/" });

    If you follow the default convention from the examples, however,
    you should be able to call `Quintus()` without any options.

    Default Options

       {
        imagePath: "images/",
        audioPath: "audio/",
        dataPath:  "data/",
        audioSupported: [ 'mp3','ogg' ],
        sound: true,
        frameTimeLimit: 100
       }

    @property Q.options
    @type Object
    @for Quintus
    */
    options: QOptions = {
      imagePath: "images/",
      audioPath: "audio/",
      dataPath: "data/",
      audioSupported: ["mp3", "ogg"],
      sound: true,
      frameTimeLimit: 100,
      autoFocus: true,
      ...opts,
    };

    scheduleFrame = window.requestAnimationFrame;
    cancelFrame = window.cancelAnimationFrame;

    /**
    Default no-op select method. Replaced with the Quintus.Scene class

    @method Q.select
    @for Quintus
    */
    select(selector: string, scope: any, options: any) {}

    /**
    Default no-op select method. Replaced with the Quintus.Scene class


    Syntax for including other modules into quintus, can accept a comma-separated
    list of strings, an array of strings, or an array of actual objects. Example:

       Q.include("Input, Sprites, Scenes")

    @method Q.include
    @param {String} mod - A comma separated list of module names
    @return {Quintus} returns Quintus instance for chaining.
    @for Quintus
    */
    include(mod: string) {
      each(normalizeArg(mod), (name: string) => {
        const m = QuintusStore[name] || name;

        if (!isFunction(m)) {
          throw new Error(`Invalid Module:${name}`);
        } else {
          m(this);
        }
      });

      return this;
    }

    /**
    Game Loop support

    By default the engine doesn't start a game loop until you actually tell it to.
    Usually the loop is started the first time you call `Q.stageScene`, but if you
    aren't using the `Scenes` module you can explicitly start the game loop yourself
    and control **exactly** what the engine does each cycle. For example:

       var Q = Quintus().setup();

       var ball = new Q.Sprite({ .. });

       Q.gameLoop(function(dt) {
         Q.clear();
         ball.step(dt);
         ball.draw(Q.ctx);
       });

    The callback will be called with fraction of a second that has elapsed since
    the last call to the loop method.

     @method Q.gameLoop
     @param {Function} callback
     @for Quintus
    */
    gameLoop(callback: (val: number) => void) {
      this.lastGameLoopFrame = new Date().getTime();
      this.loop = 1;
      this._loopFrame = 0;

      this.gameLoopCallbackWrapper = () => {
        const now = new Date().getTime();
        this._loopFrame! += 1;
        this.loop = this.scheduleFrame(this.gameLoopCallbackWrapper!);
        let dt = now - this.lastGameLoopFrame!;
        /* Prevent fast-forwarding by limiting the length of a single frame. */
        if (dt > this.options.frameTimeLimit) {
          dt = this.options.frameTimeLimit;
        }
        callback.apply(Q, [dt / 1000]);
        this.lastGameLoopFrame = now;
      };
    }

    /**
      Pause the entire game by canceling the requestAnimationFrame call. If you use setTimeout or
      setInterval in your game, those will, of course, keep on rolling...

      @method Q.pauseGame
      @for Quintus
    */
    pauseGame() {
      if (this.loop) {
        this.cancelFrame(this.loop);
      }

      this.loop = 0;
    }

    /**
     Unpause the game by restarting the requestAnimationFrame-based loop.
     Pause the entire game by canceling the requestAnimationFrame call. If you use setTimeout or
     setInterval in your game, those will, of course, keep on rolling...

      @method Q.unpauseGame
      @for Quintus
    */
    unpauseGame() {
      if (!this.loop) {
        this.lastGameLoopFrame = new Date().getTime();
        this.loop = this.scheduleFrame(this.gameLoopCallbackWrapper!);
      }
    }

    extend = (name: string, props: Record<string, any>) => {
      const subClass = function (...args: unknown[]) {
        if (subClass.prototype.init) {
          subClass.prototype.init(...args);
        }
      };
      Object.entries(props).forEach(([key, value]) => {
        subClass.prototype[key] = value;
      });
      subClass.extend = this.extend;
      this._subClassesStore[name] = subClass;

      return this._subClassesStore[name];
    };

    Class = {
      extend: this.extend,
    };
  }

  const instance = new Proxy<Q>(new Q(), {
    get(target, prop, receiver) {
      if (!(prop in target) && target._subClassesStore[prop as string]) {
        return target._subClassesStore[prop as string];
      }

      return Reflect.get(target, prop, receiver);
    },
  });

  return instance;
};

//@ts-ignore
window.Quintus = Quintus;

export default Quintus;
