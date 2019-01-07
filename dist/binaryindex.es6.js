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

    class BinaryArray {
        constructor (comparer) {
            this.arr = [];
            this.comparer = comparer || defaultComparer;
        }
        
        clear() {
            this.arr = [];
        }

        get keys() {
            return this.arr.map(m => m.key);
        }

        indexOf(key) {
            let i = this.insertPos(key);
            if (this.arr[i] && eq(this.comparer, this.arr[i].key, key)) {
                return i;
            } else {
                return -1;
            }
        }

        insertPos(key) {
            let low = 0, high = this.arr.length, mid;
            while (low < high) {
                // faster version of Math.floor((low + high) / 2)
                mid = (low + high) >>> 1; 
                lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid;
            }
            return low;
        }

        get(key) {
            const i = this.indexOf(key);
            if (i > -1) {
                return this.arr[i].value;
            }
        }

        remove(key) {
            const i = this.indexOf(key);
            if (i > -1) {
                this.removeAt(i);
            }
        }

        add(key, value) {
            const ix = this.insertPos(key);
            this.addAt(ix, key, value);
        }

        addAt(pos, key, value) {
            let item = { key: key, value: value };
            this.arr.splice(pos, 0, item);
        }

        removeAt(pos) {
            this.arr.splice(pos, 1);
        }

        getAt(pos) {
            return this.arr[pos];
        }

        update(item) {
            this.indexOf(item.key);
            if (i !== undefined) {
                this.arr[i].value = item;
            }
        }
    }

    class BinaryIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new BinaryArray(this.comparer);
            this.name = name;
            this.itemFn = itemFn;
            this.keyFn = keyFn;
        }
        
        static build(name, itemFn, keyFn, items, comparer) {
            let bin = new BinaryIndex(name, itemFn, keyFn, comparer);
            bin.populate(items);
            return bin;
        }

        get keys() {
            return this.index.keys;
        }

        clear() {
            this.index = new BinaryArray(this.comparer);
        }

        findMany(keys) {
            keys = oneOrMany(keys);
            let data = keys.map(m => this.find(m));
            return [].concat.apply([], data);
        }

        find(key) {
            return this.index.get(key);
        }

        remove(item) {
            const key = this.keyFn(item);
            const pos = this.index.indexOf(key);
            
            if (pos > -1) {
                const entry = this.index.getAt(pos);
                const it = this.itemFn(item);
                const i = entry.value.indexOf(it);
                if (i > -1) {
                    entry.value.splice(i, 1);
                }
                if (entry.value.length === 0) {
                    this.index.removeAt(pos);
                }
            }
        }

        populate(items) {
            items = oneOrMany(items);
            items.forEach(item => this.insert(item));
        }
        
        insert(item) {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            const pos = this.index.insertPos(key);
            const entry = this.index.getAt(pos);
            
            if (entry && eq(this.comparer, entry.key, key)) {
                entry.value.push(it);
            } else {
                this.index.addAt(pos, key, [it]); 
            }
        }

        update(item, olditem) {
            this.remove(olditem);
            this.insert(item);
        }
    }

    return BinaryIndex;

})));
//# sourceMappingURL=binaryindex.es6.js.map
