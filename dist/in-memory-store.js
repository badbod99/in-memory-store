/**
 * in-memory-store v1.0.4
 * JavaScript memory store for key/value with indexed lookups based on hash and binary search.
 *
 * @author Simon Lerpiniere
 * @license Apache-2.0
 * @preserve
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global['in-memory-store'] = factory());
}(this, (function () { 'use strict';

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
        keys.forEach(function (key) {
            if (map.has(key)) {
                r.push(map.get(key));
            }
        });    
        return r;
    }

    var HashIndex = function HashIndex (name, itemFn, keyFn, comparer) {
        this.index = new Map([]);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors = { keys: { configurable: true } };
        
    HashIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new HashIndex(name, itemFn, keyFn, comparer);
        bin.add(items);
        return bin;
    };

    prototypeAccessors.keys.get = function () {
        return Array.from(this.index.keys());
    };

    HashIndex.prototype.clear = function clear () {
        this.index = new Map([]);
    };

    HashIndex.prototype.getOne = function getOne (key) {
        return this.index.get(key);
    };

    HashIndex.prototype.get = function get (keys) {
        keys = oneOrMany(keys);
        if (keys.length === 1) {
            return this.getOne(keys[0]);
        }
        var data = keys.map(function (m) { return getOne(m); });
        return [].concat.apply([], data);
    };

    HashIndex.prototype.remove = function remove (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.removeOne(item);
        });
    };

    HashIndex.prototype.removeOne = function removeOne (item) {
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

    HashIndex.prototype.add = function add (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.addOne(item);
        });
    };

    HashIndex.prototype.addOne = function addOne (item) {
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
        this.removeOne(olditem);
        this.addOne(item);
    };

    Object.defineProperties( HashIndex.prototype, prototypeAccessors );

    var BinaryIndex = function BinaryIndex (name, itemFn, keyFn, comparer) {
        this.index = [];
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$1 = { keys: { configurable: true } };
        
    BinaryIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new BinaryIndex(name, itemFn, keyFn, comparer);
        bin.add(items);
        return bin;
    };

    prototypeAccessors$1.keys.get = function () {
        return this.index.map(function (m) { return m.key; });
    };

    BinaryIndex.prototype.clear = function clear () {
        this.index = [];
    };

    BinaryIndex.prototype.indexOf = function indexOf (key) {
        var i = this.insertPos(key);
        var entry = this.index[i];
        if (entry && eq(this.comparer, entry.key, key)) {
            return i;
        }
    };

    BinaryIndex.prototype.insertPos = function insertPos (key) {
        var low = 0, high = this.index.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            lt(this.comparer, this.index[mid].key, key) ? low = mid + 1 : high = mid;
        }
        return low;
    };

    BinaryIndex.prototype.get = function get (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        if (keys.length === 1) {
            return this.getOne(keys[0]);
        }
        var data = keys.map(function (m) { return this$1.getOne(m); });
        return [].concat.apply([], data);
    };

    BinaryIndex.prototype.getOne = function getOne (key) {
        var i = this.indexOf(key);
        if (i !== undefined) {
            return this.index[i].values;
        }
    };

    BinaryIndex.prototype.remove = function remove (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.removeOne(item);
        });
    };

    BinaryIndex.prototype.removeOne = function removeOne (item) {
        var key = this.keyFn(item);
        var ix = this.indexOf(key);
            
        if (ix !== undefined) {
            var entry = this.index[ix];
            var it = this.itemFn(item);
            var i = entry.values.indexOf(it);
            if (i > -1) {
                entry.values.splice(i, 1);
            }
            if (entry.values.length === 0) {
                this.index.splice(ix, 1);
            }
        }
    };

    BinaryIndex.prototype.add = function add (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.addOne(item);
        });
    };
        
    BinaryIndex.prototype.addOne = function addOne (item) {
        var key = this.keyFn(item);
        var it = this.itemFn(item);
        var pos = this.insertPos(key);
        var entry = this.index[pos];
            
        if (entry && eq(this.comparer, entry.key, key)) {
            entry.values.push(it);
        } else {
            this.index.splice(pos, 0, {key: key, values: [it]});
        }
    };

    BinaryIndex.prototype.update = function update (item, olditem) {
        this.removeOne(olditem);
        this.addOne(item);
    };

    Object.defineProperties( BinaryIndex.prototype, prototypeAccessors$1 );

    var InMemoryStore = function InMemoryStore(keyFn, comparer) {
        this.indexes = new Map([]);
        this.entries = new Map([]);
        this.keyFn = keyFn;
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$2 = { isEmpty: { configurable: true } };

    prototypeAccessors$2.isEmpty.get = function () {
        return this.entries.size === 0;
    };

    InMemoryStore.prototype.getIndexKeys = function getIndexKeys (indexName) {
        return this.indexes.get(indexName).keys;
    };

    InMemoryStore.prototype.populate = function populate (items) {
            var this$1 = this;

        items = oneOrMany(items);
        this.indexes.forEach(function (index) { return index.add(items); });
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
            this.indexes.get(indexName).get(values) : [];
        return extract(this.entries, data);
    };

    InMemoryStore.prototype.getOne = function getOne (indexName, value) {
        var data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).getOne(value) : [];
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

    Object.defineProperties( InMemoryStore.prototype, prototypeAccessors$2 );

    return InMemoryStore;

})));
//# sourceMappingURL=in-memory-store.js.map
