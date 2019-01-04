import * as mem from '../common';

class BinaryIndex {
    constructor (name, itemFn, keyFn, items) {
        this.index = [];
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.add(items);
    }
    
    static build(name, itemFn, keyFn, items) {
        return new BinaryIndex(name, itemFn, keyFn, items);
    }

    get keys() {
        return this.index.map(m => m.key);
    }

    _positionOf(key) {
        let low = 0, high = this.index.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            this.index[mid].key < key ? low = mid + 1 : high = mid
        }
        return low;
    }

    _get(key) {
        const i = this._positionOf(key);
        const entry = this.index[i];
        if (entry && entry.key === key) {
            return entry.values;
        }
    }
    
    get(keys) {
        keys = mem.oneOrMany(keys);
        let data = keys.map(m => this._get(m));
        return [].concat.apply([], data);
    }

    remove(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            const ix = this._positionOf(key);
            if (ix) {
                const col = this.index[ix].values;
                const i = col.indexOf(it);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.splice(ix, 1);
                }
            }
        });
    }

    add(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            const ix = this._positionOf(key);
            const entry = this.index[ix];
            
            if (entry && entry.key === key) {
                entry.values.push(it);
            } else {
                this.index.splice(ix, 0, {key: key, values: [it]});
            }
        });
    }

    update(item, olditem) {
        this.remove(olditem);
        this.add(item);
    }
}

export default BinaryIndex;