/**
* Callback for comparer
* @callback comparerCallback
* @param   {Key} a
* @param   {Key} b
* @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
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
    } else if (items instanceof Map) {
        return Array.from(items.values());
    } else if (!Array.isArray(items)) {
        return [items];
    } else {
        return items;
    }
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
    return a > b ? 1 : a < b ? -1 : 0;
}

/**
 * Wraps any comparer with a call to .key on both a and b.
 * Useful if you comparer is a value comparer but the values
 * are objects with keys to compare.
 * @param  {comparerCallback} comparer comparer to use
 * @return {comparerCallback} comparer wrapped in .key calls
 */
export function keyWrapComparer(comparer) {
    return function(a, b) {
        return comparer(a.key, b.key);
    };
}

/**
 * Intersects N arrays
 * @param  {Array<Array<any>>} arrays N arrays with values to intersect
 * @return {Array<any>} array of values where that value is in all array
 */
export function intersect(arrays) {
    const ordered = (arrays.length === 1
        ? arrays : 
        arrays.sort((a1,a2) => a1.length - a2.length));
    const shortest = ordered[0],
        set = new Set(), 
        result = [];

    for (let i=0; i < shortest.length; i++) {
        const item = shortest[i];
        let every = true; // don't use ordered.every ... it is slow
        for(let j=1;j<ordered.length;j++) {
            if(ordered[j].includes(item)) continue;
            every = false;
            break;
        }
        // ignore if not in every other array, or if already captured
        if(!every || set.has(item)) continue;
        // otherwise, add to book keeping set and the result
        set.add(item);
        result[result.length] = item;
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
    keys = oneOrMany(keys);
    map = map || new Map([]);
    
    keys.forEach((key) => {
        if (map.has(key)) {
            r.push(map.get(key));
        }
    });    
    return r;
}