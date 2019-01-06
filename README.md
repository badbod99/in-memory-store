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
Comparison is against [AVL](https://github.com/w8r/avl) and [bintrees](https://github.com/vadimg/js_bintrees).

* HashIndex - Backed by a javascript Map object. Insert and Read is  
very fast.
* BinaryIndex is an array backed binary search index.  Performance is not
far off that of the Tree structures, but it allows simple, fast range
results to be returned as sorted arrays.
* BinaryArray is the base implementation used by BinaryIndex. This gives a
closer comparison to AVL and BinTrees as both HashIndex and BinaryIndex
do grouping of data into the index.
* The InMemoryStore test itself is without any index setup.  This is basically
just a HashIndex without the grouping, again, useful for comparison.

```shell
Insert (x10000)
Bintrees RBTree x 392 ops/sec ±1.14% (87 runs sampled)
Bintrees BinTree x 388 ops/sec ±3.65% (84 runs sampled)
InMemoryStore BinaryIndex x 227 ops/sec ±2.76% (78 runs sampled)
InMemoryStore HashIndex x 1,154 ops/sec ±1.41% (90 runs sampled)
InMemoryStore BinaryArray x 152 ops/sec ±2.62% (77 runs sampled)
InMemoryStore x 1,580 ops/sec ±2.25% (90 runs sampled)
AVL x 597 ops/sec ±0.48% (91 runs sampled)
- Fastest is InMemoryStore

Random read (x10000)
Bintrees RBTree x 1,221 ops/sec ±1.27% (91 runs sampled)
Bintrees BinTree x 563 ops/sec ±1.29% (88 runs sampled)
InMemoryStore BinaryIndex x 934 ops/sec ±0.47% (93 runs sampled)
InMemoryStore HashIndex x 175,522 ops/sec ±1.45% (92 runs sampled)
InMemoryStore BinaryArray x 1,090 ops/sec ±1.51% (88 runs sampled)
InMemoryStore x 18,861 ops/sec ±2.44% (89 runs sampled)
AVL x 985 ops/sec ±0.45% (94 runs sampled)
- Fastest is InMemoryStore HashIndex

Remove (x10000)
Bintrees RBTree x 24,147 ops/sec ±0.57% (94 runs sampled)
Bintrees BinTree x 56,426 ops/sec ±2.08% (86 runs sampled)
InMemoryStore BinaryIndex x 10,614 ops/sec ±1.34% (92 runs sampled)
InMemoryStore HashIndex x 7,464 ops/sec ±1.37% (93 runs sampled)
InMemoryStore BinaryArray x 10,625 ops/sec ±1.29% (91 runs sampled)
InMemoryStore x 15,293 ops/sec ±0.47% (93 runs sampled)
AVL x 9,930 ops/sec ±1.03% (93 runs sampled)
- Fastest is Bintrees BinTree
```
