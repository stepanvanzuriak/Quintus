(() => {
  // lib/quintus.js
  var Quintus = function(opts) {
    const Q = function(selector, scope, options) {
      return Q.select(selector, scope, options);
    };
    Q.select = function() {
    };
    Q.include = function(mod) {
      Q._each(Q._normalizeArg(mod), (name) => {
        const m = Quintus[name] || name;
        if (!Q._isFunction(m)) {
          throw `Invalid Module:${name}`;
        }
        m(Q);
      });
      return Q;
    };
    Q._normalizeArg = function(arg) {
      if (Q._isString(arg)) {
        arg = arg.replace(/\s+/g, "").split(",");
      }
      if (!Q._isArray(arg)) {
        arg = [arg];
      }
      return arg;
    };
    Q._extend = function(dest, source) {
      if (!source) {
        return dest;
      }
      for (const prop in source) {
        dest[prop] = source[prop];
      }
      return dest;
    };
    Q._clone = function(obj) {
      return Q._extend({}, obj);
    };
    Q._defaults = function(dest, source) {
      if (!source) {
        return dest;
      }
      for (const prop in source) {
        if (dest[prop] === void 0) {
          dest[prop] = source[prop];
        }
      }
      return dest;
    };
    Q._has = function(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };
    Q._isString = function(obj) {
      return typeof obj === "string";
    };
    Q._isNumber = function(obj) {
      return Object.prototype.toString.call(obj) === "[object Number]";
    };
    Q._isFunction = function(obj) {
      return Object.prototype.toString.call(obj) === "[object Function]";
    };
    Q._isObject = function(obj) {
      return Object.prototype.toString.call(obj) === "[object Object]";
    };
    Q._isArray = function(obj) {
      return Object.prototype.toString.call(obj) === "[object Array]";
    };
    Q._isUndefined = function(obj) {
      return obj === void 0;
    };
    Q._popProperty = function(obj, property) {
      const val = obj[property];
      delete obj[property];
      return val;
    };
    Q._each = function(obj, iterator, context) {
      if (obj == null) {
        return;
      }
      if (obj.forEach) {
        obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
        for (let i = 0, l = obj.length; i < l; i++) {
          iterator.call(context, obj[i], i, obj);
        }
      } else {
        for (const key in obj) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    };
    Q._invoke = function(arr, property, arg1, arg2) {
      if (arr === null) {
        return;
      }
      for (let i = 0, l = arr.length; i < l; i++) {
        arr[i][property](arg1, arg2);
      }
    };
    Q._detect = function(obj, iterator, context, arg1, arg2) {
      let result;
      if (obj === null) {
        return;
      }
      if (obj.length === +obj.length) {
        for (let i = 0, l = obj.length; i < l; i++) {
          result = iterator.call(context, obj[i], i, arg1, arg2);
          if (result) {
            return result;
          }
        }
        return false;
      }
      for (const key in obj) {
        result = iterator.call(context, obj[key], key, arg1, arg2);
        if (result) {
          return result;
        }
      }
      return false;
    };
    Q._map = function(obj, iterator, context) {
      const results = [];
      if (obj === null) {
        return results;
      }
      if (obj.map) {
        return obj.map(iterator, context);
      }
      Q._each(obj, (value, index, list) => {
        results[results.length] = iterator.call(context, value, index, list);
      });
      if (obj.length === +obj.length) {
        results.length = obj.length;
      }
      return results;
    };
    Q._uniq = function(arr) {
      arr = arr.slice().sort();
      const output = [];
      let last = null;
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== void 0 && last !== arr[i]) {
          output.push(arr[i]);
        }
        last = arr[i];
      }
      return output;
    };
    Q._shuffle = function(obj) {
      const shuffled = [];
      let rand;
      Q._each(obj, (value, index, list) => {
        rand = Math.floor(Math.random() * (index + 1));
        shuffled[index] = shuffled[rand];
        shuffled[rand] = value;
      });
      return shuffled;
    };
    Q._keys = Object.keys || function(obj) {
      if (Q._isObject(obj)) {
        throw new TypeError("Invalid object");
      }
      const keys = [];
      for (const key in obj) {
        if (Q._has(obj, key)) {
          keys[keys.length] = key;
        }
      }
      return keys;
    };
    Q._range = function(start, stop, step) {
      step = step || 1;
      const len = Math.max(Math.ceil((stop - start) / step), 0);
      let idx = 0;
      const range = new Array(len);
      while (idx < len) {
        range[idx++] = start;
        start += step;
      }
      return range;
    };
    let idIndex = 0;
    Q._uniqueId = function() {
      return idIndex++;
    };
    Q.options = {
      imagePath: "images/",
      audioPath: "audio/",
      dataPath: "data/",
      audioSupported: ["mp3", "ogg"],
      sound: true,
      frameTimeLimit: 100,
      autoFocus: true
    };
    if (opts) {
      Q._extend(Q.options, opts);
    }
    Q.scheduleFrame = function(callback) {
      return window.requestAnimationFrame(callback);
    };
    Q.cancelFrame = function(loop) {
      window.cancelAnimationFrame(loop);
    };
    Q.gameLoop = function(callback) {
      Q.lastGameLoopFrame = (/* @__PURE__ */ new Date()).getTime();
      Q.loop = true;
      Q._loopFrame = 0;
      Q.gameLoopCallbackWrapper = function() {
        const now = (/* @__PURE__ */ new Date()).getTime();
        Q._loopFrame++;
        Q.loop = Q.scheduleFrame(Q.gameLoopCallbackWrapper);
        let dt = now - Q.lastGameLoopFrame;
        if (dt > Q.options.frameTimeLimit) {
          dt = Q.options.frameTimeLimit;
        }
        callback.apply(Q, [dt / 1e3]);
        Q.lastGameLoopFrame = now;
      };
      Q.scheduleFrame(Q.gameLoopCallbackWrapper);
      return Q;
    };
    Q.pauseGame = function() {
      if (Q.loop) {
        Q.cancelFrame(Q.loop);
      }
      Q.loop = null;
    };
    Q.unpauseGame = function() {
      if (!Q.loop) {
        Q.lastGameLoopFrame = (/* @__PURE__ */ new Date()).getTime();
        Q.loop = Q.scheduleFrame(Q.gameLoopCallbackWrapper);
      }
    };
    (function() {
      let initializing = false;
      const fnTest = /xyz/.test(() => {
        let xyz;
      }) ? /\b_super\b/ : /.*/;
      Q.Class = function() {
      };
      Q.Class.prototype.isA = function(className) {
        return this.className === className;
      };
      Q.Class.extend = function(className, prop, classMethods) {
        if (!Q._isString(className)) {
          classMethods = prop;
          prop = className;
          className = null;
        }
        const _super = this.prototype;
        const ThisClass = this;
        initializing = true;
        const prototype = new ThisClass();
        initializing = false;
        function _superFactory(name, fn) {
          return function() {
            const tmp = this._super;
            this._super = _super[name];
            const ret = fn.apply(this, arguments);
            this._super = tmp;
            return ret;
          };
        }
        for (const name in prop) {
          prototype[name] = typeof prop[name] === "function" && typeof _super[name] === "function" && fnTest.test(prop[name]) ? _superFactory(name, prop[name]) : prop[name];
        }
        function Class() {
          if (!initializing && this.init) {
            this.init.apply(this, arguments);
          }
        }
        Class.prototype = prototype;
        Class.prototype.constructor = Class;
        Class.extend = Q.Class.extend;
        if (classMethods) {
          Q._extend(Class, classMethods);
        }
        if (className) {
          Q[className] = Class;
          Class.prototype.className = className;
          Class.className = className;
        }
        return Class;
      };
    })();
    Q.Class.extend("Evented", {
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
        if (Q._isArray(event) || event.indexOf(",") !== -1) {
          event = Q._normalizeArg(event);
          for (let i = 0; i < event.length; i++) {
            this.on(event[i], target, callback);
          }
          return;
        }
        if (!callback) {
          callback = target;
          target = null;
        }
        if (!callback) {
          callback = event;
        }
        if (Q._isString(callback)) {
          callback = (target || this)[callback];
        }
        this.listeners = this.listeners || {};
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push([target || this, callback]);
        if (target) {
          if (!target.binds) {
            target.binds = [];
          }
          target.binds.push([this, event, callback]);
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
            const listener = this.listeners[event][i];
            listener[1].call(listener[0], data);
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
          if (Q._isString(callback) && target[callback]) {
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
    Q.components = {};
    Q.Evented.extend("Component", {
      // Components are created when they are added onto a `Q.GameObject` entity. The entity
      // is directly extended with any methods inside of an `extend` property and then the
      // component itself is added onto the entity as well.
      init(entity) {
        this.entity = entity;
        if (this.extend) {
          Q._extend(entity, this.extend);
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
          const extensions = Q._keys(this.extend);
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
    Q.Evented.extend("GameObject", {
      /**
           Simple check to see if a component already exists
           on an object by searching for a property of the same name.
      
           @method has
           @for Q.GameObject
           @param {String} component - name of component to test against
           @returns {Boolean}
          */
      has(component) {
        return !!this[component];
      },
      /**
           Adds one or more components to an object. Accepts either
           a comma separated string or an array of strings that map
           to component names.
      
           Instantiates a new component object of the correct type
           (if the component exists) and then triggers an addComponent
           event.
      
           For example:
      
               this.add("2d, aiBounce")
      
           Returns the object to allow chaining.
      
           @for Q.GameObject
           @method add
           @param {String} components - comma separated list of components to add
           @return {Object} returns this for chaining purposes
          */
      add(components) {
        components = Q._normalizeArg(components);
        if (!this.activeComponents) {
          this.activeComponents = [];
        }
        for (let i = 0, len = components.length; i < len; i++) {
          const name = components[i];
          const Comp = Q.components[name];
          if (!this.has(name) && Comp) {
            const c = new Comp(this);
            this.trigger("addComponent", c);
          }
        }
        return this;
      },
      /**
           Removes one or more components from an object. Accepts the
           same style of parameters as `add`. Triggers a delComponent event
           and calls destroy on the component.
      
           Returns the element to allow chaining.
      
           @for Q.GameObject
           @method del
           @param {String} components - comma separated list of components to remove
           @return {Object} returns this for chaining purposes
          */
      del(components) {
        components = Q._normalizeArg(components);
        for (let i = 0, len = components.length; i < len; i++) {
          const name = components[i];
          if (name && this.has(name)) {
            this.trigger("delComponent", this[name]);
            this[name].destroy();
          }
        }
        return this;
      },
      /**
           Destroys the object by calling debind and removing the
           object from it's parent. Will trigger a destroyed event
           callback.
      
           @for Q.GameObject
           @method del
           @param {String} components - comma separated list of components to remove
           @return {Object} returns this for chaining purposes
          */
      destroy() {
        if (this.isDestroyed) {
          return;
        }
        this.trigger("destroyed");
        this.debind();
        if (this.stage && this.stage.remove) {
          this.stage.remove(this);
        }
        this.isDestroyed = true;
        if (this.destroyed) {
          this.destroyed();
        }
      }
    });
    Q.component = function(name, methods) {
      if (!methods) {
        return Q.components[name];
      }
      methods.name = name;
      methods.componentName = `.${name}`;
      return Q.components[name] = Q.Component.extend(
        `${name}Component`,
        methods
      );
    };
    Q.GameObject.extend("GameState", {
      init(p) {
        this.p = Q._extend({}, p);
        this.listeners = {};
      },
      /**
           Resets the state to value p, triggers a reset event.
      
           @method reset
           @param {Object} p - properties to reinitialize to
          */
      reset(p) {
        this.init(p);
        this.trigger("reset");
      },
      // Internal helper method to set an individual property
      _triggerProperty(value, key) {
        if (this.p[key] !== value) {
          this.p[key] = value;
          this.trigger(`change.${key}`, value);
        }
      },
      /**
           Set one or more properties, trigger events on those
           properties changing.
      
           @example
              Q.state.set({ lives: 5, hitPoints: 4 });
              // Triggers 3 events: change.lives, change.hitPoints, change
      
      
              Q.state.set("lives",5);
              // Triggers 2 events: change.lives, change
      
          @method set
          @param {Object or String} properties - hash of properties to set, or property name
          @param {Var} [value] - if setting 1 property, the value of that property
          */
      set(properties, value) {
        if (Q._isObject(properties)) {
          Q._each(properties, this._triggerProperty, this);
        } else {
          this._triggerProperty(value, properties);
        }
        this.trigger("change");
      },
      /**
           Increment an individual property by amount, uses set internally
      
           @method inc
           @param {String} property
           @param {Integer} amount - amount to increment by
          */
      inc(property, amount) {
        this.set(property, this.get(property) + amount);
      },
      /**
      
           Increment an individual property by amount, uses set internally
      
           @method dec
           @param {String} property
           @param {Integer} amount - amount to decrement by
          */
      dec(property, amount) {
        this.set(property, this.get(property) - amount);
      },
      /**
      
           Return an individual property
      
           @method get
           @param {String} property
           @return {Var} value of the property
          */
      get(property) {
        return this.p[property];
      }
    });
    Q.state = new Q.GameState();
    Q.reset = function() {
      Q.state.reset();
    };
    Q.touchDevice = typeof exports === "undefined" && "ontouchstart" in document;
    Q.setup = function(id, options) {
      if (Q._isObject(id)) {
        options = id;
        id = null;
      }
      options = options || {};
      id = id || "quintus";
      if (Q._isString(id)) {
        Q.el = document.getElementById(id);
      } else {
        Q.el = id;
      }
      if (!Q.el) {
        Q.el = document.createElement("canvas");
        Q.el.width = options.width || 320;
        Q.el.height = options.height || 420;
        Q.el.id = id;
        document.body.appendChild(Q.el);
      }
      let w = parseInt(Q.el.width, 10);
      let h = parseInt(Q.el.height, 10);
      const maxWidth = options.maxWidth || 5e3;
      const maxHeight = options.maxHeight || 5e3;
      const { resampleWidth } = options;
      const { resampleHeight } = options;
      const { upsampleWidth } = options;
      const { upsampleHeight } = options;
      if (options.maximize === true || Q.touchDevice && options.maximize === "touch") {
        document.body.style.padding = 0;
        document.body.style.margin = 0;
        w = options.width || Math.min(window.innerWidth, maxWidth) - (options.pagescroll ? 17 : 0);
        h = options.height || Math.min(window.innerHeight - 5, maxHeight);
        if (Q.touchDevice) {
          Q.el.style.height = `${h * 2}px`;
          window.scrollTo(0, 1);
          w = Math.min(window.innerWidth, maxWidth);
          h = Math.min(window.innerHeight, maxHeight);
        }
      } else if (Q.touchDevice) {
        window.scrollTo(0, 1);
      }
      if (upsampleWidth && w <= upsampleWidth || upsampleHeight && h <= upsampleHeight) {
        Q.el.style.height = `${h}px`;
        Q.el.style.width = `${w}px`;
        Q.el.width = w * 2;
        Q.el.height = h * 2;
      } else if ((resampleWidth && w > resampleWidth || resampleHeight && h > resampleHeight) && Q.touchDevice) {
        Q.el.style.height = `${h}px`;
        Q.el.style.width = `${w}px`;
        Q.el.width = w / 2;
        Q.el.height = h / 2;
      } else {
        Q.el.style.height = `${h}px`;
        Q.el.style.width = `${w}px`;
        Q.el.width = w;
        Q.el.height = h;
      }
      const elParent = Q.el.parentNode;
      if (elParent && !Q.wrapper) {
        Q.wrapper = document.createElement("div");
        Q.wrapper.id = `${Q.el.id}_container`;
        Q.wrapper.style.width = `${w}px`;
        Q.wrapper.style.margin = "0 auto";
        Q.wrapper.style.position = "relative";
        elParent.insertBefore(Q.wrapper, Q.el);
        Q.wrapper.appendChild(Q.el);
      }
      Q.el.style.position = "relative";
      Q.ctx = Q.el.getContext && Q.el.getContext("2d");
      Q.width = parseInt(Q.el.width, 10);
      Q.height = parseInt(Q.el.height, 10);
      Q.cssWidth = w;
      Q.cssHeight = h;
      if (options.scaleToFit) {
        const factor = 1;
        const winW = window.innerWidth * factor;
        const winH = window.innerHeight * factor;
        const winRatio = winW / winH;
        const gameRatio = Q.el.width / Q.el.height;
        const scaleRatio = gameRatio < winRatio ? winH / Q.el.height : winW / Q.el.width;
        const scaledW = Q.el.width * scaleRatio;
        const scaledH = Q.el.height * scaleRatio;
        Q.el.style.width = `${scaledW}px`;
        Q.el.style.height = `${scaledH}px`;
        if (Q.el.parentNode) {
          Q.el.parentNode.style.width = `${scaledW}px`;
          Q.el.parentNode.style.height = `${scaledH}px`;
        }
        Q.cssWidth = parseInt(scaledW, 10);
        Q.cssHeight = parseInt(scaledH, 10);
        if (gameRatio > winRatio) {
          const topPos = (winH - scaledH) / 2;
          Q.el.style.top = `${topPos}px`;
        }
      }
      window.addEventListener("orientationchange", () => {
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 0);
      });
      return Q;
    };
    Q.clear = function() {
      if (Q.clearColor) {
        Q.ctx.globalAlpha = 1;
        Q.ctx.fillStyle = Q.clearColor;
        Q.ctx.fillRect(0, 0, Q.width, Q.height);
      } else {
        Q.ctx.clearRect(0, 0, Q.width, Q.height);
      }
    };
    Q.setImageSmoothing = function(enabled) {
      Q.ctx.mozImageSmoothingEnabled = enabled;
      Q.ctx.webkitImageSmoothingEnabled = enabled;
      Q.ctx.msImageSmoothingEnabled = enabled;
      Q.ctx.imageSmoothingEnabled = enabled;
    };
    Q.imageData = function(img) {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, img.width, img.height);
    };
    Q.assetTypes = {
      png: "Image",
      jpg: "Image",
      gif: "Image",
      jpeg: "Image",
      ogg: "Audio",
      wav: "Audio",
      m4a: "Audio",
      mp3: "Audio"
    };
    Q._fileExtension = function(filename) {
      const fileParts = filename.split(".");
      const fileExt = fileParts[fileParts.length - 1].toLowerCase();
      return fileExt;
    };
    Q.assetType = function(asset) {
      const fileExt = Q._fileExtension(asset);
      let fileType = Q.assetTypes[fileExt];
      if (fileType === "Audio" && Q.audio && Q.audio.type === "WebAudio") {
        fileType = "WebAudio";
      }
      return fileType || "Other";
    };
    Q.assetUrl = function(base, url) {
      let timestamp = "";
      if (Q.options.development) {
        timestamp = `${/\?/.test(url) ? "&" : "?"}_t=${(/* @__PURE__ */ new Date()).getTime()}`;
      }
      if (/^https?:\/\//.test(url) || url[0] === "/") {
        return url + timestamp;
      }
      return base + url + timestamp;
    };
    Q.loadAssetImage = function(key, src, callback, errorCallback) {
      const img = new Image();
      img.onload = function() {
        callback(key, img);
      };
      img.onerror = errorCallback;
      img.src = Q.assetUrl(Q.options.imagePath, src);
    };
    Q.audioMimeTypes = {
      mp3: "audio/mpeg",
      ogg: 'audio/ogg; codecs="vorbis"',
      m4a: "audio/m4a",
      wav: "audio/wav"
    };
    Q._audioAssetExtension = function() {
      if (Q._audioAssetPreferredExtension) {
        return Q._audioAssetPreferredExtension;
      }
      const snd = new Audio();
      return Q._audioAssetPreferredExtension = Q._detect(
        Q.options.audioSupported,
        (extension) => snd.canPlayType(Q.audioMimeTypes[extension]) ? extension : null
      );
    };
    Q.loadAssetAudio = function(key, src, callback, errorCallback) {
      if (!document.createElement("audio").play || !Q.options.sound) {
        callback(key, null);
        return;
      }
      const baseName = Q._removeExtension(src);
      const extension = Q._audioAssetExtension();
      const filename = null;
      const snd = new Audio();
      if (!extension) {
        callback(key, null);
        return;
      }
      snd.addEventListener("error", errorCallback);
      if (!Q.touchDevice) {
        snd.addEventListener("canplaythrough", () => {
          callback(key, snd);
        });
      }
      snd.src = Q.assetUrl(Q.options.audioPath, `${baseName}.${extension}`);
      snd.load();
      if (Q.touchDevice) {
        callback(key, snd);
      }
    };
    Q.loadAssetWebAudio = function(key, src, callback, errorCallback) {
      const request = new XMLHttpRequest();
      const baseName = Q._removeExtension(src);
      const extension = Q._audioAssetExtension();
      request.open(
        "GET",
        Q.assetUrl(Q.options.audioPath, `${baseName}.${extension}`),
        true
      );
      request.responseType = "arraybuffer";
      request.onload = function() {
        const audioData = request.response;
        Q.audioContext.decodeAudioData(
          request.response,
          (buffer) => {
            callback(key, buffer);
          },
          errorCallback
        );
      };
      request.send();
    };
    Q.loadAssetOther = function(key, src, callback, errorCallback) {
      const request = new XMLHttpRequest();
      const fileParts = src.split(".");
      const fileExt = fileParts[fileParts.length - 1].toLowerCase();
      if (document.location.origin === "file://" || document.location.origin === "null") {
        if (!Q.fileURLAlert) {
          Q.fileURLAlert = true;
          alert(
            "Quintus Error: Loading assets is not supported from file:// urls - please run from a local web-server and try again"
          );
        }
        return errorCallback();
      }
      request.onreadystatechange = function() {
        if (request.readyState === 4) {
          if (request.status === 200) {
            if (fileExt === "json") {
              callback(key, JSON.parse(request.responseText));
            } else {
              callback(key, request.responseText);
            }
          } else {
            errorCallback();
          }
        }
      };
      request.open("GET", Q.assetUrl(Q.options.dataPath, src), true);
      request.send(null);
    };
    Q._removeExtension = function(filename) {
      return filename.replace(/\.(\w{3,4})$/, "");
    };
    Q.assets = {};
    Q.asset = function(name) {
      return Q.assets[name];
    };
    Q.load = function(assets, callback, options) {
      let assetObj = {};
      if (!options) {
        options = {};
      }
      const { progressCallback } = options;
      let errors = false;
      const errorCallback = function(itm) {
        errors = true;
        (options.errorCallback || function(itm2) {
          throw `Error Loading: ${itm2}`;
        })(itm);
      };
      if (Q._isString(assets)) {
        assets = Q._normalizeArg(assets);
      }
      if (Q._isArray(assets)) {
        Q._each(assets, (itm) => {
          if (Q._isObject(itm)) {
            Q._extend(assetObj, itm);
          } else {
            assetObj[itm] = itm;
          }
        });
      } else {
        assetObj = assets;
      }
      const assetsTotal = Q._keys(assetObj).length;
      let assetsRemaining = assetsTotal;
      const loadedCallback = function(key, obj, force) {
        if (errors) {
          return;
        }
        if (!Q.assets[key] || force) {
          Q.assets[key] = obj;
          assetsRemaining--;
          if (progressCallback) {
            progressCallback(assetsTotal - assetsRemaining, assetsTotal);
          }
        }
        if (assetsRemaining === 0 && callback) {
          callback.apply(Q);
        }
      };
      Q._each(assetObj, (itm, key) => {
        const assetType = Q.assetType(itm);
        if (Q.assets[key]) {
          loadedCallback(key, Q.assets[key], true);
        } else {
          Q[`loadAsset${assetType}`](key, itm, loadedCallback, () => {
            errorCallback(itm);
          });
        }
      });
    };
    Q.preloads = [];
    Q.preload = function(arg, options) {
      if (Q._isFunction(arg)) {
        Q.load(Q._uniq(Q.preloads), arg, options);
        Q.preloads = [];
      } else {
        Q.preloads = Q.preloads.concat(arg);
      }
    };
    Q.matrices2d = [];
    Q.matrix2d = function() {
      return Q.matrices2d.length > 0 ? Q.matrices2d.pop().identity() : new Q.Matrix2D();
    };
    Q.Matrix2D = Q.Class.extend({
      /**
           Initialize a matrix from a source or with the identify matrix
      
           @constructor
           @for Q.Matrix2D
          */
      init(source) {
        if (source) {
          this.m = [];
          this.clone(source);
        } else {
          this.m = [1, 0, 0, 0, 1, 0];
        }
      },
      /**
           Turn this matrix into the identity
      
           @for Q.Matrix2D
           @method identity
           @chainable
          */
      identity() {
        const { m } = this;
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 1;
        m[5] = 0;
        return this;
      },
      /**
      
           Clone another matrix into this one
      
           @for Q.Matrix2D
           @method clone
           @param {Q.Matrix2D} matrix - matrix to clone
           @chainable
          */
      clone(matrix) {
        const d = this.m;
        const s = matrix.m;
        d[0] = s[0];
        d[1] = s[1];
        d[2] = s[2];
        d[3] = s[3];
        d[4] = s[4];
        d[5] = s[5];
        return this;
      },
      /**
           multiply two matrices (leaving the result in this)
      
              a * b =
                 [ [ a11*b11 + a12*b21 ], [ a11*b12 + a12*b22 ], [ a11*b31 + a12*b32 + a13 ] ,
                 [ a21*b11 + a22*b21 ], [ a21*b12 + a22*b22 ], [ a21*b31 + a22*b32 + a23 ] ]
      
           @for Q.Matrix2D
           @method clone
           @param {Q.Matrix2D} matrix - matrix to multiply by
           @chainable
         */
      multiply(matrix) {
        const a = this.m;
        const b = matrix.m;
        const m11 = a[0] * b[0] + a[1] * b[3];
        const m12 = a[0] * b[1] + a[1] * b[4];
        const m13 = a[0] * b[2] + a[1] * b[5] + a[2];
        const m21 = a[3] * b[0] + a[4] * b[3];
        const m22 = a[3] * b[1] + a[4] * b[4];
        const m23 = a[3] * b[2] + a[4] * b[5] + a[5];
        a[0] = m11;
        a[1] = m12;
        a[2] = m13;
        a[3] = m21;
        a[4] = m22;
        a[5] = m23;
        return this;
      },
      /**
      
           Multiply this matrix by a rotation matrix rotated radians radians
      
          @for Q.Matrix2D
          @method rotate
          @param {Float} radians - angle to rotate by
          @chainable
          */
      rotate(radians) {
        if (radians === 0) {
          return this;
        }
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const { m } = this;
        const m11 = m[0] * cos + m[1] * sin;
        const m12 = m[0] * -sin + m[1] * cos;
        const m21 = m[3] * cos + m[4] * sin;
        const m22 = m[3] * -sin + m[4] * cos;
        m[0] = m11;
        m[1] = m12;
        m[3] = m21;
        m[4] = m22;
        return this;
      },
      /**
      
           Helper method to rotate by a set number of degrees (calls rotate internally)
      
           @for Q.Matrix2D
           @method rotateDeg
           @param {Float} degrees
           @chainable
          */
      rotateDeg(degrees) {
        if (degrees === 0) {
          return this;
        }
        return this.rotate(Math.PI * degrees / 180);
      },
      /**
      
           Multiply this matrix by a scaling matrix scaling sx and sy
           @for Q.Matrix2D
           @method scale
           @param {Float} sx - scale in x dimension (scaling is uniform unless `sy` is provided)
           @param {Float} [sy] - scale in the y dimension
           @chainable
          */
      scale(sx, sy) {
        const { m } = this;
        if (sy === void 0) {
          sy = sx;
        }
        m[0] *= sx;
        m[1] *= sy;
        m[3] *= sx;
        m[4] *= sy;
        return this;
      },
      /**
           Multiply this matrix by a translation matrix translate by tx and ty
      
           @for Q.Matrix2D
           @method translate
           @param {Float} tx
           @param {Float} ty
           @chainable
          */
      translate(tx, ty) {
        const { m } = this;
        m[2] += m[0] * tx + m[1] * ty;
        m[5] += m[3] * tx + m[4] * ty;
        return this;
      },
      /**
           Transform x and y coordinates by this matrix
           Memory Hoggy version, returns a new Array
      
           @for Q.Matrix2D
           @method transform
           @param {Float} x
           @param {Float} y
      
           */
      transform(x, y) {
        return [
          x * this.m[0] + y * this.m[1] + this.m[2],
          x * this.m[3] + y * this.m[4] + this.m[5]
        ];
      },
      /**
       Transform an object with an x and y property by this Matrix
       @for Q.Matrix2D
       @method transformPt
       @param {Object} obj
       @return {Object} obj
      */
      transformPt(obj) {
        const { x } = obj;
        const { y } = obj;
        obj.x = x * this.m[0] + y * this.m[1] + this.m[2];
        obj.y = x * this.m[3] + y * this.m[4] + this.m[5];
        return obj;
      },
      /**
           Transform an array with an x and y elements by this Matrix and put the result in
           the outArr
      
           @for Q.Matrix2D
           @method transformArr
           @param {Array} inArr - input array
           @param {Array} outArr - output array
           @return {Object} obj
          */
      transformArr(inArr, outArr) {
        const x = inArr[0];
        const y = inArr[1];
        outArr[0] = x * this.m[0] + y * this.m[1] + this.m[2];
        outArr[1] = x * this.m[3] + y * this.m[4] + this.m[5];
        return outArr;
      },
      /**
           Return just the x coordinate transformed by this Matrix
      
           @for Q.Matrix2D
           @method transformX
           @param {Float} x
           @param {Float} y
           @return {Float} x transformed
          */
      transformX(x, y) {
        return x * this.m[0] + y * this.m[1] + this.m[2];
      },
      /**
           Return just the y coordinate transformed by this Matrix
      
           @for Q.Matrix2D
           @method transformY
           @param {Float} x
           @param {Float} y
           @return {Float} y transformed
          */
      transformY(x, y) {
        return x * this.m[3] + y * this.m[4] + this.m[5];
      },
      /**
           Release this Matrix to be reused
      
           @for Q.Matrix2D
           @method release
          */
      release() {
        Q.matrices2d.push(this);
        return null;
      },
      /**
           Set the complete transform on a Canvas 2D context
      
           @for Q.Matrix2D
           @method setContextTransform
           @param {Context2D} ctx - 2D canvs context
           */
      setContextTransform(ctx) {
        const { m } = this;
        ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
      }
    });
    return Q;
  };
  window.Quintus = Quintus;
  var quintus_default = Quintus;
})();
