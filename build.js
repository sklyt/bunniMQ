// build.js
import { build } from "esbuild";

build({
  entryPoints: ["index.js"],
  bundle: true,
  platform: "node",
  format: "esm",         // ← force real ESM
  outfile: "dist/index.js",
    external: [

    "better-sqlite3",
    "bcrypt",
    "bson",
   
    "fs",
    "path",
    "os",
    "crypto",
  ],
}).catch(() => process.exit(1));
