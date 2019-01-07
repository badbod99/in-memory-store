import * as mem from '../common';
import { RBTree } from 'bintrees';

class RBIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = mem.keyWrapComparer(comparer || mem.defaultComparer);
        this.index = new RBTree(this.comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    }
    
    static build(name, itemFn, keyFn, items, comparer) {
        let bin = new RBIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    }

    get keys() {
        let arr = [];
        this.index.each(f => arr.push(f.key));
        return arr;
    }

    clear() {
        this.index.clear();
    }

    findMany(keys) {
        keys = mem.oneOrMany(keys);
        let data = keys.map(m => this.find(m));
        return [].concat.apply([], data);
    }

    find(key) {
        let found = this.index.find({ key: key });
        if (found) {
            return found.value;
        } else {
            return [];
        }
    }

    remove(item) {
        const key = this.keyFn(item);
        const entry = this.index.find({ key: key });

        if (entry) {
            const it = this.itemFn(item);
            const arr = entry.value;
            const i = arr.indexOf(it);
            if (i > -1) {
                arr.splice(i, 1);
            }
            if (entry.value.length === 0) {
                this.index.remove({ key: key });
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
        const entry = this.index.find({ key: key });
        
        if (entry) {
            entry.value.push(it);
        } else {
            this.index.insert({key: key, value: [it]});
        }
    }

    update(item, olditem) {
        this.remove(olditem);
        this.insert(item);
    }
}

export default RBIndex;