"use strict";
(() => {
  // lib/quintus_tmx.js
  var quintusTMX = function(Quintus) {
    Quintus.TMX = function(Q) {
      Q.assetTypes.tmx = "TMX";
      Q.loadAssetTMX = function(key, src, callback, errorCallback) {
        Q.loadAssetOther(
          key,
          src,
          (key2, responseText) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(responseText, "application/xml");
            callback(key2, doc);
          },
          errorCallback
        );
      };
      Q._tmxExtractAssetName = function(result) {
        const source = result.getAttribute("source");
        const sourceParts = source.split("/");
        return sourceParts[sourceParts.length - 1];
      };
      Q._tmxExtractSources = function(asset) {
        const results = asset.querySelectorAll("[source]");
        return Q._map(results, Q._tmxExtractAssetName);
      };
      Q.loadTMX = function(files, callback, options) {
        if (Q._isString(files)) {
          files = Q._normalizeArg(files);
        }
        const tmxFiles = [];
        Q._each(files, (file) => {
          if (Q._fileExtension(file) === "tmx") {
            tmxFiles.push(file);
          }
        });
        let additionalAssets = [];
        Q.load(files, () => {
          Q._each(tmxFiles, (tmxFile) => {
            const sources = Q._tmxExtractSources(Q.asset(tmxFile));
            additionalAssets = additionalAssets.concat(sources);
          });
          if (additionalAssets.length > 0) {
            Q.load(additionalAssets, callback, options);
          } else {
            callback();
          }
        });
      };
      function attr(elem, atr) {
        const value = elem.getAttribute(atr);
        return isNaN(value) ? value : +value;
      }
      function parseProperties(elem) {
        const propElems = elem.querySelectorAll("property");
        const props = {};
        for (let i = 0; i < propElems.length; i++) {
          const propElem = propElems[i];
          props[attr(propElem, "name")] = attr(propElem, "value");
        }
        return props;
      }
      Q._tmxLoadTilesets = function(tilesets, tileProperties) {
        const gidMap = [];
        function parsePoint(pt) {
          const pts = pt.split(",");
          return [parseFloat(pts[0]), parseFloat(pts[1])];
        }
        for (let t = 0; t < tilesets.length; t++) {
          const tileset = tilesets[t];
          const sheetName = attr(tileset, "name");
          const gid = attr(tileset, "firstgid");
          const assetName = Q._tmxExtractAssetName(
            tileset.querySelector("image")
          );
          const tilesetTileProps = {};
          const tilesetProps = {
            tileW: attr(tileset, "tilewidth"),
            tileH: attr(tileset, "tileheight"),
            spacingX: attr(tileset, "spacing"),
            spacingY: attr(tileset, "spacing")
          };
          const tiles = tileset.querySelectorAll("tile");
          for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const tileId = attr(tile, "id");
            const tileGid = gid + tileId;
            const properties = parseProperties(tile);
            if (properties.points) {
              properties.points = Q._map(
                properties.points.split(" "),
                parsePoint
              );
            }
            tileProperties[tileGid] = properties;
            tilesetTileProps[tileId] = properties;
          }
          tilesetProps.frameProperties = tilesetTileProps;
          gidMap.push([gid, sheetName]);
          Q.sheet(sheetName, assetName, tilesetProps);
        }
        return gidMap;
      };
      Q._tmxProcessImageLayer = function(stage, gidMap, tileProperties, layer) {
        const assetName = Q._tmxExtractAssetName(layer.querySelector("image"));
        const properties = parseProperties(layer);
        properties.asset = assetName;
        stage.insert(new Q.Repeater(properties));
      };
      Q._lookupGid = function(gid, gidMap) {
        let idx = 0;
        while (gidMap[idx + 1] && gid >= gidMap[idx + 1][0]) {
          idx++;
        }
        return gidMap[idx];
      };
      Q._tmxProcessTileLayer = function(stage, gidMap, tileProperties, layer) {
        const tiles = layer.querySelectorAll("tile");
        const width = attr(layer, "width");
        const height = attr(layer, "height");
        let gidDetails;
        let gidOffset;
        let sheetName;
        const data = [];
        let idx = 0;
        for (let y = 0; y < height; y++) {
          data[y] = [];
          for (let x = 0; x < width; x++) {
            const gid = attr(tiles[idx], "gid");
            if (gid === 0) {
              data[y].push(null);
            } else {
              if (!gidOffset) {
                gidDetails = Q._lookupGid(attr(tiles[idx], "gid"), gidMap);
                gidOffset = gidDetails[0];
                sheetName = gidDetails[1];
              }
              data[y].push(gid - gidOffset);
            }
            idx++;
          }
        }
        const tileLayerProperties = Q._extend(
          {
            tileW: Q.sheet(sheetName).tileW,
            tileH: Q.sheet(sheetName).tileH,
            sheet: sheetName,
            tiles: data
          },
          parseProperties(layer)
        );
        const TileLayerClass = tileLayerProperties.Class || "TileLayer";
        if (tileLayerProperties.collision) {
          stage.collisionLayer(new Q[TileLayerClass](tileLayerProperties));
        } else {
          stage.insert(new Q[TileLayerClass](tileLayerProperties));
        }
      };
      Q._tmxProcessObjectLayer = function(stage, gidMap, tileProperties, layer) {
        const objects = layer.querySelectorAll("object");
        for (let i = 0; i < objects.length; i++) {
          const obj = objects[i];
          const gid = attr(obj, "gid");
          const x = attr(obj, "x");
          const y = attr(obj, "y");
          const properties = tileProperties[gid];
          const overrideProperties = parseProperties(obj);
          if (!properties) {
            throw `Invalid TMX Object: missing properties for GID:${gid}`;
          }
          if (!properties.Class) {
            throw `Invalid TMX Object: missing Class for GID:${gid}`;
          }
          const className = properties.Class;
          if (!className) {
            throw `Invalid TMX Object Class: ${className} GID:${gid}`;
          }
          const p = Q._extend(
            Q._extend({ x, y }, properties),
            overrideProperties
          );
          const sprite = new Q[className](p);
          sprite.p.x += sprite.p.w / 2;
          sprite.p.y -= sprite.p.h / 2;
          stage.insert(sprite);
        }
      };
      Q._tmxProcessors = {
        objectgroup: Q._tmxProcessObjectLayer,
        layer: Q._tmxProcessTileLayer,
        imagelayer: Q._tmxProcessImageLayer
      };
      Q.stageTMX = function(dataAsset, stage) {
        const data = Q._isString(dataAsset) ? Q.asset(dataAsset) : dataAsset;
        const tileProperties = {};
        const tilesets = data.getElementsByTagName("tileset");
        const gidMap = Q._tmxLoadTilesets(tilesets, tileProperties);
        Q._each(data.documentElement.childNodes, (layer) => {
          const layerType = layer.tagName;
          if (Q._tmxProcessors[layerType]) {
            Q._tmxProcessors[layerType](stage, gidMap, tileProperties, layer);
          }
        });
      };
    };
  };
  var quintus_tmx_default = quintusTMX;
})();
