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
  // FIXME: overrides DEFAULT_OPTS, problem if we spin up two instances
  Object.assign(DEFAULT_OPTS, opts)
  debugLib.setDebug(DEFAULT_OPTS.DEBUG)
  const app = new application()
  const server = net.createServer(app.connection)
  
  server.on('error', (err) => {
    // FIXME: better error handling than just throw, current: crash entire process
    throw err;
  });

  server.listen(DEFAULT_OPTS.port, ()=> {
    debugLib.Debug(`Bunnymq Listening on port: ${DEFAULT_OPTS.port}`, "info")
  })

  // graceful shutdown
  return function close(c){
    server.close(()=> {debugLib.Debug("server closed", "info");   c()})
  
  }

}


