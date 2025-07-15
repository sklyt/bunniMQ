import net from "node:net"
import tls from "tls"
// import { application } from "./application.js"
import debugLib, { minutesToMilliseconds } from "./utils.js"
import DEFAULT_OPTS from "./settings.js"
import path from "node:path"
import fs from "node:fs"
import ConnectionHandler from "./connectionHandler.js"
import getTimeManager from "./timescheduler.js"
import getQueueManager from "./manager/queue.js"


/**
 * 
 * @param {DEFAULT_OPTS} config 
 */
function setupQueueTimers(config){
    const timers = getTimeManager()
    const queueMan = getQueueManager(config.queue.AckExpiry)

  timers.setInterval("queuecleanup", function() {
       queueMan.checkPendingTimeouts()
       queueMan.clearExpiredMessagesInQueu()
  }, minutesToMilliseconds(config.queueCleanupInterval))

  timers.setInterval("takesnapshot",function() {
     queueMan.takeSnapshot()
  }, minutesToMilliseconds(config.snapshotInterval))
}


const handleFatal = (err, LOG_PATH) => {
    const entry = `[${new Date().toISOString()}] ${err.stack || err.message}\n`
    fs.appendFileSync(LOG_PATH, entry)
    console.error('Server failed twice – see log:', LOG_PATH)
    process.exit(1)
}






/**
 *  
 * @param {DEFAULT_OPTS} opts - options
 * @returns {Function} close - Stops the server from accepting new connections and keeps existing connections. This function is asynchronous, the server is finally closed when all connections are ended and the server emits a 'close' event. The callback will be called once the 'close' event occurs. Unlike that event, it will be called with an Error as its only argument if the server was not open when it was closed.
 */
export default function CreateBunny(opts = {}) {

  const config = { ...DEFAULT_OPTS, ...opts }
  if (typeof config.port !== 'number') {
    throw new TypeError(`port must be a number, got ${typeof config.port}`)
  }

  if (config.tls.enabled) {

    if (!config.tls.certs || !config.tls.certs.key || !config.tls.certs.cert) {
      throw new Error("TLS enabled but `key` or `cert` missing")
    }
  }

  DEFAULT_OPTS.cwd = opts.cwd // TODO: REMOVE temp will remove
  debugLib.setDebug(config.DEBUG)
  // const app = new application()
  const mux = new ConnectionHandler()
  const server = config.tls.enabled ?
    tls.createServer(config.tls.certs, function (Socket) {
      mux.handleConnection(Socket)
    })
    : net.createServer(function (Socket) {
      mux.handleConnection(Socket)
    })

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
      setTimeout(() => {
        setTimeout(() => server.listen(config.tls.enabled ? tlsPort : plainPort), 100)
      }, 100)
    } else {
      handleFatal(err, LOG_PATH)
    }
  });

  server.listen(config.tls.enabled ? tlsPort : plainPort, () => {
    const proto = config.tls.enabled ? 'TLS' : 'TCP'
    const prt = config.tls.enabled ? tlsPort : plainPort
    debugLib.Debug(`Bunnymq listening over ${proto} on port ${prt}`, "info")
  })


  setupQueueTimers(config)


  process.on("SIGINT", async () => {
    const timers = getTimeManager();
    const queueMan = getQueueManager(0)
    timers.clearAll();
    await queueMan.shutdown();
    process.exit(0)
  });

  // graceful shutdown
  return function close(c) {
    server.close(() => { debugLib.Debug("server closed", "info"); c() })

  }

}


