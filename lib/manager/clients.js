
import {v4 as uuidv4} from "uuid"


 class ClientsManager {
// FIXME: Define a proper type alias, it's incorrect // [c, true, [false, undefined]
    /**
 * @type {Map<string, [Socket, boolean]>}
 */
    clients = new Map(); 
  
    /**
     * 
     * @param {Socket} c 
     * @returns {string}
     */
   add(c){
     const id = `${c.remoteAddress}:${uuidv4()}`
     this.clients.set(id, [c, true, [false, undefined]]) // FIXME: tuples options are not a thing, objects are for configs
     return id
   }

   remove(id){
    // error check
    // FIXME: 
     this.clients.delete(id)
   }

   isConnected(clientId) {
    return !!this.clients.get(clientId)?.[1];  // FIXME: consequence of tuple options
    }

    isAuthenticated(clientId){
       return !!this.clients.get(clientId)?.[2][1] // // FIXME: consequence of tuple options, wrong index it blows up
    }
   update(id, idx, value){
       if(!this.clients.has(id)) return;
       this.clients.get(id)[idx] = value
   }
    /**
     * 
     * @param {string} id 
     * @returns {Socket | boolean}
     */
   retrieve(id, idx){ // FIXME:  is a code smell, result of tuple options
    return this.clients.get(id)[idx]
   }

   setWritable(){
    
   }
}

 const globalclientsManager = new ClientsManager()

 export default globalclientsManager