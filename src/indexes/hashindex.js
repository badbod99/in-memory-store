import * as mem from '../common';
import BaseIndex from './baseindex';

/**
 * Index based on javascript Map object for key/value storage. Groups items by index value,
 * stores items within index value as array using linear search.
 * @extends {BaseIndex}
 */
export default class HashIndex extends BaseIndex {
  /**
     * @param  {string} name name of this index
     * @param  {itemCallback} itemFn function to call to get the unique item key
     * of the items in this index
     * @param  {keyCallback} keyFn function to call to get the index key of the
     * items in this index
     * @param  {comparerCallback} [comparer] comparer to use when comparing one
     * index value to another
     */
  constructor(name, itemFn, keyFn, comparer) {
    super(name, itemFn, keyFn);
    this.comparer = comparer || mem.defaultComparer;
    this.index = new Map([]);
  }

  /**
     * Returns whether or not this index is empty
     * @abstract
     * @return {boolean}
     */
  get isEmpty() {
    return this.index.size === 0;
  }

  /**
     * Returns all keys
     * @return {Array<Key>}
     */
  get keys() {
    return Array.from(this.index.keys());
  }

  /**
     * Returns all entries less than the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $lt(key) {
    const keys = this.keys.filter(k => mem.lt(this.comparer, k, key));
    return this.findMany(keys);
  }

  /**
     * Returns all entries less or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $lte(key) {
    const keys = this.keys.filter(k => mem.lte(this.comparer, k, key));
    return this.findMany(keys);
  }

  /**
     * Returns all entries greater than the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $gt(key) {
    const keys = this.keys.filter(k => mem.gt(this.comparer, k, key));
    return this.findMany(keys);
  }

  /**
     * Returns all entries greater than or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $gte(key) {
    const keys = this.keys.filter(k => mem.gte(this.comparer, k, key));
    return this.findMany(keys);
  }

  /**
     * Returns items matching passed index key
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
  $eq(key) {
    return this.index.get(key);
  }

  /**
     * Returns items matching passed index keys
     * @param  {Array<any>} key specified index keys
     * @return {Array<any>} values found
     */
  $in(keys) {
    return this.findMany(keys);
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
