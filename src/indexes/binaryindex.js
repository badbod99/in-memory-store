import * as mem from '../common';
import { BinaryArray } from './binaryarray';
import { BaseIndex } from './baseindex';

/**
* Callback for comparer
* @callback comparerCallback
* @param   {Key} a
* @param   {Key} b
* @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
*/

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

export class BinaryIndex extends BaseIndex {
    /**
    * @class Index based on BinaryArray for key/value storage. Groups items by index value, 
    * stores items within index value as array using linear search.
    * @constructor
    * @implements {BaseIndex}
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    * @param  {comparerCallback} [comparer] comparer to use when comparing one index value to another
    */
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || mem.defaultComparer;
        this.index = new BinaryArray(this.comparer);
        super(name, itemFn, keyFn);
    }

    /**
    * Returns all keys
    * @return {Array<Key>}
    */
    get keys() {
        return this.index.keys;
    }

    /**
    * Removes all items from the index
    */
    clear() {
        this.index = new BinaryArray(this.comparer);
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
    
    /**
    * Adds an item with indexes as per itemFn and keyFn defined on index creation
    * @param  {any} item item to add to index
    */
    insert(item) {
        const key = this.keyFn(item);
        const it = this.itemFn(item);
        const pos = this.index.insertPos(key);
        const entry = this.index.getAt(pos);
        
        if (entry && mem.eq(this.comparer, entry.key, key)) {
            entry.value.push(it);
        } else {
            this.index.addAt(pos, key, [it]); 
        }
    }
}