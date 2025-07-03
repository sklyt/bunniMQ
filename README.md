## Pure JavaScript Message Broker (long lived TCP and Buffers)

- Longed Lived TCP

- Raw buffers

- Queue Management, Ack and clean up 

- Client driver based on events and event queues

- Pub/Sub 

- Bson serialization and Desirialization: Durable queues

- Handshake and Auth


**Bunni is a 4 day low level JavaScript experiment for an article series, that went decent!**

## Getting Started

```js
npm i bunni bunni-driver

```


### The message broker

creating bunny:


```js
import Bunny, {OPTS} from "bunni"
import path from "path"
import { fileURLToPath } from 'url';

OPTS.cwd = path.dirname(fileURLToPath(import.meta.url))  // used to read .auth file
Bunny({port: 3000, DEBUG:true})  // start a TCP server

```

Options:

```js
 let DEFAULT_OPTS = {
    port: 3000, 
    DEBUG: true,
    cwd: undefined,
     //  from RabbitMQ not to give more than one message to a worker at a time. Or, in other words, don't dispatch a new message to a worker until it has processed and acknowledged the previous one. Instead, it will dispatch it to the next worker that is not still busy.
    prefetch: 1,   // not implemented
    queue: {
      QueueExpiry: 60,
      MessageExpiry: 30,
      AckExpiry: 30,
      Durable: false,
      noAck: true,

    },
 
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


### Producer/Publisher 


```js
import Bunnymq from "bunni-driver"


const bunny = new Bunnymq({port: 3000, host:"localhost", username: "sk", password: "mypassword"})
bunny.QueueDeclare({name: "myqueue2", config:  {
    QueueExpiry: 60,
    MessageExpiry: 20,
    AckExpiry: 10,
    Durable: true,
    noAck: false,
}}, (rres)=> {console.log("queu creation:", rres)})

for(let i = 0; i < 100; i++){
    // work simulation
    bunny.Publish(`${Math.random()}-${i+100*8}`, (res)=> {console.log(res)})
}

```




### Consumer/worker


```js

import Bunnymq from "bunni-driver"


const bunny = new Bunnymq({port: 3000, host:"localhost", username: "john", password: "doees"})
bunny.QueueDeclare({name: "myqueue2", config: undefined}, (rres)=> {console.log("queu creation:", rres)})

let consumed = 0;
bunny.Consume("myqueue2",  async(msg) => {
    console.log('processing', msg)
    consumed++
    const [id, time] = msg.split("-")
    console.log(id, time)
    await new Promise((resolve) => setTimeout(resolve, time));
    console.log("consumed: ", consumed)
    bunny.Ack((isSuccess) => console.log("free to take more work", isSuccess))
})

```


### NOTES

- No TLS yet, Just RAW TCP (brokers are servers behinds servers)
- Use classic queue- I did implement a mapped queue which is way faster Just need to tie it, priority queue next

