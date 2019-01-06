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

    class BinaryIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.index = [];
            this.name = name;
            this.itemFn = itemFn;
            this.keyFn = keyFn;
            this.comparer = comparer || defaultComparer;
        }
        
        static build(name, itemFn, keyFn, items, comparer) {
            let hash = new BinaryIndex(name, itemFn, keyFn, comparer);
            hash.add(items);
            return hash;
        }

        get keys() {
            return this.index.map(m => m.key);
        }

        clear() {
            this.index = [];
        }

        indexOf(key) {
            const i = this.insertPos(key);
            const entry = this.index[i];
            if (entry && eq(this.comparer, entry.key, key)) {
                return i;
            }
        }

        insertPos(key) {
            let low = 0, high = this.index.length, mid;
            while (low < high) {
                // faster version of Math.floor((low + high) / 2)
                mid = (low + high) >>> 1; 
                lt(this.comparer, this.index[mid].key, key) ? low = mid + 1 : high = mid;
            }
            return low;
        }

        get(keys) {
            keys = oneOrMany(keys);
            if (keys.length === 1) {
                return this.getOne(keys[0]);
            }
            let data = keys.map(m => this.getOne(m));
            return [].concat.apply([], data);
        }

        getOne(key) {
            const i = this.indexOf(key);
            if (i !== undefined) {
                return this.index[i].values;
            }
        }

        remove(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.removeOne(item);
            });
        }

        removeOne(item) {
            const key = this.keyFn(item);
            const ix = this.indexOf(key);
            
            if (ix !== undefined) {
                const entry = this.index[ix];
                const it = this.itemFn(item);
                const i = entry.values.indexOf(it);
                if (i > -1) {
                    entry.values.splice(i, 1);
                }
                if (entry.values.length === 0) {
                    this.index.splice(ix, 1);
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
            const pos = this.insertPos(key);
            const entry = this.index[pos];
            
            if (entry && eq(this.comparer, entry.key, key)) {
                entry.values.push(it);
            } else {
                this.index.splice(pos, 0, {key: key, values: [it]});
            }
        }

        update(item, olditem) {
            this.removeOne(olditem);
            this.addOne(item);
        }
    }

    return BinaryIndex;

})));
//# sourceMappingURL=binaryindex.es6.js.map
