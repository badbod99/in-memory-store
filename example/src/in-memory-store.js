import HashIndex from './indexes/hashindex';
import BinaryIndex from './indexes/binaryindex';
import * as mem from './common';

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

    getKeys(indexName) {
        return this.indexes.get(indexName).keys;
    }

    populate(items) {
        items = mem.oneOrMany(items);
        this.indexes.forEach(index => index.add(items));
        const data = items.map(item => [this.keyFn(item), item]);
        this.entries = new Map(data);
    }

    rebuild(items) {
        this.destroy();
        this.populate(items);
    }

    destroy() {
        this.indexes = new Map([]);
        this.entries = new Map([]);
    }
	
	get(indexName, values) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).get(values) : [];
        return mem.extract(this.entries, data);
    }

    // Takes array of [indexName, [exactMatch, exactMatch]]
    getFromSet(valueSet) {
        const dataSets = valueSet.map((q) => {
            return this.get(q[0], q[1]);
        });
        const data = mem.intersect(dataSets);
        return mem.extract(this.entries, data);
    }

    buildIndex(indexName, ixFn) {
        return this.buildBinaryIndex(indexName, ixFn);
    }

    buildHashIndex(indexName, ixFn) {
        const newIndex = HashIndex.build(indexName, this.keyFn, ixFn, this.entries);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    buildBinaryIndex(indexName, ixFn) {
        const newIndex = BinaryIndex.build(indexName, this.keyFn, ixFn, this.entries);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    remove(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.indexes.forEach(index => index.remove(item));
            return this.entries.delete(this.keyFn(item));
        });
    }

    removeKey(key) {
        const item = this.entries.get(key);
        this.remove(item);
    }

    add(items) {
        items = mem.oneOrMany(items);
        this.update(items);
        items.forEach(item => {
            return this.entries.set(this.keyFn(item), item);
        });
    }

    update(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            let old;
            const key = this.keyFn(item);
            if (this.entries.has(key)) {
                old = this.entries.get(key);
            }
            this.indexes.forEach(index => index.update(item, old));
            this.entries.set(key, item);
        });
    }
}

export default InMemoryStore;