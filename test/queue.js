import { equal } from 'assert';
import CreateBunny from '../lib/bunny.js';
import net from "node:net"
import { ERROR, JSONENCODED, NEWQUEUE, NOOPTS, PUBLISH, SUCCESS } from '../lib/CONSTANTS.js';


describe('queue', function () {
  let bunny; // Hold reference to the server
  const port = 3000;

  beforeEach(function (done) {
    bunny = CreateBunny({ port, DEBUG: true });
    console.log('Outer beforeEach: Bunny server started.');
    done();
  });

  afterEach(function (done) {
    bunny(() => {
      console.log('Outer afterEach: Bunny server stopped.');
      done();
    });
  });

  it("should create a queu and should enqueue a message", async function(){
         const client = new net.Socket();
         let RES = ERROR;
    
          const connectToServer = () => {
            return new Promise((resolve, reject) => {
              client.connect(3000, '127.0.0.1', () => {
                console.log('Client connected.');
                resolve();
              });
    
              client.on('error', (err) => {
                console.error('Client error:', err.message);
                reject(err);
              });
            });
          };
    
          const CreateQueue = () => {
            return new Promise((resolve, reject) => {
                const options =   {
                    QueueExpiry: 60,
                    MessageExpiry: 30,
                    AckExpiry: 30,
                    Durable: false,
                    noAck: false,
              
                  }
                const queuename =  Buffer.from("Myqueue", "utf-8")
                const opts = Buffer.from(JSON.stringify(options), "utf-8")
              const op = Buffer.alloc(6);
              op.writeInt8(NEWQUEUE, 0); // Send a "health check" opcode
              op.writeInt8(JSONENCODED, 1);
              op.writeUint32BE(queuename.length, 2)
              const combinedBuffer = Buffer.concat([op, queuename, opts])
              client.write(combinedBuffer);
    
              client.on('data', (data) => {
                RES = data.readUint8(0); // Parse the server response
                console.log('queue creation response:', RES);
                equal(SUCCESS, RES); // Assert the health check response
                resolve();
              });
    
              client.on('error', (err) => {
                console.error('Error receiving data:', err.message);
                reject(err);
              });
            });
          };
    
          const insertInQueue = () => {
            return new Promise((resolve, reject) => {
         
                const msg =  Buffer.from("This is My Message", "utf-8")
                const opts = Buffer.from(JSON.stringify({queue: "Myqueue"}), "utf-8")
              const op = Buffer.alloc(6);
              op.writeInt8(PUBLISH, 0); 
              op.writeInt8(JSONENCODED, 1);
              op.writeUint32BE(msg.length, 2)
              const combinedBuffer = Buffer.concat([op, msg, opts])
              client.write(combinedBuffer);
    
              client.on('data', (data) => {
                RES = data.readUint8(0); // Parse the server response
                console.log('Message res:', RES);
                equal(SUCCESS, RES); // Assert the health check response
                resolve();
              });
    
              client.on('error', (err) => {
                console.error('Error receiving data:', err.message);
                reject(err);
              });
            });
          };
    
          await connectToServer(); // Wait for connection
          await CreateQueue(); // Wait for health check response
          await insertInQueue(); // Wait for health check response
          client.end()
          client.destroy().emit("close"); // Close the connection
          equal(SUCCESS, RES); // Assert the health check response
         
  })


})