
import {v4 as uuidv4} from "uuid"


 class ClientsManager {

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
     this.clients.set(id, [c, true])
     return id
   }

   remove(id){
    // error check
     this.clients.delete(id)
   }

   isConnected(clientId) {
    return !!this.clients.get(clientId)?.[1];
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
   retrieve(id, idx){
    return this.clients.get(id)[idx]
   }
}

 const globalclientsManager = new ClientsManager()

 export default globalclientsManager