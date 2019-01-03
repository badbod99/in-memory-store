class HashIndex {
    constructor (name, keyGetter, valueGetter, items) {
        this.index = new Map([]);
        this.name = name;
        this.keyFn = keyGetter;
        this.valFn = valueGetter;

        if (items) {
            this.populate(items);
        }
    }
    
    static build(name, keyGetter, valueGetter, items) {
        return new HashIndex(name, keyGetter, valueGetter, items);
    }

    populate(items) {
        items.forEach((item) => {
            const val = this.valFn(item);
            const col = this.index.get(val);
            const key = this.keyFn(item);
            if (!col) {
                this.index.set(val, [key]);
            } else {
                col.push(key);
            }
        });
    }

    get(values) {
        if (Array.isArray(values)) {
            let data = values.map(m => this.index.get(m));
            return [].concat.apply([], data);
        }
        return this.index.get(values);
    }

    remove(item) {
        if (item) {
            const val = this.valFn(item);
            const key = this.keyFn(item);
            if (this.index.has(val)) {
                const col = this.index.get(val);
                const i = col.indexOf(key);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.delete(val);
                }
            }
        }
    }

    add(item) {
        const value = this.valFn(item);
        const key = this.keyFn(item);
        if (key && value) {
            if (this.index.has(value)) {
                this.index.get(value).push(key);
            } else {
                this.index.set(value, [key]);
            }
        }
    }

    update(item, olditem) {
        this.remove(olditem);
        this.add(item);
    }
}

export default HashIndex;