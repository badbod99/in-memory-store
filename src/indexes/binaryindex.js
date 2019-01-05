import * as mem from '../common';

class BinaryIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.index = [];
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.comparer = comparer || mem.defaultComparer;
    }
    
    static build(name, itemFn, keyFn, items, comparer) {
        let hash = new BinaryIndex(name, itemFn, keyFn, comparer);
        hash.add(items);
        return hash;
    }

    get keys() {
        return this.index.map(m => m.key);
    }

    clear() {
        this.index = [];
    }

    _positionOf(key) {
        let low = 0, high = this.index.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            mem.lt(this.comparer, this.index[mid].key, key) ? low = mid + 1 : high = mid
        }
        return low;
    }

    get(keys) {
        keys = mem.oneOrMany(keys);
        if (keys.length === 1) {
            return this.getOne(keys[0]);
        }
        let data = keys.map(m => this.getOne(m));
        return [].concat.apply([], data);
    }

    getOne(key) {
        const i = this._positionOf(key);
        const entry = this.index[i];
        if (mem.eq(this.comparer, entry.key, key)) {
            return entry.values;
        }
    }

    remove(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.removeOne(item);
        });
    }

    removeOne(item) {
        const key = this.keyFn(item);
        const ix = this._positionOf(key);
        const entry = this.index[ix];
        
        if (entry && mem.eq(this.comparer, entry.key, key)) {
            const it = this.itemFn(item);
            const i = entry.values.indexOf(it);
            if (i > -1) {
                entry.values.splice(i, 1);
            }
            if (entry.values.length === 0) {
                this.index.splice(ix, 1);
            }
        }
    }

    add(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.addOne(item);
        });
    }
    
    addOne(item) {
        const key = this.keyFn(item);
        const it = this.itemFn(item);
        const ix = this._positionOf(key);
        const entry = this.index[ix];
        
        if (entry && mem.eq(this.comparer, entry.key, key)) {
            entry.values.push(it);
        } else {
            this.index.splice(ix, 0, {key: key, values: [it]});
        }
    }

    update(item, olditem) {
        this.removeOne(olditem);
        this.addOne(item);
    }
}

export default BinaryIndex;