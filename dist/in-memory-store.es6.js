/**
 * in-memory-store v1.0.4
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

    function lt(comparer, a, b) {
        return comparer(a, b) === -1;
    }

    function eq(comparer, a, b) {
        return comparer(a, b) === 0;
    }

    function defaultComparer(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
    }

    function intersect(arrays) {
        var ordered = (arrays.length===1
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
            // otherwise, add to bookeeping set and the result
            set.add(item);
            result[result.length] = item;
        }
        return result;
    }

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

    var HashIndex = function HashIndex (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || defaultComparer;
        this.index = new Map([]);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    };

    var prototypeAccessors = { keys: { configurable: true } };
        
    HashIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new HashIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    };

    prototypeAccessors.keys.get = function () {
        return Array.from(this.index.keys());
    };

    HashIndex.prototype.clear = function clear () {
        this.index = new Map([]);
    };

    HashIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.find(m); });
        return [].concat.apply([], data);
    };

    HashIndex.prototype.find = function find (key) {
        return this.index.get(key);
    };

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

    HashIndex.prototype.populate = function populate (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) { return this$1.insert(item); });
    };

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

    HashIndex.prototype.update = function update (item, olditem) {
        this.remove(olditem);
        this.insert(item);
    };

    Object.defineProperties( HashIndex.prototype, prototypeAccessors );

    var BinaryArray = function BinaryArray (comparer) {
        this.arr = [];
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$1 = { keys: { configurable: true } };
        
    BinaryArray.prototype.clear = function clear () {
        this.arr = [];
    };

    prototypeAccessors$1.keys.get = function () {
        return this.arr.map(function (m) { return m.key; });
    };

    BinaryArray.prototype.indexOf = function indexOf (key) {
        var i = this.insertPos(key);
        if (this.arr[i] && eq(this.comparer, this.arr[i].key, key)) {
            return i;
        } else {
            return -1;
        }
    };

    BinaryArray.prototype.insertPos = function insertPos (key) {
        var low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid;
        }
        return low;
    };

    BinaryArray.prototype.get = function get (key) {
        var i = this.indexOf(key);
        if (i > -1) {
            return this.arr[i].value;
        }
    };

    BinaryArray.prototype.remove = function remove (key) {
        var i = this.indexOf(key);
        if (i > -1) {
            this.removeAt(i);
        }
    };

    BinaryArray.prototype.add = function add (key, value) {
        var ix = this.insertPos(key);
        this.addAt(ix, key, value);
    };

    BinaryArray.prototype.addAt = function addAt (pos, key, value) {
        var item = { key: key, value: value };
        this.arr.splice(pos, 0, item);
    };

    BinaryArray.prototype.removeAt = function removeAt (pos) {
        this.arr.splice(pos, 1);
    };

    BinaryArray.prototype.getAt = function getAt (pos) {
        return this.arr[pos];
    };

    BinaryArray.prototype.update = function update (item) {
        this.indexOf(item.key);
        if (i !== undefined) {
            this.arr[i].value = item;
        }
    };

    Object.defineProperties( BinaryArray.prototype, prototypeAccessors$1 );

    var BinaryIndex = function BinaryIndex (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || defaultComparer;
        this.index = new BinaryArray(this.comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    };

    var prototypeAccessors$2 = { keys: { configurable: true } };
        
    BinaryIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new BinaryIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    };

    prototypeAccessors$2.keys.get = function () {
        return this.index.keys;
    };

    BinaryIndex.prototype.clear = function clear () {
        this.index = new BinaryArray(this.comparer);
    };

    BinaryIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.find(m); });
        return [].concat.apply([], data);
    };

    BinaryIndex.prototype.find = function find (key) {
        return this.index.get(key);
    };

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

    BinaryIndex.prototype.populate = function populate (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) { return this$1.insert(item); });
    };
        
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

    BinaryIndex.prototype.update = function update (item, olditem) {
        this.remove(olditem);
        this.insert(item);
    };

    Object.defineProperties( BinaryIndex.prototype, prototypeAccessors$2 );

    var AVLIndex = function AVLIndex (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || defaultComparer;
        this.index = new AVLTree(comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    };

    var prototypeAccessors$3 = { keys: { configurable: true } };
        
    AVLIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new AVLIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    };

    prototypeAccessors$3.keys.get = function () {
        return this.index.keys();
    };

    AVLIndex.prototype.clear = function clear () {
        this.index.clear();
    };

    AVLIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.find(m); });
        return [].concat.apply([], data);
    };

    AVLIndex.prototype.find = function find (key) {
        var found = this.index.find(key);
        if (found) {
            return found.data;
        } else {
            return [];
        }
    };

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

    AVLIndex.prototype.populate = function populate (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) { return this$1.insert(item); });
    };
        
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

    AVLIndex.prototype.update = function update (item, olditem) {
        this.remove(olditem);
        this.insert(item);
    };

    Object.defineProperties( AVLIndex.prototype, prototypeAccessors$3 );

    var InMemoryStore = function InMemoryStore(keyFn, comparer) {
        this.indexes = new Map([]);
        this.entries = new Map([]);
        this.keyFn = keyFn;
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$4 = { isEmpty: { configurable: true } };

    prototypeAccessors$4.isEmpty.get = function () {
        return this.entries.size === 0;
    };

    InMemoryStore.prototype.getIndexKeys = function getIndexKeys (indexName) {
        return this.indexes.get(indexName).keys;
    };

    InMemoryStore.prototype.populate = function populate (items) {
            var this$1 = this;

        items = oneOrMany(items);
        this.indexes.forEach(function (index) { return index.populate(items); });
        var data = items.map(function (item) { return [this$1.keyFn(item), item]; });
        this.entries = new Map(data);
    };

    InMemoryStore.prototype.rebuild = function rebuild (items) {
        this.entries = new Map([]);
        this.indexes.forEach(function (index) { return index.clear(); });
        this.populate(items);
    };

    InMemoryStore.prototype.destroy = function destroy () {
        this.indexes = new Map([]);
        this.entries = new Map([]);
        this.keyFn = undefined;
    };
    	
    	InMemoryStore.prototype.get = function get (indexName, values) {
        var data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).findMany(values) : [];
        return extract(this.entries, data);
    };

    InMemoryStore.prototype.getOne = function getOne (indexName, value) {
        var data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).find(value) : [];
        return extract(this.entries, data);
    };

    // Takes array of [indexName, [exactMatch, exactMatch]]
    InMemoryStore.prototype.getFromSet = function getFromSet (valueSet) {
            var this$1 = this;

        var dataSets = valueSet.map(function (q) {
            return this$1.get(q[0], q[1]);
        });
        var data = intersect(dataSets);
        return extract(this.entries, data);
    };

    InMemoryStore.prototype.buildIndex = function buildIndex (indexName, ixFn) {
        return this.buildBinaryIndex(indexName, ixFn, this.comparer);
    };

    InMemoryStore.prototype.buildHashIndex = function buildHashIndex (indexName, ixFn) {
        var newIndex = HashIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    };

    InMemoryStore.prototype.buildBinaryIndex = function buildBinaryIndex (indexName, ixFn) {
        var newIndex = BinaryIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    };

    InMemoryStore.prototype.buildAVLIndex = function buildAVLIndex (indexName, ixFn) {
        var newIndex = AVLIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    };

    InMemoryStore.prototype.remove = function remove (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.removeOne(item);
        });
    };

    InMemoryStore.prototype.removeOne = function removeOne (item) {
        if (this.indexes.size > 0) {
            this.indexes.forEach(function (index) { return index.remove(item); });
        }
        return this.entries.delete(this.keyFn(item));
    };

    InMemoryStore.prototype.removeKey = function removeKey (key) {
        var item = this.entries.get(key);
        if (this.indexes.size > 0) {
            this.indexes.forEach(function (index) { return index.remove(item); });
        }
        return this.entries.delete(key);
    };

    InMemoryStore.prototype.add = function add (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.updateOne(item);
        });
    };

    InMemoryStore.prototype.addOne = function addOne (item) {
        this.updateOne(item);
    };

    InMemoryStore.prototype.update = function update (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.updateOne(item);
        });
    };

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

    Object.defineProperties( InMemoryStore.prototype, prototypeAccessors$4 );

    exports.InMemoryStore = InMemoryStore;
    exports.HashIndex = HashIndex;
    exports.BinaryIndex = BinaryIndex;
    exports.AVLIndex = AVLIndex;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=in-memory-store.es6.js.map
