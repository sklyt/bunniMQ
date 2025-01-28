import Benchmark from "benchmark";
import ClassicDoublyLinkedList from "../lib/queue/classic.js";
import DoublyLinkedListWithMap from "../lib/queue/classicwithmap.js";

// FIRST RUN:
// classiQueu x 166 ops/sec ±103.08% (5 runs sampled)
// classic queue final size:  319200
// Classic Queue - Memory Usage: 27.48 MB
// QueueQwithMap x 40,710 ops/sec ±25.22% (33 runs sampled)
// QueueQwithMap final size:  18461100
// Enhanced Queue with Map - Memory Usage: 1422.56 MB
// Fastest is QueueQwithMap
// SECOND RUN:
// classiQueu x 110 ops/sec ±98.95% (5 runs sampled)
// classic queue final size:  361200
// Classic Queue - Memory Usage: 30.59 MB
// QueueQwithMap x 38,710 ops/sec ±22.98% (33 runs sampled)
// QueueQwithMap final size:  14740600
// Enhanced Queue with Map - Memory Usage: 1145.32 MB
// Fastest is QueueQwithMap
// later random run
// classiQueu x 80.36 ops/sec ±116.05% (5 runs sampled)
// classic queue final size:  422700
// Classic Queue - Memory Usage: 34.72 MB
// QueueQwithMap x 13,511 ops/sec ±90.04% (22 runs sampled)
// QueueQwithMap final size:  7437200
// Enhanced Queue with Map - Memory Usage: 598.59 MB
// Fastest is QueueQwithMap

let classicList = new ClassicDoublyLinkedList();
let enhancedList = new DoublyLinkedListWithMap();
let size = 1;
const QUEUE_SIZES = [3, 10, 100, 1_000, 10_000];

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



  
QUEUE_SIZES.forEach((size) => {
  // Classic Queue Test
  sizedQues.add(`ClassicQueue (${size} nodes)`, function () {
    const list =  new ClassicDoublyLinkedList();
    // Initialize with `size` nodes
    for (let i = 0; i < size; i++) list.enqueue(`Node_${i}`);
    // Simulate work: delete middle node + dequeue
    list.delete(`Node_${Math.floor(size / 2)}`);
    list.dequeue();
  });

  // Map-Based Queue Test
  sizedQues.add(`MapQueue (${size} nodes)`, function () {
      const list = new DoublyLinkedListWithMap();
    // Initialize with `size` nodes
    for (let i = 0; i < size; i++) list.enqueue(i, `Node_${i}`);
    // Simulate work: delete middle node + dequeue
    list.deleteById(Math.floor(size / 2));
    list.dequeue();
  });
})

sizedQues
.on('cycle', (event) => {
  console.log(String(event.target))
  
 logMemory(`${event.target.name}`)

})
.on('complete', function () {
  console.log('Fastest for each size:');
  QUEUE_SIZES.forEach((size) => {
    const tests = this.filter((test) => test.name.includes(`${size} nodes`));
    const fastest = tests.sort((a, b) => b.hz - a.hz)[0];
    console.log(`- ${size} nodes: ${fastest.name}`);
  });
})
.run({ async: false, delay: 0.1, minSamples: 100});