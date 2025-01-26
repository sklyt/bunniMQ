import { Socket } from "node:net";
import { ACK, CREATE, OPTS, PUBLISH } from "./CONSTANTS.js";
import { parseProtocol } from "./protocol.js";
import debugLib from "./utils.js";



class Queue {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    enqueue(data) {
        const node = { data, next: null };
        if (!this.tail) {
            this.head = this.tail = node;
        } else {
            this.tail.next = node;
            this.tail = node;
        }
        this.size++;
    }

    dequeue() {
        if (!this.head) return null; // Queue is empty
        const data = this.head.data;
        this.head = this.head.next;
        if (!this.head) this.tail = null; // Queue is now empty
        this.size--;
        return data;
    }

    peek() {
        return this.head ? this.head.data : null;
    }

    isEmpty() {
        return this.size === 0;
    }
}





class QueueManager {
    
}













/**
 * @param {number} op
 * @param {Buffer} data 
 * @param {{c: Socket;isAlive: boolean;} } conn 
 */
export default function qManagerMessages(op, data, conn){
    switch (op) {
        case CREATE:
        case ACK :
        case PUBLISH:   // enqueu
            debugLib.Debug("create queue or subcribe", "info")
  
            const p = parseProtocol(data)
             debugLib.Debug(`protocol parsed ${p.meta}`, "info")
            const b = Buffer.allocUnsafe(4)
            b.writeInt32BE(10)
            conn.c.write(b)
            break;
        case OPTS:
            // console.log("set options")
            break;
    
        default:
            break;
    }
}