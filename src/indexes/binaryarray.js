import * as mem from '../common';

class BinaryArray {
    constructor (items, comparer) {
        this.arr = [];
        this.add(items);
        this.comparer = comparer || mem.defaultComparer;
    }
    
    clear() {
        this.arr = [];
    }

    _positionOf(item) {
        let low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            mem.lt(this.comparer, this.arr[mid], item) ? low = mid + 1 : high = mid
        }
        return low;
    }

    get(items) {
        items = mem.oneOrMany(items);
        if (items.length === 1) {
            return this.getOne(items[0]);
        }
        let data = items.map(m => this.getOne(m));
        return [].concat.apply([], data);
    }

    getOne(item) {
        const i = this._positionOf(item);
        const entry = this.arr[i];
        if (mem.eq(this.comparer, entry, item)) {
            return entry;
        }
    }

    remove(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.removeOne(item);
        });
    }

    removeOne(item) {
        const ix = this._positionOf(item);
        const entry = this.arr[ix];
        if (mem.eq(this.comparer, entry, item)) {
            this.arr.splice(ix, 1);
        }
    }

    add(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.addOne(item);
        });
    }

    addOne(item) {
        const ix = this._positionOf(item);
        const entry = this.arr[ix];
        if (mem.eq(this.comparer, entry, item)) {
            this.arr[ix] = item;
        } else {
            this.arr.splice(ix, 0, item);
        }
    }

    update(item, olditem) {
        this.removeOne(olditem);
        this.addOne(item);
    }
}

export default BinaryArray;