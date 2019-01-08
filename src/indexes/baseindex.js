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

export class BaseIndex {
    /**
    * @class Base index for use with in-memory-store
    * @constructor
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    */
    constructor (name, itemFn, keyFn) {
        if (this.constructor === BaseIndex) {
            throw new TypeError("Cannot construct BaseIndex directly");
        }

        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this._populated = false;
    }

    /**
    * Returns all keys
    * @return {Array<Key>}
    */
    get keys() {
        throw new TypeError(`Must implement keys property`);
    }

    /**
    * Removes all items from the index
    */
    clear() {
        throw new TypeError(`Must implement clear method`);
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
        throw new TypeError(`Must implement find method`);
    }

    /**
    * Removes an item
    * @param  {any} item item to remove
    */
    remove(item) {
        throw new TypeError(`Must implement build method`);
    }

    /**
    * Returns whether of not this index has been populated
    * @return {boolean}
    */
    get populated() {
        return this._populated;
    }

    /**
    * Populates this index with new items and indexes as per itemFn and keyFn defined on index creation
    * @param  {Array<any>} items items to populate store with
    */
    populate(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => this.insert(item));
        this._populated = true;
    }

    /**
    * Adds an item with indexes as per itemFn and keyFn defined on index creation
    * @param  {any} item item to add to index
    */
    insert(item) {
        throw new TypeError(`Must implement insert method`);
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