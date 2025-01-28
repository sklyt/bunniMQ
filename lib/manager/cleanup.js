class CleanupManager {
    constructor(interval = 1000) {
        this.queues = new Set();
        setInterval(() => this.cleanupAll(), interval);
    }

    registerQueue(queue) {
        this.queues.add(queue);
    }

    unregisterQueue(queue) {
        this.queues.delete(queue);
    }

    cleanupAll() {
        for (const queue of this.queues) {
            queue.cleanup();
        }
    }
}

const globalCleanupManager = new CleanupManager(1000);
export default globalCleanupManager