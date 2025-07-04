import { Socket } from "net";
import debugLib from "./utils.js";
import { Buffer } from 'node:buffer';
import qManagerMessages from "./broker.js";
import globalclientsManager from "./manager/clients.js";
import Auth from "./auth/auth.js";
import { AUTHENTICATE, HANDSHAKE, PROTOCOL_VERSION } from "./CONSTANTS.js";


const HEARTBEAT_INTERVAL = 15000;

const HEARTBEAT = Buffer.alloc(1);
HEARTBEAT.writeInt8(-1, 0); // -1 as a heartbeat sig

const SERVER_HEALTH = Buffer.alloc(1)
SERVER_HEALTH.writeInt8(127, 0)  //OK

// FIXME: better auth, coupling all connections to one credential store.4
// FIXME: magic numbers everywhere e.g  case -2: has no meaning out of context use enum const OPCODES = { RESP_ID: -7, RESP_AUTH: -8, }
const auth = new Auth()
// console.log(SERVER_HEALTH.readInt8(0))
    /**
     * 
     * @param {Buffer} data 
     * @param {String} connectionId
     */
function connectionData(data, connectionId, op){
       
        
        switch (op) {
            case -1:
                debugLib.Debug(`connection ${connectionId} is alive: `, "info")
    
                // clients.get(connectionId).isAlive = true;
                globalclientsManager.update(connectionId, 1, true)
                break;
            case -2: 
                 const conn = globalclientsManager.retrieve(connectionId, 0)
             
                 debugLib.Debug(`health test `, "info")
                 conn.write(SERVER_HEALTH)
                 break;
        
            default:
                qManagerMessages(op, data, connectionId)
                break;
        }
    }


// auth and allowed server lists is my method no TLS

export class application {

    constructor() {
        auth.readCredentials()
        // setTimeout(() => {
        //     const res = auth.Authenticate("sk", "mypassword")
        //     if(res){
        //         console.log(res)
        //     }
        //   }, 5000);
    }

    /**
     * 
     * @param {Socket} c 
     */
    connection(c) {
        try {
            c.setKeepAlive(true, 10000); // Enable TCP keep-alive
            const key = globalclientsManager.add(c)
          
            debugLib.Debug(`New client connected: ${key}`, "info")
    
            // clients.set(key, {c, isAlive: true}); //FIXME: Use an array instead of an object (bad idea don't do tuples see  clients manager)
    
               const heartbeatInterval = setInterval(() => {
                const isAlive = globalclientsManager.retrieve(key, 1);
        
                if (!isAlive) {
           
                  debugLib.Debug(`Heartbeat missed for ${key}. Closing connection.`, "info")
                  
                  c.destroy();
                  globalclientsManager.remove(key);
                  clearInterval(heartbeatInterval);
                  return;
                }
                globalclientsManager.update(key, 1, false)
               
                // FIXME: returns a **boolean** true if the message was flushed successfully to the kernel else false meaning it queued: if all or part of the data was queued in user memory what can we do?   
                c.write(HEARTBEAT); // Send heartbeat - Buffer.alloc(4);
    
              }, HEARTBEAT_INTERVAL);
    
            c.on("data", (data)=> {
               
                const op = data.readInt8(0)
                // console.log(op, "data")
                if(op == HANDSHAKE){
                    // read the flag 0 for hello, 1 for auth me 
                    // cant pass op HANDSHAKE unless authed
                   const v = data.readInt8(1)

                   if(v != PROTOCOL_VERSION){
                       // maybe write unkwon protocol version ERROR in the future
                        c.destroy();
                        globalclientsManager.remove(key);
                        clearInterval(heartbeatInterval)
                     return
                   }
                    // FIXME: very inefficient Buffer construction, can we create a single buffer?,  can pre‑allocate a single buffer of length required items
                    const op = Buffer.alloc(1)
                    op.writeInt8(-7, 0)
                    const id = Buffer.from(key)
                    const combinedBuffer = Buffer.concat([op, id])
                    debugLib.Debug(`writing id ${combinedBuffer}`, "info")
                    c.write(combinedBuffer)
                    return
                
                }

                if(op == AUTHENTICATE){
                      const credLen = data.readInt32BE(1)
                      const creds = data.subarray(5, 5 + credLen).toString()
                      const clientid = data.subarray(5 + credLen).toString()
                      const op = Buffer.alloc(6)  // FIXME: local op may confuse global op at line 98
                      if(clientid !== key){
                        // console.log(clientid, "key:", key)
                        
                    // TODO: (attention) anywhere there's concat ask: can the buffer be preallocated and created only once:
                 

                       op.writeInt8(-8, 0)
                       op.writeInt8(0, 1)
                       const errorMsg = Buffer.from(`ClientID ${clientid} unknown`)
                       op.writeInt32BE(errorMsg.length, 2)
                       const combined = Buffer.concat([op, errorMsg])
                       c.write(combined)
                       c.destroy();
                       globalclientsManager.remove(key);
                       clearInterval(heartbeatInterval)
                       return

                      }

                      const [username, password] = creds.split(":")
                      const isAuthed = auth.Authenticate(username, password)
                      // failed auth:
                      if(!isAuthed){
                        op.writeInt8(-8, 0)
                        op.writeInt8(0, 1)
                        // FIXME: we know the message length but op is already defined above(static length), this is a repeating pattern (wrap?)
                        const errorMsg = Buffer.from(`Username or Password is incorrect`)
                        op.writeInt32BE(errorMsg.length, 2)
                        const combined = Buffer.concat([op, errorMsg])
                        c.write(combined)
                        c.destroy();
                        globalclientsManager.remove(key);
                        clearInterval(heartbeatInterval)
                        return
                      }
                      // succesful auth:
                      globalclientsManager.update(key, 2, [true, isAuthed[1]])
                      op.writeInt8(-8, 0)
                      op.writeInt8(1, 1)
                      c.write(op)
                      
                    return

                }


                if(!globalclientsManager.isAuthenticated(key)){
                    debugLib.Debug("Client not allowed beyond this point, Destroy!", "info")
                    // FIXME: obvious duplicate(should be wrapped in a function)
                    c.destroy();
                    globalclientsManager.remove(key);
                    clearInterval(heartbeatInterval);
                    return
                }
                connectionData(data, key, op)
                
            })
           
            c.on("close", ()=> {
    
                  // FIXME: obvious duplicate(should be wrapped in a function)
                globalclientsManager.remove(key)
                clearInterval(heartbeatInterval)
                debugLib.Debug(`${key} connection Closed.`, "info")
       
    
                
            })

            c.on("error", (err)=> {
                   // FIXME: obvious duplicate(should be wrapped in a function)
                c.destroy();
                globalclientsManager.remove(key);
                clearInterval(heartbeatInterval);
            })
      
            
        } catch (error) {
               // FIXME: error is swallowed where does it go? the client driver won't know what happened (really bad idea)
        }
       
    
    }


}



 