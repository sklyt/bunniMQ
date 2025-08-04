import { Socket } from "node:net";
import { ACK, CREATE, JSONENCODED, NEWQUEUE, NOOPTS, OPTS, PUBLISH, SUBSCRIBE, SUCCESS } from "./CONSTANTS.js";
import { parseProtocol } from "./protocol.js";
import debugLib, { minutesToMilliseconds } from "./utils.js";
// import globalCleanupManager from "./manager/cleanup.js"
import globalclientsManager from "./manager/clients.js"
import getQueueManager from "./manager/queue.js"

// TODO: senderror
const globalQueueManager = getQueueManager()
const b = Buffer.allocUnsafe(1)
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



    switch (op) {

        case ACK:
        case PUBLISH:   // enqueu
            const p = parseProtocol(data)

            if (op == ACK) {
                globalQueueManager.handleAck(p.payload.toString()).then(res => {
                    b.writeInt8(res, 0)
                    conn.write(b)
                }).catch(err => {

                })
            } else {
                globalQueueManager.insertMessage(p.meta.queue, p.payload).then(res => {
                    b.writeInt8(res, 0)
                    conn.write(b)
                }).catch(err => {

                })
            }


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

