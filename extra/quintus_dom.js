Quintus.DOM = function (Q) {
  Q.setupDOM = function (id, options) {
    options = options || {};
    id = id || "quintus";
    Q.el = $(Q._isString(id) ? `#${id}` : id);
    if (Q.el.length === 0) {
      Q.el = $("<div>")
        .attr("id", id)
        .css({ width: 320, height: 420 })
        .appendTo("body");
    }
    if (options.maximize) {
      const w = $(window).width();
      const h = $(window).height();
      Q.el.css({ width: w, height: h });
    }
    Q.wrapper = Q.el
      .wrap(`<div id='${id}_container'/>`)
      .parent()
      .css({ width: Q.el.width(), height: Q.el.height(), margin: "0 auto" });
    Q.el.css({ position: "relative", overflow: "hidden" });
    Q.width = Q.el.width();
    Q.height = Q.el.height();
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 0);
    $(window).bind("orientationchange", () => {
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 0);
    });
    return Q;
  };

  (function () {
    function translateBuilder(attribute) {
      return function (dom, x, y) {
        dom.style[attribute] = `translate(${Math.floor(x)}px,${Math.floor(
          y,
        )}px)`;
      };
    }
    function translate3DBuilder(attribute) {
      return function (dom, x, y) {
        dom.style[attribute] = `translate3d(${Math.floor(x)}px,${Math.floor(
          y,
        )}px,0px)`;
      };
    }
    function scaleBuilder(attribute) {
      return function (dom, scale) {
        dom.style[`${attribute}Origin`] = "0% 0%";
        dom.style[attribute] = `scale(${scale})`;
      };
    }
    function fallbackTranslate(dom, x, y) {
      dom.style.left = `${x}px`;
      dom.style.top = `${y}px`;
    }
    const has3d =
      "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix();
    const dummyStyle = $("<div>")[0].style;
    const transformMethods = [
      "transform",
      "webkitTransform",
      "MozTransform",
      "msTransform",
    ];
    for (let i = 0; i < transformMethods.length; i++) {
      const transformName = transformMethods[i];
      if (!Q._isUndefined(dummyStyle[transformName])) {
        if (has3d) {
          Q.positionDOM = translate3DBuilder(transformName);
        } else {
          Q.positionDOM = translateBuilder(transformName);
        }
        Q.scaleDOM = scaleBuilder(transformName);
        break;
      }
    }
    Q.positionDOM = Q.positionDOM || fallbackTranslate;
    Q.scaleDOM = Q.scaleDOM || function (scale) {};
  })();

  (function () {
    function transitionBuilder(attribute, prefix) {
      return function (dom, property, sec, easing) {
        easing = easing || "";
        if (property === "transform") {
          property = prefix + property;
        }
        sec = sec || "1s";
        dom.style[attribute] = `${property} ${sec} ${easing}`;
      };
    }
    // Dummy method
    function fallbackTransition() {}
    const dummyStyle = $("<div>")[0].style;
    const transitionMethods = [
      "transition",
      "webkitTransition",
      "MozTransition",
      "msTransition",
    ];
    const prefixNames = ["", "-webkit-", "-moz-", "-ms-"];
    for (let i = 0; i < transitionMethods.length; i++) {
      const transitionName = transitionMethods[i];
      const prefixName = prefixNames[i];
      if (!Q._isUndefined(dummyStyle[transitionName])) {
        Q.transitionDOM = transitionBuilder(transitionName, prefixName);
        break;
      }
    }
    Q.transitionDOM = Q.transitionDOM || fallbackTransition;
  })();

  Q.DOMSprite = Q.Sprite.extend({
    init(props) {
      this._super(props);
      this.el = $("<div>").css({
        width: this.p.w,
        height: this.p.h,
        zIndex: this.p.z || 0,
        position: "absolute",
      });
      this.dom = this.el[0];
      this.rp = {};
      this.setImage();
      this.setTransform();
    },

    setImage() {
      let asset;
      if (this.sheet()) {
        asset = Q.asset(this.sheet().asset);
      } else {
        asset = this.asset();
      }
      if (asset) {
        this.dom.style.backgroundImage = `url(${asset.src})`;
      }
    },

    setTransform() {
      const { p } = this;
      const { rp } = this;
      if (rp.frame !== p.frame) {
        if (p.sheet) {
          this.dom.style.backgroundPosition = `${-this.sheet().fx(
            p.frame,
          )}px ${-this.sheet().fy(p.frame)}px`;
        } else {
          this.dom.style.backgroundPosition = "0px 0px";
        }
        rp.frame = p.frame;
      }
      if (rp.x !== p.x || rp.y !== p.y) {
        Q.positionDOM(this.dom, p.x, p.y);
        rp.x = p.x;
        rp.y = p.y;
      }
    },

    hide() {
      this.dom.style.display = "none";
    },

    show() {
      this.dom.style.display = "block";
    },

    draw(ctx) {
      this.trigger("draw");
    },

    step(dt) {
      this.trigger("step", dt);
      this.setTransform();
    },

    destroy() {
      if (this.destroyed) {
        return false;
      }
      this._super();
      this.el.remove();
    },
  });

  if (Q.Stage) {
    Q.DOMStage = Q.Stage.extend({
      init(scene) {
        this.el = $("<div>")
          .css({
            top: 0,
            position: "relative",
          })
          .appendTo(Q.el);
        this.dom = this.el[0];
        this.wrapper = this.el.wrap("<div>").parent().css({
          position: "absolute",
          left: 0,
          top: 0,
        });
        this.scale = 1;
        this.wrapper_dom = this.wrapper[0];
        this._super(scene);
      },

      insert(itm) {
        if (itm.dom) {
          this.dom.appendChild(itm.dom);
        }
        return this._super(itm);
      },

      destroy() {
        this.wrapper.remove();
        this._super();
      },

      rescale(scale) {
        this.scale = scale;
        Q.scaleDOM(this.wrapper_dom, scale);
      },

      centerOn(x, y) {
        this.x = Q.width / 2 / this.scale - x;
        this.y = Q.height / 2 / this.scale - y;
        Q.positionDOM(this.dom, this.x, this.y);
      },
    });
  }

  Q.domOnly = function () {
    Q.Stage = Q.DOMStage;
    Q.setup = Q.setupDOM;
    Q.Sprite = Q.DOMSprite;
    return Q;
  };

  Q.DOMTileMap = Q.DOMSprite.extend({
    // Expects a sprite sheet, along with cols and rows properties
    init(props) {
      const sheet = Q.sheet(props.sheet);
      this._super(
        Q._extend(props, {
          w: props.cols * sheet.tilew,
          h: props.rows * sheet.tileh,
          tilew: sheet.tilew,
          tileh: sheet.tileh,
        }),
      );
      this.shown = [];
      this.domTiles = [];
    },

    setImage() {},

    setup(tiles, hide) {
      this.tiles = tiles;
      for (let y = 0, height = tiles.length; y < height; y++) {
        this.domTiles.push([]);
        this.shown.push([]);
        for (let x = 0, width = tiles[0].length; x < width; x++) {
          const domTile = this._addTile(tiles[y][x]);
          if (hide) {
            domTile.style.visibility = "hidden";
          }
          this.shown.push(!hide);
          this.domTiles[y].push(domTile);
        }
      }
    },

    _addTile(frame) {
      const { p } = this;
      const div = document.createElement("div");
      div.style.width = `${p.tilew}px`;
      div.style.height = `${p.tileh}px`;
      div.style.styleFloat = div.style.cssFloat = "left";
      this._setTile(div, frame);
      this.dom.appendChild(div);
      return div;
    },

    _setTile(dom, frame) {
      const asset = Q.asset(this.sheet().asset);
      dom.style.backgroundImage = `url(${asset.src})`;
      dom.style.backgroundPosition = `${-this.sheet().fx(
        frame,
      )}px ${-this.sheet().fy(frame)}px`;
    },

    validTile(x, y) {
      return y >= 0 && y < this.p.rows && x >= 0 && x < this.p.cols;
    },

    get(x, y) {
      return this.validTile(x, y) ? this.tiles[y][x] : null;
    },

    getDom(x, y) {
      return this.validTile(x, y) ? this.domTiles[y][x] : null;
    },
    set(x, y, frame) {
      if (!this.validTile(x, y)) {
        return;
      }
      this.tiles[y][x] = frame;
      const domTile = this.getDom(x, y);
      this._setFile(domTile, frame);
    },

    show(x, y) {
      if (!this.validTile(x, y)) {
        return;
      }
      if (this.shown[y][x]) {
        return;
      }
      this.getDom(x, y).style.visibility = "visible";
      this.shown[y][x] = true;
    },

    hide(x, y) {
      if (!this.validTile(x, y)) {
        return;
      }
      if (!this.shown[y][x]) {
        return;
      }
      this.getDom(x, y).style.visibility = "hidden";
      this.shown[y][x] = false;
    },
  });
};
