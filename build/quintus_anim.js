(() => {
  // lib/quintus_anim.js
  var quintusAnim = function(Quintus) {
    Quintus.Anim = function(Q) {
      Q._animations = {};
      Q.animations = function(sprite, animations) {
        if (!Q._animations[sprite]) {
          Q._animations[sprite] = {};
        }
        Q._extend(Q._animations[sprite], animations);
      };
      Q.animation = function(sprite, name) {
        return Q._animations[sprite] && Q._animations[sprite][name];
      };
      Q.component("animation", {
        added() {
          const { p } = this.entity;
          p.animation = null;
          p.animationPriority = -1;
          p.animationFrame = 0;
          p.animationTime = 0;
          this.entity.on("step", this, "step");
        },
        extend: {
          play(name, priority, resetFrame) {
            this.animation.play(name, priority, resetFrame);
          }
        },
        step(dt) {
          const { entity } = this;
          const { p } = entity;
          if (p.animation) {
            const anim = Q.animation(p.sprite, p.animation);
            const rate = anim.rate || p.rate;
            let stepped = 0;
            p.animationTime += dt;
            if (p.animationChanged) {
              p.animationChanged = false;
            } else if (p.animationTime > rate) {
              stepped = Math.floor(p.animationTime / rate);
              p.animationTime -= stepped * rate;
              p.animationFrame += stepped;
            }
            if (stepped > 0) {
              if (p.animationFrame >= anim.frames.length) {
                if (anim.loop === false || anim.next) {
                  p.animationFrame = anim.frames.length - 1;
                  entity.trigger("animEnd");
                  entity.trigger(`animEnd.${p.animation}`);
                  p.animation = null;
                  p.animationPriority = -1;
                  if (anim.trigger) {
                    entity.trigger(anim.trigger, anim.triggerData);
                  }
                  if (anim.next) {
                    this.play(anim.next, anim.nextPriority);
                  }
                  return;
                }
                entity.trigger("animLoop");
                entity.trigger(`animLoop.${p.animation}`);
                p.animationFrame %= anim.frames.length;
              }
              entity.trigger("animFrame");
            }
            p.sheet = anim.sheet || p.sheet;
            p.frame = anim.frames[p.animationFrame];
            if (anim.hasOwnProperty("flip")) {
              p.flip = anim.flip;
            }
          }
        },
        play(name, priority, resetFrame) {
          const { entity } = this;
          const { p } = entity;
          priority = priority || 0;
          if (name !== p.animation && priority >= p.animationPriority) {
            if (resetFrame === void 0) {
              resetFrame = true;
            }
            p.animation = name;
            if (resetFrame) {
              p.animationChanged = true;
              p.animationTime = 0;
              p.animationFrame = 0;
            }
            p.animationPriority = priority;
            entity.trigger("anim");
            entity.trigger(`anim.${p.animation}`);
          }
        }
      });
      Q.Sprite.extend("Repeater", {
        init(props) {
          this._super(
            Q._defaults(props, {
              speedX: 1,
              speedY: 1,
              repeatY: true,
              repeatX: true,
              renderAlways: true,
              type: 0
            })
          );
          this.p.repeatW = this.p.repeatW || this.p.w;
          this.p.repeatH = this.p.repeatH || this.p.h;
        },
        draw(ctx) {
          const { p } = this;
          const asset = this.asset();
          const sheet = this.sheet();
          const scale = this.stage.viewport ? this.stage.viewport.scale : 1;
          const viewX = Math.floor(
            this.stage.viewport ? this.stage.viewport.x : 0
          );
          const viewY = Math.floor(
            this.stage.viewport ? this.stage.viewport.y : 0
          );
          const offsetX = Math.floor(p.x + viewX * this.p.speedX);
          const offsetY = Math.floor(p.y + viewY * this.p.speedY);
          let curX;
          let curY;
          let startX;
          let endX;
          let endY;
          if (p.repeatX) {
            curX = -offsetX % p.repeatW;
            if (curX > 0) {
              curX -= p.repeatW;
            }
          } else {
            curX = p.x - viewX;
          }
          if (p.repeatY) {
            curY = -offsetY % p.repeatH;
            if (curY > 0) {
              curY -= p.repeatH;
            }
          } else {
            curY = p.y - viewY;
          }
          startX = curX;
          endX = Q.width / Math.abs(scale) / Math.abs(p.scale || 1) + p.repeatW;
          endY = Q.height / Math.abs(scale) / Math.abs(p.scale || 1) + p.repeatH;
          while (curY < endY) {
            curX = startX;
            while (curX < endX) {
              if (sheet) {
                sheet.draw(ctx, curX + viewX, curY + viewY, p.frame);
              } else {
                ctx.drawImage(asset, curX + viewX, curY + viewY);
              }
              curX += p.repeatW;
              if (!p.repeatX) {
                break;
              }
            }
            curY += p.repeatH;
            if (!p.repeatY) {
              break;
            }
          }
        }
      });
      Q.Tween = Q.Class.extend({
        init(entity, properties, duration, easing, options) {
          if (Q._isObject(easing)) {
            options = easing;
            easing = Q.Easing.Linear;
          }
          if (Q._isObject(duration)) {
            options = duration;
            duration = 1;
          }
          this.entity = entity;
          this.duration = duration || 1;
          this.time = 0;
          this.options = options || {};
          this.delay = this.options.delay || 0;
          this.easing = easing || this.options.easing || Q.Easing.Linear;
          this.startFrame = Q._loopFrame + 1;
          this.properties = properties;
          this.start = {};
          this.diff = {};
        },
        step(dt) {
          let property;
          if (this.startFrame > Q._loopFrame) {
            return true;
          }
          if (this.delay >= dt) {
            this.delay -= dt;
            return true;
          }
          if (this.delay > 0) {
            dt -= this.delay;
            this.delay = 0;
          }
          if (this.time === 0) {
            const { entity } = this;
            const { properties } = this;
            this.p = entity instanceof Q.Stage ? entity.viewport : entity.p;
            for (property in properties) {
              this.start[property] = this.p[property];
              if (!Q._isUndefined(this.start[property])) {
                this.diff[property] = properties[property] - this.start[property];
              }
            }
          }
          this.time += dt;
          const progress = Math.min(1, this.time / this.duration);
          const location = this.easing(progress);
          for (property in this.start) {
            if (!Q._isUndefined(this.p[property])) {
              this.p[property] = this.start[property] + this.diff[property] * location;
            }
          }
          if (progress >= 1) {
            if (this.options.callback) {
              this.options.callback.apply(this.entity);
            }
          }
          return progress < 1;
        }
      });
      Q.Easing = {
        Linear(k) {
          return k;
        },
        Quadratic: {
          In(k) {
            return k * k;
          },
          Out(k) {
            return k * (2 - k);
          },
          InOut(k) {
            if ((k *= 2) < 1) {
              return 0.5 * k * k;
            }
            return -0.5 * (--k * (k - 2) - 1);
          }
        }
      };
      Q.component("tween", {
        added() {
          this._tweens = [];
          this.entity.on("step", this, "step");
        },
        extend: {
          animate(properties, duration, easing, options) {
            this.tween._tweens.push(
              new Q.Tween(this, properties, duration, easing, options)
            );
            return this;
          },
          chain(properties, duration, easing, options) {
            if (Q._isObject(easing)) {
              options = easing;
              easing = Q.Easing.Linear;
            }
            const tweenCnt = this.tween._tweens.length;
            if (tweenCnt > 0) {
              const lastTween = this.tween._tweens[tweenCnt - 1];
              options = options || {};
              options.delay = lastTween.duration - lastTween.time + lastTween.delay;
            }
            this.animate(properties, duration, easing, options);
            return this;
          },
          stop() {
            this.tween._tweens.length = 0;
            return this;
          }
        },
        step(dt) {
          for (let i = 0; i < this._tweens.length; i++) {
            if (!this._tweens[i].step(dt)) {
              this._tweens.splice(i, 1);
              i--;
            }
          }
        }
      });
    };
  };
  if (window.Quintus) {
    quintusAnim(window.Quintus);
  }
  var quintus_anim_default = quintusAnim;
})();
