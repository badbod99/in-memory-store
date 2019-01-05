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

    function defaultComparer() {
        return function (a, b) { return a > b ? 1 : a < b ? -1 : 0; };
    }

    var BinaryIndex = function BinaryIndex (name, itemFn, keyFn, comparer) {
        this.index = [];
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors = { keys: { configurable: true } };
        
    BinaryIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var hash = new BinaryIndex(name, itemFn, keyFn, comparer);
        hash.add(items);
        return hash;
    };

    prototypeAccessors.keys.get = function () {
        return this.index.map(function (m) { return m.key; });
    };

    BinaryIndex.prototype.clear = function clear () {
        this.index = [];
    };

    BinaryIndex.prototype._positionOf = function _positionOf (key) {
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
        var i = this._positionOf(key);
        var entry = this.index[i];
        if (eq(this.comparer, entry.key, key)) {
            return entry.values;
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
        var ix = this._positionOf(key);
        var entry = this.index[ix];
            
        if (entry && eq(this.comparer, entry.key, key)) {
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
        var ix = this._positionOf(key);
        var entry = this.index[ix];
            
        if (entry && eq(this.comparer, entry.key, key)) {
            entry.values.push(it);
        } else {
            this.index.splice(ix, 0, {key: key, values: [it]});
        }
    };

    BinaryIndex.prototype.update = function update (item, olditem) {
        this.removeOne(olditem);
        this.addOne(item);
    };

    Object.defineProperties( BinaryIndex.prototype, prototypeAccessors );

    return BinaryIndex;

})));
//# sourceMappingURL=binaryindex.js.map
