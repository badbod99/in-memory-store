import * as mem from '../common';
import AVLTree from 'avl';

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

export class AVLIndex {
    /**
    * @class Index based on AVL Tree object for key/value storage. Groups items by index value, 
    * stores items within index value as array using linear search.
    * @constructor
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    * @param  {comparerCallback} [comparer] comparer to use when comparing one index value to another
    */
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || mem.defaultComparer;
        this.index = new AVLTree(comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    }
    
    /**
    * Creates a new AVL index
    * @param  {string} name name of this index
    * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
    * @param  {itemCallback} itemFn function to call to get the unique item key of the items in this index
    * @param  {comparerCallback} [comparer] comparer to use when comparing one index value to another
    * @return {AVLIndex} newly created AVLIndex with all items from this store populated
    */
    static build(name, itemFn, keyFn, items, comparer) {
        let bin = new AVLIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    }

    /**
    * Returns all keys
    * @return {Array<Key>}
    */
    get keys() {
        return this.index.keys();
    }

    /**
    * Removes all items from the index
    */
    clear() {
        this.index.clear();
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
        let found = this.index.find(key);
        if (found) {
            return found.data;
        } else {
            return [];
        }
    }

    /**
    * Removes an item
    * @param  {any} item item to remove
    */
    remove(item) {
        const key = this.keyFn(item);
        const entry = this.index.find(key);

        if (entry) {
            const it = this.itemFn(item);
            const arr = entry.data;
            const i = arr.indexOf(it);
            if (i > -1) {
                arr.splice(i, 1);
            }
            if (arr.length === 0) {
                this.index.remove(key);
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
        const entry = this.index.find(key);
        
        if (entry) {
            entry.data.push(it);
        } else {
            this.index.insert(key, [it]);
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