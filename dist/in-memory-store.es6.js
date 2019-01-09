/**
 * in-memory-store v1.0.5
 * JavaScript memory store for key/value with indexed lookups based on hash and binary search.
 *
 * @author Simon Lerpiniere
 * @license Apache-2.0
 * @preserve
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('avl')) :
    typeof define === 'function' && define.amd ? define(['exports', 'avl'], factory) :
    (factory((global['in-memory-store'] = {}),global.AVLTree));
}(this, (function (exports,AVLTree) { 'use strict';

    AVLTree = AVLTree && AVLTree.hasOwnProperty('default') ? AVLTree['default'] : AVLTree;

    /**
    * Callback for comparer
    * @callback comparerCallback
    * @param   {Key} a
    * @param   {Key} b
    * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
    */

    /**
     * Callback for item identifier
     * @callback itemCallback
     * @param   {any} item
     * @returns {any} unique value to identify the item
     */

    /**
     * Callback for key value
     * @callback keyCallback
     * @param   {any} item
     * @returns {any} value to index this item on
     */

    /**
     * Converts a passed value into an array.  Useful if you don't know
     * if your passed parameter is an array or single value.
     * @param  {any} items single item, array or javascript Map object
     * @return {Array<any>} array of passed item(s)
     */
    function oneOrMany(items) {
        if (!items) {
            return [];
        } else if (items instanceof Map) {
            return Array.from(items.values());
        } else if (!Array.isArray(items)) {
            return [items];
        } else {
            return items;
        }
    }

    /**
     * Returns whether or not a < b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a <= b
     */
    function lte(comparer, a, b) {
        return comparer(a, b) <= 0;
    }

    /**
     * Returns whether or not a > b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a => b
     */
    function gte(comparer, a, b) {
        return comparer(a, b) >= 0;
    }

    /**
     * Returns whether or not a < b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a < b
     */
    function lt(comparer, a, b) {
        return comparer(a, b) < 0;
    }

    /**
     * Returns whether or not a > b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a > b
     */
    function gt(comparer, a, b) {
        return comparer(a, b) > 0;
    }

    /**
     * Returns whether or not a === b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a === b
     */
    function eq(comparer, a, b) {
        return comparer(a, b) === 0;
    }

    /**
     * Default comparer equal to as used on Array.sort
     * @param  {any} a 
     * @param  {any} b 
     * @return {number} result of comparison
     */
    function defaultComparer(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
    }

    /**
     * Intersects N arrays
     * @param  {Array<Array<any>>} arrays N arrays with values to intersect
     * @return {Array<any>} array of values where that value is in all array
     */
    function intersect(arrays) {
        var ordered = (arrays.length === 1
            ? arrays : 
            arrays.sort(function (a1,a2) { return a1.length - a2.length; }));
        var shortest = ordered[0],
            set = new Set(), 
            result = [];

        for (var i=0; i < shortest.length; i++) {
            var item = shortest[i];
            var every = true; // don't use ordered.every ... it is slow
            for(var j=1;j<ordered.length;j++) {
                if(ordered[j].includes(item)) { continue; }
                every = false;
                break;
            }
            // ignore if not in every other array, or if already captured
            if(!every || set.has(item)) { continue; }
            // otherwise, add to book keeping set and the result
            set.add(item);
            result[result.length] = item;
        }
        return result;
    }

    /**
     * Extracts items passed by an array of keys from the passed map.
     * @param  {Map} map javascript map object containing all keys and values
     * @param  {Array<any>} keys keys to extract from the map
     * @return {Array<any>} array of values extracted from the passed map
     */
    function extract(map, keys) {
        var r = [];
        keys = oneOrMany(keys);
        map = map || new Map([]);
        
        keys.forEach(function (key) {
            if (map.has(key)) {
                r.push(map.get(key));
            }
        });    
        return r;
    }

    /**
     * Key value storage with support for grouping/returning items by index value
     */
    var InMemoryStore = function InMemoryStore(keyFn) {
         this.indexes = new Map([]);
         this.entries = new Map([]);
         this.keyFn = keyFn;        
     };

    var prototypeAccessors = { isEmpty: { configurable: true },size: { configurable: true } };

     /**
      * Returns whether the store is empty
      * @return {boolean}
      */
     prototypeAccessors.isEmpty.get = function () {
         return this.entries.size === 0;
     };

     /**
      * Returns the number of items in the store
      * @return {number}
      */
     prototypeAccessors.size.get = function () {
         return this.entries.size;
     };

     /**
      * Returns whether or not this store is empty
      * @abstract
      * @return {boolean}
      */
     prototypeAccessors.isEmpty.get = function () {
         return this.size === 0;
     };

     /**
      * Returns all keys wihin the specified index
      * @return {Array<Key>}
      */
     InMemoryStore.prototype.getIndexKeys = function getIndexKeys (indexName) {
         return this.indexes.get(indexName).keys;
     };

     /**
      * Populates a new store with items using bulk load methods for indexes if available
      * @param  {Array<any>} items items to populate store with
      */
     InMemoryStore.prototype.populate = function populate (items) {
            var this$1 = this;

         if (!this.isEmpty) {
             throw new Error(("Store must be empty to use populate. \n                Store currently has " + (this.size) + " items."));
         }

         items = oneOrMany(items);
         this.indexes.forEach(function (index) { return index.populate(items); });
         var data = items.map(function (item) { return [this$1.keyFn(item), item]; });
         this.entries = new Map(data);
     };

     /**
      * Clears and re-populates a new store with items using bulk 
      * load methods for indexes if available
      * @param  {Array<any>} items items to populate store with
      */
     InMemoryStore.prototype.rebuild = function rebuild (items) {
         this.entries = new Map([]);
         this.indexes.forEach(function (index) { return index.clear(); });
         this.populate(items);
     };

     /**
      * Clear the store
      * @return {InMemoryStore}
      */
     InMemoryStore.prototype.destroy = function destroy () {
         this.indexes = new Map([]);
         this.entries = new Map([]);
         this.keyFn = undefined;
     };
        
     /**
      * Whether the store contains an item with the given key
      * @param  {Key} key
      * @return {boolean} true/false
      */
     InMemoryStore.prototype.has = function has (item) {
         return this.entries.has(this.keyFn(item));
     };

     /**
      * Returns items within specified index matching passed values
      * @param  {string} indexName index to search
      * @param  {Array<any>} values specified index values
      * @return {Array<any>} values found
      */
    	InMemoryStore.prototype.get = function get (indexName, values) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).findMany(values) : [];
         return extract(this.entries, data);
     };

     /**
      * Returns items within specified index matching passed value
      * @param  {string} indexName index to search
      * @param  {any} value specified index value
      * @return {Array<any>} values found
      */
     InMemoryStore.prototype.getOne = function getOne (indexName, value) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).find(value) : [];
         return extract(this.entries, data);
     };

     // Takes array of [indexName, [exactMatch, exactMatch]]
     /**
      * Searches many indexes each with many values and intersects the results
      * @param  {Array<string, Array<any>>} valueSet [indexName, [exactMatch, exactMatch]]
      * @return {Array<any>} values found
      */
     InMemoryStore.prototype.getFromSet = function getFromSet (valueSet) {
            var this$1 = this;

         var dataSets = valueSet.map(function (q) {
             return this$1.get(q[0], q[1]);
         });
         var data = intersect(dataSets);
         return extract(this.entries, data);
     };

     /**
      * Adds a new index onto this store if it does not already exist. Populates index with entries
      * if index not already populated.
      * @param  {BaseIndex} index index ensure exists and is populated
      * @return {boolean} true if index was added by this operation, false if already exists.
      */
     InMemoryStore.prototype.ensureIndex = function ensureIndex (index) {
         if (!this.indexes.has(index.name)) {
             this.indexes.set(index.name, index);
             if (index.isEmpty) {
                 index.populate(this.entries);
             }
             return true;
         } else {
             return false;
         }
     };

     /**
      * Removes items from the store and any associated indexes
      * @param  {Array<any>} items items to remove
      * @return {Array<boolean>} whether each remove succeeded (false if not found)
      */
     InMemoryStore.prototype.remove = function remove (items) {
            var this$1 = this;

         items = oneOrMany(items);
         return items.map(function (item) { return this$1.removeOne(item); });
     };

     /**
      * Removes an item from the store and any associated indexes
      * @param  {any} item item to remove
      * @return {boolean} whether remove succeeded (false if not found)
      */
     InMemoryStore.prototype.removeOne = function removeOne (item) {
         if (this.indexes.size > 0) {
             this.indexes.forEach(function (index) { return index.remove(item); });
         }
         return this.entries.delete(this.keyFn(item));
     };

     /**
      * Removes an item from the store by key and any associated indexes
      * @param  {any} key key of item to remove
      * @return {boolean} whether remove succeeded (false if not found)
      */
     InMemoryStore.prototype.removeKey = function removeKey (key) {
         var item = this.entries.get(key);
         if (!item) {
             return false;
         }
         if (this.indexes.size > 0) {
             this.indexes.forEach(function (index) { return index.remove(item); });
         }
         return this.entries.delete(key);
     };

     /**
      * Adds items to the store and updated any associated indexes
      * @param  {Array<any>} items items to add
      */
     InMemoryStore.prototype.add = function add (items) {
            var this$1 = this;

         items = oneOrMany(items);
         items.map(function (item) { return this$1.updateOne(item); });
     };

     /**
      * Adds an item to the store and updated any associated indexes
      * @param  {any} item item to add
      */
     InMemoryStore.prototype.addOne = function addOne (item) {
         this.updateOne(item);
     };

     /**
      * Updates items to the store and updated any associated indexes
      * @param  {Array<any>} items items to update
      */
     InMemoryStore.prototype.update = function update (items) {
            var this$1 = this;

         items = oneOrMany(items);
         items.forEach(function (item) {
             this$1.updateOne(item);
         });
     };

     /**
      * Updates an item in the store and updated any associated indexes
      * @param  {any} item item to update
      */
     InMemoryStore.prototype.updateOne = function updateOne (item) {
         var old;
         var key = this.keyFn(item);
         if (this.entries.has(key)) {
             old = this.entries.get(key);
         }
         if (this.indexes.size > 0) {
             this.indexes.forEach(function (index) { return index.update(item, old); });
         }
         this.entries.set(key, item);
     };

    Object.defineProperties( InMemoryStore.prototype, prototypeAccessors );

    /**
     * Base index for use with in-memory-store
     */
    var BaseIndex = function BaseIndex (name, itemFn, keyFn) {
        if (this.constructor === BaseIndex) {
            throw new TypeError("Cannot construct BaseIndex directly");
        }

        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    };

    var prototypeAccessors$1 = { isEmpty: { configurable: true },keys: { configurable: true } };

    /**
     * Returns whether or not this index is empty
     * @abstract
     * @return {boolean}
     */
    prototypeAccessors$1.isEmpty.get = function () {
        throw new TypeError("Must implement isEmpty property");
    };

    /**
     * Returns all keys
     * @abstract
     * @return {Array<Key>}
     */
    prototypeAccessors$1.keys.get = function () {
        throw new TypeError("Must implement keys property");
    };    

    /**
     * Removes all items from the index
     * @abstract
     */
    BaseIndex.prototype.clear = function clear () {
        throw new TypeError("Must implement clear method");
    };

    /**
     * Returns items within matching passed index keys
     * @param  {Array<any>} keys specified index keys
     * @return {Array<any>} values found
     */
    BaseIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.find(m); });
        return [].concat.apply([], data);
    };

    /**
     * Returns items matching passed index key
     * @abstract
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
    BaseIndex.prototype.find = function find (key) {
        throw new TypeError("Must implement find method");
    };

    /**
     * Removes an item
     * @abstract
     * @param  {any} item item to remove
     */
    BaseIndex.prototype.remove = function remove (item) {
        throw new TypeError("Must implement build method");
    };

    /**
     * Populates this index with new items and indexes as per itemFn and keyFn defined on index creation
     * @param  {Array<any>} items items to populate store with
     */
    BaseIndex.prototype.populate = function populate (items) {
            var this$1 = this;

        if (!this.isEmpty) {
            throw new Error(((typeof this) + " index must be empty in order to use populate"));
        }

        items = oneOrMany(items);
        items.forEach(function (item) { return this$1.insert(item); });
    };

    /**
     * Adds an item with indexes as per itemFn and keyFn defined on index creation
     * @abstract
     * @param  {any} item item to add to index
     */
    BaseIndex.prototype.insert = function insert (item) {
        throw new TypeError("Must implement insert method");
    };

    /**
     * Updates an item by removing any associated index entry based on oldItem and adding new index
     * entries based on the new item.  Important to pass oldItem otherwise index may contain entries from
     * item in wrong indexed key.
     * @param  {any} oldItem item as it was prior to being updated
     * @param  {any} item item as it is now
     */
    BaseIndex.prototype.update = function update (item, olditem) {
        this.remove(olditem);
        this.insert(item);
    };

    Object.defineProperties( BaseIndex.prototype, prototypeAccessors$1 );

    /**
     * Index based on javascript Map object for key/value storage. Groups items by index value, 
     * stores items within index value as array using linear search.
     * @extends {BaseIndex}
     */
    var HashIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function HashIndex (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new Map([]);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) HashIndex.__proto__ = BaseIndex$$1;
        HashIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        HashIndex.prototype.constructor = HashIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.size === 0;
        };

        /**
         * Returns all keys
         * @return {Array<Key>}
         */
        prototypeAccessors.keys.get = function () {
            return Array.from(this.index.keys());
        };

        /**
         * Returns all entries less than the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        HashIndex.prototype.lt = function lt$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return lt(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Returns all entries less or equal to the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        HashIndex.prototype.lte = function lte$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return lte(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Returns all entries greater than the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        HashIndex.prototype.gt = function gt$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return gt(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        HashIndex.prototype.gte = function gte$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return gte(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Removes all items from the index
         */
        HashIndex.prototype.clear = function clear () {
            this.index = new Map([]);
        };

        /**
         * Returns items matching passed index key
         * @param  {any} key specified index key
         * @return {Array<any>} values found
         */
        HashIndex.prototype.find = function find (key) {
            return this.index.get(key);
        };

        /**
         * Removes an item
         * @param  {any} item item to remove
         */
        HashIndex.prototype.remove = function remove (item) {
            var key = this.keyFn(item);
            if (this.index.has(key)) {
                var col = this.index.get(key);
                var it = this.itemFn(item);
                var i = col.indexOf(it);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.delete(key);
                }
            }
        };

        /**
         * Adds an item with indexes as per itemFn and keyFn defined on index creation
         * @param  {any} item item to add to index
         */
        HashIndex.prototype.insert = function insert (item) {
            var key = this.keyFn(item);
            var it = this.itemFn(item);
            if (it && key) {
                if (this.index.has(key)) {
                    this.index.get(key).push(it);
                } else {
                    this.index.set(key, [it]);
                }
            }
        };

        Object.defineProperties( HashIndex.prototype, prototypeAccessors );

        return HashIndex;
    }(BaseIndex));

    /**
     * Binary key/value storage backed by native javascript array. Performs binary search on entries and
     * keeps items in sorted order based on comparer.
     */
    var BinaryArray = function BinaryArray (comparer) {
        this.arr = [];
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$2 = { keys: { configurable: true },length: { configurable: true } };
        
    /**
     * Removes all items from the index
     */
    BinaryArray.prototype.clear = function clear () {
        this.arr = [];
    };

    /**
     * Returns an array of keys store in this Key Value array
     * @returns {Array<any>} all keys
     */
    prototypeAccessors$2.keys.get = function () {
        return this.arr.map(function (m) { return m.key; });
    };

    /**
     * Returns the number of items in this BinaryArray
     * @returns {number}
     */
    prototypeAccessors$2.length.get = function () {
        return this.arr.length;
    };

    /**
     * Returns all entries less than the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.lt = function lt$$1 (key) {
        var i = this.insertPos(key);
        var data = this.arr.slice(0, i);
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns all entries less or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.lte = function lte$$1 (key) {
        var i = this.insertPos(key);
        var data = i >= 0 ? this.arr.slice(0, i + 1) : [];
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns all entries greater than the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.gt = function gt$$1 (key) {
        var i = this.insertPos(key);
        var data = i < this.arr.length ? this.arr.slice(i + 1, this.arr.length) : [];
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns all entries greater than or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.gte = function gte$$1 (key) {
        var i = this.insertPos(key);
        var data = i < this.arr.length ? this.arr.slice(i, this.arr.length) : [];
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns the index in this array of the specified key
     * @param {any} key 
     * @returns {number}
     */
    BinaryArray.prototype.indexOf = function indexOf (key) {
        var i = this.insertPos(key);
        if (this.arr[i] && eq(this.comparer, this.arr[i].key, key)) {
            return i;
        } else {
            return -1;
        }
    };

    /**
     * The insert position where to insert an item into the underlying sorted array.     
     * @param {any} key key to find in the array
     * @returns {number} position at which a new item should be inserted into this array
     */
    BinaryArray.prototype.insertPos = function insertPos (key) {
        var low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid;
        }
        return low;
    };

    /**
     * Returns items matching passed index key
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
    BinaryArray.prototype.get = function get (key) {
        var i = this.indexOf(key);
        if (i > -1) {
            return this.arr[i].value;
        }
    };

    /**
     * Removes an item by key
     * @param  {any} key key of item to remove
     */
    BinaryArray.prototype.remove = function remove (key) {
        var i = this.indexOf(key);
        if (i > -1) {
            this.removeAt(i);
        }
    };

    /**
     * Adds an key/value with array
     * @param  {any} key key to add
     * @param  {any} value item related to the specified key
     */
    BinaryArray.prototype.add = function add (key, value) {
        var ix = this.insertPos(key);
        this.addAt(ix, key, value);
    };

    /**
     * Adds a key/value entry at a specified position in the array.
     * Will not replace any existing item in that postion, instead
     * inserting before it.
     * @param {number} pos index of where to add this entry
     * @param {any} key key to add
     * @param {any} value item related to the specified key
     */
    BinaryArray.prototype.addAt = function addAt (pos, key, value) {
        var item = { key: key, value: value };
        this.arr.splice(pos, 0, item);
    };

    /**
     * Removes a key/value entry at a specified position
     * @param {number} pos index of the item to remove.
     */
    BinaryArray.prototype.removeAt = function removeAt (pos) {
        this.arr.splice(pos, 1);
    };

    /**
     * Returns key matching passed index position
     * @param  {number} pos index of where to add this entry
     * @return {any} key found at this position
     */
    BinaryArray.prototype.getAt = function getAt (pos) {
        return this.arr[pos];
    };

    Object.defineProperties( BinaryArray.prototype, prototypeAccessors$2 );

    /**
     * Index based on BinaryArray for key/value storage. Groups items by index value, 
     * stores items within index value as array using linear search.
     * @extends {BaseIndex}
     */
    var BinaryIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function BinaryIndex (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new BinaryArray(this.comparer);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) BinaryIndex.__proto__ = BaseIndex$$1;
        BinaryIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        BinaryIndex.prototype.constructor = BinaryIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.length === 0;
        };

        /**
         * Returns all keys
         * @return {Array<Key>}
         */
        prototypeAccessors.keys.get = function () {
            return this.index.keys;
        };

        /**
         * Removes all items from the index
         */
        BinaryIndex.prototype.clear = function clear () {
            this.index = new BinaryArray(this.comparer);
        };

        /**
         * Returns all entries less than the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        BinaryIndex.prototype.lt = function lt$$1 (key) {
            return this.index.lt(key);
        };

        /**
         * Returns all entries less or equal to the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        BinaryIndex.prototype.lte = function lte$$1 (key) {
            return this.index.lte(key);
        };

        /**
         * Returns all entries greater than the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        BinaryIndex.prototype.gt = function gt$$1 (key) {
            return this.index.gt(key);
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {*} key 
         */
        BinaryIndex.prototype.gte = function gte$$1 (key) {
            return this.index.gte(key);
        };

        /**
         * Returns items matching passed index key
         * @param  {any} key specified index key
         * @return {Array<any>} values found
         */
        BinaryIndex.prototype.find = function find (key) {
            return this.index.get(key);
        };

        /**
         * Removes an item
         * @param  {any} item item to remove
         */
        BinaryIndex.prototype.remove = function remove (item) {
            var key = this.keyFn(item);
            var pos = this.index.indexOf(key);
            
            if (pos > -1) {
                var entry = this.index.getAt(pos);
                var it = this.itemFn(item);
                var i = entry.value.indexOf(it);
                if (i > -1) {
                    entry.value.splice(i, 1);
                }
                if (entry.value.length === 0) {
                    this.index.removeAt(pos);
                }
            }
        };
        
        /**
         * Adds an item with indexes as per itemFn and keyFn defined on index creation
         * @param  {any} item item to add to index
         */
        BinaryIndex.prototype.insert = function insert (item) {
            var key = this.keyFn(item);
            var it = this.itemFn(item);
            var pos = this.index.insertPos(key);
            var entry = this.index.getAt(pos);
            
            if (entry && eq(this.comparer, entry.key, key)) {
                entry.value.push(it);
            } else {
                this.index.addAt(pos, key, [it]); 
            }
        };

        Object.defineProperties( BinaryIndex.prototype, prototypeAccessors );

        return BinaryIndex;
    }(BaseIndex));

    /**
     * Index based on AVL Tree object for key/value storage. Groups items by index value, 
     * stores items within index value as array using linear search.
     * @extends {BaseIndex}
     */
    var AVLIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function AVLIndex (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new AVLTree(comparer);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) AVLIndex.__proto__ = BaseIndex$$1;
        AVLIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        AVLIndex.prototype.constructor = AVLIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.size === 0;
        };

        /**
         * Returns all keys
         * @return {Array<Key>}
         */
        prototypeAccessors.keys.get = function () {
            return this.index.keys();
        };

        /**
         * Removes all items from the index
         */
        AVLIndex.prototype.clear = function clear () {
            this.index.clear();
        };

        /**
         * Returns all entries less than the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.lt = function lt$$1 (key) {
            var lastKey;
            var data = [];
            this.index.range(this.index.min, key, function (n) {
                lastKey = n.key;
                data.push(n.data);
            });
            if (data.length === 0) {
                return [];
            }
            // Since Tree is unique, we only need to check last key to omit
            if (eq(this.comparer, lastKey, key)) {
                data.pop();
            }
            return data;
        };

        /**
         * Returns all entries less or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.lte = function lte$$1 (key) {
            var data = [];
            this.index.range(this.index.min, key, function (n) {
                data.push(n.data);
            });
            return data;
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.gt = function gt$$1 (key) {
            var firstKey;
            var data = [];
            this.index.range(key, this.index.max, function (n) {
                if (firstKey === undefined) {
                    firstKey = n.key;
                }
                data.push(n.data);
            });
            if (data.length === 0) {
                return [];
            }
            // Since Tree is unique, we only need to check first key to omit
            if (eq(this.comparer, firstKey, key)) {
                data.shift();
            }
            return data;
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.gte = function gte$$1 (key) {
            var data = [];
            this.index.range(key, this.index.max, function (n) {
                data.push(n.data);
            });
            return data;
        };

        /**
         * Returns items matching passed index key
         * @param  {any} key specified index key
         * @return {Array<any>} values found
         */
        AVLIndex.prototype.find = function find (key) {
            var found = this.index.find(key);
            if (found) {
                return found.data;
            } else {
                return [];
            }
        };

        /**
         * Removes an item
         * @param  {any} item item to remove
         */
        AVLIndex.prototype.remove = function remove (item) {
            var key = this.keyFn(item);
            var entry = this.index.find(key);

            if (entry) {
                var it = this.itemFn(item);
                var arr = entry.data;
                var i = arr.indexOf(it);
                if (i > -1) {
                    arr.splice(i, 1);
                }
                if (arr.length === 0) {
                    this.index.remove(key);
                }
            }
        };
        
        /**
         * Adds an item with indexes as per itemFn and keyFn defined on index creation
         * @param  {any} item item to add to index
         */
        AVLIndex.prototype.insert = function insert (item) {
            var key = this.keyFn(item);
            var it = this.itemFn(item);
            var entry = this.index.find(key);
            
            if (entry) {
                entry.data.push(it);
            } else {
                this.index.insert(key, [it]);
            }
        };

        Object.defineProperties( AVLIndex.prototype, prototypeAccessors );

        return AVLIndex;
    }(BaseIndex));

    exports.InMemoryStore = InMemoryStore;
    exports.HashIndex = HashIndex;
    exports.BinaryIndex = BinaryIndex;
    exports.AVLIndex = AVLIndex;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=in-memory-store.es6.js.map
