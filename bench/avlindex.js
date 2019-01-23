/* eslint import/no-extraneous-dependencies: ["error", {"devDependencies": true}] */
import AVLTree from 'avl';
import * as mem from '../src/common';
import BaseIndex from '../src/indexes/baseindex';

/**
 * Index based on AVL Tree object for key/value storage. Groups items by index value,
 * stores items within index value as array using linear search.
 * @extends {BaseIndex}
 */
export default class AVLIndex extends BaseIndex {
  /**
     * @param  {string} name name of this index
     * @param  {itemCallback} itemFn function to call to get the unique item
     * key of the items in this index
     * @param  {keyCallback} keyFn function to call to get the index key
     * of the items in this index
     * @param  {comparerCallback} [comparer] comparer to use when comparing
     * one index value to another
     */
  constructor(name, itemFn, keyFn, comparer) {
    super(name, itemFn, keyFn);
    this.comparer = comparer || mem.defaultComparer;
    this.index = new AVLTree(comparer);
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
    return this.index.keys();
  }

  /**
     * Removes all items from the index
     */
  clear() {
    this.index.clear();
  }

  /**
     * Returns all entries less than the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $lt(key) {
    let lastKey;
    const data = [];
    this.index.range(this.index.min, key, (n) => {
      lastKey = n.key;
      data.push(n.data);
    });
    if (data.length === 0) {
      return [];
    }
    // Since Tree is unique, we only need to check last key to omit
    if (mem.eq(this.comparer, lastKey, key)) {
      data.pop();
    }
    return data;
  }

  /**
     * Returns all entries less or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $lte(key) {
    const data = [];
    this.index.range(this.index.min, key, (n) => {
      data.push(n.data);
    });
    return data;
  }

  /**
     * Returns all entries greater than or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $gt(key) {
    let firstKey;
    const data = [];
    this.index.range(key, this.index.max, (n) => {
      if (firstKey === undefined) {
        firstKey = n.key;
      }
      data.push(n.data);
    });
    if (data.length === 0) {
      return [];
    }
    // Since Tree is unique, we only need to check first key to omit
    if (mem.eq(this.comparer, firstKey, key)) {
      data.shift();
    }
    return data;
  }

  /**
     * Returns all entries greater than or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  $gte(key) {
    const data = [];
    this.index.range(key, this.index.max, (n) => {
      data.push(n.data);
    });
    return data;
  }

  /**
     * Returns items matching passed index key
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
  $eq(key) {
    return this.find(key);
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
     * Returns items matching passed index key
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
  find(key) {
    const found = this.index.find(key);
    if (found) {
      return found.data;
    }
    return [];
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
}
