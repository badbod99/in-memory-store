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

    function defaultComparer() {
        return (a, b) => a > b ? 1 : a < b ? -1 : 0;
    }

    class HashIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.index = new Map([]);
            this.name = name;
            this.itemFn = itemFn;
            this.keyFn = keyFn;
            this.comparer = comparer || defaultComparer;
        }
        
        static build(name, itemFn, keyFn, items, comparer) {
            let bin = new HashIndex(name, itemFn, keyFn, comparer);
            bin.add(items);
            return bin;
        }

        get keys() {
            return Array.from(this.index.keys());
        }

        clear() {
            this.index = new Map([]);
        }

        getOne(key) {
            return this.index.get(key);
        }

        get(keys) {
            keys = oneOrMany(keys);
            if (keys.length === 1) {
                return this.getOne(keys[0]);
            }
            let data = keys.map(m => getOne(m));
            return [].concat.apply([], data);
        }

        remove(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.removeOne();
            });
        }

        removeOne(item) {
            const key = this.keyFn(item);
            if (this.index.has(key)) {
                const col = this.index.get(key);
                const it = this.itemFn(item);
                const i = col.indexOf(it);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.delete(key);
                }
            }
        }

        add(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.addOne(item);
            });
        }

        addOne(item) {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            if (it && key) {
                if (this.index.has(key)) {
                    this.index.get(key).push(it);
                } else {
                    this.index.set(key, [it]);
                }
            }
        }

        update(item, olditem) {
            this.removeOne(olditem);
            this.addOne(item);
        }
    }

    return HashIndex;

})));
//# sourceMappingURL=hashindex.es6.js.map
