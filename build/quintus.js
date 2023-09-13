"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // lib/quintus.ts
  var each = (obj, iterator, context) => {
    if (!obj) {
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(iterator, context);
    } else if (obj.length === Number(obj.length) && length in obj) {
      for (let i = 0, l = obj.length; i < l; i += 1) {
        iterator.call(context, obj[i], i, obj);
      }
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        iterator.call(context, value, key, obj);
      });
    }
  };
  var isFunction = (obj) => Object.prototype.toString.call(obj) === "[object Function]";
  var normalizeArg = (arg) => {
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
  var extend = (dest, source) => {
    const result = dest;
    if (!source) {
      return dest;
    }
    Object.entries(source).forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  };
  var Quintus = (opts) => {
    const QuintusStore = {};
    class Q {
      constructor() {
        this._subClassesStore = {};
        this.components = {};
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
        this.options = __spreadValues({
          imagePath: "images/",
          audioPath: "audio/",
          dataPath: "data/",
          audioSupported: ["mp3", "ogg"],
          sound: true,
          frameTimeLimit: 100,
          autoFocus: true
        }, opts);
        this.scheduleFrame = window.requestAnimationFrame;
        this.cancelFrame = window.cancelAnimationFrame;
        this.extend = (name, props) => {
          const subClass = function(...args) {
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
        this.Class = {
          extend: this.extend
        };
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
          on(event, target, callback) {
            let modifiedEvent = event;
            let modifiedCallback = callback;
            let modifiedTarget = target;
            if (Array.isArray(modifiedEvent) || modifiedEvent.indexOf(",") !== -1) {
              modifiedEvent = normalizeArg(event);
              for (let i = 0; i < modifiedEvent.length; i++) {
                this.on(modifiedEvent[i], target, modifiedCallback);
              }
              return;
            }
            if (!modifiedCallback) {
              modifiedCallback = target ? target : modifiedEvent;
              modifiedTarget = null;
            }
            if (typeof modifiedCallback === "string") {
              modifiedCallback = (modifiedTarget || this)[modifiedCallback];
            }
            this.listeners = this.listeners || {};
            this.listeners[modifiedEvent] = this.listeners[modifiedEvent] || [];
            this.listeners[modifiedEvent].push([
              modifiedTarget || this,
              modifiedCallback
            ]);
            if (modifiedTarget) {
              if (!modifiedTarget.binds) {
                modifiedTarget.binds = [];
              }
              modifiedTarget.binds.push([this, modifiedEvent, callback]);
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
          trigger(event, data) {
            if (this.listeners && this.listeners[event]) {
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
          off(event, target, callback) {
            if (!target) {
              if (this.listeners[event]) {
                delete this.listeners[event];
              }
            } else {
              if (typeof callback === "string" && target[callback]) {
                callback = target[callback];
              }
              const l = this.listeners && this.listeners[event];
              if (l) {
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
          }
        });
        Evented.extend("Components", {
          // Components are created when they are added onto a `Q.GameObject` entity. The entity
          // is directly extended with any methods inside of an `extend` property and then the
          // component itself is added onto the entity as well.
          init(entity) {
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
          }
        });
      }
      /**
          Default no-op select method. Replaced with the Quintus.Scene class
      
          @method Q.select
          @for Quintus
          */
      select(selector, scope, options) {
      }
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
      include(mod) {
        each(normalizeArg(mod), (name) => {
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
      gameLoop(callback) {
        this.lastGameLoopFrame = (/* @__PURE__ */ new Date()).getTime();
        this.loop = 1;
        this._loopFrame = 0;
        this.gameLoopCallbackWrapper = () => {
          const now = (/* @__PURE__ */ new Date()).getTime();
          this._loopFrame += 1;
          this.loop = this.scheduleFrame(this.gameLoopCallbackWrapper);
          let dt = now - this.lastGameLoopFrame;
          if (dt > this.options.frameTimeLimit) {
            dt = this.options.frameTimeLimit;
          }
          callback.apply(Q, [dt / 1e3]);
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
          this.lastGameLoopFrame = (/* @__PURE__ */ new Date()).getTime();
          this.loop = this.scheduleFrame(this.gameLoopCallbackWrapper);
        }
      }
    }
    const instance = new Proxy(new Q(), {
      get(target, prop, receiver) {
        if (!(prop in target) && target._subClassesStore[prop]) {
          return target._subClassesStore[prop];
        }
        return Reflect.get(target, prop, receiver);
      }
    });
    return instance;
  };
  window.Quintus = Quintus;
  var quintus_default = Quintus;
})();
