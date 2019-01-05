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

    function defaultComparer() {
        return function (a, b) { return a > b ? 1 : a < b ? -1 : 0; };
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

    return HashIndex;

})));
//# sourceMappingURL=hashindex.js.map
