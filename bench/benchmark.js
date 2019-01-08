// Benchmark script runs in node.js, hense the ES5 systax
const Benchmark = require('benchmark');
const { AVLIndex, BinaryIndex, HashIndex, RBIndex } = require('../dist/benchmark');

const A = 500;
const N = 10000;
let rvalues = new Array(N).fill(0).map((n, i) => {
  return {
    id: i, // As we don't keep duplicates, need unique id, not random
    rnd1: Math.floor(Math.random() * A),
    rnd2: Math.floor(Math.random() * A)
  }
});
// Shuffle it after so it's not in sequence
rvalues = shuffle(rvalues);

const avalues = new Array(N).fill(0).map((n, i) => Math.floor(Math.random() * A));

const prefilledAVL = new AVLIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach((v) => prefilledAVL.insert(v));
const prefilledRB = new RBIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach((v) => prefilledRB.insert(v));
const prefilledMemBin = new BinaryIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach((v) => prefilledMemBin.insert(v));
const prefilledMemHash = new HashIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach((v) => prefilledMemHash.insert(v));

const options = {
  onStart (event) { console.log(this.name); },
  onError (event) { console.log(event.target.error); },
  onCycle (event) { console.log(String(event.target)); },
  onComplete() {
    console.log('- Fastest is ' + this.filter('fastest').map('name') + '\n');
  }
};


let slicedA = avalues.slice(0,10);
console.log('--------------------- CORRECTNESS CHECK -----------------');
console.log(`${prefilledAVL.findMany(slicedA).length} [${slicedA}] values found in AVLIndex`);
console.log(`${prefilledRB.findMany(slicedA).length} [${slicedA}] values found in prefilledRB`);
console.log(`${prefilledMemBin.findMany(slicedA).length} [${slicedA}] values found in prefilledMemBin`);
console.log(`${prefilledMemHash.findMany(slicedA).length} [${slicedA}] values found in prefilledMemHash`);
console.log('---------------------------------------------------------');

new Benchmark.Suite(`Insert (x${N})`, options)
  .add('RBIndex', () => {
    let rb = new RBIndex('test', r => r.id, r => r.rnd1);
    for (let i = 0; i < N; i++) rb.insert(rvalues[i]);
  })
  .add('AVLIndex', () => {
    let avl = new AVLIndex('test', r => r.id, r => r.rnd1);
    for (let i = N - 1; i; i--) avl.insert(rvalues[i]);
  })
  .add('BinaryIndex', () => {
    let mem = new BinaryIndex('test', r => r.id, r => r.rnd1);
    for (let i = 0; i < N; i++) frb = mem.insert(rvalues[i]);
  })
  .add('HashIndex', () => {
    let mem = new HashIndex('test', r => r.id, r => r.rnd1);
    for (let i = 0; i < N; i++) frb = mem.insert(rvalues[i]);
  })
  .run();

new Benchmark.Suite(`Random read (${A} finds x ${N / A} times)`, options)
  .add('RBIndex', () => {
    for (let lp = N / A; lp; lp--) {
      for (let i = A - 1; i; i--) prefilledRB.find(avalues[i]);
    }
  })
  .add('AVLIndex', () => {
    for (let lp = N / A; lp; lp--) {
      for (let i = A - 1; i; i--) prefilledAVL.find(avalues[i]);
    }
  })
  .add('BinaryIndex', () => {
    for (let lp = N / A; lp; lp--) {
      for (let i = A - 1; i; i--) prefilledMemBin.find(avalues[i]);
    }
  })
  .add('HashIndex', () => {
    for (let lp = N / A; lp; lp--) {
      for (let i = A - 1; i; i--) prefilledMemHash.find(avalues[i]);
    }
  })
  .run();

new Benchmark.Suite(`Remove (x${N})`, options)
  .add('RBIndex', () => {
    for (let i = 0; i < N; i++) prefilledRB.remove(rvalues[i]);
  })
  .add('AVLIndex', () => {
    for (let i = N - 1; i; i--) prefilledAVL.remove(rvalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemBin.remove(rvalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemHash.remove(rvalues[i]);
  })
  .run();


/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}