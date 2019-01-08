import { HashIndex } from './indexes/hashindex';
import { BinaryIndex } from './indexes/binaryindex';
import { AVLIndex } from './indexes/avlindex';
import * as mem from './common';

export class InMemoryStore {
   /**
   * @class Key value storage with support for grouping/returning items by index value
   * @constructor
   * @param  {keyCallback} [keyFn] function to call to get the key of the items in this store
   */
    constructor(keyFn) {
        this.indexes = new Map([]);
        this.entries = new Map([]);
        this.keyFn = keyFn;
    }

    /**
    * Returns whether the store is empty
    * @return {boolean}
    */
    get isEmpty() {
        return this.entries.size === 0;
    }

    /**
    * Returns the number of items in the store
    * @return {number}
    */
    get size() {
        return this.entries.size;
    }

    /**
    * Returns all keys wihin the specified index
    * @return {Array<Key>}
    */
    getIndexKeys(indexName) {
        return this.indexes.get(indexName).keys;
    }

    /**
    * Populates a new store with items using bulk load methods for indexes if available
    * @param  {Array<any>} items items to populate store with
    */
    populate(items) {
        items = mem.oneOrMany(items);
        this.indexes.forEach(index => index.populate(items));
        const data = items.map(item => [this.keyFn(item), item]);
        this.entries = new Map(data);
    }

    /**
    * Clears and re-populates a new store with items using bulk 
    * load methods for indexes if available
    * @param  {Array<any>} items items to populate store with
    */
    rebuild(items) {
        this.entries = new Map([]);
        this.indexes.forEach(index => index.clear());
        this.populate(items);
    }

    /**
    * Clear the store
    * @return {InMemoryStore}
    */
    destroy() {
        this.indexes = new Map([]);
        this.entries = new Map([]);
        this.keyFn = undefined;
    }
    
    /**
    * Whether the store contains an item with the given key
    * @param  {Key} key
    * @return {boolean} true/false
    */
    has(item) {
        return this.entries.has(this.keyFn(item));
    }

    /**
    * Returns items within specified index matching passed values
    * @param  {string} indexName index to search
    * @param  {Array<any>} values specified index values
    * @return {Array<any>} values found
    */
	get(indexName, values) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).findMany(values) : [];
        return mem.extract(this.entries, data);
    }

    /**
    * Returns items within specified index matching passed value
    * @param  {string} indexName index to search
    * @param  {any} value specified index value
    * @return {Array<any>} values found
    */
    getOne(indexName, value) {
        const data = this.indexes.has(indexName) ? 
            this.indexes.get(indexName).find(value) : [];
        return mem.extract(this.entries, data);
    }

    // Takes array of [indexName, [exactMatch, exactMatch]]
    /**
    * Searches many indexes each with many values and intersects the results
    * @param  {Array<string, Array<any>>} valueSet [indexName, [exactMatch, exactMatch]]
    * @return {Array<any>} values found
    */
    getFromSet(valueSet) {
        const dataSets = valueSet.map((q) => {
            return this.get(q[0], q[1]);
        });
        const data = mem.intersect(dataSets);
        return mem.extract(this.entries, data);
    }

    /**
    * Creates a new Hash index
    * @param  {string} indexName index to create
    * @param  {indexCallback} ixFn function to call with the item to get the indexed value
    * @return {HashIndex} newly created HashIndex with all items from this store populated
    */
    buildHashIndex(indexName, ixFn) {
        const newIndex = HashIndex.build(indexName, this.keyFn, ixFn, this.entries);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    /**
    * Creates a new Binary index
    * @param  {string} indexName index to create
    * @param  {indexCallback} ixFn function to call with the item to get the indexed value
    * @param  {comparerCallback} [comparer] comparer to use when comparing one index value to another
    * @return {BinaryIndex} newly created BinaryIndex with all items from this store populated
    */
    buildBinaryIndex(indexName, ixFn, comparer) {
        const newIndex = BinaryIndex.build(indexName, this.keyFn, ixFn, this.entries, comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    /**
    * Creates a new AVL index
    * @param  {string} indexName index to create
    * @param  {indexCallback} ixFn function to call with the item to get the indexed value
    * @param  {comparerCallback} [comparer] comparer to use when comparing one index value to another
    * @return {Array<any>} values found
    */
    buildAVLIndex(indexName, ixFn, comparer) {
        const newIndex = AVLIndex.build(indexName, this.keyFn, ixFn, this.entries, comparer);
        this.indexes.set(indexName, newIndex);
        return newIndex;
    }

    /**
    * Removes items from the store and any associated indexes
    * @param  {Array<any>} items items to remove
    * @return {Array<boolean>} whether each remove succeeded (false if not found)
    */
    remove(items) {
        items = mem.oneOrMany(items);
        return items.map(item => this.removeOne(item));
    }

    /**
    * Removes an item from the store and any associated indexes
    * @param  {any} item item to remove
    * @return {boolean} whether remove succeeded (false if not found)
    */
    removeOne(item) {
        if (this.indexes.size > 0) {
            this.indexes.forEach(index => index.remove(item));
        }
        return this.entries.delete(this.keyFn(item));
    }

    /**
    * Removes an item from the store by key and any associated indexes
    * @param  {any} key key of item to remove
    * @return {boolean} whether remove succeeded (false if not found)
    */
    removeKey(key) {
        const item = this.entries.get(key);
        if (!item) {
            return false;
        }
        if (this.indexes.size > 0) {
            this.indexes.forEach(index => index.remove(item));
        }
        return this.entries.delete(key);
    }

    /**
    * Adds items to the store and updated any associated indexes
    * @param  {Array<any>} items items to add
    */
    add(items) {
        items = mem.oneOrMany(items);
        items.map(item => this.updateOne(item));
    }

    /**
    * Adds an item to the store and updated any associated indexes
    * @param  {any} item item to add
    */
    addOne(item) {
        this.updateOne(item);
    }

    /**
    * Updates items to the store and updated any associated indexes
    * @param  {Array<any>} items items to update
    */
    update(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.updateOne(item);
        });
    }

    /**
    * Updates an item in the store and updated any associated indexes
    * @param  {any} item item to update
    */
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