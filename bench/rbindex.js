// Not intended for production use.
// RBTree does not provide key/value store and performs
// poorly as implemented here with custom comparator and
// key/value objects.

import * as mem from '../src/common';
import { RBTree } from 'bintrees';
import { BaseIndex } from '../src/indexes/baseindex';

export class RBIndex extends BaseIndex {
    constructor (name, itemFn, keyFn, comparer) {
        this.comparer = mem.keyWrapComparer(comparer || mem.defaultComparer);
        this.index = new RBTree(this.comparer);
        super(name, itemFn, keyFn);
    }

    /**
     * Returns whether or not this index is empty
     * @abstract
     * @return {boolean}
     */
    get isEmpty() {
        return this.index.size === 0;
    }
    
    get keys() {
        let arr = [];
        this.index.each(f => arr.push(f.key));
        return arr;
    }

    clear() {
        this.index.clear();
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
}