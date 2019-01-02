// -------------------------------------------------------
// Indexing system based on exact match only
// Will hold a map of the key and the matching itemument ids
// to allow you to return all related itemument ids
// from a passed key or keys.
// This allows very fast lookups of itemuments 
// by grade/spec/client/location/etc...
// Note: Do not cache or persist these maps forever,
// they will become stale as data changes or is deleted.
// You should rebuild the index infrequently to ensure
// optimal storage.
// -------------------------------------------------------
class InMemoryIndex {
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
        return new InMemoryIndex(name, keyGetter, valueGetter, items);
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

    get(value) {
        return this.index.get(value);
    }

    getMany(values) {
        let data = values.map((m) => {
            return this.index.get(m);
        });
        return [].concat.apply([], data);
    }

    remove(item) {
        if (item) {
            const val = this.valFn(item);
            const key = this.keyFn(item);
            if (this.index.has(val)) {
                const i = this.index.get(val).indexOf(key);
                if (i > -1) {
                    this.index.get(val).splice(i, 1);
                }
            }
        }
    }

    add(item) {
        const value = this.valFn(item);
        const key = this.keyFn(item);
        if (key && value) {
            if (this.has(value)) {
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

export default InMemoryIndex;