import * as mem from '../common';

/**
 * Binary key/value storage backed by native javascript array. Performs binary search on entries and
 * keeps items in sorted order based on comparer.
 */
export default class BinaryArray {
  /**
     * @param  {comparerCallback} [comparer] comparer to use when comparing one
     * index value to another
     */
  constructor(comparer) {
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
     * Returns an array of keys stored in this Key Value array
     * @returns {Array<any>} all keys
     */
  get keys() {
    return this.arr.map(m => m.key);
  }

  /**
     * Returns an array of values stored in this Key Value array
     * @returns {Array<any>} all values
     */
  get values() {
    return this.arr.map(m => m.value);
  }

  /**
     * Returns the number of items in this BinaryArray
     * @returns {number}
     */
  get length() {
    return this.arr.length;
  }

  /**
     * Returns all entries less than the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  lt(key) {
    const i = this.insertPos(key);
    const data = this.arr.slice(0, i);
    return data.map(d => d.value);
  }

  /**
     * Returns all entries less or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  lte(key) {
    const i = this.insertPos(key);
    const data = i >= 0 ? this.arr.slice(0, i + 1) : [];
    return data.map(d => d.value);
  }

  /**
     * Returns all entries greater than the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  gt(key) {
    const i = this.insertPos(key);
    const data = i < this.arr.length ? this.arr.slice(i + 1, this.arr.length) : [];
    return data.map(d => d.value);
  }

  /**
     * Returns all entries greater than or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key
     */
  gte(key) {
    const i = this.insertPos(key);
    const data = i < this.arr.length ? this.arr.slice(i, this.arr.length) : [];
    return data.map(d => d.value);
  }

  /**
     * Returns the index in this array of the specified key
     * @param {any} key
     * @returns {number}
     */
  indexOf(key) {
    const i = this.insertPos(key);
    if (this.arr[i] && mem.eq(this.comparer, this.arr[i].key, key)) {
      return i;
    }
    return -1;
  }

  /**
     * The insert position where to insert an item into the underlying sorted array.
     * @param {any} key key to find in the array
     * @returns {number} position at which a new item should be inserted into this array
     */
  insertPos(key) {
    let low = 0; let high = this.arr.length; let
      mid;
    while (low < high) {
      /* eslint no-bitwise: 0 */
      mid = (low + high) >>> 1;
      if (mem.lt(this.comparer, this.arr[mid].key, key)) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  /**
     * Returns items matching passed index key
     * @param  {any} key specified index key
     * @return {any} value found
     */
  get(key) {
    const i = this.indexOf(key);
    if (i > -1) {
      return this.arr[i].value;
    }
    return undefined;
  }

  /**
     * Returns whether or not a given key exists.
     * @param  {any} key specified index key
     * @return {boolean} if key exists or not
     */
  has(key) {
    const i = this.indexOf(key);
    return (i > -1);
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
    this.addAt(ix, key, value);
  }

  /**
     * Replaces an existing entry in the array with a new one.
     * @param {any} key key to add
     * @param {any} value item related to the specified key
     */
  replace(key, value) {
    const i = this.indexOf(key);
    if (i > -1) {
      this.replaceAt(i, key, value);
    }
  }

  /**
     * Adds a key/value entry at a specified position in the array.
     * Will not replace any existing item in that postion, instead
     * inserting before it.
     * @param {number} pos index of where to add this entry
     * @param {any} key key to add
     */
  addAt(pos, key, value) {
    const item = { key, value };
    this.arr.splice(pos, 0, item);
  }

  /**
     * Replaces an existing entry in the array at specified position with a new one.
     * @param {number} pos index of where to replace this entry
     * @param {any} key key to add
     * @param {any} value item related to the specified key
     */
  replaceAt(pos, key, value) {
    const item = { key, value };
    this.arr.splice(pos, 1, item);
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
