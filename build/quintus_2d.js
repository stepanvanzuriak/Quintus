(() => {
  // lib/quintus_2d.js
  var quintus2D = function(Quintus) {
    Quintus["2D"] = function(Q) {
      Q.component("viewport", {
        added() {
          this.entity.on("prerender", this, "prerender");
          this.entity.on("render", this, "postrender");
          this.x = 0;
          this.y = 0;
          this.offsetX = 0;
          this.offsetY = 0;
          this.centerX = Q.width / 2;
          this.centerY = Q.height / 2;
          this.scale = 1;
        },
        extend: {
          follow(sprite, directions, boundingBox) {
            this.off("poststep", this.viewport, "follow");
            this.viewport.directions = directions || { x: true, y: true };
            this.viewport.following = sprite;
            if (Q._isUndefined(boundingBox) && this.lists.TileLayer !== void 0) {
              this.viewport.boundingBox = Q._detect(
                this.lists.TileLayer,
                (layer) => layer.p.boundingBox ? { minX: 0, maxX: layer.p.w, minY: 0, maxY: layer.p.h } : null
              );
            } else {
              this.viewport.boundingBox = boundingBox;
            }
            this.on("poststep", this.viewport, "follow");
            this.viewport.follow(true);
          },
          unfollow() {
            this.off("poststep", this.viewport, "follow");
          },
          centerOn(x, y) {
            this.viewport.centerOn(x, y);
          },
          moveTo(x, y) {
            return this.viewport.moveTo(x, y);
          }
        },
        follow(first) {
          const followX = Q._isFunction(this.directions.x) ? this.directions.x(this.following) : this.directions.x;
          const followY = Q._isFunction(this.directions.y) ? this.directions.y(this.following) : this.directions.y;
          this[first === true ? "centerOn" : "softCenterOn"](
            followX ? this.following.p.x - this.offsetX : void 0,
            followY ? this.following.p.y - this.offsetY : void 0
          );
        },
        offset(x, y) {
          this.offsetX = x;
          this.offsetY = y;
        },
        softCenterOn(x, y) {
          if (x !== void 0) {
            const dx = (x - Q.width / 2 / this.scale - this.x) / 3;
            if (this.boundingBox) {
              if (this.x + dx < this.boundingBox.minX) {
                this.x = this.boundingBox.minX / this.scale;
              } else if (this.x + dx > (this.boundingBox.maxX - Q.width) / this.scale) {
                this.x = Math.max(
                  this.boundingBox.maxX - Q.width,
                  this.boundingBox.minX
                ) / this.scale;
              } else {
                this.x += dx;
              }
            } else {
              this.x += dx;
            }
          }
          if (y !== void 0) {
            const dy = (y - Q.height / 2 / this.scale - this.y) / 3;
            if (this.boundingBox) {
              if (this.y + dy < this.boundingBox.minY) {
                this.y = this.boundingBox.minY / this.scale;
              } else if (this.y + dy > (this.boundingBox.maxY - Q.height) / this.scale) {
                this.y = Math.max(
                  this.boundingBox.maxY - Q.height,
                  this.boundingBox.minY
                ) / this.scale;
              } else {
                this.y += dy;
              }
            } else {
              this.y += dy;
            }
          }
        },
        centerOn(x, y) {
          if (x !== void 0) {
            this.x = x - Q.width / 2 / this.scale;
          }
          if (y !== void 0) {
            this.y = y - Q.height / 2 / this.scale;
          }
        },
        moveTo(x, y) {
          if (x !== void 0) {
            this.x = x;
          }
          if (y !== void 0) {
            this.y = y;
          }
          return this.entity;
        },
        prerender() {
          this.centerX = this.x + Q.width / 2 / this.scale;
          this.centerY = this.y + Q.height / 2 / this.scale;
          Q.ctx.save();
          Q.ctx.translate(Math.floor(Q.width / 2), Math.floor(Q.height / 2));
          Q.ctx.scale(this.scale, this.scale);
          Q.ctx.translate(-Math.floor(this.centerX), -Math.floor(this.centerY));
        },
        postrender() {
          Q.ctx.restore();
        }
      });
      Q.Sprite.extend("TileLayer", {
        init(props) {
          this._super(props, {
            tileW: 32,
            tileH: 32,
            blockTileW: 10,
            blockTileH: 10,
            type: 1,
            renderAlways: true
          });
          if (this.p.dataAsset) {
            this.load(this.p.dataAsset);
          }
          this.setDimensions();
          this.blocks = [];
          this.p.blockW = this.p.tileW * this.p.blockTileW;
          this.p.blockH = this.p.tileH * this.p.blockTileH;
          this.colBounds = {};
          this.directions = ["top", "left", "right", "bottom"];
          this.tileProperties = {};
          this.collisionObject = {
            p: {
              w: this.p.tileW,
              h: this.p.tileH,
              cx: this.p.tileW / 2,
              cy: this.p.tileH / 2
            }
          };
          this.tileCollisionObjects = {};
          this.collisionNormal = { separate: [] };
          this._generateCollisionObjects();
        },
        // Generate the tileCollisionObject overrides where needed
        _generateCollisionObjects() {
          const self = this;
          function returnPoint(pt) {
            return [
              pt[0] * self.p.tileW - self.p.tileW / 2,
              pt[1] * self.p.tileH - self.p.tileH / 2
            ];
          }
          if (this.sheet() && this.sheet().frameProperties) {
            const { frameProperties } = this.sheet();
            for (const k in frameProperties) {
              const colObj = this.tileCollisionObjects[k] = {
                p: Q._clone(this.collisionObject.p)
              };
              Q._extend(colObj.p, frameProperties[k]);
              if (colObj.p.points) {
                colObj.p.points = Q._map(colObj.p.points, returnPoint);
              }
              this.tileCollisionObjects[k] = colObj;
            }
          }
        },
        load(dataAsset) {
          const fileParts = dataAsset.split(".");
          const fileExt = fileParts[fileParts.length - 1].toLowerCase();
          let data;
          if (fileExt === "json") {
            data = Q._isString(dataAsset) ? Q.asset(dataAsset) : dataAsset;
          } else {
            throw "file type not supported";
          }
          this.p.tiles = data;
        },
        setDimensions() {
          const { tiles } = this.p;
          if (tiles) {
            this.p.rows = tiles.length;
            this.p.cols = tiles[0].length;
            this.p.w = this.p.cols * this.p.tileW;
            this.p.h = this.p.rows * this.p.tileH;
          }
        },
        getTile(tileX, tileY) {
          return this.p.tiles[tileY] && this.p.tiles[tileY][tileX];
        },
        getTileProperty(tile, prop) {
          if (this.tileProperties[tile] !== void 0) {
            return this.tileProperties[tile][prop];
          }
        },
        getTileProperties(tile) {
          if (this.tileProperties[tile] !== void 0) {
            return this.tileProperties[tile];
          }
          return {};
        },
        getTilePropertyAt(tileX, tileY, prop) {
          return this.getTileProperty(this.getTile(tileX, tileY), prop);
        },
        getTilePropertiesAt(tileX, tileY) {
          return this.getTileProperties(this.getTile(tileX, tileY));
        },
        tileHasProperty(tile, prop) {
          return this.getTileProperty(tile, prop) !== void 0;
        },
        setTile(x, y, tile) {
          const { p } = this;
          const blockX = Math.floor(x / p.blockTileW);
          const blockY = Math.floor(y / p.blockTileH);
          if (x >= 0 && x < this.p.cols && y >= 0 && y < this.p.rows) {
            this.p.tiles[y][x] = tile;
            if (this.blocks[blockY]) {
              this.blocks[blockY][blockX] = null;
            }
          }
        },
        tilePresent(tileX, tileY) {
          return this.p.tiles[tileY] && this.collidableTile(this.p.tiles[tileY][tileX]);
        },
        // Overload this method to draw tiles at frame 0 or not draw
        // tiles at higher number frames
        drawableTile(tileNum) {
          return tileNum > 0;
        },
        // Overload this method to control which tiles trigger a collision
        // (defaults to all tiles > number 0)
        collidableTile(tileNum) {
          return tileNum > 0;
        },
        getCollisionObject(tileX, tileY) {
          const { p } = this;
          const tile = this.getTile(tileX, tileY);
          let colObj;
          colObj = this.tileCollisionObjects[tile] !== void 0 ? this.tileCollisionObjects[tile] : this.collisionObject;
          colObj.p.x = tileX * p.tileW + p.x + p.tileW / 2;
          colObj.p.y = tileY * p.tileH + p.y + p.tileH / 2;
          return colObj;
        },
        collide(obj) {
          const { p } = this;
          const objP = obj.c || obj.p;
          const tileStartX = Math.floor((objP.x - objP.cx - p.x) / p.tileW);
          const tileStartY = Math.floor((objP.y - objP.cy - p.y) / p.tileH);
          const tileEndX = Math.ceil((objP.x - objP.cx + objP.w - p.x) / p.tileW);
          const tileEndY = Math.ceil((objP.y - objP.cy + objP.h - p.y) / p.tileH);
          const normal = this.collisionNormal;
          let col;
          let colObj;
          normal.collided = false;
          for (let tileY = tileStartY; tileY <= tileEndY; tileY++) {
            for (let tileX = tileStartX; tileX <= tileEndX; tileX++) {
              if (this.tilePresent(tileX, tileY)) {
                colObj = this.getCollisionObject(tileX, tileY);
                col = Q.collision(obj, colObj);
                if (col && col.magnitude > 0) {
                  if (colObj.p.sensor) {
                    colObj.tile = this.getTile(tileX, tileY);
                    if (obj.trigger) {
                      obj.trigger("sensor.tile", colObj);
                    }
                  } else if (!normal.collided || normal.magnitude < col.magnitude) {
                    normal.collided = true;
                    normal.separate[0] = col.separate[0];
                    normal.separate[1] = col.separate[1];
                    normal.magnitude = col.magnitude;
                    normal.distance = col.distance;
                    normal.normalX = col.normalX;
                    normal.normalY = col.normalY;
                    normal.tileX = tileX;
                    normal.tileY = tileY;
                    normal.tile = this.getTile(tileX, tileY);
                    if (obj.p.collisions !== void 0) {
                      obj.p.collisions.push(normal);
                    }
                  }
                }
              }
            }
          }
          return normal.collided ? normal : false;
        },
        prerenderBlock(blockX, blockY) {
          const { p } = this;
          const { tiles } = p;
          const sheet = this.sheet();
          const blockOffsetX = blockX * p.blockTileW;
          const blockOffsetY = blockY * p.blockTileH;
          if (blockOffsetX < 0 || blockOffsetX >= this.p.cols || blockOffsetY < 0 || blockOffsetY >= this.p.rows) {
            return;
          }
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = p.blockW;
          canvas.height = p.blockH;
          this.blocks[blockY] = this.blocks[blockY] || {};
          this.blocks[blockY][blockX] = canvas;
          for (let y = 0; y < p.blockTileH; y++) {
            if (tiles[y + blockOffsetY]) {
              for (let x = 0; x < p.blockTileW; x++) {
                if (this.drawableTile(tiles[y + blockOffsetY][x + blockOffsetX])) {
                  sheet.draw(
                    ctx,
                    x * p.tileW,
                    y * p.tileH,
                    tiles[y + blockOffsetY][x + blockOffsetX]
                  );
                }
              }
            }
          }
        },
        drawBlock(ctx, blockX, blockY) {
          const { p } = this;
          const startX = Math.floor(blockX * p.blockW + p.x);
          const startY = Math.floor(blockY * p.blockH + p.y);
          if (!this.blocks[blockY] || !this.blocks[blockY][blockX]) {
            this.prerenderBlock(blockX, blockY);
          }
          if (this.blocks[blockY] && this.blocks[blockY][blockX]) {
            ctx.drawImage(this.blocks[blockY][blockX], startX, startY);
          }
        },
        draw(ctx) {
          const { p } = this;
          const { viewport } = this.stage;
          const scale = viewport ? viewport.scale : 1;
          const x = viewport ? viewport.x : 0;
          const y = viewport ? viewport.y : 0;
          const viewW = Q.width / scale;
          const viewH = Q.height / scale;
          const startBlockX = Math.floor((x - p.x) / p.blockW);
          const startBlockY = Math.floor((y - p.y) / p.blockH);
          const endBlockX = Math.floor((x + viewW - p.x) / p.blockW);
          const endBlockY = Math.floor((y + viewH - p.y) / p.blockH);
          for (let iy = startBlockY; iy <= endBlockY; iy++) {
            for (let ix = startBlockX; ix <= endBlockX; ix++) {
              this.drawBlock(ctx, ix, iy);
            }
          }
        }
      });
      Q.gravityY = 9.8 * 100;
      Q.gravityX = 0;
      Q.component("2d", {
        added() {
          const { entity } = this;
          Q._defaults(entity.p, {
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            gravity: 1,
            collisionMask: Q.SPRITE_DEFAULT
          });
          entity.on("step", this, "step");
          entity.on("hit", this, "collision");
        },
        collision(col, last) {
          const { entity } = this;
          const { p } = entity;
          const magnitude = 0;
          if (col.obj.p && col.obj.p.sensor) {
            col.obj.trigger("sensor", entity);
            return;
          }
          col.impact = 0;
          const impactX = Math.abs(p.vx);
          const impactY = Math.abs(p.vy);
          p.x -= col.separate[0];
          p.y -= col.separate[1];
          if (col.normalY < -0.3) {
            if (!p.skipCollide && p.vy > 0) {
              p.vy = 0;
            }
            col.impact = impactY;
            entity.trigger("bump.bottom", col);
            entity.trigger("bump", col);
          }
          if (col.normalY > 0.3) {
            if (!p.skipCollide && p.vy < 0) {
              p.vy = 0;
            }
            col.impact = impactY;
            entity.trigger("bump.top", col);
            entity.trigger("bump", col);
          }
          if (col.normalX < -0.3) {
            if (!p.skipCollide && p.vx > 0) {
              p.vx = 0;
            }
            col.impact = impactX;
            entity.trigger("bump.right", col);
            entity.trigger("bump", col);
          }
          if (col.normalX > 0.3) {
            if (!p.skipCollide && p.vx < 0) {
              p.vx = 0;
            }
            col.impact = impactX;
            entity.trigger("bump.left", col);
            entity.trigger("bump", col);
          }
        },
        step(dt) {
          const { p } = this.entity;
          let dtStep = dt;
          while (dtStep > 0) {
            dt = Math.min(1 / 30, dtStep);
            p.vx += p.ax * dt + (p.gravityX === void 0 ? Q.gravityX : p.gravityX) * dt * p.gravity;
            p.vy += p.ay * dt + (p.gravityY === void 0 ? Q.gravityY : p.gravityY) * dt * p.gravity;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            this.entity.stage.collide(this.entity);
            dtStep -= dt;
          }
        }
      });
      Q.component("aiBounce", {
        added() {
          this.entity.on("bump.right", this, "goLeft");
          this.entity.on("bump.left", this, "goRight");
        },
        goLeft(col) {
          this.entity.p.vx = -col.impact;
          if (this.entity.p.defaultDirection === "right") {
            this.entity.p.flip = "x";
          } else {
            this.entity.p.flip = false;
          }
        },
        goRight(col) {
          this.entity.p.vx = col.impact;
          if (this.entity.p.defaultDirection === "left") {
            this.entity.p.flip = "x";
          } else {
            this.entity.p.flip = false;
          }
        }
      });
    };
  };
  if (window.Quintus) {
    quintus2D(window.Quintus);
  }
  var quintus_2d_default = quintus2D;
})();
