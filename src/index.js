import HashIndex from './indexes/hashindex';
import BinaryIndex from './indexes/binaryindex';
import RBIndex from './indexes/rbindex';
import AVLIndex from './indexes/avlindex';
import * as mem from './common';

class InMemoryStore {
    constructor(keyFn, comparer) {
        this.indexes = new Map([]);
        this.entries = new Map([]);
        this.keyFn = keyFn;
        this.comparer = comparer || mem.defaultComparer;
    }

    get isEmpty() {
        return this.entries.size === 0;
    }

    getIndexKeys(indexName) {
        return this.indexes.get(indexName).keys;
    }

    populate(items) {
        items = mem.oneOrMany(items);
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
        return mem.extract(this.entries, data);
    }

    getOne(indexName, value) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).find(value) : [];
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

    buildRBIndex(indexName, ixFn) {
        const newIndex = RBIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    buildAVLIndex(indexName, ixFn) {
        const newIndex = AVLIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    remove(items) {
        items = mem.oneOrMany(items);
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
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.updateOne(item);
        });
    }

    addOne(item) {
        this.updateOne(item);
    }

    update(items) {
        items = mem.oneOrMany(items);
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

export default InMemoryStore;