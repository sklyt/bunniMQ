import debugLib from "../utils.js";


export default class CleanupManager {
    queuCleanUp; 
    constructor(interval = 1000, queuCleanUp) {
        // this.queues = new Set();
        this.queuCleanUp = queuCleanUp
        setInterval(() => this.cleanup(), interval);
    }

    async cleanup() {
            
         
                debugLib.Debug("cleaning pendingTimeouts", "info")
                this.queuCleanUp.checkPendingTimeouts()
                debugLib.Debug("cleaning queues", "info")
                this.queuCleanUp.clearExpiredMessagesInQueu() 
       
    }
}


