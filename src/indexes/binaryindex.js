class BinaryIndex {
    constructor (name, keyGetter, valueGetter, items) {
        this.index = [];
        this.name = name;
        this.keyFn = keyGetter;
        this.valFn = valueGetter;
        this.dirty = false;
        this.comparer = this.keyComparer;

        if (items) {
            this.populate(items);
        }
    }
    
    static build(name, keyGetter, valueGetter, items) {
        return new BinaryIndex(name, keyGetter, valueGetter, items);
    }

    get values() {
        return this.index.map(m => m.key);
    }

    keyComparer(item1, item2) {
        const a = item1.key;
        const b = item2.key;
        return a === b ? 0 : a > b ? 1 : -1
    }

    search(key) {
        const i = this._searchExact(key);
        if (i !== undefined) {
            return this.index[i].values;
        } else {
            return undefined;
        }
    }

    _searchIndex(key) {
        let low = 0, high = this.index.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            this.index[mid].key < key ? low = mid + 1 : high = mid
        }
        return low;
    }

    _searchExact(key) {
        const i = this._searchIndex(key);
        return this.index[i] && this.index[i].key === key ? i : undefined;
    }

    populate(items) {
        items.forEach((item) => {
            const val = this.valFn(item);
            const key = this.keyFn(item);
            const col = this.search(val);
            if (!col) {
                this.index.push({key: val, values: [key]});
                this.dirty = true;
                this._sortIfDirty();
            } else {
                col.push(key);
            }
        });

        this._sortIfDirty();
    }

    get(values) {
        if (Array.isArray(values)) {
            let data = values.map(m => this.search(m));
            return [].concat.apply([], data);
        }
        return this.search(values);
    }

    remove(item) {
        if (item) {
            const val = this.valFn(item);
            const key = this.keyFn(item);
            const ix = _searchIndex(val);
            if (ix) {
                const col = this.index[ix].values;
                const i = col.indexOf(key);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.splice(ix, 1);
                }
            }
        }
    }

    add(item) {
        const val = this.valFn(item);
        const key = this.keyFn(item);
        const col = this.search(val);
        if (!col) {
            this.index.push({key: val, values: [key]});
            this._sortIfDirty();
        } else {
            col.values.push(key);
        }
    }

    update(item, olditem) {
        this.remove(olditem);
        this.add(item);
    }

    _sortIfDirty() {
        if (this.dirty) {
            this.index.sort(this.comparer);
            this.dirty = false;
        }
    }
}

export default BinaryIndex;