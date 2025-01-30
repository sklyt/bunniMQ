import { PENDING } from "../CONSTANTS.js";
import DEFAULT_OPTS from "../settings.js";
import {v4 as uuidv4} from "uuid"
import debugLib, { minutesToMilliseconds } from "../utils.js";

class Node {
    constructor(value) {
      
      this.value = value;
      this.next = null;
      this.prev = null;
      this.expiry = DEFAULT_OPTS.MessageExpiry
      this.id = uuidv4()
      this.timestamp = Date.now()
      // pending
      this.status = PENDING
    }
  }
  
 export default class ClassicDoublyLinkedList { 
    constructor() {
      this.head = null;
      this.tail = null;
      this.size = 0;
  
    }
  
    enqueue(value) {
      const newNode = new Node(value);
      this.size++;
      if (!this.tail) {
        this.head = this.tail = newNode;
      } else {
        this.tail.next = newNode;
        newNode.prev = this.tail;
        this.tail = newNode;
      }
    }
  
    dequeue() {
      if (!this.head) return null;
  
      const value = this.head.value;
      this.head = this.head.next;
      if (this.head) this.head.prev = null;
      else this.tail = null; // List is now empty
  
      return value;
    }
  
    delete(id) {
      let current = this.head;
  
      while (current) {
        if (current.id === id) {
          if (current.prev) current.prev.next = current.next;
          if (current.next) current.next.prev = current.prev;
  
          if (this.head === current) this.head = current.next;
          if (this.tail === current) this.tail = current.prev;
  
          return true;
        }
        current = current.next;
      }
  
      return false; // Value not found
    }


    /**
     * 
     * @param {{QueueExpiry: number; MessageExpiry: number; AckExpiry: number; Durable: boolean; noAck: boolean; }} opts 
     */
    clean(opts){

    // if queue expired explode

      /**
       * @type {Node}
       */
      let current = this.head;
      const now = Date.now()
      while (current) {
        if(now - current.timestamp >  minutesToMilliseconds(opts.MessageExpiry)){
          
          debugLib.Debug(`deleting message ${current.value} overdue by ${now - current.timestamp} messages expire in ${opts.MessageExpiry}`, "info")
          if (current.prev) current.prev.next = current.next;
          if (current.next) current.next.prev = current.prev;
  
          if (this.head === current) this.head = current.next;
          if (this.tail === current) this.tail = current.prev;
  
     
        }
        current = current.next;
      }
    }
  
    printList() {
      const result = [];
      let current = this.head;
      while (current) {
        result.push(current.value);
        current = current.next;
      }
      return result;
    }
  }

  