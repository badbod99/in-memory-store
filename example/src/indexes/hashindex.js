import * as mem from '../common';

class HashIndex {
    constructor (name, itemFn, keyFn, items) {
        this.index = new Map([]);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
        this.add(items);
    }
    
    static build(name, itemFn, keyFn, items) {
        return new HashIndex(name, itemFn, keyFn, items);
    }

    get keys() {
        return Array.from(this.index.keys());
    }

    get(keys) {
        keys = mem.oneOrMany(keys);
        let data = keys.map(m => this.index.get(m));
        return [].concat.apply([], data);
    }

    remove(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            if (this.index.has(key)) {
                const col = this.index.get(key);
                const i = col.indexOf(it);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.delete(key);
                }
            }
        });
    }

    add(items) {
        items = mem.oneOrMany(items);
        items.forEach(item => {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            if (it && key) {
                if (this.index.has(key)) {
                    this.index.get(key).push(it);
                } else {
                    this.index.set(key, [it]);
                }
            }
        });
    }

    update(item, olditem) {
        this.remove(olditem);
        this.add(item);
    }
}

export default HashIndex;