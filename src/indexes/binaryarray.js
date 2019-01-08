import * as mem from '../common';

/**
* Callback for comparer
* @callback comparerCallback
* @param   {Key} a
* @param   {Key} b
* @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
*/

export class BinaryArray {
    /**
    * @class Binary key/value storage backed by native javascript array. Performs binary search on entries and
    * keeps items in sorted order based on comparer.
    * @constructor
    * @param  {comparerCallback} [comparer] comparer to use when comparing one index value to another
    */
    constructor (comparer) {
        this.arr = [];
        this.comparer = comparer || mem.defaultComparer;
    }
    
    /**
    * Removes all items from the index
    */
    clear() {
        this.arr = [];
    }

    /**
     * Returns an array of keys store in this Key Value array
     * @returns {Array<any>} all keys
     */
    get keys() {
        return this.arr.map(m => m.key);
    }

    /**
     * Returns the index in this array of the specified key
     * @param {number} key 
     */
    indexOf(key) {
        let i = this.insertPos(key);
        if (this.arr[i] && mem.eq(this.comparer, this.arr[i].key, key)) {
            return i;
        } else {
            return -1;
        }
    }

    /**
     * Returns the position at which a new item should be inserted into this array.
     * That position may already contain an item, in which can this key already exists.
     * @param {number} key key to find in the array
     */
    insertPos(key) {
        let low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            mem.lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid
        }
        return low;
    }

    /**
    * Returns items matching passed index key
    * @param  {any} key specified index key
    * @return {Array<any>} values found
    */
    get(key) {
        const i = this.indexOf(key);
        if (i > -1) {
            return this.arr[i].value;
        }
    }

    /**
    * Removes an item by key
    * @param  {any} key key of item to remove
    */
    remove(key) {
        const i = this.indexOf(key);
        if (i > -1) {
            this.removeAt(i);
        }
    }

    /**
    * Adds an key/value with array
    * @param  {any} key key to add
    * @param  {any} value item related to the specified key
    */
    add(key, value) {
        const ix = this.insertPos(key);
        let item = { key: key, value: value };
        this.addAt(ix, key, value);
    }

    /**
     * Adds a key/value entry at a specified position in the array.
     * Will not replace any existing item in that postion, instead
     * inserting before it.
     * @param {number} pos index of where to add this entry
     * @param {any} key key to add
     * @param {any} value item related to the specified key
     */
    addAt(pos, key, value) {
        let item = { key: key, value: value };
        this.arr.splice(pos, 0, item);
    }

    /**
     * Removes a key/value entry at a specified position
     * @param {number} pos index of the item to remove.
     */
    removeAt(pos) {
        this.arr.splice(pos, 1);
    }

    /**
     * Returns key matching passed index position
     * @param  {number} pos index of where to add this entry
     * @return {any} key found at this position
     */
    getAt(pos) {
        return this.arr[pos];
    }
}