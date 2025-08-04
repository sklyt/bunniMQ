
import { v4 as uuidv4 } from "uuid"




class Client {
  constructor(socket) {
    this.socket = socket;
    this.isConnected = true;
    this.auth = {
      isAuthenticated: false,
      permissions: undefined
    };
    this.protocolVersion = 0; // Default to legacy protocol
    this.options = {};
  }
}

class ClientsManager {
  clients = new Map();

  add(c) {
    const id = `${c.remoteAddress}:${uuidv4()}`;
    this.clients.set(id, new Client(c));
    return id;
  }

  remove(id) {
    this.clients.delete(id);
  }

  isConnected(id) {
    const client = this.clients.get(id);
    return client ? client.isConnected : false;
  }

  isAuthenticated(id) {
    const client = this.clients.get(id);
    return client ? client.auth.isAuthenticated : false;
  }

  update(id, property, value) {
    const client = this.clients.get(id);
    if (!client) return;

    // Backward compatibility adapter for prior tuple-style updates
    if (property === 1) client.isConnected = value;
    else if (property === 2) {
      client.auth.isAuthenticated = value[0];
      client.auth.permissions = value[1];
    }
    // New property-based updates
    else if (typeof property === 'string') {
      client[property] = value;
    }
  }

  retrieve(id, property) {
    const client = this.clients.get(id);
    if (!client) return undefined;

    // Backward compatibility adapter
    if (property === 0) return client.socket;
    if (property === 1) return client.isConnected;
    if (property === 2) return [client.auth.isAuthenticated, client.auth.permissions];

    return client[property];
  }

  setProtocolVersion(id, version) {
    this.update(id, 'protocolVersion', version);
  }

  getProtocolVersion(id) {
    return this.retrieve(id, 'protocolVersion') || 0;
  }

  setWritable() {

  }
}





// class ClientsManager {
//   // FIXME: Define a proper type alias, it's incorrect // [c, true, [false, undefined]
//   /**
// * @type {Map<string, [Socket, boolean]>}
// */
//   clients = new Map();

//   /**
//    * 
//    * @param {Socket} c 
//    * @returns {string}
//    */
//   add(c) {
//     const id = `${c.remoteAddress}:${uuidv4()}`
//     //socket, isconnected, isauthed, options
//     this.clients.set(id, [c, true, [false, undefined]]) // FIXME: tuples options in JS are not a thing, objects are for configs
//     return id
//   }

//   remove(id) {
//     // error check
//     // FIXME: 
//     this.clients.delete(id)
//   }

//   isConnected(clientId) {
//     return !!this.clients.get(clientId)?.[1];  // FIXME: consequence of tuple options
//   }

//   isAuthenticated(clientId) {
//     return !!this.clients.get(clientId)?.[2][1] // // FIXME: consequence of tuple options, wrong index it blows up
//   }
//   update(id, idx, value) {
//     if (!this.clients.has(id)) return;
//     this.clients.get(id)[idx] = value
//   }
//   /**
//    * 
//    * @param {string} id 
//    * @returns {Socket | boolean}
//    */
//   retrieve(id, idx) { // FIXME:  is a code smell, result of tuple options
//     return this.clients.get(id)[idx]
//   }

//   setWritable() {

//   }
// }

const globalclientsManager = new ClientsManager()

export default globalclientsManager