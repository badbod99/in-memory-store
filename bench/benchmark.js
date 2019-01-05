const Benchmark = require('benchmark');
const Tree      = require('avl');
const BinaryIndex = require('../dist/binaryindex');
const BinaryArray = require('../dist/binaryarray');
const HashIndex = require('../dist/hashindex');
const InMemoryStore = require('../dist/in-memory-store');
const RBTree    = require('bintrees').RBTree;

const N = 10000;
const rvalues = new Array(N).fill(0).map((n, i) => Math.floor(Math.random() * N));

const prefilledAVL = new Tree();
rvalues.forEach((v) => prefilledAVL.insert(v));
const prefilledRB = new RBTree((a, b) => a - b);
rvalues.forEach((v) => prefilledRB.insert(v));
const prefilledMemBin = new BinaryIndex('test', r => r, r => r);
rvalues.forEach((v) => prefilledMemBin.add(v));
const prefilledMemHash = new HashIndex('test', r => r, r => r);
rvalues.forEach((v) => prefilledMemHash.add(v));
const prefilledMemArr = new BinaryArray();
rvalues.forEach((v) => prefilledMemArr.add(v));
const prefilledMemStore = new InMemoryStore(r => r);
rvalues.forEach((v) => prefilledMemStore.add(v));

const options = {
  onStart (event) { console.log(this.name); },
  onError (event) { console.log(event.target.error); },
  onCycle (event) { console.log(String(event.target)); },
  onComplete() {
    console.log('- Fastest is ' + this.filter('fastest').map('name') + '\n');
  }
};

new Benchmark.Suite(`Insert (x${N})`, options)
  .add('Bintrees', () => {
    let rb = new RBTree((a, b) => a - b);
    for (let i = 0; i < N; i++) rb.insert(rvalues[i]);
  })
  .add('InMemoryStore BinaryIndex', () => {
    let mem = new BinaryIndex('test', r => r, r => r);
    for (let i = 0; i < N; i++) frb = mem.addOne(rvalues[i]);
  })
  .add('InMemoryStore HashIndex', () => {
    let mem = new HashIndex('test', r => r, r => r);
    for (let i = 0; i < N; i++) frb = mem.addOne(rvalues[i]);
  })
  .add('InMemoryStore BinaryArray', () => {
    let mem = new BinaryArray();
    for (let i = 0; i < N; i++) frb = mem.addOne(rvalues[i]);
  })
  .add('InMemoryStore', () => {
    let mem = new InMemoryStore(r => r);
    for (let i = 0; i < N; i++) frb = mem.addOne(rvalues[i]);
  })
  .add('AVL', () => {
    const tree = new Tree();
    for (let i = 0; i < N; i++) tree.insert(rvalues[i]);
  })
  .run();

new Benchmark.Suite(`Random read (x${N})`, options)
  .add('Bintrees', () => {
    for (let i = N - 1; i; i--) prefilledRB.find(rvalues[i]);
  })
  .add('InMemoryStore BinaryIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemBin.getOne(rvalues[i]);
  })
  .add('InMemoryStore HashIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemHash.getOne(rvalues[i]);
  })
  .add('InMemoryStore BinaryArray', () => {
    for (let i = 0; i < N; i++) prefilledMemArr.getOne(rvalues[i]);
  })
  .add('InMemoryStore', () => {
    for (let i = 0; i < N; i++) prefilledMemStore.getOne(rvalues[i]);
  })
  .add('AVL', () => {
    for (let i = N - 1; i; i--) prefilledAVL.find(rvalues[i]);
  })
  .run();

new Benchmark.Suite(`Remove (x${N})`, options)
  .add('Bintrees', () => {
    for (let i = 0; i < N; i++) prefilledRB.remove(rvalues[i]);
  })
  .add('InMemoryStore BinaryIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemBin.removeOne(rvalues[i]);
  })
  .add('InMemoryStore HashIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemHash.removeOne(rvalues[i]);
  })
  .add('InMemoryStore BinaryArray', () => {
    for (let i = N - 1; i; i--) prefilledMemArr.removeOne(rvalues[i]);
  })
  .add('InMemoryStore', () => {
    for (let i = 0; i < N; i++) prefilledMemStore.removeOne(rvalues[i]);
  })
  .add('AVL', () => {
    for (let i = N - 1; i; i--) prefilledAVL.remove(rvalues[i]);
  })
  .run();

  /*
const M = 10000;
const arr = new Array(M).fill(0).map((i) => M * Math.random());
arr.sort((a, b) => a - b);
new Benchmark.Suite(`Bulk-load (x${M})`, options)
  .add('1 by 1', () => {
    const t = new Tree();
    for (let i = 0; i < M; i++) t.insert(arr[i]);
  })
  .add('bulk load', () => {
    const t = new Tree();
    const data = arr.slice();

    t.load(data, []);
  })
  .run();
  */
