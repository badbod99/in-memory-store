# JavaScript In Memory Store
JavaScript memory store for key/value with indexed lookups based on hash.  No dependencies on any other library.  Designed for ES6, so if you must support ES5 you will need ES5 shim.

# Install
Copy the 2 files in the src folder to your local project.  Nothing else is needed.

# Usage
InMemoryStore constructor takes 2 parameters `keyFn[, items]`. 

`keyFn`: function applied to each object added to the store to get it's key for indexing purposes.  
`items`: array of objects to populate the store.

Create a store as:
`let store = new InMemoryStore(obj => obj.key);`

Populate on creation:

`let store = new InMemoryStore(obj => obj.key, items);`

A more complex example, populating the items later would be:

```
let store = new InMemoryStore(obj => obj.key);
...
// populate the store with your items when you like
store.populate(items);
```

You can create an index on the store like so:

```
// builds the index, where 'breed' is the index name
store.buildIndex('breed', kitten => kitten.breed);
```

Indexes are case sensitive, so normalise your values if you expect variation.  You can build as many indexes as you like.  Each is stored as a JavaScript Map object.  You can get items from the store by Index.
```
// Get one breed
let britishShorthair = store.get('breed', 'British Shorthair');

// Get based on array of breeds
let allSorts = store.getMany('breed', ['British Shorthair','Moggy']);

// Get intersection of 2 indexes
let oldMixed = store.getFromSet([['breed', ['British Shorthair','Moggy'], ['age',[5,6,7]]);
```
