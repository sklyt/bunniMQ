// Create an array and iterate over it 100,000 times
const arr = new Int32Array(0);
for (let i = 0; i < 100000; i++) {
  arr[i] = i;
}

// Measure the time it takes to iterate over the array
console.time('array iteration');
for (let i = 0; i < 100000; i++) {
  const value = arr[i];
}
console.timeEnd('array iteration');

// Create an object with 100,000 properties and iterate over it
const obj = {};
for (let i = 0; i < 100000; i++) {
  obj[`key${i}`] = `value${i}`;
}

// Measure the time it takes to iterate over the object
console.time('object iteration');
for (let key in obj) {
  const value = obj[key];
}
console.timeEnd('object iteration');