import net from "node:net"
import { application } from "./application.js"
import debugLib from "./utils.js"
import DEFAULT_OPTS from "./settings.js"


export default function CreateBunny(opts){
  Object.assign(DEFAULT_OPTS, opts)
  debugLib.setDebug(DEFAULT_OPTS.DEBUG)
  const app = new application()
  const server = net.createServer(app.connection)
  
  server.on('error', (err) => {
    throw err;
  });

  server.listen(DEFAULT_OPTS.port)


  return function close(c){
    server.close(()=> debugLib.Debug("server closed", "info"))
    c()
  }

}


