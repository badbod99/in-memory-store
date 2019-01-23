import * as mem from './common';

/**
 * Key value storage with support for grouping/returning items by index value
 */
export default class Find {
    /**
     * @param {Map<indexName, index>} indexes Map of indexes to query
     */
    constructor(indexes) {
        this.indexes = indexes;
    }

    /**
     * Searches one or many indexes, each using specified operator for specified value.
     * @param {Array<any>} filters [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * @returns {Array<any>} keys found in all passed index searches
     */
    $and(filters) {
        let filterFns = this._getFilterFns(filters, this.indexes);
        let dataSets = filterFns.map(fn => fn());
        return mem.intersect(dataSets);
    }

    /**
     * Searches one or many indexes, each using specified operator for specified value.
     * @param {Array<any>} filters [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * @returns {Array<any>} keys found in all passed index searches
     */
    $or(filters) {
        let filterFns = this._getFilterFns(filters, this.indexes);
        let dataSets = filterFns.map(fn => fn());
        return [].concat.apply([], dataSets);
    }

    /**
     * Performs a find across many indexes based on limited find selector language.
     * @param {Array<any>} selector
     * { $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}],
     * $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}] }
     * @returns {Array<any>} keys from found in all passed index searches
     */
    find(query) {
        let selector = this._parseQuery(query);
        var joins = Object.keys(selector);
        let fns = joins.map(op => this._combinatorFn(op, selector[op]));
        let dataSets = fns.map(fn => fn());
        // All operator results are ultimately $and together
        return mem.intersect(dataSets);
    }
    
    /**
     * Gets the combinator function based on the specified combinator key.
     * @param {*} key Either $and or $or
     * @param {*} filters The filters to pass through to the combinator.
     */
    _combinatorFn(key, filters) {
        switch(key) {
            case "$and":
                return () => this.$and(filters);
            case "$or":
                return () => this.$or(filters);
        }
    }

    /**
     * Gets a filter function based on the specified operator key..
     * @param {string} operator $lt/$gt/$gte/$lte or $eq
     * @returns {any} function coresponding to passed key
     */
    _opertatorFn(key, index, val) {
        switch (key) {
            case '$lt':
                return () => index.$lt(val);
            case '$lte':
                return () => index.$lte(val);
            case '$gt':
                return () => index.$gt(val);
            case '$gte':
                return () => index.$gte(val);
            case '$in':
                return () => index.$in(val);
            case '$eq':
                return () => index.$eq(val);
        }
    }
  
    /**
     * Parses loose query language to strict with implicit operators and combinators
     * made explicit.
     * @param {*} query Query to parse in following supported formats...
     * { $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}],
     * $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}] }
     * OR (implicit $and)
     * [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * OR (implicit $eq)
     * {"indexName":"value", "indexName":"value"}
     * OR (implicit $in)
     * {"indexName":"value", "indexName":["value1", "value1"]}
     * @returns {object} Strict query format in format...
     * { $and: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}],
     * $or: [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}] }
     */
    _parseQuery(query) {
        let selector = {};
        if (typeof query === 'object') {
            let keys = Object.keys(query);

            if (Array.isArray(query) || !Array.isArray(query[keys[0]])) {
                // We've got a single item or array of items
                selector['$and'] = [];
                this._parseInnerSelector(query, selector['$and']);
            } else {
                // We've got a combinator
                keys.forEach(key => {
                    selector[key] = [];
                    this._parseInnerSelector(query[key], selector[key]);
                });
            }
        } else {
            throw new SyntaxError(`Query should be an object or an array ${JSON.stringify(query)}`);
        }
        return selector;
    }

    _parseInnerSelector(query, selectors) {
        // Inner selector should be an array
        if (!Array.isArray(query)) {
            query = [query];
        }

        let converted = query.map(part => {
            let selector = {};
            if (typeof part !== 'object') {
                throw new SyntaxError(`Selector part should be an object ${JSON.stringify(part)}`);
            }

            Object.keys(part).forEach(k => {
                // First part is always an index name (i.e. field name)
                selector[k] = {};

                // If it's an object, we've got an operator/key combination
                // otherwise it's just a value
                if (Array.isArray(part[k])) {
                    selector[k]['$in'] = part[k];
                } else if (typeof part[k] === 'object') {
                    let op = Object.keys(part[k])[0];
                    selector[k][op] = part[k][op];
                } else {
                    selector[k]['$eq'] = part[k];
                }
            });
            return selector;
        });

        selectors.push(...converted);
    }

    /**
     * Get function array based on specified find criteria.
     * @param {Array<any>} filters [{"indexName":{"operator":"value"}}, {"indexName":{"operator":"value"}}]
     * @returns {Array<any>} Array of functions to perform specified find operations.
     */
    _getFilterFns(filters, indexMap) {
        filters = mem.oneOrMany(filters);
        return filters.map(f => {
            // only one entry per filter
            let filter = Object.entries(f)[0];
            let indexName = filter[0];
            let action = filter[1];

            if (typeof action !== 'object') {
                throw new TypeError(`Filter must contain a valid action object, passed filter ${filter}`);
            }
            
            const op = Object.keys(action)[0];
            const val = action[op];

            if (!this.indexes.has(indexName)) {
                throw new TypeError(`Invalid index specified ${indexName}`);
            }

            return this._opertatorFn(op, this.indexes.get(indexName), val);
        });
    }
}