/* eslint class-methods-use-this: 0 */
import * as mem from '../common';

/**
 * Base index for use with in-memory-store
 */
export default class BaseIndex {
  /**
     * @param  {string} name name of this index
     * @param  {keyCallback} keyFn function to call to get the index key of the items in this index
     * @param  {itemCallback} itemFn function to call to get the unique item key of the
     * items in this index
     */
  constructor(name, itemFn, keyFn) {
    if (this.constructor === BaseIndex) {
      throw new TypeError('Cannot construct BaseIndex directly');
    }

    this.name = name;
    this.itemFn = itemFn;
    this.keyFn = keyFn;
  }

  /**
     * Returns whether or not this index is empty
     * @abstract
     * @return {boolean}
     */
  get isEmpty() {
    throw new TypeError('Must implement isEmpty property');
  }

  /**
     * Returns all keys
     * @abstract
     * @return {Array<Key>}
     */
  get keys() {
    throw new TypeError('Must implement keys property');
  }

  /**
     * Removes all items from the index
     * @abstract
     */
  clear() {
    throw new TypeError('Must implement clear method');
  }

  /**
     * Returns items within matching passed index keys
     * @param  {Array<any>} keys specified index keys
     * @return {Array<any>} values found
     */
  findMany(keys) {
    const manyKeys = mem.oneOrMany(keys);
    const data = manyKeys.map(m => this.find(m));
    return mem.shallowFlat(data);
  }

  /**
     * Returns items matching passed index key
     * @abstract
     * @return {Array<any>} values found
     */
  find() {
    throw new TypeError('Must implement find method');
  }

  /**
     * Removes an item
     * @abstract
     */
  remove() {
    throw new TypeError('Must implement build method');
  }

  /**
     * Populates this index with new items and indexes
     * as per itemFn and keyFn defined on index creation
     * @param  {Array<any>} items items to populate store with
     */
  populate(items) {
    if (!this.isEmpty) {
      throw new Error(`${typeof this} index must be empty in order to use populate`);
    }

    const manyItems = mem.oneOrMany(items);
    manyItems.forEach(item => this.insert(item));
  }

  /**
     * Adds an item with indexes as per itemFn and keyFn defined on index creation
     * @abstract
     */
  insert() {
    throw new TypeError('Must implement insert method');
  }

  /**
     * Updates an item by removing any associated index entry based on oldItem and adding new index
     * entries based on the new item.  Important to pass oldItem otherwise index
     * may contain entries from item in wrong indexed key.
     * @param  {any} oldItem item as it was prior to being updated
     * @param  {any} item item as it is now
     */
  update(item, olditem) {
    if (olditem) {
      this.remove(olditem);
    }
    this.insert(item);
  }
}
