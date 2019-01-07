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

export function lt(comparer, a, b) {
    return comparer(a, b) === -1;
}

export function gt(comparer, a, b) {
    return comparer(a, b) === 1;
}

export function eq(comparer, a, b) {
    return comparer(a, b) === 0;
}

export function defaultComparer(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
}

export function keyWrapComparer(comparer) {
    return function(a, b) {
        return comparer(a.key, b.key);
    };
}

export function intersect(arrays) {
    const ordered = (arrays.length===1
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
        // otherwise, add to bookeeping set and the result
        set.add(item);
        result[result.length] = item;
    }
    return result;
}

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