 let DEFAULT_OPTS = {
    port: 3000, 
    DEBUG: true,
    cwd: undefined,
     //  from RabbitMQ not to give more than one message to a worker at a time. Or, in other words, don't dispatch a new message to a worker until it has processed and acknowledged the previous one. Instead, it will dispatch it to the next worker that is not still busy.

    prefetch: 1,  
    queue: {
      QueueExpiry: 60,
      MessageExpiry: 30,
      AckExpiry: 30,
      Durable: false,
      noAck: true,

    },
 
 }





 export default DEFAULT_OPTS