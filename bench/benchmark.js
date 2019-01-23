// Benchmark script runs in node.js, hense the ES5 systax
const Benchmark = require('benchmark');
const { InMemoryStore, AVLIndex, BinaryIndex, HashIndex, RBIndex } = require('../dist/benchmark');

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

const C = 25;
let nvalues = new Array(C).fill(0).map((n, i) => {
  return {
    id: i, // As we don't keep duplicates, need unique id, not random
    ord1: 9000 + i
  }
});

const storeBin = new BinaryIndex('test', r => r.id, r => r.ord1);
let store = new InMemoryStore(r => r.id);
store.ensureIndex(storeBin);
store.populate(nvalues);

let arr = store.find(
  { 
    "$and": [{"test":{"$lte":"9020"}}, {"test":{"$gte":"9010"}}],
    "$or": [{"test":{"$eq":"9020"}}, {"test":{"$in":["9019", "9018"]}}]
  }
);
let lt = store.find(
 [{"test":"9020"}, {"test":["9010","9020"]}]
);
let lt2 = store.find(
  [{"test":{"$lte":"9020"}}, {"test":{"$gte":"9010"}}]
);

let slicedA = avalues.slice(0,10);
console.log('--------------------- CORRECTNESS CHECK -----------------');
console.log(`${prefilledAVL.findMany(slicedA).length} [${slicedA}] values found in AVLIndex`);
console.log(`${prefilledRB.findMany(slicedA).length} [${slicedA}] values found in prefilledRB`);
console.log(`${prefilledMemBin.findMany(slicedA).length} [${slicedA}] values found in prefilledMemBin`);
console.log(`${prefilledMemHash.findMany(slicedA).length} [${slicedA}] values found in prefilledMemHash`);
console.log('---------------------------------------------------------');
console.log(`${JSON.stringify(arr.map(o => o.id))}`);
console.log(`${JSON.stringify(lt.map(o => o.id))}`);
console.log(`${JSON.stringify(lt2.map(o => o.id))}`);
console.log('---------------------------------------------------------');

/*
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

new Benchmark.Suite(`gt read (${A} finds)`, options)
  .add('AVLIndex', () => {
    for (let i = A - 1; i; i--) prefilledAVL.$gt(avalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = A - 1; i; i--) prefilledMemBin.$gt(avalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = A - 1; i; i--) prefilledMemHash.$gt(avalues[i]);
  })
  .run();

new Benchmark.Suite(`lte read (${A} finds)`, options)
  .add('AVLIndex', () => {
    for (let i = A - 1; i; i--) prefilledAVL.$lte(avalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = A - 1; i; i--) prefilledMemBin.$lte(avalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = A - 1; i; i--) prefilledMemHash.$lte(avalues[i]);
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
*/

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