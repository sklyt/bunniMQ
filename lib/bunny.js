import net from "node:net"
import tls from "tls"
import { application } from "./application.js"
import debugLib from "./utils.js"
import DEFAULT_OPTS from "./settings.js"
import path from "node:path"
import fs from "node:fs"
/**
 *  
 * @param {DEFAULT_OPTS} opts - options
 * @returns {Function} close - Stops the server from accepting new connections and keeps existing connections. This function is asynchronous, the server is finally closed when all connections are ended and the server emits a 'close' event. The callback will be called once the 'close' event occurs. Unlike that event, it will be called with an Error as its only argument if the server was not open when it was closed.
 */
export default function CreateBunny(opts = {}) {

  const config = { ...DEFAULT_OPTS, ...opts }
  if (typeof config.port !== 'number') {
    throw new TypeError(`\`port\` must be a number, got ${typeof config.port}`)
  }

  if (config.tls.enabled) {

    if (!config.tls.certs || !config.tls.certs.key || !config.tls.certs.cert) {
      throw new Error("TLS enabled but `key` or `cert` missing")
    }
  }

  DEFAULT_OPTS.cwd = opts.cwd // TODO: REMOVE temp will remove
  debugLib.setDebug(config.DEBUG)
  const app = new application()
  const server = config.tls.enabled ?
    tls.createServer(config.tls.certs, app.connection)
    : net.createServer(app.connection)



  const handleFatal = (err) => {
    const entry = `[${new Date().toISOString()}] ${err.stack || err.message}\n`
    fs.appendFileSync(LOG_PATH, entry)
    console.error('Server failed twice – see log:', LOG_PATH)
    process.exit(1)
  }

  const plainPort = config.port
  const tlsPort = config.tls.enabled
    ? (config.tls.port || config.port)
    : null


  const LOG_PATH = config.logPath || path.resolve(process.cwd(), 'server-error.log')
  let retryCount = 0
  server.on('error', (err) => {
    if (retryCount < 1) {
      retryCount++
      console.warn(`Server error (${err.code}). retrying… (${retryCount}/1)`)
      // small back‑off before retry
      setTimeout(() => {
        setTimeout(() => server.listen(config.tls.enabled ? tlsPort : plainPort), 100)
      }, 100)
    } else {
      handleFatal(err)
    }
  });

  server.listen(config.tls.enabled ? tlsPort : plainPort, () => {
    const proto = config.tls.enabled ? 'TLS' : 'TCP'
    const prt = config.tls.enabled ? tlsPort : plainPort
    debugLib.Debug(`Bunnymq listening over ${proto} on port ${prt}`, "info")
  })


  // graceful shutdown
  return function close(c) {
    server.close(() => { debugLib.Debug("server closed", "info"); c() })

  }

}


