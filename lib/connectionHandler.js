import globalclientsManager from "./manager/clients.js";
import Auth from "./auth/auth.js";

class ConnectionHandler {

    constructor() {
        this.auth = new Auth();
        this.auth.readCredentials();
        this.preallocatedBuffers = this.createPreallocatedBuffers();
        this.connectionTimers = new Map();
    }

    createPreallocatedBuffers() {
        const buffers = {
            heartbeat: Buffer.alloc(1),
            serverHealth: Buffer.alloc(1),
            respIdHeader: Buffer.alloc(1),
            authResponse: Buffer.alloc(6),
            errorResponse: Buffer.alloc(6)
        };

        buffers.heartbeat.writeInt8(HEARTBEAT_SIGNAL, 0);
        buffers.serverHealth.writeInt8(127, 0); // OK status
        buffers.respIdHeader.writeInt8(RESP_ID, 0);

        return buffers;
    }

    handleConnection(c) {
        const key = globalclientsManager.add(c);
        debugLib.Debug(`New client connected: ${key}`, "info");

        c.setKeepAlive(true, 10000);
        this.setupConnectionListeners(c, key);
        this.startHeartbeatMonitor(c, key);
    }

    setupConnectionListeners(c, key) {
        c.on("data", (data) => this.handleData(data, c, key));
        c.on("close", () => this.handleClose(key));
        c.on("error", (err) => this.handleError(err, key));
        c.on("drain", () => this.handleDrain(key));
    }

    startHeartbeatMonitor(c, key) {
        const timer = setInterval(() => {
            const isAlive = globalclientsManager.retrieve(key, 1);

            if (!isAlive) {
                debugLib.Debug(`Heartbeat missed for ${key}. Closing connection.`, "info");
                this.destroyConnection(c, key, timer);
                return;
            }

            globalclientsManager.update(key, 1, false);
            this.sendWithBackpressure(c, this.preallocatedBuffers.heartbeat, key);
        }, HEARTBEAT_INTERVAL);

            this.connectionTimers.set(key, timer); // central timer manager 

    }

    handleData(data, c, key) { }
    handleClose(key) { }
    handleError(err, key) { }
    handleDrain(key) { }

    destroyConnection(c, key, timer = null) {
    
    }





}

export default ConnectionHandler;