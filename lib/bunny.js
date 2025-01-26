import net from "node:net"
import { application } from "./application.js"
import debugLib from "./utils.js"

export default function CreateBunny(opts = {port: 3000, DEBUG: false}){
  debugLib.setDebug(opts.DEBUG)
  const app = new application()
  const server = net.createServer(app.connection)
  
  server.on('error', (err) => {
    throw err;
  });

  server.listen(opts.port)


  return function close(c){
    server.close(()=> debugLib.Debug("server closed", "info"))
    c()
  }

}


