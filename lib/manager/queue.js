import { DELIVERED, ERROR, MESSAGE, NOOPTS, SUCCESS } from "../CONSTANTS.js";
import DEFAULT_OPTS from "../settings.js";
import ClassicDoublyLinkedList from "../queue/classic.js";
import globalclientsManager from "./clients.js"


import Database from 'better-sqlite3';
import { serialize, deserialize } from 'bson'; // Using BSON for binary serialization
import debugLib from "../utils.js";


class QueueManager {
    /**
     * @type {Map<string, [ClassicDoublyLinkedList, Record<any, any>]>}
     */
    queues = new Map()

    consumers = new Map(); // queueName -> Map<clientId, isBusy>
    pendingMessages = new Map(); // clientId -> { message, queueName, timestamp }

    subscribe(clientId, queueName) {
      if (!this.consumers.has(queueName)) {
          this.consumers.set(queueName, new Map());
      }
      this.consumers.get(queueName).set(clientId, false);
      ;(async function() {
        this.deliverMessages(queueName); // Process next message
    })();
    return SUCCESS
    }
    

    unsubscribe(clientId, queueName) {
      const queueConsumers = this.consumers.get(queueName);
      if (queueConsumers) {
          queueConsumers.delete(clientId);
          if (this.pendingMessages.has(clientId)) {
              this.requeuePendingMessage(clientId);
          }
      }
  }

  
    // Core message distribution logic
    deliverMessages(queueName) {
        debugLib.Debug(`trying to send messages from ${queueName}`, 'info')
      const queueData = this.queues.get(queueName);
      if (!queueData) return;
      
      const [queue] = queueData;
      const consumers = this.consumers.get(queueName);
      
       

        if (!consumers) return;
        
        const freeConsumers = this.findFreeConsumers(consumers); //  Map<clientId, isBusy>
        if (freeConsumers.length == 0) return;

        for(let i = 0; i < freeConsumers.length; i++){
            // id
            let freeConsumer = freeConsumers[i]
            /**
             * @type {{value: string, id: string, status: number}}
             */
            const message = queue.dequeue();
            if (this.tryDeliver(freeConsumer, queueName, message)) {
                consumers.set(freeConsumer, true); // isBusy
                 message.status = DELIVERED
                this.pendingMessages.set(freeConsumer, { 
                    message, 
                    queueName, 
                    timestamp: Date.now() 
                });
            } else {
                queue.enqueue(message); // Requeue on delivery failure
            }
        }
        
  }

  // Handle acknowledgment from consumer
  handleAck(clientId) {
      if (!this.pendingMessages.has(clientId)) return ERROR;
      
      const { queueName } = this.pendingMessages.get(clientId);
      this.pendingMessages.delete(clientId);
      
      const consumers = this.consumers.get(queueName);
      if (consumers?.has(clientId)) {
          consumers.set(clientId, false);
        ;(async function() {
            this.deliverMessages(queueName); // Process next message
        })();
        return SUCCESS
      }

      return ERROR
  }

  // Helper methods
  findFreeConsumers(consumers) {
      let freeConsumers = []
      for (const [clientId, isBusy] of consumers) {
          if (!isBusy && globalclientsManager.isConnected(clientId)) {
              freeConsumers.push(clientId)
          }
      }
      debugLib.Debug(`number of free consumers ${freeConsumers.length}`, 'info')
      return freeConsumers;
  }

  /**
   * 
   * @param {*} clientId 
   * @param {*} queueName 
   * @param {{value: string, id: string, status: number}} message 
   * @returns 
   */
 async tryDeliver(clientId, queueName, message) {  
      try {
             const socket = globalclientsManager.retrieve(clientId, 0);
             const msg = Buffer.from(message.value)
             const msgid = Buffer.from(message.id)
             const op = Buffer.alloc(6);
            
             op.writeInt8(MESSAGE, 0); 
             op.writeInt8(NOOPTS, 1);
             op.writeUint32BE(msg.length, 2)
             const combinedBuffer = Buffer.from([op, msg, msgid])
             socket.write(combinedBuffer);
          return true;
      } catch (error) {
        // give 2 or more chances before deleting a connection
          debugLib.Debug(`Delivery failed to ${clientId}: error: ${error}`, 'error');
          this.unsubscribe(clientId, queueName);
          return false;
      }
  }

  requeuePendingMessage(clientId) {
      const pending = this.pendingMessages.get(clientId);
      if (!pending) return;

      const [queue] = this.queues.get(pending.queueName) || [];
      if (queue) queue.enqueue(pending.message);
      
      this.pendingMessages.delete(clientId);
  }

  checkPendingTimeouts() {
      const now = Date.now();
      for (const [clientId, pending] of this.pendingMessages) {
          if (now - pending.timestamp > this.timeoutMs) {
              this.requeuePendingMessage(clientId);
              const consumers = this.consumers.get(pending.queueName);
              if (consumers?.has(clientId)) {
                  consumers.set(clientId, false);
              }
          }
      }
  }

  clearExpiredMessagesInQueu(){
    for (const [queueName, [queue, opts]] of this.queues) {
         debugLib.Debug(`cleaning ${queueName}`, "info")
         queue.clean(opts)
    }
  }

  // 
    newQueu(queueName, opts){
      if(this.queues.has(queueName)){
        // console.log("queue already has name: ", queueName)
        debugLib.Debug(`queue already has name: ${queueName}`, "info")
        return ERROR
      }
      if(opts){
        // validate opts
       
      }
      this.queues.set(queueName, [new ClassicDoublyLinkedList(), opts ? opts : DEFAULT_OPTS.queue])
      return SUCCESS
    }

    insertMessage(queueName, msg){
      
        // console.log(queueName, msg)
        if(!this.queues.has(queueName)){
            return ERROR
        }

        this.queues.get(queueName)[0].enqueue(msg)

        // console.dir(this.queues)
        this.deliverMessages(queueName)
        return SUCCESS
    }
    
    DEBUG(queueName){
        this.queues.get(queueName)[0].printList()
    }

    
}





// Singleton cleanup manager

const globalQueuepManager = new QueueManager()
export default globalQueuepManager