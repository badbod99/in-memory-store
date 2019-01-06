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

    get items() {
        return this.arr;
    }

    indexOf(item) {
        let i = this.insertPos(item);
        if (this.arr[i] && mem.eq(this.comparer, this.arr[i], item)) {
            return i;
        }
    }

    insertPos(item) {
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
        const i = this.indexOf(item);
        if (i !== undefined) {
            return this.arr[i];
        }
    }

    remove(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.removeOne(item);
        });
    }

    removeOne(item) {
        const i = this.indexOf(item);
        if (i !== undefined) {
            this.arr.splice(i, 1);
        }
    }

    add(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            this.addOne(item);
        });
    }

    addOne(item) {
        const ix = this.insertPos(item);
        this.arr.splice(ix, 0, item);
    }

    update(item) {
        this.indexOf(item);
        if (i !== undefined) {
            this.arr[i] = item;
        }
    }
}

export default BinaryArray;