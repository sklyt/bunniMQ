import { minutesToMilliseconds } from "./utils.js"

 let DEFAULT_OPTS = {
    port: 3000, 
    DEBUG: true,
    cwd: undefined,
    queueCleanupInterval: 10,
    snapshotInterval: 60,
     //  from RabbitMQ not to give more than one message to a worker at a time. Or, in other words, don't dispatch a new message to a worker until it has processed and acknowledged the previous one. Instead, it will dispatch it to the next worker that is not still busy.

    prefetch: 1,  
    queue: {
      QueueExpiry: 60,
      MessageExpiry: 30,
      AckExpiry: 10, // 10 minutes to requeue pending messages
      Durable: false,
      noAck: true,

    },
      tls: {
    enabled: false,            // master switch
    port:  0,                  // 0 = same as plain port, or specify e.g. 3443
    certs: undefined,
    requestCert: false,        // ask client for cert
    rejectUnauthorized: false, // drop unauthorized clients
  }
 
 }





 export default DEFAULT_OPTS