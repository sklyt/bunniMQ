import debugLib from "../utils.js";

const cleanUps = ["pendingTimeouts", "queues"]
let i = 0
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

    cleanup() {
            
            if(cleanUps[i % cleanUps.length] == "pendingTimeouts");{
                debugLib.Debug("cleaning pendingTimeouts", "info")
                this.queuCleanUp.checkPendingTimeouts()
            }
            if(cleanUps[i % cleanUps.length] == "queues");{
                debugLib.Debug("cleaning queues", "info")

                this.queuCleanUp.clearExpiredMessagesInQueu()
            }
            i++
          
        
       
    }
}


