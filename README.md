**Bunni is a 4-day low-level JavaScript experiment I did for fun; and it actually turned out decent.**

I wrote it months ago as a joke to see how far I could push barebones JS. After not touching it for a while, I came back and was surprised by how well it worked.

So I marked every code smell and issue (some are really bad) with `FIXME` tags, for anyone curious to learn low-level JS by doing, checkout the fixmes branch `git checkout fixmes`.

I am already applying the changes into main, fixmes will remain unmerged.




## Pure JavaScript Message Broker (long lived TCP and Buffers)

- Longed Lived TCP
 
- Raw buffers

- Queue Management, Ack and clean up 

- Client driver based on events and event queues

- Pub/Sub 

- Bson serialization and Desirialization: Durable queues

- Handshake and Auth




## Getting Started

```js
npm i bunni bunnimq-driver

```


### The message broker

creating bunny:

1. Non-TLS Encrypted

```js
// broker.js
import Bunny from "bunnimq";
import path from "path";
import { fileURLToPath } from 'url';


Bunny({
  port: 3000,
  DEBUG: true,
  cwd: path.dirname(fileURLToPath(import.meta.url)), // path to the .auth file
  queue: {
    Durable: true, 
    MessageExpiry: 60  // 1 hour
  }
});

```

2. Over TLS

```js

import fs from "node:fs"


const CERT_DIR = "C:/Users/[you]/Workspace/personal/JavaScript/backend/crs/TSLserver/certs"

const certs = { 
     key:  fs.readFileSync(path.join(CERT_DIR, 'server-key.pem')),
  cert: fs.readFileSync(path.join(CERT_DIR, 'server-cert.pem')),
}

Bunny({
  port: 3000,
  DEBUG: true,
  cwd: path.dirname(fileURLToPath(import.meta.url)), // path to the .auth file
  queueCleanupInterval: 20,
  snapshotInterval: 30,
  queue: {
    Durable: true, 
    MessageExpiry: 60  // 1 hour
  },
    tls: {
    enabled: true,
    certs,
    port: 433 // TLS port
   }
});



```

Options:

```js
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

```



create `.auth` file:

```js

sk:mypassword:4
jane:doeeee:1
john:doees:3

```

credential: username:password:permissions

```js
const perms = {
    1 : "PUBLISH",
    2 : "CONSUME",
    3 : "PUBLISH|CONSUME",
    4 : "ADMIN"
}

```

creds will be loaded when Bunny boots up and saved in a sqlite database

run the broker

```js
node.js ./broker.js
```


### Producer/Publisher 


```js
// producer
import BunnyMQ from "bunnimq-driver"

const config = {
    port: 3000,
    host: "localhost",
    username: "sk",
    password: "mypassword",
    autoReconnect: true

}

const bunny = new BunnyMQ(config)

bunny.queueDeclare({
    name: "TestQueue", config: {
        MessageExpiry: 10,
        AckExpiry: 20, // if not acknowledged in n minutes requeued. if noAck is false
        Durable: true,
        noAck: false, // expect acknowledgement from consumer before getting another packet.
    }
}, (res) => { console.log("queue creation status:", res) }) // 126 for already exist, 127 for sucess

for (let i = 0; i < 100; i++) {
    const audioJobsim = `{"jobId":"${crypto.randomUUID()}-audio","audio":"https://[project_id].supabase.co/storage/v1/object/public/[bucket_name]/[file_path]"}`
    bunny.publish("TestQueue", audioJobsim, res => { console.log(res) })
}


```

For TLS Encryption(if the broker is TLS enabled)

```JS
import path from "node:path"
import fs from "node:fs"

const CERT_DIR = "C:/Users/[you]/Workspace/personal/JavaScript/backend/crs/TSLserver/certs"

const config = {
    port: 433, // your chosen TLS port
    host: "localhost",
    username: "sk",
    password: "mypassword",
    autoReconnect: true,
    tls: true,
    tlsOptions: {
        ca: fs.readFileSync(path.join(CERT_DIR, 'ca-cert.pem')),
        key: fs.readFileSync(path.join(CERT_DIR, 'client-key.pem')),
        cert: fs.readFileSync(path.join(CERT_DIR, 'client-cert.pem')),
        servername: 'local.bunny' // from the certificate
    },

}


 
```

Run 

```js
node ./producer.js
```



### Consumer/worker


```js
// consumer.js

import BunnyMQ from "bunnimq-driver"
import path from "node:path"
import fs from "node:fs"

const CERT_DIR = "C:/Users/baned/Workspace/personal/JavaScript/backend/crs/TSLserver/certs"

const config = {
    port: 433,
    host: "localhost",
    username: "sk",
    password: "mypassword",
    tls: true,
    tlsOptions: {
        ca: fs.readFileSync(path.join(CERT_DIR, 'ca-cert.pem')),
        key: fs.readFileSync(path.join(CERT_DIR, 'client-key.pem')),
        cert: fs.readFileSync(path.join(CERT_DIR, 'client-cert.pem')),
        servername: 'local.bunny' // from the certificate
    },
    autoReconnect: true

}



const bunny = new BunnyMQ(config)
bunny.queueDeclare({name: "TestQueue", config:  {
    MessageExpiry: 1,
    AckExpiry: 1,
    Durable: true,
    noAck: false, // expect ack
}}, (res)=> {console.log("queue creation status:", res)})

bunny.consume("TestQueue",  async(msg) => {
    console.log('processing', msg)
    //await new Promise((resolve) => setTimeout(resolve, 1000)); uncomment to simulate work
    bunny.ack((isSuccess) => console.log("free to take more work", isSuccess))
}) 


```


run 

```js
node ./consumer.js
```



