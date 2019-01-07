import * as mem from '../common';
import AVLTree from 'avl';

class AVLIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || mem.defaultComparer;
        this.index = new AVLTree(comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    }
    
    static build(name, itemFn, keyFn, items, comparer) {
        let bin = new AVLIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    }

    get keys() {
        return this.index.keys();
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
        let found = this.index.find(key);
        if (found) {
            return found.data;
        } else {
            return [];
        }
    }

    remove(item) {
        const key = this.keyFn(item);
        const entry = this.index.find(key);

        if (entry) {
            const it = this.itemFn(item);
            const arr = entry.data;
            const i = arr.indexOf(it);
            if (i > -1) {
                arr.splice(i, 1);
            }
            if (arr.length === 0) {
                this.index.remove(key);
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
        const entry = this.index.find(key);
        
        if (entry) {
            entry.data.push(it);
        } else {
            this.index.insert(key, [it]);
        }
    }

    update(item, olditem) {
        this.remove(olditem);
        this.insert(item);
    }
}

export default AVLIndex;