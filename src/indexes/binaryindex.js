import * as mem from '../common';
import { BinaryArray } from './binaryarray';

export class BinaryIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = comparer || mem.defaultComparer;
        this.index = new BinaryArray(this.comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    }
    
    static build(name, itemFn, keyFn, items, comparer) {
        let bin = new BinaryIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    }

    get keys() {
        return this.index.keys;
    }

    clear() {
        this.index = new BinaryArray(this.comparer);
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
        const pos = this.index.indexOf(key);
        
        if (pos > -1) {
            const entry = this.index.getAt(pos);
            const it = this.itemFn(item);
            const i = entry.value.indexOf(it);
            if (i > -1) {
                entry.value.splice(i, 1);
            }
            if (entry.value.length === 0) {
                this.index.removeAt(pos);
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
        const pos = this.index.insertPos(key);
        const entry = this.index.getAt(pos);
        
        if (entry && mem.eq(this.comparer, entry.key, key)) {
            entry.value.push(it);
        } else {
            this.index.addAt(pos, key, [it]); 
        }
    }

    update(item, olditem) {
        this.remove(olditem);
        this.insert(item);
    }
}