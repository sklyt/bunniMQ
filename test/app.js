import { equal } from 'assert';
import CreateBunny from '../lib/bunny.js';
import net from "node:net"
import { CREATE, JSONENCODED, NOOPTS } from '../lib/CONSTANTS.js';

describe('application', function () {

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
  describe('server', function () {
    it("should ping server for health", async function () {

      let health = 500; // Default to server error
      const client = new net.Socket();

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

      const sendHealthCheck = () => {
        return new Promise((resolve, reject) => {
          const op = Buffer.alloc(1);
          op.writeInt8(-2, 0); // Send a "health check" opcode
          client.write(op);

          client.on('data', (data) => {
            health = data.readInt32BE(0); // Parse the server response
            console.log('Health response:', health);
            resolve();
          });

          client.on('error', (err) => {
            console.error('Error receiving data:', err.message);
            reject(err);
          });
        });
      };

      await connectToServer(); // Wait for connection
      await sendHealthCheck(); // Wait for health check response
      client.end()
      client.destroy().emit("close"); // Close the connection
      equal(200, health); // Assert the health check response

    })



    it("should send a heartbeat", async function () {
      this.timeout(37000);
      const client = new net.Socket();
      // Client 1: Will stay alive by responding to "ping"
      const clientAlive = new net.Socket();
      clientAlive.connect(3000, '127.0.0.1', () => {
        console.log('Client Alive connected.');
      });
      const HEARTBEAT = Buffer.alloc(1); 
      HEARTBEAT.writeInt8(-1); // -1 as a heartbeat sig

      clientAlive.on('data', (data) => {
        const message = data.readInt32BE(0);
        
        if (message === -1) {
          console.log('Client Alive received heartbeat, sending pong.');
          clientAlive.write(HEARTBEAT);
        }
      });

      // Client 2: Will "die" by not responding
      const clientDead = new net.Socket();
      clientDead.connect(3000, '127.0.0.1', () => {
        console.log('Client Dead connected.');
      });

      clientDead.on('data', (data) => {
        const message = data.readInt32BE(0);
        if (message === -1) {
          console.log('Client Dead ignoring heartbeat.');
          // Do nothing to simulate a dead client
        }
      });

      // Wait a few seconds for the server to process heartbeats
      await new Promise((resolve) => setTimeout(resolve, 15000));

      const checkClientSize = () => {
  
        return new Promise((resolve, reject) => {
          client.connect(3000, '127.0.0.1', () => {
            console.log('Client connected.');
            const op = Buffer.alloc(1);
            op.writeInt8(-3, 0); // Send a "health check" opcode
            client.write(op);
         
          });
         
     

          client.on("data", (data)=> {
            
            const s = data.readUInt32BE(0);
            resolve(s);
          })

          client.on('error', (err) => {
            console.error('Client error:', err.message);
            reject(err);
          });
        });
      };
     
       const clientsConnected = await checkClientSize()
          
   
       console.log(`clients conncted: ${clientsConnected}`)
      // After the test time, check server state
      console.log('Test complete. Checking server state...');
      equal(1, clientsConnected);

      // should check if its alive

        // Clean up
      clientAlive.destroy().emit("close");
      clientDead.destroy().emit("close");
      
      client.destroy().emit("close")

 
    
    })
  });

  
});


describe("datatransfer", function(){
  
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

  describe("protocol", function(){
    it("should send a test packet", async function(){
      // this.timeout(10000);
      const client = new net.Socket();
      const sendOPSPacket=()=>{
        
        return new Promise((resolve, reject) => {
          client.connect(3000, '127.0.0.1', () => {
            console.log('Client connected.');
            const data =  Buffer.from("The core of the internet, the nucleus is the transmission control protocol(TCP), its sits a level lower to the application layer! and sits on top of an entire network stack(internet protocol(IP) being well", "utf-8")
            const meta = Buffer.from(JSON.stringify({opts: "none"}), "utf-8")
          
            const op = Buffer.alloc(6);
  
            op.writeInt8(CREATE, 0); 
            op.writeInt8(JSONENCODED, 1);
            op.writeUint32BE(data.length, 2)
          
            const combinedBuffer = Buffer.concat([op, data, meta])
            console.log(combinedBuffer, "combined")
            client.write(combinedBuffer);
         
          });
         
     
  
          client.on("data", (data)=> {
            
            const s = data.readUInt32BE(0);
            resolve(s);
          })
  
          client.on('error', (err) => {
            console.error('Client error:', err.message);
            reject(err);
          });
        });
      }
  
      await sendOPSPacket()
      client.destroy().emit("close")
  
    })
  
  })
})
