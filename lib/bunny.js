import net from "node:net"
import { application } from "./application.js"
import debugLib from "./utils.js"
import DEFAULT_OPTS from "./settings.js"

/**
 *  
 * @param {DEFAULT_OPTS} opts - options
 * @returns {Function} close - Stops the server from accepting new connections and keeps existing connections. This function is asynchronous, the server is finally closed when all connections are ended and the server emits a 'close' event. The callback will be called once the 'close' event occurs. Unlike that event, it will be called with an Error as its only argument if the server was not open when it was closed.
 */
export default function CreateBunny(opts){

  const config = { ...DEFAULT_OPTS, ...opts } 
  DEFAULT_OPTS.cwd = opts.cwd // TODO: REMOVE temp will remove
  debugLib.setDebug(config.DEBUG) 
  const app = new application()
  const server = net.createServer(app.connection)
  
  const handleFatal = (err) => {
    const entry = `[${new Date().toISOString()}] ${err.stack || err.message}\n`
    fs.appendFileSync(LOG_PATH, entry)
    console.error('Server failed twice – see log:', LOG_PATH)
    process.exit(1)
  }


  let retryCount = 0
  server.on('error', (err) => {
    if (retryCount < 1) {
      retryCount++
      console.warn(`Server error (${err.code}). retrying… (${retryCount}/1)`)
      // small back‑off before retry
      setTimeout(() => {
        server.listen(config.port)
      }, 100)
    } else {
      handleFatal(err)
    }
  });

  server.listen(config.port, () => {
    debugLib.Debug(`Bunnymq Listening on port: ${config.port}`, "info")
  })


  // graceful shutdown
  return function close(c){
    server.close(()=> {debugLib.Debug("server closed", "info");   c()})
  
  }

}


