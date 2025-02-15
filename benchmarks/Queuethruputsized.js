import Benchmark from "benchmark";

import ClassicDoublyLinkedList from "../lib/queue/classic.js";
import DoublyLinkedListWithMap from "../lib/queue/classicwithmap.js";

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

  
const sizedQues = new Benchmark.Suite();


// correct view the queue is dynamic and changes   
// ✅
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
    console.log(String(event.target));
    // const bench = event.target;
    // console.log(bench)
    // // Manually build the ops/sec string
    // const ops = bench.hz.toFixed(2);
    // const rme = bench.stats.rme.toFixed(2);
    // const samples = bench.stats.sample.length;
    // console.log(`${bench.name} x ${ops} ops/sec ±${rme}% (${samples} runs sampled)`);
    logMemory(event.target.name)
  
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