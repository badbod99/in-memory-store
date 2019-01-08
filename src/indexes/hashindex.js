import { BaseIndex } from './baseindex';

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

export class HashIndex extends BaseIndex {
    /**
    * @class Index based on javascript Map object for key/value storage. Groups items by index value, 
    * stores items within index value as array using linear search.
    * @constructor
    * @implements {BaseIndex}
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    */
    constructor (name, itemFn, keyFn) {
        this.index = new Map([]);
        super(name, itemFn, keyFn);
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
}