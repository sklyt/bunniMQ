import { Socket } from "node:net";
import { ACK, CREATE, JSONENCODED, NEWQUEUE, NOOPTS, OPTS, PUBLISH, SUCCESS } from "./CONSTANTS.js";
import { parseProtocol } from "./protocol.js";
import debugLib from "./utils.js";
import globalCleanupManager from "./manager/cleanup.js"
import globalclientsManager from "./manager/clients.js"
import globalQueuepManager from "./manager/queue.js"



/**
 * @param {number} op
 * @param {Buffer} data 
 * @param {string} conn 
 */
export default function qManagerMessages(op, data, connectionId){
    /**
     * @type {Socket}
     */
    const conn = globalclientsManager.retrieve(connectionId, 0)
    const b = Buffer.allocUnsafe(4)
    let res;
    switch (op) {

        case ACK :
        case PUBLISH:   // enqueu
 
  
            const p = parseProtocol(data)
    
            if(op == ACK){

            }else{
               res = globalQueuepManager.insertMessage(p.meta.queue, p.payload.toString())
            }
            
            b.writeUint8(res)
            conn.write(b)
            break;
        case OPTS:
            // console.log("set options")
            break;
        case NEWQUEUE:
            let queuepayload = parseProtocol(data)
            res =  globalQueuepManager.newQueu(queuepayload.payload.toString(), 
                     queuepayload.flags == NOOPTS ? undefined : queuepayload.meta)
            b.writeUint8(res)
            conn.write(b)
            break;
    
        default:
            break;
    }
}

