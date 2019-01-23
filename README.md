# JavaScript In Memory Store
JavaScript memory store for key/value with indexed lookups based on hash and binary search.

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

`keyFn`: each item in the store requires a unique key, specify the function to get it from the item.

Creating and populating a store ...
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
```

Removing and updating items ...
```javascript
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
```

All store queries require an index. You can use either a BinaryIndex or HashIndex.  BinaryIndex keeps data sorted at all times and provide fast range searches (e.g. $lt, $gt).  HashIndex is significantly faster to query for single items. 
```javascript
// Build a binary index (binary indexes are sorted at all times)
let index = new BinaryIndex("firstLetter", obj => obj.key, kitten => kitten.breed);
// Build a hash index (hash indexes are very fast, but can't do range searches)
let index = new HashIndex("firstLetter", kitten => kitten.breed);
// Keys are case senstive, so normalise if needed
let index = new BinaryIndex("firstLetter", obj => obj.key, kitten => kitten.breed.toLowerCase());
// Add an index to the store (populates it with items in the store if not already populated)
store.ensureIndex(index);
```

Most simple way to query the store is using the get and getOne functions.
```javascript
// Get all entries with specified breed
let britishShorthair = store.getOne('breed', 'British Shorthair');
// Get based on array of breeds
let allSorts = store.get('breed', ['British Shorthair','Moggy']);
// Get join of 2 indexes
let mixed = store.get('breed', ['British Shorthair','Moggy']);
let old = store.get('age', [5,6,7]);
let oldOrMixed = [...old, ...mixed];
```

You can also use the `find()` function to execute CouchDB style [Mango queries](https://docs.couchdb.org/en/2.2.0/api/database/find.html). Only $and, $or are currently supported combinators.  `$lt, $gt, $gte, $lte, $eq, $in` operators are all supported.
```javascript
// Using implicit $and with implicit $in
let oldMixed = store.find([
        {'breed': ['British Shorthair','Moggy']},
        {'age': [5,6,7]}
]);
// Using $or with implicit $in
let oldOrBreed = store.find(
        $or: [
                {'breed': ['British Shorthair','Moggy']},
                {'age': [5,6,7]}
        ]
]);
// Using $or with explicit $in and $eq
let oldOrBreed = store.find(
        $or: [
                {'breed': {'$eq': 'British Shorthair'}},
                {'age': {'$in': [5,6,7]}}
        ]
]);
// Get all kittens that are 3 months old (most simple form)
let allSorts = store.find({'age': 3});
// Get all kittens age more than 2 months
let allSorts = store.find({'age': {'$gt': 2}});
// Get all kittens with age less than or equal to 3
let allSorts = store.find({'age': {'$lte': 2}});
```

Rebuilding and cleaning up a store ...
```javascript
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
* AVLIndex - Index built on AVLIndex from [AVL](https://github.com/w8r/avl).

## Results
```shell
Insert (x10000)
AVLIndex x 1,258 ops/sec ±0.72% (90 runs sampled)
BinaryIndex x 689 ops/sec ±2.95% (86 runs sampled)
HashIndex x 2,025 ops/sec ±2.89% (88 runs sampled)
- Fastest is HashIndex

Random read (500 finds x 20 times)
AVLIndex x 2,223 ops/sec ±1.01% (93 runs sampled)
BinaryIndex x 2,094 ops/sec ±1.23% (91 runs sampled)
HashIndex x 175,833 ops/sec ±2.20% (91 runs sampled)
- Fastest is HashIndex

gt read (500 finds)
AVLIndex x 9.74 ops/sec ±2.92% (28 runs sampled)
BinaryIndex x 87.02 ops/sec ±3.25% (74 runs sampled)
HashIndex x 25.50 ops/sec ±1.37% (46 runs sampled)
- Fastest is BinaryIndex

lte read (500 finds)
AVLIndex x 18.77 ops/sec ±1.36% (37 runs sampled)
BinaryIndex x 87.51 ops/sec ±1.75% (74 runs sampled)
HashIndex x 24.28 ops/sec ±3.22% (44 runs sampled)
- Fastest is BinaryIndex

Remove (x10000)
AVLIndex x 11,354 ops/sec ±1.46% (86 runs sampled)
BinaryIndex x 9,379 ops/sec ±0.79% (87 runs sampled)
HashIndex x 7,641 ops/sec ±2.08% (80 runs sampled)
- Fastest is RBIndex
```
