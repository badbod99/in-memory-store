import * as mem from '../common';

class BinaryArray {
    constructor (comparer) {
        this.arr = [];
        this.comparer = comparer || mem.defaultComparer;
    }
    
    clear() {
        this.arr = [];
    }

    get keys() {
        return this.arr.map(m => m.key);
    }

    indexOf(key) {
        let i = this.insertPos(key);
        if (this.arr[i] && mem.eq(this.comparer, this.arr[i].key, key)) {
            return i;
        } else {
            return -1;
        }
    }

    insertPos(key) {
        let low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            mem.lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid
        }
        return low;
    }

    get(key) {
        const i = this.indexOf(key);
        if (i > -1) {
            return this.arr[i].value;
        }
    }

    remove(key) {
        const i = this.indexOf(key);
        if (i > -1) {
            this.removeAt(i);
        }
    }

    add(key, value) {
        const ix = this.insertPos(key);
        let item = { key: key, value: value };
        this.addAt(ix, key, value);
    }

    addAt(pos, key, value) {
        let item = { key: key, value: value };
        this.arr.splice(pos, 0, item);
    }

    removeAt(pos) {
        this.arr.splice(pos, 1);
    }

    getAt(pos) {
        return this.arr[pos];
    }

    update(item) {
        this.indexOf(item.key);
        if (i !== undefined) {
            this.arr[i].value = item;
        }
    }
}

export default BinaryArray;