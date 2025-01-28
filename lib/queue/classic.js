class Node {
    constructor(value) {
      this.value = value;
      this.next = null;
      this.prev = null;
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
  
    delete(value) {
      let current = this.head;
  
      while (current) {
        if (current.value === value) {
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
  // const classicList = new ClassicDoublyLinkedList();
  // classicList.enqueue("A");
  // classicList.enqueue("B");
  // classicList.enqueue("C");
  // console.log(classicList.printList()); // ["A", "B", "C"]
  // classicList.delete("B");
  // console.log(classicList.printList()); // ["A", "C"]
  // classicList.dequeue();
  // console.log(classicList.printList()); // ["C"]
  