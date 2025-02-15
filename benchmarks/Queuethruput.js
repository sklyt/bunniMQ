import Benchmark from "benchmark";
import ClassicDoublyLinkedList from "../lib/queue/classic.js";
import DoublyLinkedListWithMap from "../lib/queue/classicwithmap.js";

let classicList = new ClassicDoublyLinkedList();
let enhancedList = new DoublyLinkedListWithMap();
let size = 5;


const logMemory = (label) => {
  const memory = process.memoryUsage();
  console.log(`${label} - Memory Usage: ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
};

const measureLatency = (fn, label) => {
  const start = process.hrtime.bigint();
  fn();
  const end = process.hrtime.bigint();
  console.log(`${label} - Operation latency: ${(end - start) / BigInt(1e6)} ms`);
};

const suite = new Benchmark.Suite();
var sizedQues = new Benchmark.Suite();

// FAULTY VIEW QUEUES IN A BROKER ARE NOT STATIC:
// ❌
suite
  .add("classiQueu", function () { 
    for (let i = 0; i < size; i++) classicList.enqueue(`Node_${i}`);
    classicList.delete(Math.floor(size / 2));
    classicList.dequeue();
  })
  .add("QueueQwithMap", function () {
    for (let i = 0; i < size; i++) enhancedList.enqueue(i, `Node_${i}`);
    enhancedList.deleteById(`Node_${Math.floor(size / 2)}`);
    enhancedList.dequeue();
  })
  .on("cycle", function (event) {
    console.log(String(event.target));

    if (event.target.name === "classiQueu") {
      console.log("classic queue final size: ", classicList.size);
      logMemory("Classic Queue");
    }

    if (event.target.name === "QueueQwithMap") {
      console.log("QueueQwithMap final size: ", enhancedList.size);
      logMemory("Enhanced Queue with Map");
    }
  })
  .on("complete", function () {
    console.log("Fastest is " + this.filter("fastest").map("name"));
  })
  .run({ async: false, delay: 0.1, minSamples: 100 });



