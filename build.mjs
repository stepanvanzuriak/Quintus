import * as esbuild from "esbuild";

const ctx = await esbuild.context({
  entryPoints: [
    { out: "quintus_2d", in: "./lib/quintus_2d.js" },
    { out: "quintus_anim", in: "./lib/quintus_anim.js" },
    { out: "quintus_audio", in: "./lib/quintus_audio.js" },
    { out: "quintus_input", in: "./lib/quintus_input.js" },
    { out: "quintus_scenes", in: "./lib/quintus_scenes.js" },
    { out: "quintus_sprites", in: "./lib/quintus_sprites.js" },
    { out: "quintus_tmx", in: "./lib/quintus_tmx.js" },
    { out: "quintus_touch", in: "./lib/quintus_touch.js" },
    { out: "quintus_ui", in: "./lib/quintus_ui.js" },
    { out: "quintus", in: "./lib/quintus.ts" },
  ],
  target: ['es6'],
  bundle: true,
  write: true,
  outdir: "build",
});

await ctx.watch()
