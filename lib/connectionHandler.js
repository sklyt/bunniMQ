import { Socket } from "net";
import debugLib from "./utils.js";
import { Buffer } from 'node:buffer';
import qManagerMessages from "./broker.js";
import globalclientsManager from "./manager/clients.js";
import Auth from "./auth/auth.js";
import {
  AUTHENTICATE,
  HANDSHAKE,
  PROTOCOL_VERSION,
  HEARTBEAT_SIGNAL,
  HEALTH_CHECK,
  RESP_ID,
  RESP_AUTH,
  RESP_ERROR,
  CONNECTION_CLOSE,
} from "./CONSTANTS.js";

const HEARTBEAT_INTERVAL = 15000;

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

    this.connectionTimers.set(key, timer);
  }

  handleData(data, c, key) {
    try {
      const op = data.readInt8(0);

      switch (op) {
        case HANDSHAKE:
          this.handleHandshake(data, c, key);
          break;
        case AUTHENTICATE:
          this.handleAuthentication(data, c, key);
          break;
        case HEALTH_CHECK:
          this.handleHealthCheck(c, key);
          break;
        case HEARTBEAT_SIGNAL:
           debugLib.Debug(`connection ${key} is alive: `, "info")
           globalclientsManager.update(key, 1, true)
          break;
        default:
          if (globalclientsManager.isAuthenticated(key)) {
            qManagerMessages(op, data, key);
          } else {
            debugLib.Debug("Unauthenticated access attempt", "warn");
            this.destroyConnection(c, key);
          }
      }
    } catch (error) {
      debugLib.Debug(`Data handling error: ${error.message}`, "error");
      this.destroyConnection(c, key);
    }
  }

  handleHandshake(data, c, key) {
    const version = data.readInt8(1);

    if (version !== PROTOCOL_VERSION) {
      const error = Buffer.from(`Unsupported protocol version: ${version}`);
      this.sendError(c, RESP_ERROR, error, key);
      this.destroyConnection(c, key);
      return;
    }

    const idBuffer = Buffer.from(key);
    const response = Buffer.concat([
      this.preallocatedBuffers.respIdHeader,
      idBuffer
    ]);

    this.sendWithBackpressure(c, response, key);
  }

  handleAuthentication(data, c, key) {
    const credLen = data.readInt32BE(1);
    const creds = data.subarray(5, 5 + credLen).toString();
    const clientId = data.subarray(5 + credLen).toString();

    if (clientId !== key) {
      const error = Buffer.from(`ClientID ${clientId} unknown`);
      this.sendError(c, RESP_AUTH, error, key);
      this.destroyConnection(c, key);
      return;
    }

    const [username, password] = creds.split(":");
    const authResult = this.auth.Authenticate(username, password);

    if (!authResult) {
      const error = Buffer.from("Username or Password is incorrect");
      this.sendError(c, RESP_AUTH, error, key);
      this.destroyConnection(c, key);
      return;
    }

    globalclientsManager.update(key, 2, [true, authResult[1]]);

    // Successful auth response
    const response = Buffer.alloc(2);
    response.writeInt8(RESP_AUTH, 0);
    response.writeInt8(1, 1);

    this.sendWithBackpressure(c, response, key);
  }

  handleHealthCheck(c, key) {
    debugLib.Debug(`Health check from ${key}`, "info");
    this.sendWithBackpressure(c, this.preallocatedBuffers.serverHealth, key);
  }

  sendError(c, responseType, errorMsg, key) {
    const header = this.preallocatedBuffers.errorResponse;
    header.writeInt8(responseType, 0);
    header.writeInt8(0, 1); // Error flag
    header.writeUint32BE(errorMsg.length, 2);

    const response = Buffer.concat([header, errorMsg]);
    this.sendWithBackpressure(c, response, key);
  }
  /**
   * 
   * @param {Socket} c 
   * @param {*} data 
   * @param {*} key 
   * @returns 
   */
  sendWithBackpressure(c, data, key) {
    try {
      if (!c.writable || c.destroyed) return false;

      if (!c.write(data)) {
        debugLib.Debug("failed to write pausing for drain", "info")
        // TODO: research more it talks about read, who the kernel or me?
        c.pause();
        c.once("drain", () => c.resume());
        return false;
      }
      return true;
    } catch (error) {
      debugLib.Debug(`Send error: ${error.message}`, "error");
      this.destroyConnection(c, key);
      return false;
    }
  }

  handleDrain(key) {
    globalclientsManager.setWritable(key, true);
  }

  handleClose(key) {
    debugLib.Debug(`${key} connection closed`, "info");
    this.cleanupConnection(key);
  }

  handleError(err, key) {
    debugLib.Debug(`Connection error: ${err.message}`, "error");
    this.cleanupConnection(key);
  }

  destroyConnection(c, key, timer = null) {
    try {
      if (c && !c.destroyed) {
        c.end(Buffer.from([CONNECTION_CLOSE]));
        c.destroy();
      }
    } catch (e) {
      debugLib.Debug(`Destroy connection error: ${e.message}`, "error");
    } finally {
      this.cleanupConnection(key, timer);
    }
  }

  cleanupConnection(key, timer = null) {
    const actualTimer = timer || this.connectionTimers.get(key);
    if (actualTimer) clearInterval(actualTimer);

    globalclientsManager.remove(key);
    this.connectionTimers.delete(key);
  }
}

export default ConnectionHandler;