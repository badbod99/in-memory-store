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

in-memory-store currently ships with 2 indexes.  BinaryIndex and HashIndex.

* HashIndex - Backed by a javascript Map object. Insert/Read/Remove is all 
very fast.  
* BinaryIndex is an array backed binary search index. Read performance
is fast due to the low number of function calls and zero recursion. It easily
outperforms AVL and Bintrees on larger datasets. The compromise is that insert
and remove performance is poor.

The InMemoryStore test itself is without any index setup.

```shell
Insert (x10000)
Bintrees x 405 ops/sec ±1.06% (88 runs sampled)
InMemoryStore BinaryIndex x 89.83 ops/sec ±5.46% (75 runs sampled)
InMemoryStore HashIndex x 1,007 ops/sec ±4.69% (78 runs sampled)
InMemoryStore x 1,385 ops/sec ±3.25% (77 runs sampled)
AVL x 466 ops/sec ±4.60% (75 runs sampled)
- Fastest is InMemoryStore

Random read (x10000)
Bintrees x 1,224 ops/sec ±1.78% (89 runs sampled)
InMemoryStore BinaryIndex x 5,034 ops/sec ±3.17% (87 runs sampled)
InMemoryStore HashIndex x 161,850 ops/sec ±2.42% (81 runs sampled)
InMemoryStore x 16,178 ops/sec ±4.76% (78 runs sampled)
AVL x 975 ops/sec ±3.16% (87 runs sampled)
- Fastest is InMemoryStore HashIndex

Remove (x10000)
Bintrees x 23,962 ops/sec ±1.16% (90 runs sampled)
InMemoryStore BinaryIndex x 5,361 ops/sec ±0.85% (94 runs sampled)
InMemoryStore HashIndex x 20,083 ops/sec ±0.81% (91 runs sampled)
InMemoryStore x 14,818 ops/sec ±1.28% (94 runs sampled)
AVL x 21,165 ops/sec ±1.09% (92 runs sampled)
- Fastest is Bintrees
```
