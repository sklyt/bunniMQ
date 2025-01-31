import debugLib from "../utils.js";


export default class CleanupManager {
    queuCleanUp; 
    constructor(interval = 1000, queuCleanUp) {
        // this.queues = new Set();
        this.queuCleanUp = queuCleanUp
        setInterval(() => this.cleanup(), interval);
    }

    // registerQueue(queue) {
    //     this.queues.add(queue);
    // }

    // unregisterQueue(queue) {
    //     this.queues.delete(queue);
    // }

    async cleanup() {
            
         
                debugLib.Debug("cleaning pendingTimeouts", "info")
                this.queuCleanUp.checkPendingTimeouts()
            
         
                debugLib.Debug("cleaning queues", "info")

                this.queuCleanUp.clearExpiredMessagesInQueu()

          
        
       
    }
}


