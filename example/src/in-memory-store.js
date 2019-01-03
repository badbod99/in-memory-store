import HashIndex from './indexes/hashindex';

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

    getValues(indexName) {
        return this.indexes.get(indexName).values;
    }

    populate(items) {
        items = items || [];
        this.indexes.forEach(index => index.populate(items));
        const data = items.map(item => [this.keyFn(item), item]);
        this.items = new Map(data);
    }

    destroy() {
        this.indexes = new Map([]);
        this.items = new Map([]);
    }

    rebuild(items) {
        this.destroy();
        this.populate(items);
    }
	
	get(indexName, values) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).get(values) : [];
        return this.extract(this.items, data);
    }

    // Takes array of [indexName, [exactMatch, exactMatch]]
    getFromSet(valueSet) {
        const dataSets = valueSet.map((q) => {
            return this.getMany(q[0], q[1]);
        });
        const data = this.intersect(dataSets);
        return this.extract(this.items, data);
    }

    buildIndex(indexName, valueGetter) {
        console.log(`building index ${indexName}`);
        const newIndex = HashIndex.build(indexName, this.keyFn, valueGetter, this.items);
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

    updateMany(items) {
        items.forEach(item => update(item));
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