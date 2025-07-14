import debugLib from "./utils.js";

class TimerManager {
    constructor() {
        this.timers = new Map();
    }

    setInterval(id, fn, interval) {
        this.clear(id);
        this.timers.set(id, setInterval(fn, interval));
    }

    clear(id) {
        if (this.timers.has(id)) {
            clearInterval(this.timers.get(id));
            this.timers.delete(id);
        }
    }

    clearAll() {
        for (const timer of this.timers.values()) clearInterval(timer);
         debugLib.Debug("Tearing Down All Timers", "info")
         this.timers.clear();
    }
}

let scheduler = undefined;

/**
 * 
 * @returns {TimerManager}
 */
export default function getTimeManager() {
    if (!scheduler) {
        debugLib.Debug("Creating New Scheduler", "info")
        scheduler = new TimerManager()
    }

    return scheduler

}