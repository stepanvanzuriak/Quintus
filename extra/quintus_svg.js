Quintus.SVG = function (Q) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  Q.setupSVG = function (id, options) {
    options = options || {};
    id = id || "quintus";
    Q.svg = Q._isString(id) ? document.getElementById(id) : id;

    if (!Q.svg) {
      Q.svg = document.createElementNS(SVG_NS, "svg");
      Q.svg.setAttribute("width", 320);
      Q.svg.setAttribute("height", 420);
      document.body.appendChild(Q.svg);
    }

    if (options.maximize) {
      const w = window.innerWidth - 1;
      const h = window.innerHeight - 10;
      Q.svg.setAttribute("width", w);
      Q.svg.setAttribute("height", h);
    }
    Q.width = Q.svg.getAttribute("width");
    Q.height = Q.svg.getAttribute("height");
    const parent = Q.svg.parentNode;
    const container = document.createElement("div");
    container.setAttribute("id", `${id}_container`);
    container.style.width = Q.width;
    container.style.height = Q.height;
    container.style.margin = "0 auto";
    container.appendChild(Q.svg);
    parent.appendChild(container);
    Q.wrapper = container;

    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 0);
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 0);
    });
    return Q;
  };

  Q.Sprite.extend("SVGSprite", {
    init(props) {
      this._super(
        Q._defaults(props, {
          shape: "block",
          color: "black",
          angle: 0,
          active: true,
          cx: 0,
          cy: 0,
        }),
      );
      this.createShape();
      this.svg.sprite = this;
      this.rp = {};
      this.setTransform();
    },

    set(attr) {
      Q._each(
        attr,
        function (value, key) {
          this.svg.setAttribute(key, value);
        },
        this,
      );
    },

    createShape() {
      const { p } = this;
      switch (p.shape) {
        case "block":
          this.svg = document.createElementNS(SVG_NS, "rect");
          Q._extend(p, { cx: p.w / 2, cy: p.h / 2 });
          this.set({ width: p.w, height: p.h });
          break;
        case "circle":
          this.svg = document.createElementNS(SVG_NS, "circle");
          this.set({ r: p.r, cx: 0, cy: 0 });
          break;
        case "polygon":
          this.svg = document.createElementNS(SVG_NS, "polygon");
          var pts = Q._map(p.points, (pt) => `${pt[0]},${pt[1]}`).join(" ");
          this.set({ points: pts });
          break;
      }
      this.set({ fill: p.color });
      if (p.outline) {
        this.set({
          stroke: p.outline,
          "stroke-width": p.outlineWidth || 1,
        });
      }
    },

    setTransform() {
      const { p } = this;
      const { rp } = this;
      if (rp.x !== p.x || rp.y !== p.y || rp.angle !== p.angle) {
        const transform =
          `translate(${p.x - p.cx},${p.y - p.cy}) ` +
          `rotate(${p.angle},${p.cx},${p.cy})`;
        this.svg.setAttribute("transform", transform);
        rp.angle = p.angle;
        rp.x = p.x;
        rp.y = p.y;
      }
    },
    render(ctx) {
      this.trigger("predraw", ctx);
      this.trigger("beforedraw", ctx);
      this.draw(ctx);
      this.trigger("beforedraw", ctx);
    },
    draw(ctx) {},

    step(dt) {
      this.trigger("step", dt);
      this.setTransform();
    },
  });

  Q.Stage.extend("SVGStage", {
    init(scene) {
      this.svg = document.createElementNS(SVG_NS, "svg");
      this.svg.setAttribute("width", Q.width);
      this.svg.setAttribute("height", Q.height);
      Q.svg.appendChild(this.svg);

      this.viewBox = { x: 0, y: 0, w: Q.width, h: Q.height };
      this._super(scene);
    },
    remove(itm) {
      if (itm.svg) {
        this.svg.removeChild(itm.svg);
      }
      return this._super(itm);
    },
    insert(itm) {
      if (itm.svg) {
        this.svg.appendChild(itm.svg);
      }
      return this._super(itm);
    },

    destroy() {
      Q.svg.removeChild(this.svg);
      this._super();
    },

    viewport(w, h) {
      this.viewBox.w = w;
      this.viewBox.h = h;
      if (this.viewBox.cx || this.viewBox.cy) {
        this.centerOn(this.viewBox.cx, this.viewBox.cy);
      } else {
        this.setViewBox();
      }
    },

    centerOn(x, y) {
      this.viewBox.cx = x;
      this.viewBox.cy = y;
      this.viewBox.x = x - this.viewBox.w / 2;
      this.viewBox.y = y - this.viewBox.h / 2;
      this.setViewBox();
    },

    setViewBox() {
      this.svg.setAttribute(
        "viewBox",
        `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.w} ${this.viewBox.h}`,
      );
    },

    browserToWorld(x, y) {
      const m = this.svg.getScreenCTM();
      const p = this.svg.createSVGPoint();
      p.x = x;
      p.y = y;
      return p.matrixTransform(m.inverse());
    },
  });

  Q.svgOnly = function () {
    Q.Stage = Q.SVGStage;
    Q.setup = Q.setupSVG;
    Q.Sprite = Q.SVGSprite;
    return Q;
  };
};
