import { DELIVERED, ERROR, MESSAGE, NOOPTS, SUCCESS } from "../CONSTANTS.js";
import DEFAULT_OPTS from "../settings.js";
import ClassicDoublyLinkedList from "../queue/classic.js";
import globalclientsManager from "./clients.js"


import Database from 'better-sqlite3';
import { deserialize } from 'bson'; // Using BSON for binary serialization
import debugLib, { minutesToMilliseconds } from "../utils.js";
import { Mutex } from 'async-mutex';

// FIXME: same as application: No back‑pressure on socket writes

class QueueManager {




  /**
   * @type {Map<string, { queue: ClassicDoublyLinkedList, opts: Object }>}  
   * @returns { {list: ClassicDoublyLinkedList, opts: Object} }
   */
  queues = new Map()
  durable = new Map()

  consumers = new Map(); // queueName -> Map<clientId, isBusy>
  clientSubscriptions = new Map(); // clientId -> Set<queueName>
  //FIXME: track every message awaiting ack, but never remove expired ones until the next cleanup tick, could grow infinitley before cleanup
  pendingMessages = new Map(); // clientId -> { message, queueName, timestamp }
  queueMutex = new Map()
  globalMutex = new Mutex();
  constructor(pendingMessagesTimeout) {
    this.timeoutMs = minutesToMilliseconds(pendingMessagesTimeout)
    this.initDatabase()
    this.restoreFromDisk()
    this.lastSnapshot = 0;


  }

