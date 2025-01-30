import { Socket } from "net";
import debugLib from "./utils.js";
import { Buffer } from 'node:buffer';
import qManagerMessages from "./broker.js";
import globalclientsManager from "./manager/clients.js";


const HEARTBEAT_INTERVAL = 15000;

const HEARTBEAT = Buffer.alloc(1);
HEARTBEAT.writeInt8(-1, 0); // -1 as a heartbeat sig

const SERVER_HEALTH = Buffer.alloc(1)
SERVER_HEALTH.writeInt8(127, 0)  //OK


// console.log(SERVER_HEALTH.readInt8(0))
    /**
     * 
     * @param {Buffer} data 
     * @param {String} connectionId
     */
function connectionData(data, connectionId){
        const op = data.readInt8(0)
        
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


export class application {

    constructor() {
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
    
            // clients.set(key, {c, isAlive: true}); // Use an array instead of an object
    
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
               
                c.write(HEARTBEAT); // Send heartbeat - Buffer.alloc(4);
    
              }, HEARTBEAT_INTERVAL);
    
            c.on("data", (data)=> {
                connectionData(data, key)
                
            })
           
            c.on("close", ()=> {
    
               
                globalclientsManager.remove(key)
                clearInterval(heartbeatInterval)
                debugLib.Debug(`${key} connection Closed.`, "info")
       
    
                
            })

            c.on("error", (err)=> {
                c.destroy();
                globalclientsManager.remove(key);
                clearInterval(heartbeatInterval);
            })
            const op = Buffer.alloc(1)
            op.writeInt8(-7, 0)
            const id = Buffer.from(key)
            const combinedBuffer = Buffer.concat([op, id])
            debugLib.Debug(`writing id ${combinedBuffer}`, "info")
            c.write(combinedBuffer)
            
        } catch (error) {
            
        }
       
    
    }


}



 