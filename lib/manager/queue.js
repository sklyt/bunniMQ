import { ERROR, SUCCESS } from "../CONSTANTS.js";
import DEFAULT_OPTS from "../settings.js";
import ClassicDoublyLinkedList from "../queue/classic.js";
class QueueManager {
    /**
     * @type {Map<string, [ClassicDoublyLinkedList, Record<any, any>]>}
     */
    queues = new Map()
   
    newQueu(queueName, opts){
      if(this.queues.has(queueName)){
        console.log("queue already has name: ", queueName)
        return ERROR
      }
      if(opts){
        // validate opts
       
      }
      this.queues.set(queueName, [new ClassicDoublyLinkedList(), opts ? opts : DEFAULT_OPTS.queue])
      return SUCCESS
    }

    insertMessage(queueName, msg){
      
        console.log(queueName, msg)
        if(!this.queues.has(queueName)){
            return ERROR
        }

        this.queues.get(queueName)[0].enqueue(msg)

        // console.dir(this.queues)
        return SUCCESS
    }
    
    DEBUG(queueName){
        this.queues.get(queueName)[0].printList()
    }

    
}





// Singleton cleanup manager

const globalQueuepManager = new QueueManager()
export default globalQueuepManager