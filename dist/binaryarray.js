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

    var BinaryArray = function BinaryArray (items, comparer) {
        this.arr = [];
        this.add(items);
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors = { items: { configurable: true } };
        
    BinaryArray.prototype.clear = function clear () {
        this.arr = [];
    };

    prototypeAccessors.items.get = function () {
        return this.arr;
    };

    BinaryArray.prototype.indexOf = function indexOf (item) {
        var i = this.insertPos(item);
        if (this.arr[i] && eq(this.comparer, this.arr[i], item)) {
            return i;
        }
    };

    BinaryArray.prototype.insertPos = function insertPos (item) {
        var low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            lt(this.comparer, this.arr[mid], item) ? low = mid + 1 : high = mid;
        }
        return low;
    };

    BinaryArray.prototype.get = function get (items) {
            var this$1 = this;

        items = oneOrMany(items);
        if (items.length === 1) {
            return this.getOne(items[0]);
        }
        var data = items.map(function (m) { return this$1.getOne(m); });
        return [].concat.apply([], data);
    };

    BinaryArray.prototype.getOne = function getOne (item) {
        var i = this.indexOf(item);
        if (i !== undefined) {
            return this.arr[i];
        }
    };

    BinaryArray.prototype.remove = function remove (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.removeOne(item);
        });
    };

    BinaryArray.prototype.removeOne = function removeOne (item) {
        var i = this.indexOf(item);
        if (i !== undefined) {
            this.arr.splice(i, 1);
        }
    };

    BinaryArray.prototype.add = function add (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) {
            this$1.addOne(item);
        });
    };

    BinaryArray.prototype.addOne = function addOne (item) {
        var ix = this.insertPos(item);
        this.arr.splice(ix, 0, item);
    };

    BinaryArray.prototype.update = function update (item) {
        this.indexOf(item);
        if (i !== undefined) {
            this.arr[i] = item;
        }
    };

    Object.defineProperties( BinaryArray.prototype, prototypeAccessors );

    return BinaryArray;

})));
//# sourceMappingURL=binaryarray.js.map
