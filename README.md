# JavaScript In Memory Store
JavaScript memory store for key/value with indexed lookups based on hash.  No dependencies on any other library.  Designed for ES6, so if you must support ES5 you will need babel or similar.

# Install
Copy the files in the src folder to your local project.  Nothing else is needed.

# Usage
InMemoryStore constructor takes 2 parameters `keyFn[, items]`. 

`keyFn`: each item in the store requires a unique key, specific the function to get it from the item.
`items`: array of objects to populate the store.

Example usage...
```javascript
// Populate on creating with items array
let store = new InMemoryStore(obj => obj.key, items);

// Create an empty store
let store = new InMemoryStore(obj => obj.key);
// and populate it later
store.populate(items);

// Build an index (default index type is a HashIndex)
store.buildIndex('breed', kitten => kitten.breed);
// Build a binary index
store.buildBinaryIndex('breed', kitten => kitten.breed);
// Keys are case senstive, so normalise if needed
store.buildBinaryIndex('breed', kitten => kitten.breed.toLowerCase());

// Get all entries with specified breeds
let britishShorthair = store.get('breed', 'British Shorthair');
// Get based on array of breeds
let allSorts = store.get('breed', ['British Shorthair','Moggy']);
// Get intersection of 2 indexes
let oldMixed = store.getFromSet([['breed', ['British Shorthair','Moggy'], ['age',[5,6,7]]);
// Get join of 2 indexes
let mixed = store.get('breed', ['British Shorthair','Moggy']);
let old = store.get('age', [5,6,7]);
let oldOrMixed = [...old, ...mixed];
```
