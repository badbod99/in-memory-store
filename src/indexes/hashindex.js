import * as mem from '../common';

export class HashIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || mem.defaultComparer;
        this.index = new Map([]);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    }
    
    static build(name, itemFn, keyFn, items, comparer) {
        let bin = new HashIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    }

    get keys() {
        return Array.from(this.index.keys());
    }

    clear() {
        this.index = new Map([]);
    }

    findMany(keys) {
        keys = mem.oneOrMany(keys);
        let data = keys.map(m => this.find(m));
        return [].concat.apply([], data);
    }

    find(key) {
        return this.index.get(key);
    }

    remove(item) {
        const key = this.keyFn(item);
        if (this.index.has(key)) {
            const col = this.index.get(key);
            const it = this.itemFn(item);
            const i = col.indexOf(it);
            if (i > -1) {
                col.splice(i, 1);
            }
            if (col.length === 0) {
                this.index.delete(key);
            }
        }
    }

    populate(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => this.insert(item));
    }

    insert(item) {
        const key = this.keyFn(item);
        const it = this.itemFn(item);
        if (it && key) {
            if (this.index.has(key)) {
                this.index.get(key).push(it);
            } else {
                this.index.set(key, [it]);
            }
        }
    }

    update(item, olditem) {
        this.remove(olditem);
        this.insert(item);
    }
}