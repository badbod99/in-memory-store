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

    function intersect(arrays) {
        const ordered = (arrays.length===1
            ? arrays : 
            arrays.sort((a1,a2) => a1.length - a2.length));
        const shortest = ordered[0],
            set = new Set(), 
            result = [];

        for (let i=0; i < shortest.length; i++) {
            const item = shortest[i];
            let every = true; // don't use ordered.every ... it is slow
            for(let j=1;j<ordered.length;j++) {
                if(ordered[j].includes(item)) continue;
                every = false;
                break;
            }
            // ignore if not in every other array, or if already captured
            if(!every || set.has(item)) continue;
            // otherwise, add to bookeeping set and the result
            set.add(item);
            result[result.length] = item;
        }
        return result;
    }

    function extract(map, keys) {
        const r = [];
        keys.forEach((key) => {
            if (map.has(key)) {
                r.push(map.get(key));
            }
        });    
        return r;
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

        _positionOf(key) {
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
            const i = this._positionOf(key);
            const entry = this.index[i];
            if (eq(this.comparer, entry.key, key)) {
                return entry.values;
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
            const ix = this._positionOf(key);
            const entry = this.index[ix];
            
            if (entry && eq(this.comparer, entry.key, key)) {
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
            const ix = this._positionOf(key);
            const entry = this.index[ix];
            
            if (entry && eq(this.comparer, entry.key, key)) {
                entry.values.push(it);
            } else {
                this.index.splice(ix, 0, {key: key, values: [it]});
            }
        }

        update(item, olditem) {
            this.removeOne(olditem);
            this.addOne(item);
        }
    }

    class InMemoryStore {
        constructor(keyFn, items) {
            this.indexes = new Map([]);
            this.entries = new Map([]);
            this.keyFn = keyFn;
            this.populate(items);
        }

        get isEmpty() {
            return this.entries.size === 0;
        }

        getIndexKeys(indexName) {
            return this.indexes.get(indexName).keys;
        }

        populate(items) {
            items = oneOrMany(items);
            this.indexes.forEach(index => index.add(items));
            const data = items.map(item => [this.keyFn(item), item]);
            this.entries = new Map(data);
        }

        rebuild(items) {
            this.entries = new Map([]);
            this.indexes.forEach(index => index.clear());
            this.populate(items);
        }

        destroy() {
            this.indexes = new Map([]);
            this.entries = new Map([]);
            this.keyFn = undefined;
        }
    	
    	get(indexName, values) {
            const data = this.indexes.has(indexName) ? 
                this.indexes.get(indexName).get(values) : [];
            return extract(this.entries, data);
        }

        getOne(indexName, value) {
            const data = this.indexes.has(indexName) ? 
                this.indexes.get(indexName).getOne(value) : [];
            return extract(this.entries, data);
        }

        // Takes array of [indexName, [exactMatch, exactMatch]]
        getFromSet(valueSet) {
            const dataSets = valueSet.map((q) => {
                return this.get(q[0], q[1]);
            });
            const data = intersect(dataSets);
            return extract(this.entries, data);
        }

        buildIndex(indexName, ixFn) {
            return this.buildBinaryIndex(indexName, ixFn, defaultComparer);
        }

        buildHashIndex(indexName, ixFn, comparer) {
            const newIndex = HashIndex.build(indexName, this.keyFn, ixFn, this.entries, comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        buildBinaryIndex(indexName, ixFn, comparer) {
            const newIndex = BinaryIndex.build(indexName, this.keyFn, ixFn, this.entries, comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        remove(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.removeOne(item);
            });
        }

        removeOne(item) {
            this.indexes.forEach(index => index.remove(item));
            return this.entries.delete(this.keyFn(item));
        }

        removeKey(key) {
            const item = this.entries.get(key);
            this.remove(item);
        }

        add(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.updateOne(item);
            });
        }

        addOne(item) {
            this.updateOne(item);
        }

        update(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.updateOne(item);
            });
        }

        updateOne(item) {
            let old;
            const key = this.keyFn(item);
            if (this.entries.has(key)) {
                old = this.entries.get(key);
            }
            this.indexes.forEach(index => index.update(item, old));
            this.entries.set(key, item);
        }
    }

    return InMemoryStore;

})));
//# sourceMappingURL=in-memory-store.es6.js.map
