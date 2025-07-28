import { Socket } from "node:net";
import { ACK, CREATE, JSONENCODED, NEWQUEUE, NOOPTS, OPTS, PUBLISH, SUBSCRIBE, SUCCESS } from "./CONSTANTS.js";
import { parseProtocol } from "./protocol.js";
import debugLib, { minutesToMilliseconds } from "./utils.js";
// import globalCleanupManager from "./manager/cleanup.js"
import globalclientsManager from "./manager/clients.js"
import getQueueManager from "./manager/queue.js"


const globalQueueManager = getQueueManager()

/**
 * @param {number} op
 * @param {Buffer} data 
 * @param {string} conn 
 */
export default function qManagerMessages(op, data, connectionId) {
    /**
     * @type {Socket}
     */
    const conn = globalclientsManager.retrieve(connectionId, 0)
    // re-use global buffer qManager is called a lot no need to create a new buffer all of the time
    const b = Buffer.allocUnsafe(1) // FIXME: Premature optimization. very useless if we wanted only it'll be outside the function, it's recreated on every call

    let res;
    switch (op) {

        case ACK:
        case PUBLISH:   // enqueu


            const p = parseProtocol(data)

            if (op == ACK) {
                res = globalQueueManager.handleAck(p.payload.toString())
            } else {
                res = globalQueueManager.insertMessage(p.meta.queue, p.payload)
            }

            b.writeInt8(res, 0)
            conn.write(b)
            break;
        case OPTS:
            // console.log("set options")
            break;
        case NEWQUEUE:
            let queuepayload = parseProtocol(data)
             globalQueueManager.createQueue(queuepayload.payload.toString(),
                queuepayload.flags == NOOPTS ? undefined : queuepayload.meta).then(res => {
                    b.writeInt8(res, 0)
                    conn.write(b)
                }).catch(err => {
                    console.log(err)
                    // TODO: unexpected behaviour
                })

            break;
        case SUBSCRIBE:
            let load = parseProtocol(data)
            globalQueueManager.subscribe(load.payload.toString(), load.meta.toString()).then(res => {
                b.writeInt8(res, 0)
                conn.write(b)
            }).catch(err => {
                console.log(err)
                // TODO: unexpected behaviour
            })

            break;

        default:
            // FIXME: No default/error handling
            break;
    }
}

