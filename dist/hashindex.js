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

    function defaultComparer(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
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
        var data = keys.map(function (m) { return this$1.getOne(m); });
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
        this.removeOne(olditem);
        this.addOne(item);
    };

    Object.defineProperties( HashIndex.prototype, prototypeAccessors );

    return HashIndex;

})));
//# sourceMappingURL=hashindex.js.map
