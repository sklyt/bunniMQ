# Bunni Message Broker

**Bunni is a 4-day low-level JavaScript experiment I did for fun; and it actually turned out decent.**

I wrote it months ago as a joke to see how far I could push barebones JS. After not touching it for a while, I came back and was surprised by how well it worked.

So I marked every code smell and issue (some are really bad) with `FIXME` tags. For anyone curious to learn low-level JS by doing, checkout the fixmes branch: `git checkout fixmes`.

I'm already applying the changes into main; fixmes will remain unmerged.

## Pure JavaScript Message Broker (Long-lived TCP and Buffers)

- Long-lived TCP (TLS support)
- Raw buffers
- Queue Management, Ack and cleanup 
- Client driver based on events and event queues
- Pub/Sub 
- BSON serialization and deserialization: Durable queues
- Handshake and Auth

## Getting Started

```bash
npm i bunnimq bunnimq-driver
```

### The Message Broker

Creating bunny:

#### 1. Non-TLS Encrypted

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

#### 2. Over TLS

```js
import fs from "node:fs"

const CERT_DIR = "C:/Users/[you]/Workspace/personal/JavaScript/backend/crs/TLSserver/certs"

const certs = { 
  key: fs.readFileSync(path.join(CERT_DIR, 'server-key.pem')),
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
    port: 443 // TLS port
  }
});
```

#### Options:

```js
let DEFAULT_OPTS = {
  port: 3000, 
  DEBUG: true,
  cwd: undefined,
  queueCleanupInterval: 10,
  snapshotInterval: 60,
  // From RabbitMQ: not to give more than one message to a worker at a time. 
  // In other words, don't dispatch a new message to a worker until it has 
  // processed and acknowledged the previous one. Instead, it will dispatch 
  // it to the next worker that is not still busy.
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
    port: 0,                   // 0 = same as plain port, or specify e.g. 3443
    certs: undefined,
    requestCert: false,        // ask client for cert
    rejectUnauthorized: false, // drop unauthorized clients
  }
}
```

#### Create `.auth` file:

```
sk:mypassword:4
jane:doeeee:1
john:doees:3
```

Format: `username:password:permissions`

```js
const perms = {
  1: "PUBLISH",
  2: "CONSUME",
  3: "PUBLISH|CONSUME",
  4: "ADMIN"
}
```

Credentials will be loaded when Bunny boots up and saved in a SQLite database.

#### Run the broker

```bash
node ./broker.js
```

### Producer/Publisher 

```js
// producer.js
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
  name: "TestQueue", 
  config: {
    MessageExpiry: 10,
    AckExpiry: 20, // if not acknowledged in n minutes, requeue. if noAck is false
    Durable: true,
    noAck: false, // expect acknowledgement from consumer before getting another packet
  }
}, (res) => { 
  console.log("queue creation status:", res) // 126 for already exists, 127 for success
})

for (let i = 0; i < 100; i++) {
  const audioJobSim = `{"jobId":"${crypto.randomUUID()}-audio","audio":"https://[project_id].supabase.co/storage/v1/object/public/[bucket_name]/[file_path]"}`
  bunny.publish("TestQueue", audioJobSim, res => { 
    console.log(res) 
  })
}
```

#### For TLS Encryption (if the broker is TLS enabled)

```js
import path from "node:path"
import fs from "node:fs"

const CERT_DIR = "C:/Users/[you]/Workspace/personal/JavaScript/backend/crs/TLSserver/certs"

const config = {
  port: 443, // your chosen TLS port
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

#### Run 

```bash
node ./producer.js
```

### Consumer/Worker

```js
// consumer.js
import BunnyMQ from "bunnimq-driver"
import path from "node:path"
import fs from "node:fs"

const CERT_DIR = "C:/Users/[you]/Workspace/personal/JavaScript/backend/crs/TLSserver/certs"

const config = {
  port: 443,
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

bunny.consume("TestQueue", async (msg) => {
  console.log('processing', msg)
  // await new Promise((resolve) => setTimeout(resolve, 1000)); // uncomment to simulate work
  bunny.ack((isSuccess) => console.log("free to take more work", isSuccess))
}) 
```

#### Run 

```bash
node ./consumer.js
```