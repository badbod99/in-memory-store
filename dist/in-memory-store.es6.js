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
            bin.populate(items);
            return bin;
        }

        get keys() {
            return Array.from(this.index.keys());
        }

        clear() {
            this.index = new Map([]);
        }

        findMany(keys) {
            keys = oneOrMany(keys);
            let data = keys.map(m => this.getOne(m));
            return [].concat.apply([], data);
        }

        find(key) {
            return this.index.get(key);
        }

        remove(item) {
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

        populate(items) {
            items = oneOrMany(items);
            items.forEach(item => this.insert(item));
        }

        insert(item) {
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
            this.index = new BinaryArray(comparer);
            this.name = name;
            this.itemFn = itemFn;
            this.keyFn = keyFn;
            this.comparer = comparer || defaultComparer;
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
            this.index = [];
        }

        findMany(keys) {
            keys = oneOrMany(keys);
            let data = keys.map(m => this.getOne(m));
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
            this.removeOne(olditem);
            this.addOne(item);
        }
    }

    class InMemoryStore {
        constructor(keyFn, comparer) {
            this.indexes = new Map([]);
            this.entries = new Map([]);
            this.keyFn = keyFn;
            this.comparer = comparer || defaultComparer;
        }

        get isEmpty() {
            return this.entries.size === 0;
        }

        getIndexKeys(indexName) {
            return this.indexes.get(indexName).keys;
        }

        populate(items) {
            items = oneOrMany(items);
            this.indexes.forEach(index => index.populate(items));
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
                this.indexes.get(indexName).findMany(values) : [];
            return extract(this.entries, data);
        }

        getOne(indexName, value) {
            const data = this.indexes.has(indexName) ? 
                this.indexes.get(indexName).find(value) : [];
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
            return this.buildBinaryIndex(indexName, ixFn, this.comparer);
        }

        buildHashIndex(indexName, ixFn) {
            const newIndex = HashIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        buildBinaryIndex(indexName, ixFn) {
            const newIndex = BinaryIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
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
            if (this.indexes.size > 0) {
                this.indexes.forEach(index => index.remove(item));
            }
            return this.entries.delete(this.keyFn(item));
        }

        removeKey(key) {
            const item = this.entries.get(key);
            if (this.indexes.size > 0) {
                this.indexes.forEach(index => index.remove(item));
            }
            return this.entries.delete(key);
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
            if (this.indexes.size > 0) {
                this.indexes.forEach(index => index.update(item, old));
            }
            this.entries.set(key, item);
        }
    }

    return InMemoryStore;

})));
//# sourceMappingURL=in-memory-store.es6.js.map