  initDatabase() {
    try {
      this.db = new Database('queues.db');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS queues (
          name TEXT PRIMARY KEY,
          data BLOB,
          updated_at INTEGER
        );
        PRAGMA journal_mode = WAL; -- Better write performance
      `);
    } catch (e) {
      debugLib.Debug(`Database initialization failed: ${e.message}`, 'critical');
    }
  }


  async subscribe(clientId, queueName) {
    const release = await this.globalMutex.acquire();
    try {
      // client -> queues subbed to
      if (!this.clientSubscriptions.has(clientId)) {
        this.clientSubscriptions.set(clientId, new Set());
      }
      this.clientSubscriptions.get(clientId).add(queueName);

      // queue and it's consumers
      if (!this.consumers.has(queueName)) {
        this.consumers.set(queueName, new Map());
      }

      if (!this.consumers.get(queueName).has(clientId)) {
        this.consumers.get(queueName).set(clientId, false);
        this.scheduleDelivery(queueName);
      }
      return SUCCESS;
    } catch (e) {
      debugLib.Debug(`Subscribe error: ${e.message}`, 'error');
      return ERROR;
    } finally {
      release();
    }
  }

  scheduleDelivery(queueName) {
    setImmediate(() => this.deliverMessages(queueName));
  }


  async unsubscribe(clientId, queueName) {
    const release = await this.globalMutex.acquire();
    try {
      if (this.clientSubscriptions.has(clientId)) {
        const subscriptions = this.clientSubscriptions.get(clientId);
        subscriptions.delete(queueName);
        if (subscriptions.size === 0) {
          this.clientSubscriptions.delete(clientId);
        }
      }

      const queueConsumers = this.consumers.get(queueName);
      if (queueConsumers?.has(clientId)) {
        queueConsumers.delete(clientId);
        // un-answered ACK from the clientId
        if (this.pendingMessages.has(clientId)) {
          await this.requeuePendingMessage(clientId);
        }
      }
      return SUCCESS;
    } catch (e) {
      debugLib.Debug(`Unsubscribe error: ${e.message}`, 'error');
      return ERROR;
    } finally {
      release();
    }
  }



  isMessageExpired(message, opts) {
    return Date.now() - message.timestamp > minutesToMilliseconds(opts.MessageExpiry);
  }

  // Finally will always trigger even if there's 0 consumers
  async deliverMessages(queueName) {
    if (!this.queueMutex.has(queueName)) {
      this.queueMutex.set(queueName, new Mutex());
    }
    const release = await this.queueMutex.get(queueName).acquire();

    try {
      const queueData = this.queues.get(queueName);
      if (!queueData) return;

      const { queue, opts } = queueData;
      const consumers = this.consumers.get(queueName);
      if (!consumers || queue.size === 0) return;

      const freeConsumers = this.findFreeConsumers(consumers);
      if (freeConsumers.length === 0) return;

      for (const clientId of freeConsumers) {
        if (queue.size === 0) break;

        const message = queue.dequeue();
        if (this.isMessageExpired(message, opts)) {
          continue; // Skip expired messages
        }

        if (await this.tryDeliver(clientId, queueName, message, opts)) {
          if (!opts.noAck) {
            consumers.set(clientId, true);
            this.pendingMessages.set(clientId, {
              message,
              queueName,
              timestamp: Date.now()
            });
          }
        } else {
          list.enqueue(message); // Requeue on failure
        }
      }
    } catch (e) {
      debugLib.Debug(`Delivery error: ${e.message}`, 'error');
    } finally {
      release();
      // Schedule next delivery if messages remain
      const consumers = this.consumers.get(queueName);
      if (!consumers) return;
      const freeConsumers = this.findFreeConsumers(consumers);
      if (this.queues.get(queueName)?.queue.size > 0 && freeConsumers.length != 0) {
        setImmediate(() => this.scheduleDelivery(queueName));
      }
    }
  }


  async handleAck(clientId) {
    const release = await this.globalMutex.acquire();
    try {
      if (!this.pendingMessages.has(clientId)) return ERROR;

      const { queueName } = this.pendingMessages.get(clientId);
      this.pendingMessages.delete(clientId);

      const consumers = this.consumers.get(queueName);
      if (consumers?.has(clientId)) {
        consumers.set(clientId, false); // busy false
        this.scheduleDelivery(queueName);
      }
      return SUCCESS;
    } catch (e) {
      debugLib.Debug(`Ack error: ${e.message}`, 'error');
      return ERROR;
    } finally {
      release();
    }
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

  notifyWritable(clientId) {
    const queues = this.clientSubscriptions.get(clientId) || [];
    for (const queueName of queues) {
      this.scheduleDelivery(queueName);
    }
  }
  /**
   * 
   * @param {*} clientId 
   * @param {*} queueName 
   * @param {{value: string, id: string, status: number}} message 
   * @returns 
   */
  async tryDeliver(clientId, queueName, message, opts) {
    try {

      const socket = globalclientsManager.retrieve(clientId, 0);
      if (!socket) {
        return false; // re-queue message
      }

      const msgBuffer = Buffer.from(message.value);
      const header = Buffer.alloc(6);
      header.writeInt8(MESSAGE, 0);
      header.writeInt8(NOOPTS, 1);
      header.writeUint32BE(msgBuffer.length, 2);

      const canWrite = socket.write(Buffer.concat([header, msgBuffer]));
      if (!canWrite) {
        globalclientsManager.setWritable(clientId, false); // not used yet
        socket.once('drain', () => {
          globalclientsManager.setWritable(clientId, true);
          this.notifyWritable(clientId);
        });
      }
      return canWrite;
    } catch (e) {
      debugLib.Debug(`Delivery failed: ${e.message}`, 'error');
      await this.unsubscribe(clientId, queueName);
      return false;
    }
  }



  async requeuePendingMessage(clientId) {
    const pending = this.pendingMessages.get(clientId);
    if (!pending) return;
    const queueData = this.queues.get(pending.queueName);
    if (queueData) {
      debugLib.Debug(`requeing ${pending.message} `, "info")
      queueData.queue.enqueue(pending.message);
    }
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


  clearExpiredMessagesInQueu() {
    for (const [queueName, { queue, opts }] of this.queues) {
      debugLib.Debug(`cleaning ${queueName}`, "info")
      queue.clean(opts)
    }
  }


  async takeSnapshot() {

    if (this.durable.size === 0) return;

    try {
      const now = Date.now();
      const transaction = this.db.transaction(() => {
        for (const [queueName, _] of this.durable) {
          const queueData = this.queues.get(queueName);
          if (!queueData || !queueData.queue.dirty) {
            continue
          };

          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO queues 
            VALUES (?, ?, ?)
          `);
          debugLib.Debug(` serialized Queue size: ${queueData.queue.size}`, "info")
          const serialized = queueData.queue.ser(queueData.opts);
          stmt.run(queueName, serialized, now);
          queueData.queue.dirty = false;
        }
        this.lastSnapshot = now;
      });
      await transaction();
    } catch (e) {
      debugLib.Debug(`Snapshot failed: ${e.message}`, 'error');
    }
  }


  deserializeQueue(buffer) {
    const { items, opts } = deserialize(buffer);
    const list = new ClassicDoublyLinkedList();
    items.forEach(item => list.enqueue(Buffer.from(item.toString(), "utf-8")));
    debugLib.Debug(`deserializedQueue size: ${list.size} opts: ${JSON.stringify(opts)}`, "info")
    return { queue: list, opts };
  }


  restoreFromDisk() {
    try {
      const rows = this.db.prepare('SELECT name, data FROM queues').all();
      for (const row of rows) {
        const queueData = this.deserializeQueue(row.data)
        if (queueData.opts.Durable) {
          this.durable.set(row.name, true)
        }
        this.queues.set(row.name, queueData);
      }
    } catch (e) {
      debugLib.Debug(`Restore failed: ${e.message}`, 'error');
    }
  }

  async createQueue(queueName, opts = {}) {
    if (this.queues.has(queueName)) return ERROR;

    const resolvedOpts = { ...DEFAULT_OPTS.queue, ...opts };
    const queue = {
      queue: new ClassicDoublyLinkedList(),
      opts: resolvedOpts
    };

    this.queues.set(queueName, queue);
    if (resolvedOpts.Durable) this.durable.add(queueName);

    return SUCCESS;
  }

  async insertMessage(queueName, message) {
    if (!this.queues.has(queueName)) return ERROR;

    const queueData = this.queues.get(queueName);
    queueData.queue.enqueue(message);

    this.scheduleDelivery(queueName);
    return SUCCESS;
  }



  DEBUG(queueName) {
    this.queues.get(queueName).queue.printList()
  }


  async shutdown() {
    debugLib.Debug("Taking Final Snapshot", "info")
    await this.takeSnapshot();
    debugLib.Debug("Closing Queue Database", "info")
    this.db?.close();
  }



}



let globalQueueManager = undefined
/**
 * 
 * @param {number} pendingMessagesTimeout 
 * @returns {QueueManager}
 */
export default function getQueueManger(pendingMessagesTimeout) {
  if (!globalQueueManager) {
    debugLib.Debug("Creating New QueueManager", "info")
    globalQueueManager = new QueueManager(pendingMessagesTimeout)
  }

  return globalQueueManager;
}
