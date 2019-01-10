import * as mem from './common';

/**
 * Key value storage with support for grouping/returning items by index value
 */
export class InMemoryStore {
   /**
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
     * Returns whether or not this store is empty
     * @abstract
     * @return {boolean}
     */
    get isEmpty() {
        return this.size === 0;
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
        if (!this.isEmpty) {
            throw new Error(`Store must be empty to use populate. 
                Store currently has ${this.size} items.`);
        }

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
     * Returns all entries less than the passed value according to the
     * indexes comparer.
     * @param  {string} indexName index to search
     * @returns {Array<any>} keys found in all passed index searches
     */
    $lt(indexName, value) {
        return this.indexes.has(indexName) ? 
            this.indexes.get(indexName).lt(value) : [];
    }

    /**
     * Returns items within specified index matching passed values
     * @param  {string} indexName index to search
     * @param  {any} values specified index value
     * @returns {Array<any>} keys found in all passed index searches
     */
	$eq(indexName, value) {
        return this.indexes.has(indexName) ? 
            this.indexes.get(indexName).find(value) : [];
    }

    /**
     * Returns all entries less or equal to the passed value according to the
     * indexes comparer.
     * @param  {string} indexName index to search
     * @returns {Array<any>} keys found in all passed index searches
     */
    $lte(indexName, value) {
        return this.indexes.has(indexName) ? 
            this.indexes.get(indexName).lte(value) : [];
    }

    /**
     * Returns all entries greater than the passed value according to the
     * indexes comparer.
     * @param  {string} indexName index to search
     * @returns {Array<any>} keys found in all passed index searches
     */
    $gt(indexName, value) {
        return this.indexes.has(indexName) ? 
            this.indexes.get(indexName).gt(value) : [];
    }

    /**
     * Returns all entries greater than or equal to the passed value according to the
     * indexes comparer.
     * @param  {string} indexName index to search
     * @returns {Array<any>} keys found in all passed index searches
     */
    $gte(indexName, value) {
        return this.indexes.has(indexName) ? 
            this.indexes.get(indexName).gte(value) : [];
    }

    /**
     * Searches one or many indexes, each using specified operator for specified value.
     * @param {Array<any>} filters [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * @returns {Array<any>} keys found in all passed index searches
     */
    $and(filters) {
        let filterFns = this._getFilterFns(filters);
        let dataSets = filterFns.map(fn => fn());
        return mem.intersect(dataSets);
    }

    /**
     * Searches one or many indexes, each using specified operator for specified value.
     * @param {Array<any>} filters [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * @returns {Array<any>} keys found in all passed index searches
     */
    $or(filters) {
        let filterFns = this._getFilterFns(filters);
        let dataSets = filterFns.map(fn => fn());
        return [].concat.apply([], dataSets);
    }

    /**
     * Performs a find across many indexes based on limited find selector language.
     * @param {Array<any>} selector
     * { $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}],
     * $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}] }
     * @returns {Array<any>} items from the store found in all passed index searches
     */
    find(selector) {
        var joins = Object.keys(selector);
        console.log(joins);
        let fns = joins.map(op => {
            return this._getOperatorFn(op, selector[op]);
        });
        let dataSets = fns.map(fn => {
            console.log(fn);
            return fn()
        });
        console.log(JSON.stringify(dataSets));
        let data = mem.intersect(dataSets);
        return mem.extract(this.entries, data);
    }

    /**
     * Get function array based on specified find criteria.
     * @param {Array<any>} filters [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * @returns {Array<any>} Array of functions to perform specified find operations.
     */
    _getFilterFns(filters) {
        return filters.map(f => {
            // only one entry per filter
            let filter = Object.entries(f)[0];
            let indexName = filter[0];
            let action = filter[1];

            // only one operation per entry
            let op = Object.keys(action)[0];
            let val = action[op];

            let fn = this._getFilterFn(op, indexName, val);
            return this._getFilterFn(op, indexName, val);
        });
    }

    _getOperatorFn(operatorKey, filters) {
        switch(operatorKey) {
            case "$and":
                return () => this.$and(filters);
            case "$or":
                return () => this.$or(filters);
        }
    }

    /**
     * Gets a filter function based on the specified filter key..
     * @param {string} filterKey $lt/$gt/$gte/$lte or $eq
     * @returns {any} function coresponding to passed key
     */
    _getFilterFn(filterKey, indexName, val) {
        switch (filterKey) {
            case '$lt':
                return () => this.$lt(indexName, val);
            case '$lte':
                return () => this.$lte(indexName, val);
            case '$gt':
                return () => this.$gt(indexName, val);
            case '$gte':
                return () => this.$gte(indexName, val);
            case '$eq':
                return () => this.$eq(indexName, val);
            default:
                return () => this.$eq(indexName, val);
        }
    }


    /**
     * Adds a new index onto this store if it does not already exist. Populates index with entries
     * if index not already populated.
     * @param  {BaseIndex} index index ensure exists and is populated
     * @return {boolean} true if index was added by this operation, false if already exists.
     */
    ensureIndex(index) {
        if (!this.indexes.has(index.name)) {
            this.indexes.set(index.name, index);
            if (index.isEmpty) {
                index.populate(this.entries);
            }
            return true;
        } else {
            return false;
        }
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