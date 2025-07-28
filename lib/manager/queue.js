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



  unsubscribe(clientId, queueName) {
    const queueConsumers = this.consumers.get(queueName);
    if (queueConsumers) {
      queueConsumers.delete(clientId);
      if (this.pendingMessages.has(clientId)) {
        this.requeuePendingMessage(clientId);
      }
    }
  }


  // Core message distribution logic
  // FIXME: really bad plumbing: recursively and async IIFEs, for concurrency can cause really bad race conditions
  deliverMessages(queueName) {
    debugLib.Debug(`trying to send messages from ${queueName}`, 'info')
    const queueData = this.queues.get(queueName);
    //   console.log(queueData, "queue")
    if (!queueData) return;

    const { queue, opts } = queueData;
    const consumers = this.consumers.get(queueName);

    //    console.log(consumers)

    if (!consumers) return;

    const freeConsumers = this.findFreeConsumers(consumers); //  Map<clientId, isBusy>
    if (freeConsumers.length == 0) return;
    const now = Date.now()
    for (let i = 0; i < freeConsumers.length; i++) {
      // id
      let freeConsumer = freeConsumers[i]
      debugLib.Debug(`free consumer: ${freeConsumer}`, "info")
      debugLib.Debug(`quueuSize ${queue.size}`, "info")
      debugLib.Debug(`noAck ${opts.noAck}`)
      /**
       * @type {{value: string, id: string, status: number}}
       */
      const message = queue.dequeue();
      if (!message) return;

      if (now - message.timestamp > minutesToMilliseconds(opts.MessageExpiry)) {
        debugLib.Debug(`message expired ${message ? message.value : undefined}`, "info")
        this.deliverMessages(queueName)
        return
      }
      debugLib.Debug(`message ${message ? message.value : undefined}`, "info")

      // console.log(message, "message")
      if (this.tryDeliver(freeConsumer, queueName, message)) {
        if (opts.noAck) {
          // FIXME: really bad plumbing: recursively and async IIFEs, for concurrency can cause really bad race conditions
          this.deliverMessages(queueName)
          return
        }; // don't mark the consumer as busy and just lose the message
        consumers.set(freeConsumer, true); // isBusy
        message.status = DELIVERED
        this.pendingMessages.set(freeConsumer, {
          message,
          queueName,
          timestamp: Date.now()
        });
      } else {
        queue.enqueue(message); // Requeue on delivery failure
      }
    }

  }

  // Handle acknowledgment from consumer
  handleAck(clientId) {
    // console.log("ack")
    if (!this.pendingMessages.has(clientId)) {
      debugLib.Debug(`noAck is set to true for this client and queu`, 'info')
      return ERROR
    };

    const { queueName } = this.pendingMessages.get(clientId);
    this.pendingMessages.delete(clientId);

    const consumers = this.consumers.get(queueName);
    if (consumers?.has(clientId)) {
      consumers.set(clientId, false);
      // FIXME: Async functions that aren’t awaited,  async wrapper is pointless, deliverMessages isn’t async. It also swallows exceptions.
      ; (async function (instance) {
        // console.log("deliver msg", queueName)
        instance.deliverMessages(queueName); // Process next message
      })(this);
      return SUCCESS
    }

    return ERROR
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

  /**
   * 
   * @param {*} clientId 
   * @param {*} queueName 
   * @param {{value: string, id: string, status: number}} message 
   * @returns 
   */
  async tryDeliver(clientId, queueName, message) {
    try {

      const socket = globalclientsManager.retrieve(clientId, 0);
      //  console.log(socket)
      const msg = message.value
      //  const msgid = Buffer.from(message.id)
      const op = Buffer.alloc(6);

      op.writeInt8(MESSAGE, 0);
      op.writeInt8(NOOPTS, 1);
      op.writeUint32BE(msg.length, 2)
      const combinedBuffer = Buffer.concat([op, msg])

      socket.write(combinedBuffer);
      return true;
    } catch (error) {
      // FIX: give 2 or more chances before deleting a connection
      debugLib.Debug(`Delivery failed to ${clientId}: error: ${error}`, 'error');
      this.unsubscribe(clientId, queueName);
      return false;
    }
  }

  requeuePendingMessage(clientId) {
    const pending = this.pendingMessages.get(clientId);
    if (!pending) return;
    const queueData = this.queues.get(pending.queueName);
    if (queueData) {
      debugLib.Debug(`requing ${pending.message} `, "info")
      queueData.queue.enqueue(pending.message);
    }
    this.pendingMessages.delete(clientId);
  }

  checkPendingTimeouts() {
    const now = Date.now();
    for (const [clientId, pending] of this.pendingMessages) {
      if (now - pending.timestamp > this.timeoutMs) {
        this.requeuePendingMessage(clientId);
        // FIXME: this.pendingMessages.delete(clientId) if the client unsubbed, meaning requeuePendingMessage returned early line 207 
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
    debugLib.Debug(`taking snapshot of durable queues`, "info")
    if (this.durable.size == 0) {

      debugLib.Debug(`durable queues size: ${this.durable.size}-- returning early`, "info")
      return
    }
    const transaction = this.db.transaction(() => {
      const now = Date.now();

      for (const [queueName, _] of this.durable) {
        const queueData = this.queues.get(queueName);
        //   console.log(queueData, "queue")
        if (!queueData) continue;

        const { queue, opts } = queueData
        if (!queue.dirty) {
          debugLib.Debug(`queue : ${queueName} is up to date -- continue the loop`, "info")

          continue
        };

        if (queue.size == 0) {
          // do something - delete? 
          // continue
        }

        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO queues 
          VALUES (?, ?, ?)
        `);
        debugLib.Debug(`serializing queue: ${queueName}`, "info")

        const ser = queue.ser(opts)
        if (ser) {
          stmt.run(queueName, ser, now);
          queue.dirty = false;
        }

      }

      this.lastSnapshot = now;
    });

    await transaction();
  }

  deserializeQueue(buffer) {
    const { items, opts } = deserialize(buffer);
    const list = new ClassicDoublyLinkedList();
    items.forEach(item => list.enqueue(Buffer.from(item.toString(), "utf-8")));
    debugLib.Debug(`deserializedQueue size: ${list.size}`, "info")
    return { queue: list, opts };
  }


  restoreFromDisk() {
    try {
      const rows = this.db.prepare('SELECT name, data FROM queues').all();
      for (const row of rows) {
        this.queues.set(row.name, this.deserializeQueue(row.data));
      }
    } catch (e) {
      debugLib.Debug(`Restore failed: ${e.message}`, 'error');
    }
  }

  //FIXME: missing “e”
  newQueu(queueName, opts) {
    if (this.queues.has(queueName)) {

      // console.log("queue already has name: ", queueName)
      debugLib.Debug(`queue already has name: ${queueName}`, "info")
      return ERROR
    }
    // parse the options make ack optional(so messages are just removed - we don't care what happenes)
    if (opts) {
      // validate opts
      opts = Object.assign({}, DEFAULT_OPTS.queue, opts)

      debugLib.Debug(`options set ${opts} for: ${queueName}`)

    }
    this.queues.set(queueName, { queue: new ClassicDoublyLinkedList(), opts: opts ? opts : DEFAULT_OPTS.queue })
    if (opts.Durable) {
      debugLib.Debug(`Durable Queue: ${queueName}`, "info")
      this.durable.set(queueName, "")
    }
    return SUCCESS
  }

  insertMessage(queueName, msg) {

    // console.log(queueName, msg)
    if (!this.queues.has(queueName)) {
      return ERROR
    }

    this.queues.get(queueName).queue.enqueue(msg)

    // console.dir(this.queues)
    // ; (async function (instance) {
    //   // console.log("deliver msg", queueName)
    //   instance.deliverMessages(queueName); // Process next message
    // })(this);
    return SUCCESS
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
