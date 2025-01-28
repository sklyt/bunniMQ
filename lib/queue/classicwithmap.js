import { v4 as uuidv4 } from 'uuid';


class NodeWithMap {
    constructor(id, value) {
      this.id = id;
      this.value = value;
      this.next = null;
      this.prev = null;
    }
  }
  
  export default class DoublyLinkedListWithMap {
    constructor() {
      this.head = null;
      this.tail = null;
      this.size = 0;
      this.nodeMap = new Map(); // id -> node
    }
  
    enqueue(id, value) {
      const newNode = new NodeWithMap(id, value);
      this.nodeMap.set(id, newNode);
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
  
      const node = this.head;
      this.nodeMap.delete(node.id);
  
      this.head = this.head.next;
      if (this.head) this.head.prev = null;
      else this.tail = null;
  
      return node.value;
    }
  
    deleteById(id) {
      const node = this.nodeMap.get(id);
      if (!node) return false;
  
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
  
      if (this.head === node) this.head = node.next;
      if (this.tail === node) this.tail = node.prev;
  
      this.nodeMap.delete(id);
      return true;
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
  
  // Usage
  // const enhancedList = new DoublyLinkedListWithMap();
  // enhancedList.enqueue(uuidv4(), "A");
  // enhancedList.enqueue(2, "B");
  // enhancedList.enqueue(3, "C");
  // console.log(enhancedList.printList()); // ["A", "B", "C"]
  // enhancedList.deleteById(2);
  // console.log(enhancedList.printList()); // ["A", "C"]
  // enhancedList.dequeue();
  // console.log(enhancedList.printList()); // ["C"]
  