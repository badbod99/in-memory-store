/* eslint no-console: 0 */
/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
// Benchmark script runs in node.js, hense the ES5 systax
const Benchmark = require('benchmark');
const {
  InMemoryStore,
  AVLIndex,
  BinaryIndex,
  HashIndex,
} = require('../dist/benchmark');

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
/* eslint no-param-reassign: 0 */
function shuffle(a) {
  let j;
  let x;
  let i;

  for (i = a.length - 1; i > 0; i -= 1) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

const A = 500;
const N = 10000;
let rvalues = new Array(N).fill(0).map((n, i) => ({
  id: i, // As we don't keep duplicates, need unique id, not random
  rnd1: Math.floor(Math.random() * A),
  rnd2: Math.floor(Math.random() * A),
}));
// Shuffle it after so it's not in sequence
rvalues = shuffle(rvalues);

const avalues = new Array(N).fill(0).map(() => Math.floor(Math.random() * A));

const prefilledAVL = new AVLIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach(v => prefilledAVL.insert(v));
const prefilledMemBin = new BinaryIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach(v => prefilledMemBin.insert(v));
const prefilledMemHash = new HashIndex('test', r => r.id, r => r.rnd1);
rvalues.forEach(v => prefilledMemHash.insert(v));

const options = {
  onStart() { console.log(this.name); },
  onError(event) { console.log(event.target.error); },
  onCycle(event) { console.log(String(event.target)); },
  onComplete() {
    const nm = this.filter('fastest').map('name');
    console.log(`- Fastest is ${nm}\n`);
  },
};

const C = 25;
const nvalues = new Array(C).fill(0).map((n, i) => ({
  id: i, // As we don't keep duplicates, need unique id, not random
  ord1: 9000 + i,
}));

const storeBin = new BinaryIndex('test', r => r.id, r => r.ord1);
const store = new InMemoryStore(r => r.id);
store.ensureIndex(storeBin);
store.populate(nvalues);

const arr = store.find({
  $and: [{ test: { $lte: '9020' } }, { test: { $gte: '9010' } }],
  $or: [{ test: { $eq: '9020' } }, { test: { $in: ['9019', '9018'] } }],
});
const lt = store.find([{ test: '9020' }, { test: ['9010', '9020'] }]);
const lt2 = store.find([{ test: { $lte: '9020' } }, { test: { $gte: '9010' } }]);

const slicedA = avalues.slice(0, 10);
console.log('--------------------- CORRECTNESS CHECK -----------------');
console.log(`${prefilledAVL.findMany(slicedA).length} [${slicedA}] values found in AVLIndex`);
console.log(`${prefilledMemBin.findMany(slicedA).length} [${slicedA}] values found in prefilledMemBin`);
console.log(`${prefilledMemHash.findMany(slicedA).length} [${slicedA}] values found in prefilledMemHash`);
console.log('--------------------- FIND CHECK -----------------');
console.log(`${JSON.stringify(arr.map(o => o.id))}`);
console.log(`${JSON.stringify(lt.map(o => o.id))}`);
console.log(`${JSON.stringify(lt2.map(o => o.id))}`);
console.log('--------------------- INDEX PERFORMANCE COMPARISON -----------------');
new Benchmark.Suite(`Insert (x${N})`, options)
  .add('AVLIndex', () => {
    const avl = new AVLIndex('test', r => r.id, r => r.rnd1);
    for (let i = 0; i < N; i += 1) avl.insert(rvalues[i]);
  })
  .add('BinaryIndex', () => {
    const mem = new BinaryIndex('test', r => r.id, r => r.rnd1);
    for (let i = 0; i < N; i += 1) mem.insert(rvalues[i]);
  })
  .add('HashIndex', () => {
    const mem = new HashIndex('test', r => r.id, r => r.rnd1);
    for (let i = 0; i < N; i += 1) mem.insert(rvalues[i]);
  })
  .run();

new Benchmark.Suite(`Random read (${A} finds x ${N / A} times)`, options)
  .add('AVLIndex', () => {
    for (let lp = N / A; lp; lp -= 1) {
      for (let i = A - 1; i; i -= 1) prefilledAVL.find(avalues[i]);
    }
  })
  .add('BinaryIndex', () => {
    for (let lp = N / A; lp; lp -= 1) {
      for (let i = A - 1; i; i -= 1) prefilledMemBin.find(avalues[i]);
    }
  })
  .add('HashIndex', () => {
    for (let lp = N / A; lp; lp -= 1) {
      for (let i = A - 1; i; i -= 1) prefilledMemHash.find(avalues[i]);
    }
  })
  .run();

new Benchmark.Suite(`gt read (${A} finds)`, options)
  .add('AVLIndex', () => {
    for (let i = A - 1; i; i -= 1) prefilledAVL.$gt(avalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = A - 1; i; i -= 1) prefilledMemBin.$gt(avalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = A - 1; i; i -= 1) prefilledMemHash.$gt(avalues[i]);
  })
  .run();

new Benchmark.Suite(`lte read (${A} finds)`, options)
  .add('AVLIndex', () => {
    for (let i = A - 1; i; i -= 1) prefilledAVL.$lte(avalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = A - 1; i; i -= 1) prefilledMemBin.$lte(avalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = A - 1; i; i -= 1) prefilledMemHash.$lte(avalues[i]);
  })
  .run();

new Benchmark.Suite(`Remove (x${N})`, options)
  .add('AVLIndex', () => {
    for (let i = N - 1; i; i -= 1) prefilledAVL.remove(rvalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = N - 1; i; i -= 1) prefilledMemBin.remove(rvalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = N - 1; i; i -= 1) prefilledMemHash.remove(rvalues[i]);
  })
  .run();
console.log('---------------------------------------------------------');
