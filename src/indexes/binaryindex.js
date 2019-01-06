import * as mem from '../common';
import HashIndex from './hashindex';

class BinaryIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.index = [];
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.comparer = comparer || mem.defaultComparer;
    }
    
    static build(name, itemFn, keyFn, items, comparer) {
        let bin = new BinaryIndex(name, itemFn, keyFn, comparer);
        bin.add(items);
        return bin;
    }

    get keys() {
        return this.index.map(m => m.key);
    }

    clear() {
        this.index = [];
    }

    indexOf(key) {
        const i = this.insertPos(key);
        const entry = this.index[i];
        if (entry && mem.eq(this.comparer, entry.key, key)) {
            return i;
        }
    }

    insertPos(key) {
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
        const i = this.indexOf(key);
        if (i !== undefined) {
            return this.index[i].values;
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
        const ix = this.indexOf(key);
        
        if (ix !== undefined) {
            const entry = this.index[ix];
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
        const pos = this.insertPos(key);
        const entry = this.index[pos];
        
        if (entry && mem.eq(this.comparer, entry.key, key)) {
            entry.values.push(it);
        } else {
            this.index.splice(pos, 0, {key: key, values: [it]});
        }
    }

    update(item, olditem) {
        this.removeOne(olditem);
        this.addOne(item);
    }
}

export default BinaryIndex;