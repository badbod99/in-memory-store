// -------------------------------------------------------
// Indexing system based on exact match only
// Will hold a map of the key and the matching itemument ids
// to allow you to return all related itemument ids
// from a passed key or keys.
// This allows very fast lookups of itemuments 
// by grade/spec/client/location/etc...
// Note: Do not cache or persist these maps forever,
// they will become stale as data changes or is deleted.
// You should rebuild the index infrequently to ensure
// optimal storage.
// -------------------------------------------------------
import InMemoryIndex from './in-memory-index';

class InMemoryStore {
    constructor(keyFn, items) {
        this.indexes = new Map([]);
        this.items = new Map([]);
        this.keyFn = keyFn;
        this.populate(items);
    }

    get isEmpty() {
        return this.items.size === 0;
    }

    populate(items) {
        items = items || [];
        this.indexes.forEach(index => index.populate(items));
        const data = items.map(item => [this.keyFn(item), item]);
        this.items = new Map(data);
    }
	
	get(key) {
		return this.items.get(key);
	}

    get(indexName, value) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).get(value) : [];
        return this.extract(this.items, data);
    }

    getMany(indexName, values) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).getMany(values) : [];
        return this.extract(this.items, data);
    }

    // Takes array of [indexName, [exactMatch, exactMatch]]
    getFromSet(valueSet) {
        const dataSets = valueSet.map((q) => {
            return this.indexes.get(q[0]).getMany(q[1]);
        });
        const data = this.intersect(dataSets);
        return this.extract(this.items, data);
    }

    buildIndex(indexName, valueGetter) {
        const newIndex = InMemoryIndex.build(indexName, this.keyFn, valueGetter, this.items);
        this.indexes.set(indexName, newIndex);
    }

    remove(item) {
        this.indexes.forEach(index => index.remove(item));
        return this.items.delete(this.keyFn(item));
    }

    removeKey(key) {
        const item = this.items.get(item);
        this.remove(item);
    }

    add(item) {
        this.update(item);
        return this.items.set(this.keyFn(item), item);
    }

    update(item) {
        let old;
        const key = this.keyFn(item);
        if (this.items.has(key)) {
            old = this.items.get(key);
        }
        this.indexes.forEach(index => index.update(item, old));
        return this.items.set(key, item);
    }

    // -------------------------------
    // Helper JS functions for map/array
    // -------------------------------
    intersect(arrays) {
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

    extract(map, keys) {
        const r = [];
        keys.forEach((key) => {
            if (map.has(key)) {
                r.push(map.get(key));
            }
        });    
        return r;
    }
}

export default InMemoryStore;