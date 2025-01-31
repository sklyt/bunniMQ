
import CreateBunny from "./lib/bunny.js";
import { fileURLToPath } from 'url';
import path from "path"
import DEFAULT_OPTS from "./lib/settings.js";

DEFAULT_OPTS.cwd = path.dirname(fileURLToPath(import.meta.url))


const start = process.hrtime.bigint();

CreateBunny({port: 3000, DEBUG: true})
const end = process.hrtime.bigint();


// On process shutdown
process.on('SIGINT', async () => {
    console.log(`Operation latency: ${(end - start) / BigInt(1e6)} ms`);
    const memory = process.memoryUsage();
      console.log(` Memory Usage: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`)
    process.exit();
  });