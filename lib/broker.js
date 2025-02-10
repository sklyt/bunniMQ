import { Socket } from "node:net";
import { ACK, CREATE, JSONENCODED, NEWQUEUE, NOOPTS, OPTS, PUBLISH, SUBSCRIBE, SUCCESS } from "./CONSTANTS.js";
import { parseProtocol } from "./protocol.js";
import debugLib, { minutesToMilliseconds } from "./utils.js";
import globalCleanupManager from "./manager/cleanup.js"
import globalclientsManager from "./manager/clients.js"
import globalQueuepManager from "./manager/queue.js"





// use the client given cleanup?
new globalCleanupManager(minutesToMilliseconds(30), globalQueuepManager);

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
    // re-use global buffer qManager is called a lot no need to create a new buffer all of the time
    const b = Buffer.allocUnsafe(1)

    let res;
    switch (op) {

        case ACK :
        case PUBLISH:   // enqueu
 
  
            const p = parseProtocol(data)
    
            if(op == ACK){
              res = globalQueuepManager.handleAck(p.payload.toString())
            }else{
               res = globalQueuepManager.insertMessage(p.meta.queue, p.payload)
            //    console.log(res)
            }
            
            b.writeInt8(res, 0)
            conn.write(b)
            break;
        case OPTS:
            // console.log("set options")
            break;
        case NEWQUEUE:
            let queuepayload = parseProtocol(data)
            res =  globalQueuepManager.newQueu(queuepayload.payload.toString(), 
                     queuepayload.flags == NOOPTS ? undefined : queuepayload.meta)
            b.writeInt8(res, 0)
            conn.write(b)
            break;
        case SUBSCRIBE:
            let load = parseProtocol(data)
            res = globalQueuepManager.subscribe(load.payload.toString(), load.meta.toString())
            b.writeInt8(res, 0)
            conn.write(b)
            break;
    
        default:
            break;
    }
}

