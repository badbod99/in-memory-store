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

/**
 * Converts a passed value into an array.  Useful if you don't know
 * if your passed parameter is an array or single value.
 * @param  {any} items single item, array or javascript Map object
 * @return {Array<any>} array of passed item(s)
 */
export function oneOrMany(items) {
  if (!items) {
    return [];
  } if (items instanceof Map) {
    return Array.from(items.values());
  } if (!Array.isArray(items)) {
    return [items];
  }
  return items;
}

/**
 * Returns whether or not a < b
 * @param  {comparerCallback} comparer comparer to use
 * @param  {any} a
 * @param  {any} b
 * @return {boolean} whether or not a <= b
 */
export function lte(comparer, a, b) {
  return comparer(a, b) <= 0;
}

/**
 * Returns whether or not a > b
 * @param  {comparerCallback} comparer comparer to use
 * @param  {any} a
 * @param  {any} b
 * @return {boolean} whether or not a => b
 */
export function gte(comparer, a, b) {
  return comparer(a, b) >= 0;
}

/**
 * Returns whether or not a < b
 * @param  {comparerCallback} comparer comparer to use
 * @param  {any} a
 * @param  {any} b
 * @return {boolean} whether or not a < b
 */
export function lt(comparer, a, b) {
  return comparer(a, b) < 0;
}

/**
 * Returns whether or not a > b
 * @param  {comparerCallback} comparer comparer to use
 * @param  {any} a
 * @param  {any} b
 * @return {boolean} whether or not a > b
 */
export function gt(comparer, a, b) {
  return comparer(a, b) > 0;
}

/**
 * Returns whether or not a === b
 * @param  {comparerCallback} comparer comparer to use
 * @param  {any} a
 * @param  {any} b
 * @return {boolean} whether or not a === b
 */
export function eq(comparer, a, b) {
  return comparer(a, b) === 0;
}

/**
 * Default comparer equal to as used on Array.sort
 * @param  {any} a
 * @param  {any} b
 * @return {number} result of comparison
 */
export function defaultComparer(a, b) {
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}

/**
 * Wraps any comparer with a call to .key on both a and b.
 * Useful if you comparer is a value comparer but the values
 * are objects with keys to compare.
 * @param  {comparerCallback} comparer comparer to use
 * @return {comparerCallback} comparer wrapped in .key calls
 */
export function keyWrapComparer(comparer) {
  return (a, b) => comparer(a.key, b.key);
}

/**
 * Intersects N arrays
 * @param  {Array<Array<any>>} arrays N arrays with values to intersect
 * @return {Array<any>} array of values where that value is in all array
 */
export function intersect(arrays) {
  const ordered = (arrays.length === 1
    ? arrays
    : arrays.sort((a1, a2) => a1.length - a2.length));
  const shortest = ordered[0];
  const set = new Set();
  const result = [];

  for (let i = 0; i < shortest.length; i += 1) {
    const item = shortest[i];
    let every = true; // don't use ordered.every ... it is slow
    for (let j = 1; j < ordered.length; j += 1) {
      if (!ordered[j].includes(item)) {
        every = false;
        break;
      }
    }
    // ignore if not in every other array, or if already captured
    if (every || !set.has(item)) {
      // otherwise, add to book keeping set and the result
      set.add(item);
      result[result.length] = item;
    }
  }
  return result;
}

/**
 * Extracts items passed by an array of keys from the passed map.
 * @param  {Map} map javascript map object containing all keys and values
 * @param  {Array<any>} keys keys to extract from the map
 * @return {Array<any>} array of values extracted from the passed map
 */
export function extract(map, keys) {
  const r = [];
  const manyKeys = oneOrMany(keys);
  const defMap = map || new Map([]);

  manyKeys.forEach((key) => {
    if (map.has(key)) {
      r.push(defMap.get(key));
    }
  });
  return r;
}

/**
 * Flattens an array one level deep only.
 * @param  {Array<any>} arr array of arrays to flatten
 * @return {Array<any>} flattened array
 */
export function shallowFlat(arr) {
  const resultArr = [];
  if (!arr) {
    return resultArr;
  }
  for (let i = 0; i < arr.length; i += 1) {
    resultArr.push(...arr[i]);
  }
  return resultArr;
}
