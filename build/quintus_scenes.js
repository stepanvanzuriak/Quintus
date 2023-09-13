"use strict";
(() => {
  // lib/quintus_scenes.js
  var quintusScenes = function(Quintus) {
    Quintus.Scenes = function(Q) {
      Q.scenes = {};
      Q.stages = [];
      Q.Class.extend("Scene", {
        init(sceneFunc, opts) {
          this.opts = opts || {};
          this.sceneFunc = sceneFunc;
        }
      });
      Q.scene = function(name, sceneFunc, opts) {
        if (sceneFunc === void 0) {
          return Q.scenes[name];
        }
        if (Q._isFunction(sceneFunc)) {
          sceneFunc = new Q.Scene(sceneFunc, opts);
          sceneFunc.name = name;
        }
        Q.scenes[name] = sceneFunc;
        return sceneFunc;
      };
      Q._nullContainer = {
        c: {
          x: 0,
          y: 0,
          angle: 0,
          scale: 1
        },
        matrix: Q.matrix2d()
      };
      Q.collision = function() {
        let normalX;
        let normalY;
        const offset = [0, 0];
        const result1 = { separate: [] };
        const result2 = { separate: [] };
        function calculateNormal(points, idx) {
          const pt1 = points[idx];
          const pt2 = points[idx + 1] || points[0];
          normalX = -(pt2[1] - pt1[1]);
          normalY = pt2[0] - pt1[0];
          const dist = Math.sqrt(normalX * normalX + normalY * normalY);
          if (dist > 0) {
            normalX /= dist;
            normalY /= dist;
          }
        }
        function dotProductAgainstNormal(point) {
          return normalX * point[0] + normalY * point[1];
        }
        function collide(o1, o2, flip) {
          let min1;
          let max1;
          let min2;
          let max2;
          let d1;
          let d2;
          let offsetLength;
          let tmp;
          let i;
          let j;
          let minDist;
          let minDistAbs;
          let shortestDist = Number.POSITIVE_INFINITY;
          let collided = false;
          let p1;
          let p2;
          const result = flip ? result2 : result1;
          offset[0] = 0;
          offset[1] = 0;
          if (o1.c) {
            p1 = o1.c.points;
          } else {
            p1 = o1.p.points;
            offset[0] += o1.p.x;
            offset[1] += o1.p.y;
          }
          if (o2.c) {
            p2 = o2.c.points;
          } else {
            p2 = o2.p.points;
            offset[0] += -o2.p.x;
            offset[1] += -o2.p.y;
          }
          o1 = o1.p;
          o2 = o2.p;
          for (i = 0; i < p1.length; i++) {
            calculateNormal(p1, i);
            min1 = dotProductAgainstNormal(p1[0]);
            max1 = min1;
            for (j = 1; j < p1.length; j++) {
              tmp = dotProductAgainstNormal(p1[j]);
              if (tmp < min1) {
                min1 = tmp;
              }
              if (tmp > max1) {
                max1 = tmp;
              }
            }
            min2 = dotProductAgainstNormal(p2[0]);
            max2 = min2;
            for (j = 1; j < p2.length; j++) {
              tmp = dotProductAgainstNormal(p2[j]);
              if (tmp < min2) {
                min2 = tmp;
              }
              if (tmp > max2) {
                max2 = tmp;
              }
            }
            offsetLength = dotProductAgainstNormal(offset);
            min1 += offsetLength;
            max1 += offsetLength;
            d1 = min1 - max2;
            d2 = min2 - max1;
            if (d1 > 0 || d2 > 0) {
              return null;
            }
            minDist = (max2 - min1) * -1;
            if (flip) {
              minDist *= -1;
            }
            minDistAbs = Math.abs(minDist);
            if (minDistAbs < shortestDist) {
              result.distance = minDist;
              result.magnitude = minDistAbs;
              result.normalX = normalX;
              result.normalY = normalY;
              if (result.distance > 0) {
                result.distance *= -1;
                result.normalX *= -1;
                result.normalY *= -1;
              }
              collided = true;
              shortestDist = minDistAbs;
            }
          }
          return collided ? result : null;
        }
        function satCollision(o1, o2) {
          let result12;
          let result22;
          let result;
          if (!o1.p.points) {
            Q._generatePoints(o1);
          }
          if (!o2.p.points) {
            Q._generatePoints(o2);
          }
          result12 = collide(o1, o2);
          if (!result12) {
            return false;
          }
          result22 = collide(o2, o1, true);
          if (!result22) {
            return false;
          }
          result = result22.magnitude < result12.magnitude ? result22 : result12;
          if (result.magnitude === 0) {
            return false;
          }
          result.separate[0] = result.distance * result.normalX;
          result.separate[1] = result.distance * result.normalY;
          return result;
        }
        return satCollision;
      }();
      Q.overlap = function(o1, o2) {
        const c1 = o1.c || o1.p || o1;
        const c2 = o2.c || o2.p || o2;
        const o1x = c1.x - (c1.cx || 0);
        const o1y = c1.y - (c1.cy || 0);
        const o2x = c2.x - (c2.cx || 0);
        const o2y = c2.y - (c2.cy || 0);
        return !(o1y + c1.h < o2y || o1y > o2y + c2.h || o1x + c1.w < o2x || o1x > o2x + c2.w);
      };
      Q.Stage = Q.GameObject.extend({
        // Should know whether or not the stage is paused
        defaults: {
          sort: false,
          gridW: 400,
          gridH: 400,
          x: 0,
          y: 0
        },
        init(scene, opts) {
          this.scene = scene;
          this.items = [];
          this.lists = {};
          this.index = {};
          this.removeList = [];
          this.grid = {};
          this._collisionLayers = [];
          this.time = 0;
          this.defaults.w = Q.width;
          this.defaults.h = Q.height;
          this.options = Q._extend({}, this.defaults);
          if (this.scene) {
            Q._extend(this.options, scene.opts);
          }
          if (opts) {
            Q._extend(this.options, opts);
          }
          if (this.options.sort && !Q._isFunction(this.options.sort)) {
            this.options.sort = function(a, b) {
              return (a.p && a.p.z || -1) - (b.p && b.p.z || -1);
            };
          }
        },
        destroyed() {
          this.invoke("debind");
          this.trigger("destroyed");
        },
        // Needs to be separated out so the current stage can be set
        loadScene() {
          if (this.scene) {
            this.scene.sceneFunc(this);
          }
        },
        /**
              Load an array of assets of the form:
        
                  [ [ "Player", { x: 15, y: 54 } ],
                    [ "Enemy",  { x: 54, y: 42 } ] ]
        
              Either pass in the array or a string of asset name
        
             @method loadAssets
             @param {Array or String} asset - Array of assets or a string of asset name
             @for Q.Stage
            */
        // Load an array of assets of the form:
        // [ [ "Player", { x: 15, y: 54 } ],
        //   [ "Enemy",  { x: 54, y: 42 } ] ]
        // Either pass in the array or a string of asset name
        loadAssets(asset) {
          const assetArray = Q._isArray(asset) ? asset : Q.asset(asset);
          for (let i = 0; i < assetArray.length; i++) {
            const spriteClass = assetArray[i][0];
            const spriteProps = assetArray[i][1];
            this.insert(new Q[spriteClass](spriteProps));
          }
        },
        /**
             executes the callback for each item in the scene
        
             @method each
             @param {function} callback
             @for Q.Stage
            */
        each(callback) {
          for (let i = 0, len = this.items.length; i < len; i++) {
            callback.call(this.items[i], arguments[1], arguments[2]);
          }
        },
        /**
             invokes a functioncall for each item in the scene
        
             @method invoke
             @param {function} funcName
             @for Q.Stage
            */
        invoke(funcName) {
          for (let i = 0, len = this.items.length; i < len; i++) {
            this.items[i][funcName].call(
              this.items[i],
              arguments[1],
              arguments[2]
            );
          }
        },
        /**
        
             @method detect
             @param {function} func
             @for Q.Stage
            */
        detect(func) {
          for (let i = this.items.length - 1; i >= 0; i--) {
            if (func.call(this.items[i], arguments[1], arguments[2], arguments[3])) {
              return this.items[i];
            }
          }
          return false;
        },
        /**
        
             @method identify
             @param {function} func
             @for Q.Stage
            */
        identify(func) {
          let result;
          for (let i = this.items.length - 1; i >= 0; i--) {
            if (result = func.call(
              this.items[i],
              arguments[1],
              arguments[2],
              arguments[3]
            )) {
              return result;
            }
          }
          return false;
        },
        /**
        
             @method find
             @param {Number or String} id
             @for Q.Stage
            */
        find(id) {
          return this.index[id];
        },
        addToLists(lists, object) {
          for (let i = 0; i < lists.length; i++) {
            this.addToList(lists[i], object);
          }
        },
        addToList(list, itm) {
          if (!this.lists[list]) {
            this.lists[list] = [];
          }
          this.lists[list].push(itm);
        },
        removeFromLists(lists, itm) {
          for (let i = 0; i < lists.length; i++) {
            this.removeFromList(lists[i], itm);
          }
        },
        removeFromList(list, itm) {
          const listIndex = this.lists[list].indexOf(itm);
          if (listIndex !== -1) {
            this.lists[list].splice(listIndex, 1);
          }
        },
        /**
             Inserts an item directly into the scene, or inside a container.
             The object can later accessed via `children` property of the scene or the container.
        
             @method insert
             @for Q.Stage
             @param {Q.GameObject} itm - the Item to insert
             @param [container] - `container` to add the item to
             @return the inserted object for chaining
            */
        insert(itm, container) {
          this.items.push(itm);
          itm.stage = this;
          itm.container = container;
          if (container) {
            container.children.push(itm);
          }
          itm.grid = {};
          Q._generatePoints(itm);
          Q._generateCollisionPoints(itm);
          if (itm.className) {
            this.addToList(itm.className, itm);
          }
          if (itm.activeComponents) {
            this.addToLists(itm.activeComponents, itm);
          }
          if (itm.p) {
            this.index[itm.p.id] = itm;
          }
          this.trigger("inserted", itm);
          itm.trigger("inserted", this);
          this.regrid(itm);
          return itm;
        },
        /**
             Removes an item from the scene.
        
             @method remove
             @param {Q.GameObject} itm - the Item to remove
             @for Q.Stage
            */
        remove(itm) {
          this.delGrid(itm);
          this.removeList.push(itm);
        },
        forceRemove(itm) {
          const idx = this.items.indexOf(itm);
          if (idx !== -1) {
            this.items.splice(idx, 1);
            if (itm.className) {
              this.removeFromList(itm.className, itm);
            }
            if (itm.activeComponents) {
              this.removeFromLists(itm.activeComponents, itm);
            }
            if (itm.container) {
              const containerIdx = itm.container.children.indexOf(itm);
              if (containerIdx !== -1) {
                itm.container.children.splice(containerIdx, 1);
              }
            }
            if (itm.destroy) {
              itm.destroy();
            }
            if (itm.p.id) {
              delete this.index[itm.p.id];
            }
            this.trigger("removed", itm);
          }
        },
        /**
             Pauses the scene, sprites will no longer be stepped but still rendered.
        
             @method pause
             @for Q.Stage
            */
        pause() {
          this.paused = true;
        },
        /**
             Unpauses the scene.
        
             @method unpause
             @for Q.Stage
            */
        unpause() {
          this.paused = false;
        },
        _gridCellCheck(type, id, obj, collisionMask) {
          if (Q._isUndefined(collisionMask) || collisionMask & type) {
            const obj2 = this.index[id];
            if (obj2 && obj2 !== obj && Q.overlap(obj, obj2)) {
              const col = Q.collision(obj, obj2);
              if (col) {
                col.obj = obj2;
                return col;
              }
              return false;
            }
          }
        },
        gridTest(obj, collisionMask) {
          const { grid } = obj;
          let gridCell;
          let col;
          for (let y = grid.Y1; y <= grid.Y2; y++) {
            if (this.grid[y]) {
              for (let x = grid.X1; x <= grid.X2; x++) {
                gridCell = this.grid[y][x];
                if (gridCell) {
                  col = Q._detect(
                    gridCell,
                    this._gridCellCheck,
                    this,
                    obj,
                    collisionMask
                  );
                  if (col) {
                    return col;
                  }
                }
              }
            }
          }
          return false;
        },
        collisionLayer(layer) {
          this._collisionLayers.push(layer);
          layer.collisionLayer = true;
          return this.insert(layer);
        },
        _collideCollisionLayer(obj, collisionMask) {
          let col;
          for (let i = 0, max = this._collisionLayers.length; i < max; i++) {
            const layer = this._collisionLayers[i];
            if (layer.p.type & collisionMask) {
              col = layer.collide(obj);
              if (col) {
                col.obj = layer;
                return col;
              }
            }
          }
          return false;
        },
        /**
             Searches the scene for an object.
        
             @method search
             @param obj
             @param [collisionMask] -
             @for Q.Stage
            */
        search(obj, collisionMask) {
          let col;
          if (!obj.grid) {
            this.regrid(obj, obj.stage !== this);
          }
          collisionMask = Q._isUndefined(collisionMask) ? obj.p && obj.p.collisionMask : collisionMask;
          col = this._collideCollisionLayer(obj, collisionMask);
          col = col || this.gridTest(obj, collisionMask);
          return col;
        },
        _locateObj: {
          p: {
            x: 0,
            y: 0,
            cx: 0,
            cy: 0,
            w: 1,
            h: 1
          },
          grid: {}
        },
        /**
             Finds any object that collides with the point x,y on the stage (not on the canvas).
             If `collisionMask` is used, only checks for collisions with sprites of that type.
        
             @method locate
             @param {number} x
             @param {number} y
             @param [collisionMask] - type of the sprite
             @return the object if one is found or false
             @for Q.Stage
            */
        locate(x, y, collisionMask) {
          let col = null;
          this._locateObj.p.x = x;
          this._locateObj.p.y = y;
          this.regrid(this._locateObj, true);
          col = this._collideCollisionLayer(this._locateObj, collisionMask);
          col = col || this.gridTest(this._locateObj, collisionMask);
          if (col && col.obj) {
            return col.obj;
          }
          return false;
        },
        /**
             calculates if the given object collides with anything in the scene
        
             @method collide
             @param {Object} obj - the object on that the collisions should be checked
             @param {Object} [options] - collisionsMask, maxCol, skipEvents to overwrite from obj
             @return col2 || col
             @for Q.Stage
            */
        collide(obj, options) {
          let col;
          let col2;
          let collisionMask;
          let maxCol;
          let curCol;
          let skipEvents;
          if (Q._isObject(options)) {
            collisionMask = options.collisionMask;
            maxCol = options.maxCol;
            skipEvents = options.skipEvents;
          } else {
            collisionMask = options;
          }
          collisionMask = Q._isUndefined(collisionMask) ? obj.p && obj.p.collisionMask : collisionMask;
          maxCol = maxCol || 3;
          Q._generateCollisionPoints(obj);
          this.regrid(obj);
          curCol = maxCol;
          while (curCol > 0 && (col = this._collideCollisionLayer(obj, collisionMask))) {
            if (!skipEvents) {
              obj.trigger("hit", col);
              obj.trigger("hit.collision", col);
            }
            Q._generateCollisionPoints(obj);
            this.regrid(obj);
            curCol--;
          }
          curCol = maxCol;
          while (curCol > 0 && (col2 = this.gridTest(obj, collisionMask))) {
            obj.trigger("hit", col2);
            obj.trigger("hit.sprite", col2);
            if (!skipEvents) {
              const obj2 = col2.obj;
              col2.obj = obj;
              col2.normalX *= -1;
              col2.normalY *= -1;
              col2.distance = 0;
              col2.magnitude = 0;
              col2.separate[0] = 0;
              col2.separate[1] = 0;
              obj2.trigger("hit", col2);
              obj2.trigger("hit.sprite", col2);
            }
            Q._generateCollisionPoints(obj);
            this.regrid(obj);
            curCol--;
          }
          return col2 || col;
        },
        delGrid(item) {
          const { grid } = item;
          for (let y = grid.Y1; y <= grid.Y2; y++) {
            if (this.grid[y]) {
              for (let x = grid.X1; x <= grid.X2; x++) {
                if (this.grid[y][x]) {
                  delete this.grid[y][x][item.p.id];
                }
              }
            }
          }
        },
        addGrid(item) {
          const { grid } = item;
          for (let y = grid.Y1; y <= grid.Y2; y++) {
            if (!this.grid[y]) {
              this.grid[y] = {};
            }
            for (let x = grid.X1; x <= grid.X2; x++) {
              if (!this.grid[y][x]) {
                this.grid[y][x] = {};
              }
              this.grid[y][x][item.p.id] = item.p.type;
            }
          }
        },
        // Add an item into the collision detection grid,
        // Ignore collision layers
        regrid(item, skipAdd) {
          if (item.collisionLayer) {
            return;
          }
          item.grid = item.grid || {};
          const c = item.c || item.p;
          const gridX1 = Math.floor((c.x - c.cx) / this.options.gridW);
          const gridY1 = Math.floor((c.y - c.cy) / this.options.gridH);
          const gridX2 = Math.floor((c.x - c.cx + c.w) / this.options.gridW);
          const gridY2 = Math.floor((c.y - c.cy + c.h) / this.options.gridH);
          const { grid } = item;
          if (grid.X1 !== gridX1 || grid.X2 !== gridX2 || grid.Y1 !== gridY1 || grid.Y2 !== gridY2) {
            if (grid.X1 !== void 0) {
              this.delGrid(item);
            }
            grid.X1 = gridX1;
            grid.X2 = gridX2;
            grid.Y1 = gridY1;
            grid.Y2 = gridY2;
            if (!skipAdd) {
              this.addGrid(item);
            }
          }
        },
        markSprites(items, time) {
          const { viewport } = this;
          const scale = viewport ? viewport.scale : 1;
          const x = viewport ? viewport.x : 0;
          const y = viewport ? viewport.y : 0;
          const viewW = Q.width / scale;
          const viewH = Q.height / scale;
          const gridX1 = Math.floor(x / this.options.gridW);
          const gridY1 = Math.floor(y / this.options.gridH);
          const gridX2 = Math.floor((x + viewW) / this.options.gridW);
          const gridY2 = Math.floor((y + viewH) / this.options.gridH);
          let gridRow;
          let gridBlock;
          for (let iy = gridY1; iy <= gridY2; iy++) {
            if (gridRow = this.grid[iy]) {
              for (let ix = gridX1; ix <= gridX2; ix++) {
                if (gridBlock = gridRow[ix]) {
                  for (const id in gridBlock) {
                    if (this.index[id]) {
                      this.index[id].mark = time;
                      if (this.index[id].container) {
                        this.index[id].container.mark = time;
                      }
                    }
                  }
                }
              }
            }
          }
        },
        updateSprites(items, dt, isContainer) {
          let item;
          for (let i = 0, len = items.length; i < len; i++) {
            item = items[i];
            if (!isContainer && item.p.visibleOnly && (!item.mark || item.mark < this.time)) {
              continue;
            }
            if (isContainer || !item.container) {
              item.update(dt);
              Q._generateCollisionPoints(item);
              this.regrid(item);
            }
          }
        },
        step(dt) {
          if (this.paused) {
            return false;
          }
          this.time += dt;
          this.markSprites(this.items, this.time);
          this.trigger("prestep", dt);
          this.updateSprites(this.items, dt);
          this.trigger("step", dt);
          if (this.removeList.length > 0) {
            for (let i = 0, len = this.removeList.length; i < len; i++) {
              this.forceRemove(this.removeList[i]);
            }
            this.removeList.length = 0;
          }
          this.trigger("poststep", dt);
        },
        /**
             Hides the scene.
        
             @method hide
             @for Q.Stage
            */
        hide() {
          this.hidden = true;
        },
        /**
             Unhides the scene.
        
             @method show
             @for Q.Stage
            */
        show() {
          this.hidden = false;
        },
        /**
             Stops the scene (hides and pauses).
        
             @method stop
             @for Q.Stage
            */
        stop() {
          this.hide();
          this.pause();
        },
        /**
             Starts the scene (shows and unpauses).
        
             @method start
             @for Q.Stage
            */
        start() {
          this.show();
          this.unpause();
        },
        render(ctx) {
          if (this.hidden) {
            return false;
          }
          if (this.options.sort) {
            this.items.sort(this.options.sort);
          }
          this.trigger("prerender", ctx);
          this.trigger("beforerender", ctx);
          for (let i = 0, len = this.items.length; i < len; i++) {
            const item = this.items[i];
            if (!item.container && (item.p.renderAlways || item.mark >= this.time)) {
              item.render(ctx);
            }
          }
          this.trigger("render", ctx);
          this.trigger("postrender", ctx);
        }
      });
      Q.activeStage = 0;
      Q.StageSelector = Q.Class.extend({
        emptyList: [],
        init(stage, selector) {
          this.stage = stage;
          this.selector = selector;
          this.items = this.stage.lists[this.selector] || this.emptyList;
          this.length = this.items.length;
        },
        each(callback) {
          for (let i = 0, len = this.items.length; i < len; i++) {
            callback.call(this.items[i], arguments[1], arguments[2]);
          }
          return this;
        },
        invoke(funcName) {
          for (let i = 0, len = this.items.length; i < len; i++) {
            this.items[i][funcName].call(
              this.items[i],
              arguments[1],
              arguments[2]
            );
          }
          return this;
        },
        trigger(name, params) {
          this.invoke("trigger", name, params);
        },
        destroy() {
          this.invoke("destroy");
        },
        detect(func) {
          for (let i = 0, val = null, len = this.items.length; i < len; i++) {
            if (func.call(this.items[i], arguments[1], arguments[2])) {
              return this.items[i];
            }
          }
          return false;
        },
        identify(func) {
          let result = null;
          for (let i = 0, val = null, len = this.items.length; i < len; i++) {
            if (result = func.call(this.items[i], arguments[1], arguments[2])) {
              return result;
            }
          }
          return false;
        },
        // This hidden utility method extends
        // and object's properties with a source object.
        // Used by the p method to set properties.
        _pObject(source) {
          Q._extend(this.p, source);
        },
        _pSingle(property, value) {
          this.p[property] = value;
        },
        set(property, value) {
          if (value === void 0) {
            this.each(this._pObject, property);
          } else {
            this.each(this._pSingle, property, value);
          }
          return this;
        },
        at(idx) {
          return this.items[idx];
        },
        first() {
          return this.items[0];
        },
        last() {
          return this.items[this.items.length - 1];
        }
      });
      Q.select = function(selector, scope) {
        scope = scope === void 0 ? Q.activeStage : scope;
        scope = Q.stage(scope);
        if (Q._isNumber(selector)) {
          return scope.index[selector];
        }
        return new Q.StageSelector(scope, selector);
      };
      Q.stage = function(num) {
        num = num === void 0 ? Q.activeStage : num;
        return Q.stages[num];
      };
      Q.stageScene = function(scene, num, options) {
        if (Q._isString(scene)) {
          scene = Q.scene(scene);
        }
        if (Q._isObject(num)) {
          options = num;
          num = Q._popProperty(options, "stage") || scene && scene.opts.stage || 0;
        }
        options = Q._clone(options);
        const StageClass = Q._popProperty(options, "stageClass") || scene && scene.opts.stageClass || Q.Stage;
        num = Q._isUndefined(num) ? scene && scene.opts.stage || 0 : num;
        if (Q.stages[num]) {
          Q.stages[num].destroy();
        }
        Q.activeStage = num;
        const stage = Q.stages[num] = new StageClass(scene, options);
        if (stage.options.asset) {
          stage.loadAssets(stage.options.asset);
        }
        if (scene) {
          stage.loadScene();
        }
        Q.activeStage = 0;
        if (!Q.loop) {
          Q.gameLoop(Q.stageGameLoop);
        }
        return stage;
      };
      Q.stageStepLoop = function(dt) {
        let i;
        let len;
        let stage;
        if (dt < 0) {
          dt = 1 / 60;
        }
        if (dt > 1 / 15) {
          dt = 1 / 15;
        }
        for (i = 0, len = Q.stages.length; i < len; i++) {
          Q.activeStage = i;
          stage = Q.stage();
          if (stage) {
            stage.step(dt);
          }
        }
        Q.activeStage = 0;
      };
      Q.stageRenderLoop = function() {
        if (Q.ctx) {
          Q.clear();
        }
        for (let i = 0, len = Q.stages.length; i < len; i++) {
          Q.activeStage = i;
          const stage = Q.stage();
          if (stage) {
            stage.render(Q.ctx);
          }
        }
        if (Q.input && Q.ctx) {
          Q.input.drawCanvas(Q.ctx);
        }
        Q.activeStage = 0;
      };
      Q.stageGameLoop = function(dt) {
        Q.stageStepLoop(dt);
        Q.stageRenderLoop();
      };
      Q.clearStage = function(num) {
        if (Q.stages[num]) {
          Q.stages[num].destroy();
          Q.stages[num] = null;
        }
      };
      Q.clearStages = function() {
        for (let i = 0, len = Q.stages.length; i < len; i++) {
          if (Q.stages[i]) {
            Q.stages[i].destroy();
          }
        }
        Q.stages.length = 0;
      };
    };
  };
  if (window.Quintus) {
    quintusScenes(window.Quintus);
  }
  var quintus_scenes_default = quintusScenes;
})();
