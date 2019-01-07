const Benchmark = require('benchmark');
const AVLIndex      = require('../dist/avlindex')
const BinaryIndex = require('../dist/binaryindex');
const HashIndex = require('../dist/hashindex');
const RBIndex    = require('../dist/rbindex');

const N = 10000;
const rvalues = new Array(N).fill(0).map((n, i) => Math.floor(Math.random() * N));

const prefilledAVL = new AVLIndex('test', r => r, r => r);
rvalues.forEach((v) => prefilledAVL.insert(v));
const prefilledRB = new RBIndex('test', r => r, r => r);
rvalues.forEach((v) => prefilledRB.insert(v));
const prefilledMemBin = new BinaryIndex('test', r => r, r => r);
rvalues.forEach((v) => prefilledMemBin.insert(v));
const prefilledMemHash = new HashIndex('test', r => r, r => r);
rvalues.forEach((v) => prefilledMemHash.insert(v));

const options = {
  onStart (event) { console.log(this.name); },
  onError (event) { console.log(event.target.error); },
  onCycle (event) { console.log(String(event.target)); },
  onComplete() {
    console.log('- Fastest is ' + this.filter('fastest').map('name') + '\n');
  }
};

new Benchmark.Suite(`Insert (x${N})`, options)
  .add('RBIndex', () => {
    let rb = new RBIndex('test', r => r, r => r);
    for (let i = 0; i < N; i++) rb.insert(rvalues[i]);
  })
  .add('AVLIndex', () => {
    for (let i = N - 1; i; i--) prefilledAVL.find(rvalues[i]);
  })
  .add('BinaryIndex', () => {
    let mem = new BinaryIndex('test', r => r, r => r);
    for (let i = 0; i < N; i++) frb = mem.insert(rvalues[i]);
  })
  .add('HashIndex', () => {
    let mem = new HashIndex('test', r => r, r => r);
    for (let i = 0; i < N; i++) frb = mem.insert(rvalues[i]);
  })
  .run();

new Benchmark.Suite(`Random read (x${N})`, options)
  .add('RBIndex', () => {
    for (let i = N - 1; i; i--) prefilledRB.find(rvalues[i]);
  })
  .add('AVLIndex', () => {
    for (let i = N - 1; i; i--) prefilledAVL.find(rvalues[i]);
  })
  .add('BinaryIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemBin.find(rvalues[i]);
  })
  .add('HashIndex', () => {
    for (let i = N - 1; i; i--) prefilledMemHash.find(rvalues[i]);
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
