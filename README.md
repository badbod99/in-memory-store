# JavaScript In Memory Store
JavaScript memory store for key/value with indexed lookups based on hash.  No dependencies on any other library.

# Install 
First, install with npm.
```shell
npm install in-memory-store
```
Then include in your project either with ES6 imports
```javascript
import InMemoryTree from 'in-memory-tree';
```
or require
```javascript
const InMemoryStore = require('../dist/in-memory-store');
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
// Note: Populate does not check for existing index entries,
// it's designed for initial population and this is omitted for performance
// if you know your entries have never been added before, it's safe to call
// multiple times.  Otherwise use .add(items).

// or add individual items one by one (slower than populate)
store.addOne(item);
// or add multiple items later (slower than populate)
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

// Build an index (default index type is a HashIndex)
store.buildIndex('breed', kitten => kitten.breed);
// Build a binary index (binary indexes are sorted at all times)
store.buildBinaryIndex('breed', kitten => kitten.breed);
// Keys are case senstive, so normalise if needed
store.buildBinaryIndex('breed', kitten => kitten.breed.toLowerCase());
// Note: You only need to build an index once, update/add/remove all update index automatically


// Get all entries with specified breed
let britishShorthair = store.getOne('breed', 'British Shorthair');
// Get based on array of breeds
let allSorts = store.get('breed', ['British Shorthair','Moggy']);
// Get intersection of 2 indexes
let oldMixed = store.getFromSet([['breed', ['British Shorthair','Moggy'], ['age',[5,6,7]]);
// Get join of 2 indexes
let mixed = store.get('breed', ['British Shorthair','Moggy']);
let old = store.get('age', [5,6,7]);
let oldOrMixed = [...old, ...mixed];

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

# Performance
Performance testing is included with [Benchmark](https://benchmarkjs.com/).
Currently a very simple test of each Index type and the overall store.

* HashIndex - Backed by a javascript Map object. Insert and Read is  
very fast.
* BinaryIndex is an array backed binary search index.  Performance is not
far off that of the Tree structures, but it allows simple, fast range
results to be returned as sorted arrays.
* RBIndex - Index built on Red Black Tree from [bintrees](https://github.com/vadimg/js_bintrees).
* AVLIndex - Index built on AVLIndex from [AVL](https://github.com/w8r/avl).

```shell
Insert (x10000)
RBIndex x 280 ops/sec ±1.98% (89 runs sampled)
AVLIndex x 1,066 ops/sec ±0.34% (96 runs sampled)
BinaryIndex x 285 ops/sec ±4.37% (89 runs sampled)
HashIndex x 1,388 ops/sec ±0.61% (94 runs sampled)
- Fastest is HashIndex

Random read (x10000)
RBIndex x 621 ops/sec ±0.43% (95 runs sampled)
AVLIndex x 1,061 ops/sec ±0.37% (95 runs sampled)
BinaryIndex x 1,005 ops/sec ±0.34% (95 runs sampled)
HashIndex x 199,560 ops/sec ±0.48% (92 runs sampled)
- Fastest is HashIndex

Remove (x10000)
RBIndex x 20,168 ops/sec ±0.33% (98 runs sampled)
AVLIndex x 36,095 ops/sec ±0.68% (94 runs sampled)
BinaryIndex x 28,463 ops/sec ±0.46% (94 runs sampled)
HashIndex x 22,291 ops/sec ±0.40% (97 runs sampled)
- Fastest is AVLIndex
```
