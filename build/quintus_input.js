"use strict";
(() => {
  // lib/quintus_input.js
  var quintusInput = function(Quintus) {
    Quintus.Input = function(Q) {
      const KEY_NAMES = Q.KEY_NAMES = {
        LEFT: 37,
        RIGHT: 39,
        UP: 38,
        DOWN: 40,
        ZERO: 48,
        ONE: 49,
        TWO: 50,
        THREE: 51,
        FOUR: 52,
        FIVE: 53,
        SIX: 54,
        SEVEN: 55,
        EIGHT: 56,
        NINE: 57,
        A: 65,
        B: 66,
        C: 67,
        D: 68,
        E: 69,
        F: 70,
        G: 71,
        H: 72,
        I: 73,
        J: 74,
        K: 75,
        L: 76,
        M: 77,
        N: 78,
        O: 79,
        P: 80,
        Q: 81,
        R: 82,
        S: 83,
        T: 84,
        U: 85,
        V: 86,
        W: 87,
        X: 88,
        Y: 89,
        Z: 90,
        ENTER: 13,
        ESC: 27,
        BACKSPACE: 8,
        TAB: 9,
        SHIFT: 16,
        CTRL: 17,
        ALT: 18,
        SPACE: 32,
        HOME: 36,
        END: 35,
        PGGUP: 33,
        PGDOWN: 34
      };
      const DEFAULT_KEYS = {
        LEFT: "left",
        RIGHT: "right",
        UP: "up",
        DOWN: "down",
        SPACE: "fire",
        Z: "fire",
        X: "action",
        ENTER: "confirm",
        ESC: "esc",
        P: "P",
        S: "S"
      };
      const DEFAULT_TOUCH_CONTROLS = [
        ["left", "<"],
        ["right", ">"],
        [],
        ["action", "b"],
        ["fire", "a"]
      ];
      const DEFAULT_JOYPAD_INPUTS = ["up", "right", "down", "left"];
      Q.inputs = {};
      Q.joypad = {};
      const hasTouch = !!("ontouchstart" in window);
      Q.canvasToStageX = function(x, stage) {
        x = x / Q.cssWidth * Q.width;
        if (stage.viewport) {
          x /= stage.viewport.scale;
          x += stage.viewport.x;
        }
        return x;
      };
      Q.canvasToStageY = function(y, stage) {
        y = y / Q.cssWidth * Q.width;
        if (stage.viewport) {
          y /= stage.viewport.scale;
          y += stage.viewport.y;
        }
        return y;
      };
      Q.InputSystem = Q.Evented.extend({
        keys: {},
        keypad: {},
        keyboardEnabled: false,
        touchEnabled: false,
        joypadEnabled: false,
        /**
         * Bind a key name or keycode to an action name (used by `keyboardControls`)
         *
         * @method bindKey
         * @for Q.InputSystem
         * @param {String or Integer} key - name or integer keycode for to bind
         * @param {String} name - name of action to bind to
         */
        bindKey(key, name) {
          Q.input.keys[KEY_NAMES[key] || key] = name;
        },
        /**
         * Enable keyboard controls by binding to events
         *
         * @for Q.InputSystem
         * @method enableKeyboard
         */
        enableKeyboard() {
          if (this.keyboardEnabled) {
            return false;
          }
          Q.el.tabIndex = 0;
          Q.el.style.outline = 0;
          Q.el.addEventListener(
            "keydown",
            (e) => {
              if (Q.input.keys[e.keyCode]) {
                const actionName = Q.input.keys[e.keyCode];
                Q.inputs[actionName] = true;
                Q.input.trigger(actionName);
                Q.input.trigger("keydown", e.keyCode);
              }
              if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
              }
            },
            false
          );
          Q.el.addEventListener(
            "keyup",
            (e) => {
              if (Q.input.keys[e.keyCode]) {
                const actionName = Q.input.keys[e.keyCode];
                Q.inputs[actionName] = false;
                Q.input.trigger(`${actionName}Up`);
                Q.input.trigger("keyup", e.keyCode);
              }
              e.preventDefault();
            },
            false
          );
          if (Q.options.autoFocus) {
            Q.el.focus();
          }
          this.keyboardEnabled = true;
        },
        /**
         * Convenience method to activate keyboard controls (call `bindKey` and `enableKeyboard` internally)
         *
         * @method keyboardControls
         * @for Q.InputSystem
         * @param {Object} [keys] - hash of key names or codes to actions
         */
        keyboardControls(keys) {
          keys = keys || DEFAULT_KEYS;
          Q._each(
            keys,
            function(name, key) {
              this.bindKey(key, name);
            },
            Q.input
          );
          this.enableKeyboard();
        },
        _containerOffset() {
          Q.input.offsetX = 0;
          Q.input.offsetY = 0;
          let { el } = Q;
          do {
            Q.input.offsetX += el.offsetLeft;
            Q.input.offsetY += el.offsetTop;
          } while (el = el.offsetParent);
        },
        touchLocation(touch) {
          const { el } = Q;
          let posX = touch.offsetX;
          let posY = touch.offsetY;
          let touchX;
          let touchY;
          if (Q._isUndefined(posX) || Q._isUndefined(posY)) {
            posX = touch.layerX;
            posY = touch.layerY;
          }
          if (Q._isUndefined(posX) || Q._isUndefined(posY)) {
            if (Q.input.offsetX === void 0) {
              Q.input._containerOffset();
            }
            posX = touch.pageX - Q.input.offsetX;
            posY = touch.pageY - Q.input.offsetY;
          }
          touchX = Q.width * posX / Q.cssWidth;
          touchY = Q.height * posY / Q.cssHeight;
          return { x: touchX, y: touchY };
        },
        /**
         * Activate touch button controls - pass in an options hash to override
         *
         * Default Options:
         *
         *     {
         *        left: 0,
         *        gutter:10,
         *        controls: DEFAULT_TOUCH_CONTROLS,
         *        width: Q.width,
         *        bottom: Q.height
         *      }
         *
         * Default controls are left and right buttons, a space, and 'a' and 'b' buttons, as defined as an Array of Arrays below:
         *
         *      [ ['left','<' ],
         *        ['right','>' ],
         *        [],  // use an empty array as a spacer
         *        ['action','b'],
         *        ['fire', 'a' ]]
         *
         * @method touchControls
         * @for Q.InputSystem
         * @param {Object} [opts] - Options hash
         */
        touchControls(opts) {
          if (this.touchEnabled) {
            return false;
          }
          if (!hasTouch) {
            return false;
          }
          Q.input.keypad = opts = Q._extend(
            {
              left: 0,
              gutter: 10,
              controls: DEFAULT_TOUCH_CONTROLS,
              width: Q.width,
              bottom: Q.height,
              fullHeight: false
            },
            opts
          );
          opts.unit = opts.width / opts.controls.length;
          opts.size = opts.unit - opts.gutter * 2;
          function getKey(touch) {
            const pos = Q.input.touchLocation(touch);
            const minY = opts.bottom - opts.unit;
            for (let i = 0, len = opts.controls.length; i < len; i++) {
              const minX = i * opts.unit + opts.gutter;
              if (pos.x >= minX && pos.x <= minX + opts.size && (opts.fullHeight || pos.y >= minY + opts.gutter && pos.y <= minY + opts.unit - opts.gutter)) {
                return opts.controls[i][0];
              }
            }
          }
          function touchDispatch(event) {
            const wasOn = {};
            let i;
            let len;
            let tch;
            let key;
            let actionName;
            for (i = 0, len = opts.controls.length; i < len; i++) {
              actionName = opts.controls[i][0];
              if (Q.inputs[actionName]) {
                wasOn[actionName] = true;
              }
              Q.inputs[actionName] = false;
            }
            const touches = event.touches ? event.touches : [event];
            for (i = 0, len = touches.length; i < len; i++) {
              tch = touches[i];
              key = getKey(tch);
              if (key) {
                Q.inputs[key] = true;
                if (!wasOn[key]) {
                  Q.input.trigger(key);
                } else {
                  delete wasOn[key];
                }
              }
            }
            for (actionName in wasOn) {
              Q.input.trigger(`${actionName}Up`);
            }
            return null;
          }
          this.touchDispatchHandler = function(e) {
            touchDispatch(e);
            e.preventDefault();
          };
          Q._each(
            ["touchstart", "touchend", "touchmove", "touchcancel"],
            function(evt) {
              Q.el.addEventListener(evt, this.touchDispatchHandler);
            },
            this
          );
          this.touchEnabled = true;
        },
        /**
         * Turn off touch (button and joypad) controls and remove event listeners
         *
         * @method disableTouchControls
         * @for Q.InputSystem
         */
        disableTouchControls() {
          Q._each(
            ["touchstart", "touchend", "touchmove", "touchcancel"],
            function(evt) {
              Q.el.removeEventListener(evt, this.touchDispatchHandler);
            },
            this
          );
          Q.el.removeEventListener("touchstart", this.joypadStart);
          Q.el.removeEventListener("touchmove", this.joypadMove);
          Q.el.removeEventListener("touchend", this.joypadEnd);
          Q.el.removeEventListener("touchcancel", this.joypadEnd);
          this.touchEnabled = false;
          for (const input in Q.inputs) {
            Q.inputs[input] = false;
          }
        },
        /**
         * Activate joypad controls (i.e. 4-way touch controls)
         *
         * Lots of options, defaults are:
         *
         *     {
         *      size: 50,
         *      trigger: 20,
         *      center: 25,
         *      color: "#CCC",
         *      background: "#000",
         *      alpha: 0.5,
         *      zone: Q.width / 2,
         *      inputs: DEFAULT_JOYPAD_INPUTS
         *    }
         *
         *  Default joypad controls is an array that defines the inputs to bind to:
         *
         *       // Clockwise from midnight (a la CSS)
         *       var DEFAULT_JOYPAD_INPUTS =  [ 'up','right','down','left'];
         *
         * @method joypadControls
         * @for Q.InputSystem
         * @param {Object} [opts] -  joypad options
         */
        joypadControls(opts) {
          if (this.joypadEnabled) {
            return false;
          }
          if (!hasTouch) {
            return false;
          }
          const joypad = Q.joypad = Q._defaults(opts || {}, {
            size: 50,
            trigger: 20,
            center: 25,
            color: "#CCC",
            background: "#000",
            alpha: 0.5,
            zone: Q.width / 2,
            joypadTouch: null,
            inputs: DEFAULT_JOYPAD_INPUTS,
            triggers: []
          });
          this.joypadStart = function(evt) {
            if (joypad.joypadTouch === null) {
              const touch = evt.changedTouches[0];
              const loc = Q.input.touchLocation(touch);
              if (loc.x < joypad.zone) {
                joypad.joypadTouch = touch.identifier;
                joypad.centerX = loc.x;
                joypad.centerY = loc.y;
                joypad.x = null;
                joypad.y = null;
              }
            }
          };
          this.joypadMove = function(e) {
            if (joypad.joypadTouch !== null) {
              const evt = e;
              for (let i = 0, len = evt.changedTouches.length; i < len; i++) {
                const touch = evt.changedTouches[i];
                if (touch.identifier === joypad.joypadTouch) {
                  const loc = Q.input.touchLocation(touch);
                  let dx = loc.x - joypad.centerX;
                  let dy = loc.y - joypad.centerY;
                  let dist = Math.sqrt(dx * dx + dy * dy);
                  const overage = Math.max(1, dist / joypad.size);
                  const ang = Math.atan2(dx, dy);
                  if (overage > 1) {
                    dx /= overage;
                    dy /= overage;
                    dist /= overage;
                  }
                  const triggers = [
                    dy < -joypad.trigger,
                    dx > joypad.trigger,
                    dy > joypad.trigger,
                    dx < -joypad.trigger
                  ];
                  for (let k = 0; k < triggers.length; k++) {
                    const actionName = joypad.inputs[k];
                    if (triggers[k]) {
                      Q.inputs[actionName] = true;
                      if (!joypad.triggers[k]) {
                        Q.input.trigger(actionName);
                      }
                    } else {
                      Q.inputs[actionName] = false;
                      if (joypad.triggers[k]) {
                        Q.input.trigger(`${actionName}Up`);
                      }
                    }
                  }
                  Q._extend(joypad, {
                    dx,
                    dy,
                    x: joypad.centerX + dx,
                    y: joypad.centerY + dy,
                    dist,
                    ang,
                    triggers
                  });
                  break;
                }
              }
            }
            e.preventDefault();
          };
          this.joypadEnd = function(e) {
            const evt = e;
            if (joypad.joypadTouch !== null) {
              for (let i = 0, len = evt.changedTouches.length; i < len; i++) {
                const touch = evt.changedTouches[i];
                if (touch.identifier === joypad.joypadTouch) {
                  for (let k = 0; k < joypad.triggers.length; k++) {
                    const actionName = joypad.inputs[k];
                    Q.inputs[actionName] = false;
                    if (joypad.triggers[k]) {
                      Q.input.trigger(`${actionName}Up`);
                    }
                  }
                  joypad.joypadTouch = null;
                  break;
                }
              }
            }
            e.preventDefault();
          };
          Q.el.addEventListener("touchstart", this.joypadStart);
          Q.el.addEventListener("touchmove", this.joypadMove);
          Q.el.addEventListener("touchend", this.joypadEnd);
          Q.el.addEventListener("touchcancel", this.joypadEnd);
          this.joypadEnabled = true;
        },
        /**
         * Activate mouse controls - mouse controls don't trigger events, but just set `Q.inputs['mouseX']` & `Q.inputs['mouseY']` on each frame.
         *
         * Default options:
         *
         *     {
         *       stageNum: 0,
         *       mouseX: "mouseX",
         *       mouseY: "mouseY",
         *       cursor: "off"
         *     }
         *
         * @method mouseControls
         * @for Q.InputSystem
         * @param {Object} [options] - override default options
         */
        mouseControls(options) {
          options = options || {};
          const stageNum = options.stageNum || 0;
          const mouseInputX = options.mouseX || "mouseX";
          const mouseInputY = options.mouseY || "mouseY";
          const cursor = options.cursor || "off";
          const mouseMoveObj = {};
          if (cursor !== "on") {
            if (cursor === "off") {
              Q.el.style.cursor = "none";
            } else {
              Q.el.style.cursor = cursor;
            }
          }
          Q.inputs[mouseInputX] = 0;
          Q.inputs[mouseInputY] = 0;
          Q._mouseMove = function(e) {
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            const { el } = Q;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            let posX = touch.clientX - rect.left - parseInt(style.paddingLeft, 10);
            let posY = touch.clientY - rect.top - parseInt(style.paddingTop, 10);
            const stage = Q.stage(stageNum);
            if (Q._isUndefined(posX) || Q._isUndefined(posY)) {
              posX = touch.offsetX;
              posY = touch.offsetY;
            }
            if (Q._isUndefined(posX) || Q._isUndefined(posY)) {
              posX = touch.layerX;
              posY = touch.layerY;
            }
            if (Q._isUndefined(posX) || Q._isUndefined(posY)) {
              if (Q.input.offsetX === void 0) {
                Q.input._containerOffset();
              }
              posX = touch.pageX - Q.input.offsetX;
              posY = touch.pageY - Q.input.offsetY;
            }
            if (stage) {
              mouseMoveObj.x = Q.canvasToStageX(posX, stage);
              mouseMoveObj.y = Q.canvasToStageY(posY, stage);
              Q.inputs[mouseInputX] = mouseMoveObj.x;
              Q.inputs[mouseInputY] = mouseMoveObj.y;
              Q.input.trigger("mouseMove", mouseMoveObj);
            }
          };
          Q._mouseWheel = function(e) {
            e = window.event || e;
            const delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));
            Q.input.trigger("mouseWheel", delta);
          };
          Q.el.addEventListener("mousemove", Q._mouseMove, true);
          Q.el.addEventListener("touchstart", Q._mouseMove, true);
          Q.el.addEventListener("touchmove", Q._mouseMove, true);
          Q.el.addEventListener("mousewheel", Q._mouseWheel, true);
          Q.el.addEventListener("DOMMouseScroll", Q._mouseWheel, true);
        },
        /**
         * Turn off mouse controls
         *
         * @method disableMouseControls
         * @for Q.InputSystem
         */
        disableMouseControls() {
          if (Q._mouseMove) {
            Q.el.removeEventListener("mousemove", Q._mouseMove, true);
            Q.el.removeEventListener("mousewheel", Q._mouseWheel, true);
            Q.el.removeEventListener("DOMMouseScroll", Q._mouseWheel, true);
            Q.el.style.cursor = "inherit";
            Q._mouseMove = null;
          }
        },
        /**
         * Draw the touch buttons on the screen
         *
         * overload this to change how buttons are drawn
         *
         * @method drawButtons
         * @for Q.InputSystem
         */
        drawButtons() {
          const { keypad } = Q.input;
          const { ctx } = Q;
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          for (let i = 0; i < keypad.controls.length; i++) {
            const control = keypad.controls[i];
            if (control[0]) {
              ctx.font = `bold ${keypad.size / 2}px arial`;
              const x = keypad.left + i * keypad.unit + keypad.gutter;
              const y = keypad.bottom - keypad.unit;
              const key = Q.inputs[control[0]];
              ctx.fillStyle = keypad.color || "#FFFFFF";
              ctx.globalAlpha = key ? 1 : 0.5;
              ctx.fillRect(x, y, keypad.size, keypad.size);
              ctx.fillStyle = keypad.text || "#000000";
              ctx.fillText(control[1], x + keypad.size / 2, y + keypad.size / 2);
            }
          }
          ctx.restore();
        },
        drawCircle(x, y, color, size) {
          const { ctx } = Q;
          const { joypad } = Q;
          ctx.save();
          ctx.beginPath();
          ctx.globalAlpha = joypad.alpha;
          ctx.fillStyle = color;
          ctx.arc(x, y, size, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        },
        /**
         * Draw the joypad on the screen
         *
         * overload this to change how joypad is drawn
         *
         * @method drawJoypad
         * @for Q.InputSystem
         */
        drawJoypad() {
          const { joypad } = Q;
          if (joypad.joypadTouch !== null) {
            Q.input.drawCircle(
              joypad.centerX,
              joypad.centerY,
              joypad.background,
              joypad.size
            );
            if (joypad.x !== null) {
              Q.input.drawCircle(joypad.x, joypad.y, joypad.color, joypad.center);
            }
          }
        },
        /**
         * Called each frame by the stage game loop to render any onscreen UI
         *
         * calls `drawJoypad` and `drawButtons` if enabled
         *
         * @method drawCanvas
         * @for Q.InputSystem
         */
        drawCanvas() {
          if (this.touchEnabled) {
            this.drawButtons();
          }
          if (this.joypadEnabled) {
            this.drawJoypad();
          }
        }
      });
      Q.input = new Q.InputSystem();
      Q.controls = function(joypad) {
        Q.input.keyboardControls();
        if (joypad) {
          Q.input.touchControls({
            controls: [[], [], [], ["action", "b"], ["fire", "a"]]
          });
          Q.input.joypadControls();
        } else {
          Q.input.touchControls();
        }
        return Q;
      };
      Q.component("platformerControls", {
        defaults: {
          speed: 200,
          jumpSpeed: -300,
          collisions: []
        },
        added() {
          const { p } = this.entity;
          Q._defaults(p, this.defaults);
          this.entity.on("step", this, "step");
          this.entity.on("bump.bottom", this, "landed");
          p.landed = 0;
          p.direction = "right";
        },
        landed(col) {
          const { p } = this.entity;
          p.landed = 1 / 5;
        },
        step(dt) {
          const { p } = this.entity;
          if (p.ignoreControls === void 0 || !p.ignoreControls) {
            let collision = null;
            if (p.collisions !== void 0 && p.collisions.length > 0 && (Q.inputs.left || Q.inputs.right || p.landed > 0)) {
              if (p.collisions.length === 1) {
                collision = p.collisions[0];
              } else {
                collision = null;
                for (let i = 0; i < p.collisions.length; i++) {
                  if (p.collisions[i].normalY < 0) {
                    collision = p.collisions[i];
                  }
                }
              }
              if (collision !== null && collision.normalY > -0.3 && collision.normalY < 0.3) {
                collision = null;
              }
            }
            if (Q.inputs.left) {
              p.direction = "left";
              if (collision && p.landed > 0) {
                p.vx = p.speed * collision.normalY;
                p.vy = -p.speed * collision.normalX;
              } else {
                p.vx = -p.speed;
              }
            } else if (Q.inputs.right) {
              p.direction = "right";
              if (collision && p.landed > 0) {
                p.vx = -p.speed * collision.normalY;
                p.vy = p.speed * collision.normalX;
              } else {
                p.vx = p.speed;
              }
            } else {
              p.vx = 0;
              if (collision && p.landed > 0) {
                p.vy = 0;
              }
            }
            if (p.landed > 0 && (Q.inputs.up || Q.inputs.action) && !p.jumping) {
              p.vy = p.jumpSpeed;
              p.landed = -dt;
              p.jumping = true;
            } else if (Q.inputs.up || Q.inputs.action) {
              this.entity.trigger("jump", this.entity);
              p.jumping = true;
            }
            if (p.jumping && !(Q.inputs.up || Q.inputs.action)) {
              p.jumping = false;
              this.entity.trigger("jumped", this.entity);
              if (p.vy < p.jumpSpeed / 3) {
                p.vy = p.jumpSpeed / 3;
              }
            }
          }
          p.landed -= dt;
        }
      });
      Q.component("stepControls", {
        added() {
          const { p } = this.entity;
          if (!p.stepDistance) {
            p.stepDistance = 32;
          }
          if (!p.stepDelay) {
            p.stepDelay = 0.2;
          }
          p.stepWait = 0;
          this.entity.on("step", this, "step");
          this.entity.on("hit", this, "collision");
        },
        collision(col) {
          const { p } = this.entity;
          if (p.stepping) {
            p.stepping = false;
            p.x = p.origX;
            p.y = p.origY;
          }
        },
        step(dt) {
          const { p } = this.entity;
          const moved = false;
          p.stepWait -= dt;
          if (p.stepping) {
            p.x += p.diffX * dt / p.stepDelay;
            p.y += p.diffY * dt / p.stepDelay;
          }
          if (p.stepWait > 0) {
            return;
          }
          if (p.stepping) {
            p.x = p.destX;
            p.y = p.destY;
          }
          p.stepping = false;
          p.diffX = 0;
          p.diffY = 0;
          if (Q.inputs.left) {
            p.diffX = -p.stepDistance;
          } else if (Q.inputs.right) {
            p.diffX = p.stepDistance;
          }
          if (Q.inputs.up) {
            p.diffY = -p.stepDistance;
          } else if (Q.inputs.down) {
            p.diffY = p.stepDistance;
          }
          if (p.diffY || p.diffX) {
            p.stepping = true;
            p.origX = p.x;
            p.origY = p.y;
            p.destX = p.x + p.diffX;
            p.destY = p.y + p.diffY;
            p.stepWait = p.stepDelay;
          }
        }
      });
    };
  };
  if (window.Quintus) {
    quintusInput(window.Quintus);
  }
  var quintus_input_default = quintusInput;
})();
