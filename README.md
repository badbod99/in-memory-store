# JavaScript In Memory Store
JavaScript memory store for key/value with indexed lookups based on hash.

# Install 
First, install with npm.
```shell
npm install in-memory-store
```
Then include in your project either with ES6 imports
```javascript
import { InMemoryStore } from 'in-memory-store';
```
or require
```javascript
const { InMemoryStore } = require('../dist/in-memory-store');
```
or can also directly reference the compiled version from 'dist/in-memory-tree.js'.

# Usage
InMemoryStore constructor takes 3 parameters `keyFn[, items]`. 

`keyFn`: each item in the store requires a unique key, specific the function to get it from the item.

Example usage...
```javascript
// Create an empty store
let store = new InMemoryStore(obj => obj.key);
// and populate it
store.populate(items);
// Note: Populate can only be called on an empty store.

// or add individual items one by one
store.addOne(item);
// or add multiple items later
let items = [item1, item2, item3];
store.add(items);

// remove an item from store
store.removeOne(item);
// remove by item key
store.removeKey("my_item_key");
// remove many items
let items = [item1, item2, item3];
store.remove(items);

// update an item
store.updateOne(item);
// update many items
let items = [item1, item2, item3];
store.update(items);

// Build a binary index (binary indexes are sorted at all times)
store.buildBinaryIndex('breed', kitten => kitten.breed);
// Keys are case senstive, so normalise if needed
store.buildBinaryIndex('breed', kitten => kitten.breed.toLowerCase());
// Note: You only need to build an index once, update/add/remove all update index automatically

// Build a binary index (binary indexes are sorted at all times)
let index = new BinaryIndex("firstLetter", obj => obj.key, kitten => kitten.breed);
// Build a hash index (hash indexes are very fast, but can't do range searches)
let index = new HashIndex("firstLetter", kitten => kitten.breed);
// Keys are case senstive, so normalise if needed
let index = new BinaryIndex("firstLetter", obj => obj.key, kitten => kitten.breed.toLowerCase());
// Add an index to the store (populates it with items in the store if not already populated)
store.ensureIndex(index);

// Get all entries with specified breed
let britishShorthair = store.getOne('breed', 'British Shorthair');
// Get based on array of breeds
let allSorts = store.get('breed', ['British Shorthair','Moggy']);
// Get join of 2 indexes
let mixed = store.get('breed', ['British Shorthair','Moggy']);
let old = store.get('age', [5,6,7]);
let oldOrMixed = [...old, ...mixed];

// You can also use the find function to execute CouchDB style Mango queries
// Only $and, $or are currently supported combinators.
let oldMixed = store.find([
        {'breed': ['British Shorthair','Moggy']},
        {'age': [5,6,7]}
]);

let oldOrBreed = store.find(
        $or: [{'breed': ['British Shorthair','Moggy']},
                {'age': [5,6,7]}]
]);
// Get all kittens age more than 2 months
let allSorts = store.find({'age': {'$gt': 2}});
// Get all kittens with age less than or equal to 3
let allSorts = store.find({'age': {'$lte': 2}});

// Rebuild the store with new items keeping the same indexes and keyFn
store.rebuild(items);

// Destroy the store completely (removes all indexes and keyFn)
store.destroy();
```

## Running the example project
The example project is a very simple address book.  It shows building an index
of people by first letter of their last name and using the index to filter.
```Shell
git clone https://github.com/badbod99/in-memory-store
cd in-memory-store
npm install
npm run build
npm run example
```
Then open a web browser to http://localhost:8080

## Using AVLIndex instead of BinaryIndex
HashIndex, BinaryIndex and AVLIndex are packaged with in-memory-store. The [AVL](https://github.com/w8r/avl) 
dependency is external. Include AVL globally with a CDN or using Webpack/Browserify/Rollup in your project
to use.

AVL provides similar read performance, but much faster insert performance for large datasets. It is however
a more complex library and maintained seperately.

# Performance
Performance testing is included with [Benchmark](https://benchmarkjs.com/).

## Test definition:
1. Define object as `{id: X, rnd1: Y, rnd2: Z}` where X=1 to 10,000 Y=rnd(1 to 500) and Z=rnd(1 to 500).
2. Create index (of each type) on Y (so items grouped by Y).
3. Create 10,000 objects as above in each index
4. Find each grouped Y (all 500 of them), 20 times over (10,000 find operations)
5. Find all values where key > Y (all 500 of them), 20 times over (10,000 find operations) **
6. Find all values where key <=> Y (all 500 of them), 20 times over (10,000 find operations) **
7. Remove all items (1-10,000) from each index

** RBIndex omitted and library does not contain functions suitable for range searches.
** Unfortunately AVL does not include lt/gte. It does provide range, but calls a function for
each entry, so very slow.  AVL could potentially be entended to include native range return.

## Different index types tested
* HashIndex - Backed by a javascript Map object. Insert and Read is  
very fast.
* BinaryIndex is an array backed binary search index.  Performance is not
far off that of the Tree structures, but it allows simple, fast range
results to be returned as sorted arrays.
* RBIndex - Index built on Red Black Tree from [bintrees](https://github.com/vadimg/js_bintrees).
* AVLIndex - Index built on AVLIndex from [AVL](https://github.com/w8r/avl).

## Results
Insert (x10000)
RBIndex x 779 ops/sec ±1.62% (91 runs sampled)
AVLIndex x 1,301 ops/sec ±0.82% (95 runs sampled)
BinaryIndex x 1,197 ops/sec ±0.67% (93 runs sampled)
HashIndex x 2,258 ops/sec ±0.65% (94 runs sampled)
- Fastest is HashIndex

Random read (500 finds x 20 times)
RBIndex x 1,127 ops/sec ±0.64% (96 runs sampled)
AVLIndex x 2,195 ops/sec ±1.98% (91 runs sampled)
BinaryIndex x 2,038 ops/sec ±0.43% (97 runs sampled)
HashIndex x 196,731 ops/sec ±0.34% (97 runs sampled)
- Fastest is HashIndex

gt read (500 finds x 20 times)
AVLIndex x 0.53 ops/sec ±0.38% (6 runs sampled)
BinaryIndex x 103 ops/sec ±0.79% (76 runs sampled)
HashIndex x 1.53 ops/sec ±0.51% (8 runs sampled)
- Fastest is BinaryIndex

lte read (500 finds x 20 times)
AVLIndex x 1.05 ops/sec ±0.17% (7 runs sampled)
BinaryIndex x 101 ops/sec ±3.05% (74 runs sampled)
HashIndex x 1.53 ops/sec ±0.27% (8 runs sampled)
- Fastest is BinaryIndex

Remove (x10000)
RBIndex x 19,081 ops/sec ±0.59% (94 runs sampled)
AVLIndex x 12,602 ops/sec ±0.33% (98 runs sampled)
BinaryIndex x 10,293 ops/sec ±0.17% (99 runs sampled)
HashIndex x 9,826 ops/sec ±1.38% (95 runs sampled)
- Fastest is RBIndex

