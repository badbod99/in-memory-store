/**
 * in-memory-store v1.0.3
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
        return (a, b) => a > b ? 1 : a < b ? -1 : 0;
    }

    class BinaryArray {
        constructor (items, comparer) {
            this.arr = [];
            this.add(items);
            this.comparer = comparer || defaultComparer;
        }
        
        clear() {
            this.arr = [];
        }

        _positionOf(item) {
            let low = 0, high = this.arr.length, mid;
            while (low < high) {
                // faster version of Math.floor((low + high) / 2)
                mid = (low + high) >>> 1; 
                lt(this.comparer, this.arr[mid], item) ? low = mid + 1 : high = mid;
            }
            return low;
        }

        get(items) {
            items = oneOrMany(items);
            if (items.length === 1) {
                return this.getOne(items[0]);
            }
            let data = items.map(m => this.getOne(m));
            return [].concat.apply([], data);
        }

        getOne(item) {
            const i = this._positionOf(item);
            const entry = this.arr[i];
            if (eq(this.comparer, entry, item)) {
                return entry;
            }
        }

        remove(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.removeOne(item);
            });
        }

        removeOne(item) {
            const ix = this._positionOf(item);
            const entry = this.arr[ix];
            if (eq(this.comparer, entry, item)) {
                this.arr.splice(ix, 1);
            }
        }

        add(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.addOne(item);
            });
        }

        addOne(item) {
            const ix = this._positionOf(item);
            const entry = this.arr[ix];
            if (eq(this.comparer, entry, item)) {
                this.arr[ix] = item;
            } else {
                this.arr.splice(ix, 0, item);
            }
        }

        update(item, olditem) {
            this.removeOne(olditem);
            this.addOne(item);
        }
    }

    return BinaryArray;

})));
//# sourceMappingURL=binaryarray.es6.js.map
