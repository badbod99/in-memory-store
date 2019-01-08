import * as mem from '../common';

/**
* Callback for item identifier
* @callback itemCallback
* @param   {any} item
* @returns {any} unique value to identify the item
*/

/**
* Callback for key value
* @callback keyCallback
* @param   {any} item
* @returns {any} value to index this item on
*/

export class HashIndex {
    /**
    * @class Index based on javascript Map object for key/value storage. Groups items by index value, 
    * stores items within index value as array using linear search.
    * @constructor
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    */
    constructor (name, itemFn, keyFn) {
        this.index = new Map([]);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    }
    
    /**
    * Creates a new Hash index
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    * @return {HashIndex} newly created HashIndex with all items from this store populated
    */
    static build(name, itemFn, keyFn, items) {
        let bin = new HashIndex(name, itemFn, keyFn);
        bin.populate(items);
        return bin;
    }

    /**
    * Returns all keys
    * @return {Array<Key>}
    */
    get keys() {
        return Array.from(this.index.keys());
    }

    /**
    * Removes all items from the index
    */
    clear() {
        this.index = new Map([]);
    }

    /**
    * Returns items within matching passed index keys
    * @param  {Array<any>} keys specified index keys
    * @return {Array<any>} values found
    */
    findMany(keys) {
        keys = mem.oneOrMany(keys);
        let data = keys.map(m => this.find(m));
        return [].concat.apply([], data);
    }

    /**
    * Returns items matching passed index key
    * @param  {any} key specified index key
    * @return {Array<any>} values found
    */
    find(key) {
        return this.index.get(key);
    }

    /**
    * Removes an item
    * @param  {any} item item to remove
    */
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

    /**
    * Populates this index with new items and indexes as per itemFn and keyFn defined on index creation
    * @param  {Array<any>} items items to populate store with
    */
    populate(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => this.insert(item));
    }

    /**
    * Adds an item with indexes as per itemFn and keyFn defined on index creation
    * @param  {any} item item to add to index
    */
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

    /**
    * Updates an item by removing any associated index entry based on oldItem and adding new index
    * entries based on the new item.  Important to pass oldItem otherwise index may contain entries from
    * item in wrong indexed key.
    * @param  {any} oldItem item as it was prior to being updated
    * @param  {any} item item as it is now
    */
    update(item, olditem) {
        this.remove(olditem);
        this.insert(item);
    }
}