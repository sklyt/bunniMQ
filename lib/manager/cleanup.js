import debugLib from "../utils.js";


export default class CleanupManager {
    queuCleanUp; 
// FIXME: Unbounded interval timers again, should be centralized(startup),  Instantiate from a single entry point, create a scheduler
// TODO: solution a cleanup scheduler or expose a start method to gain control of the timer, it's all about the control
    constructor(interval = 1000, queuCleanUp) {
        // this.queues = new Set();
        this.queuCleanUp = queuCleanUp
        setInterval(() => this.cleanup(), interval);
    }

    // FIXME: too generic maybe runCleanupTasks()
    async cleanup() {
            
         
                debugLib.Debug("cleaning pendingTimeouts", "info")
                this.queuCleanUp.checkPendingTimeouts()
                debugLib.Debug("cleaning queues", "info")
                this.queuCleanUp.clearExpiredMessagesInQueu() 
       
    }
}


