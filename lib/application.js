import { Socket } from "net";
import debugLib from "./utils.js";
import { Buffer } from 'node:buffer';
import qManagerMessages from "./broker.js";

const HEARTBEAT_INTERVAL = 15000;

const HEARTBEAT = Buffer.alloc(4);
HEARTBEAT.writeInt32BE(-1); // -1 as a heartbeat sig

const SERVER_HEALTH = Buffer.alloc(4)
SERVER_HEALTH.writeUInt32BE(200)  // OK


/**
 * @type {Map<string, {c:Socket, isAlive: boolean}>}
 */
const clients = new Map(); 


    /**
     * 
     * @param {Buffer} data 
     * @param {String} connectionId
     */
function connectionData(data, connectionId){
        const op = data.readInt8(0)
        const conn = clients.get(connectionId)
        switch (op) {
            case -1:
                debugLib.Debug(`connection ${connectionId} is alive: `, "info")
    
                clients.get(connectionId).isAlive = true;
                break;
            case -2: 
                debugLib.Debug(`health test `, "info")
                 conn.c.write(SERVER_HEALTH)
                 break;
            case -3:
                let aliveClientsCount = 0;
                for (const client of clients.values()) {
                  if (client.isAlive) {
                    aliveClientsCount++;
                  }
                }
              debugLib.Debug(`clients actually connected: ${aliveClientsCount}`, "info")
               const alive = Buffer.alloc(4)
               alive.writeUint32BE(aliveClientsCount)
               conn.c.write(alive)
               break;
        
            default:
                qManagerMessages(op, data, conn)
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
        c.setKeepAlive(true, 10000); // Enable TCP keep-alive
        const key = `${c.remoteAddress}:${c.remotePort}`;
      
        debugLib.Debug(`New client connected: ${key}`, "info")

        clients.set(key, {c, isAlive: true}); // Use an array instead of an object

        const heartbeatInterval = setInterval(() => {
            const conn = clients.get(key);
    
            if (!conn.isAlive) {
       
              debugLib.Debug(`Heartbeat missed for ${key}. Closing connection.`, "info")
              
              c.destroy();
              clients.delete(key);
              clearInterval(heartbeatInterval);
              return;
            }
            conn.isAlive = false
           
            c.write(HEARTBEAT); // Send heartbeat - Buffer.alloc(4);

          }, HEARTBEAT_INTERVAL);

        c.on("data", (data)=> {
            connectionData(data, key)
        })
       
        c.on("close", ()=> {

            clients.delete(key)
            clearInterval(heartbeatInterval)
            debugLib.Debug(`${key} connection Closed.`, "info")
            debugLib.Debug(`Connected Clients ${clients.size}`, "info")

            
        })
        
    
    }


}



 