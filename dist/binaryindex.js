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

    var BinaryArray = function BinaryArray (comparer) {
        this.arr = [];
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors = { keys: { configurable: true } };
        
    BinaryArray.prototype.clear = function clear () {
        this.arr = [];
    };

    prototypeAccessors.keys.get = function () {
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

    Object.defineProperties( BinaryArray.prototype, prototypeAccessors );

    var BinaryIndex = function BinaryIndex (name, itemFn, keyFn, comparer) {
        this.index = new BinaryArray(comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$1 = { keys: { configurable: true } };
        
    BinaryIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new BinaryIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    };

    prototypeAccessors$1.keys.get = function () {
        return this.index.keys;
    };

    BinaryIndex.prototype.clear = function clear () {
        this.index = [];
    };

    BinaryIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.getOne(m); });
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
        this.removeOne(olditem);
        this.addOne(item);
    };

    Object.defineProperties( BinaryIndex.prototype, prototypeAccessors$1 );

    return BinaryIndex;

})));
//# sourceMappingURL=binaryindex.js.map
