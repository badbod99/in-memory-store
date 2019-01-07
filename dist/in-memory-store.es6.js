/**
 * in-memory-store v1.0.4
 * JavaScript memory store for key/value with indexed lookups based on hash and binary search.
 *
 * @author Simon Lerpiniere
 * @license Apache-2.0
 * @preserve
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global['in-memory-store'] = factory());
}(this, (function () { 'use strict';

    function oneOrMany(items) {
        if (!items) {
            return [];
        } else if (items instanceof Map) {
            return Array.from(items.values());
        } else if (!Array.isArray(items)) {
            return [items];
        } else {
            return items;
        }
    }

    function lt(comparer, a, b) {
        return comparer(a, b) === -1;
    }

    function eq(comparer, a, b) {
        return comparer(a, b) === 0;
    }

    function defaultComparer(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
    }

    function keyWrapComparer(comparer) {
        return function(a, b) {
            return comparer(a.key, b.key);
        };
    }

    function intersect(arrays) {
        const ordered = (arrays.length===1
            ? arrays : 
            arrays.sort((a1,a2) => a1.length - a2.length));
        const shortest = ordered[0],
            set = new Set(), 
            result = [];

        for (let i=0; i < shortest.length; i++) {
            const item = shortest[i];
            let every = true; // don't use ordered.every ... it is slow
            for(let j=1;j<ordered.length;j++) {
                if(ordered[j].includes(item)) continue;
                every = false;
                break;
            }
            // ignore if not in every other array, or if already captured
            if(!every || set.has(item)) continue;
            // otherwise, add to bookeeping set and the result
            set.add(item);
            result[result.length] = item;
        }
        return result;
    }

    function extract(map, keys) {
        const r = [];
        keys.forEach((key) => {
            if (map.has(key)) {
                r.push(map.get(key));
            }
        });    
        return r;
    }

    class HashIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
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
            keys = oneOrMany(keys);
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
            items = oneOrMany(items);
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

    class BinaryArray {
        constructor (comparer) {
            this.arr = [];
            this.comparer = comparer || defaultComparer;
        }
        
        clear() {
            this.arr = [];
        }

        get keys() {
            return this.arr.map(m => m.key);
        }

        indexOf(key) {
            let i = this.insertPos(key);
            if (this.arr[i] && eq(this.comparer, this.arr[i].key, key)) {
                return i;
            } else {
                return -1;
            }
        }

        insertPos(key) {
            let low = 0, high = this.arr.length, mid;
            while (low < high) {
                // faster version of Math.floor((low + high) / 2)
                mid = (low + high) >>> 1; 
                lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid;
            }
            return low;
        }

        get(key) {
            const i = this.indexOf(key);
            if (i > -1) {
                return this.arr[i].value;
            }
        }

        remove(key) {
            const i = this.indexOf(key);
            if (i > -1) {
                this.removeAt(i);
            }
        }

        add(key, value) {
            const ix = this.insertPos(key);
            this.addAt(ix, key, value);
        }

        addAt(pos, key, value) {
            let item = { key: key, value: value };
            this.arr.splice(pos, 0, item);
        }

        removeAt(pos) {
            this.arr.splice(pos, 1);
        }

        getAt(pos) {
            return this.arr[pos];
        }

        update(item) {
            this.indexOf(item.key);
            if (i !== undefined) {
                this.arr[i].value = item;
            }
        }
    }

    class BinaryIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
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
            keys = oneOrMany(keys);
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
            items = oneOrMany(items);
            items.forEach(item => this.insert(item));
        }
        
        insert(item) {
            const key = this.keyFn(item);
            const it = this.itemFn(item);
            const pos = this.index.insertPos(key);
            const entry = this.index.getAt(pos);
            
            if (entry && eq(this.comparer, entry.key, key)) {
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

    function TreeBase() {}

    // removes all nodes from the tree
    TreeBase.prototype.clear = function() {
        this._root = null;
        this.size = 0;
    };

    // returns node data if found, null otherwise
    TreeBase.prototype.find = function(data) {
        var res = this._root;

        while(res !== null) {
            var c = this._comparator(data, res.data);
            if(c === 0) {
                return res.data;
            }
            else {
                res = res.get_child(c > 0);
            }
        }

        return null;
    };

    // returns iterator to node if found, null otherwise
    TreeBase.prototype.findIter = function(data) {
        var res = this._root;
        var iter = this.iterator();

        while(res !== null) {
            var c = this._comparator(data, res.data);
            if(c === 0) {
                iter._cursor = res;
                return iter;
            }
            else {
                iter._ancestors.push(res);
                res = res.get_child(c > 0);
            }
        }

        return null;
    };

    // Returns an iterator to the tree node at or immediately after the item
    TreeBase.prototype.lowerBound = function(item) {
        var cur = this._root;
        var iter = this.iterator();
        var cmp = this._comparator;

        while(cur !== null) {
            var c = cmp(item, cur.data);
            if(c === 0) {
                iter._cursor = cur;
                return iter;
            }
            iter._ancestors.push(cur);
            cur = cur.get_child(c > 0);
        }

        for(var i=iter._ancestors.length - 1; i >= 0; --i) {
            cur = iter._ancestors[i];
            if(cmp(item, cur.data) < 0) {
                iter._cursor = cur;
                iter._ancestors.length = i;
                return iter;
            }
        }

        iter._ancestors.length = 0;
        return iter;
    };

    // Returns an iterator to the tree node immediately after the item
    TreeBase.prototype.upperBound = function(item) {
        var iter = this.lowerBound(item);
        var cmp = this._comparator;

        while(iter.data() !== null && cmp(iter.data(), item) === 0) {
            iter.next();
        }

        return iter;
    };

    // returns null if tree is empty
    TreeBase.prototype.min = function() {
        var res = this._root;
        if(res === null) {
            return null;
        }

        while(res.left !== null) {
            res = res.left;
        }

        return res.data;
    };

    // returns null if tree is empty
    TreeBase.prototype.max = function() {
        var res = this._root;
        if(res === null) {
            return null;
        }

        while(res.right !== null) {
            res = res.right;
        }

        return res.data;
    };

    // returns a null iterator
    // call next() or prev() to point to an element
    TreeBase.prototype.iterator = function() {
        return new Iterator(this);
    };

    // calls cb on each node's data, in order
    TreeBase.prototype.each = function(cb) {
        var it=this.iterator(), data;
        while((data = it.next()) !== null) {
            if(cb(data) === false) {
                return;
            }
        }
    };

    // calls cb on each node's data, in reverse order
    TreeBase.prototype.reach = function(cb) {
        var it=this.iterator(), data;
        while((data = it.prev()) !== null) {
            if(cb(data) === false) {
                return;
            }
        }
    };


    function Iterator(tree) {
        this._tree = tree;
        this._ancestors = [];
        this._cursor = null;
    }

    Iterator.prototype.data = function() {
        return this._cursor !== null ? this._cursor.data : null;
    };

    // if null-iterator, returns first node
    // otherwise, returns next node
    Iterator.prototype.next = function() {
        if(this._cursor === null) {
            var root = this._tree._root;
            if(root !== null) {
                this._minNode(root);
            }
        }
        else {
            if(this._cursor.right === null) {
                // no greater node in subtree, go up to parent
                // if coming from a right child, continue up the stack
                var save;
                do {
                    save = this._cursor;
                    if(this._ancestors.length) {
                        this._cursor = this._ancestors.pop();
                    }
                    else {
                        this._cursor = null;
                        break;
                    }
                } while(this._cursor.right === save);
            }
            else {
                // get the next node from the subtree
                this._ancestors.push(this._cursor);
                this._minNode(this._cursor.right);
            }
        }
        return this._cursor !== null ? this._cursor.data : null;
    };

    // if null-iterator, returns last node
    // otherwise, returns previous node
    Iterator.prototype.prev = function() {
        if(this._cursor === null) {
            var root = this._tree._root;
            if(root !== null) {
                this._maxNode(root);
            }
        }
        else {
            if(this._cursor.left === null) {
                var save;
                do {
                    save = this._cursor;
                    if(this._ancestors.length) {
                        this._cursor = this._ancestors.pop();
                    }
                    else {
                        this._cursor = null;
                        break;
                    }
                } while(this._cursor.left === save);
            }
            else {
                this._ancestors.push(this._cursor);
                this._maxNode(this._cursor.left);
            }
        }
        return this._cursor !== null ? this._cursor.data : null;
    };

    Iterator.prototype._minNode = function(start) {
        while(start.left !== null) {
            this._ancestors.push(start);
            start = start.left;
        }
        this._cursor = start;
    };

    Iterator.prototype._maxNode = function(start) {
        while(start.right !== null) {
            this._ancestors.push(start);
            start = start.right;
        }
        this._cursor = start;
    };

    var treebase = TreeBase;

    function Node(data) {
        this.data = data;
        this.left = null;
        this.right = null;
        this.red = true;
    }

    Node.prototype.get_child = function(dir) {
        return dir ? this.right : this.left;
    };

    Node.prototype.set_child = function(dir, val) {
        if(dir) {
            this.right = val;
        }
        else {
            this.left = val;
        }
    };

    function RBTree(comparator) {
        this._root = null;
        this._comparator = comparator;
        this.size = 0;
    }

    RBTree.prototype = new treebase();

    // returns true if inserted, false if duplicate
    RBTree.prototype.insert = function(data) {
        var ret = false;

        if(this._root === null) {
            // empty tree
            this._root = new Node(data);
            ret = true;
            this.size++;
        }
        else {
            var head = new Node(undefined); // fake tree root

            var dir = 0;
            var last = 0;

            // setup
            var gp = null; // grandparent
            var ggp = head; // grand-grand-parent
            var p = null; // parent
            var node = this._root;
            ggp.right = this._root;

            // search down
            while(true) {
                if(node === null) {
                    // insert new node at the bottom
                    node = new Node(data);
                    p.set_child(dir, node);
                    ret = true;
                    this.size++;
                }
                else if(is_red(node.left) && is_red(node.right)) {
                    // color flip
                    node.red = true;
                    node.left.red = false;
                    node.right.red = false;
                }

                // fix red violation
                if(is_red(node) && is_red(p)) {
                    var dir2 = ggp.right === gp;

                    if(node === p.get_child(last)) {
                        ggp.set_child(dir2, single_rotate(gp, !last));
                    }
                    else {
                        ggp.set_child(dir2, double_rotate(gp, !last));
                    }
                }

                var cmp = this._comparator(node.data, data);

                // stop if found
                if(cmp === 0) {
                    break;
                }

                last = dir;
                dir = cmp < 0;

                // update helpers
                if(gp !== null) {
                    ggp = gp;
                }
                gp = p;
                p = node;
                node = node.get_child(dir);
            }

            // update root
            this._root = head.right;
        }

        // make root black
        this._root.red = false;

        return ret;
    };

    // returns true if removed, false if not found
    RBTree.prototype.remove = function(data) {
        if(this._root === null) {
            return false;
        }

        var head = new Node(undefined); // fake tree root
        var node = head;
        node.right = this._root;
        var p = null; // parent
        var gp = null; // grand parent
        var found = null; // found item
        var dir = 1;

        while(node.get_child(dir) !== null) {
            var last = dir;

            // update helpers
            gp = p;
            p = node;
            node = node.get_child(dir);

            var cmp = this._comparator(data, node.data);

            dir = cmp > 0;

            // save found node
            if(cmp === 0) {
                found = node;
            }

            // push the red node down
            if(!is_red(node) && !is_red(node.get_child(dir))) {
                if(is_red(node.get_child(!dir))) {
                    var sr = single_rotate(node, dir);
                    p.set_child(last, sr);
                    p = sr;
                }
                else if(!is_red(node.get_child(!dir))) {
                    var sibling = p.get_child(!last);
                    if(sibling !== null) {
                        if(!is_red(sibling.get_child(!last)) && !is_red(sibling.get_child(last))) {
                            // color flip
                            p.red = false;
                            sibling.red = true;
                            node.red = true;
                        }
                        else {
                            var dir2 = gp.right === p;

                            if(is_red(sibling.get_child(last))) {
                                gp.set_child(dir2, double_rotate(p, last));
                            }
                            else if(is_red(sibling.get_child(!last))) {
                                gp.set_child(dir2, single_rotate(p, last));
                            }

                            // ensure correct coloring
                            var gpc = gp.get_child(dir2);
                            gpc.red = true;
                            node.red = true;
                            gpc.left.red = false;
                            gpc.right.red = false;
                        }
                    }
                }
            }
        }

        // replace and remove if found
        if(found !== null) {
            found.data = node.data;
            p.set_child(p.right === node, node.get_child(node.left === null));
            this.size--;
        }

        // update root and make it black
        this._root = head.right;
        if(this._root !== null) {
            this._root.red = false;
        }

        return found !== null;
    };

    function is_red(node) {
        return node !== null && node.red;
    }

    function single_rotate(root, dir) {
        var save = root.get_child(!dir);

        root.set_child(!dir, save.get_child(dir));
        save.set_child(dir, root);

        root.red = true;
        save.red = false;

        return save;
    }

    function double_rotate(root, dir) {
        root.set_child(!dir, single_rotate(root.get_child(!dir), !dir));
        return single_rotate(root, dir);
    }

    var rbtree = RBTree;

    function Node$1(data) {
        this.data = data;
        this.left = null;
        this.right = null;
    }

    Node$1.prototype.get_child = function(dir) {
        return dir ? this.right : this.left;
    };

    Node$1.prototype.set_child = function(dir, val) {
        if(dir) {
            this.right = val;
        }
        else {
            this.left = val;
        }
    };

    function BinTree(comparator) {
        this._root = null;
        this._comparator = comparator;
        this.size = 0;
    }

    BinTree.prototype = new treebase();

    // returns true if inserted, false if duplicate
    BinTree.prototype.insert = function(data) {
        if(this._root === null) {
            // empty tree
            this._root = new Node$1(data);
            this.size++;
            return true;
        }

        var dir = 0;

        // setup
        var p = null; // parent
        var node = this._root;

        // search down
        while(true) {
            if(node === null) {
                // insert new node at the bottom
                node = new Node$1(data);
                p.set_child(dir, node);
                ret = true;
                this.size++;
                return true;
            }

            // stop if found
            if(this._comparator(node.data, data) === 0) {
                return false;
            }

            dir = this._comparator(node.data, data) < 0;

            // update helpers
            p = node;
            node = node.get_child(dir);
        }
    };

    // returns true if removed, false if not found
    BinTree.prototype.remove = function(data) {
        if(this._root === null) {
            return false;
        }

        var head = new Node$1(undefined); // fake tree root
        var node = head;
        node.right = this._root;
        var p = null; // parent
        var found = null; // found item
        var dir = 1;

        while(node.get_child(dir) !== null) {
            p = node;
            node = node.get_child(dir);
            var cmp = this._comparator(data, node.data);
            dir = cmp > 0;

            if(cmp === 0) {
                found = node;
            }
        }

        if(found !== null) {
            found.data = node.data;
            p.set_child(p.right === node, node.get_child(node.left === null));

            this._root = head.right;
            this.size--;
            return true;
        }
        else {
            return false;
        }
    };

    var bintree = BinTree;

    var bintrees = {
        RBTree: rbtree,
        BinTree: bintree
    };
    var bintrees_1 = bintrees.RBTree;

    class RBIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.comparer = keyWrapComparer(comparer || defaultComparer);
            this.index = new bintrees_1(this.comparer);
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
            keys = oneOrMany(keys);
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
            items = oneOrMany(items);
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

    /**
     * Prints tree horizontally
     * @param  {Node}                       root
     * @param  {Function(node:Node):String} [printNode]
     * @return {String}
     */
    function print (root, printNode = (n) => n.key) {
      var out = [];
      row(root, '', true, (v) => out.push(v), printNode);
      return out.join('');
    }

    /**
     * Prints level of the tree
     * @param  {Node}                        root
     * @param  {String}                      prefix
     * @param  {Boolean}                     isTail
     * @param  {Function(in:string):void}    out
     * @param  {Function(node:Node):String}  printNode
     */
    function row (root, prefix, isTail, out, printNode) {
      if (root) {
        out(`${ prefix }${ isTail ? '└── ' : '├── ' }${ printNode(root) }\n`);
        const indent = prefix + (isTail ? '    ' : '│   ');
        if (root.left)  row(root.left,  indent, false, out, printNode);
        if (root.right) row(root.right, indent, true,  out, printNode);
      }
    }


    /**
     * Is the tree balanced (none of the subtrees differ in height by more than 1)
     * @param  {Node}    root
     * @return {Boolean}
     */
    function isBalanced(root) {
      if (root === null) return true; // If node is empty then return true

      // Get the height of left and right sub trees
      var lh = height(root.left);
      var rh = height(root.right);

      if (Math.abs(lh - rh) <= 1 &&
          isBalanced(root.left)  &&
          isBalanced(root.right)) return true;

      // If we reach here then tree is not height-balanced
      return false;
    }

    /**
     * The function Compute the 'height' of a tree.
     * Height is the number of nodes along the longest path
     * from the root node down to the farthest leaf node.
     *
     * @param  {Node} node
     * @return {Number}
     */
    function height(node) {
      return node ? (1 + Math.max(height(node.left), height(node.right))) : 0;
    }


    function loadRecursive (parent, keys, values, start, end) {
      const size = end - start;
      if (size > 0) {
        const middle = start + Math.floor(size / 2);
        const key    = keys[middle];
        const data   = values[middle];
        const node   = { key, data, parent };
        node.left    = loadRecursive(node, keys, values, start, middle);
        node.right   = loadRecursive(node, keys, values, middle + 1, end);
        return node;
      }
      return null;
    }


    function markBalance(node) {
      if (node === null) return 0;
      const lh = markBalance(node.left);
      const rh = markBalance(node.right);

      node.balanceFactor = lh - rh;
      return Math.max(lh, rh) + 1;
    }


    function sort(keys, values, left, right, compare) {
      if (left >= right) return;

      // eslint-disable-next-line no-bitwise
      const pivot = keys[(left + right) >> 1];
      let i = left - 1;
      let j = right + 1;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        do i++; while (compare(keys[i], pivot) < 0);
        do j--; while (compare(keys[j], pivot) > 0);
        if (i >= j) break;

        let tmp = keys[i];
        keys[i] = keys[j];
        keys[j] = tmp;

        tmp = values[i];
        values[i] = values[j];
        values[j] = tmp;
      }

      sort(keys, values,  left,     j, compare);
      sort(keys, values, j + 1, right, compare);
    }

    // function createNode (parent, left, right, height, key, data) {
    //   return { parent, left, right, balanceFactor: height, key, data };
    // }

    /**
     * @typedef {{
     *   parent:        ?Node,
     *   left:          ?Node,
     *   right:         ?Node,
     *   balanceFactor: number,
     *   key:           Key,
     *   data:          Value
     * }} Node
     */

    /**
     * @typedef {*} Key
     */

    /**
     * @typedef {*} Value
     */

    /**
     * Default comparison function
     * @param {Key} a
     * @param {Key} b
     * @returns {number}
     */
    function DEFAULT_COMPARE (a, b) { return a > b ? 1 : a < b ? -1 : 0; }


    /**
     * Single left rotation
     * @param  {Node} node
     * @return {Node}
     */
    function rotateLeft (node) {
      var rightNode = node.right;
      node.right    = rightNode.left;

      if (rightNode.left) rightNode.left.parent = node;

      rightNode.parent = node.parent;
      if (rightNode.parent) {
        if (rightNode.parent.left === node) {
          rightNode.parent.left = rightNode;
        } else {
          rightNode.parent.right = rightNode;
        }
      }

      node.parent    = rightNode;
      rightNode.left = node;

      node.balanceFactor += 1;
      if (rightNode.balanceFactor < 0) {
        node.balanceFactor -= rightNode.balanceFactor;
      }

      rightNode.balanceFactor += 1;
      if (node.balanceFactor > 0) {
        rightNode.balanceFactor += node.balanceFactor;
      }
      return rightNode;
    }


    function rotateRight (node) {
      var leftNode = node.left;
      node.left = leftNode.right;
      if (node.left) node.left.parent = node;

      leftNode.parent = node.parent;
      if (leftNode.parent) {
        if (leftNode.parent.left === node) {
          leftNode.parent.left = leftNode;
        } else {
          leftNode.parent.right = leftNode;
        }
      }

      node.parent    = leftNode;
      leftNode.right = node;

      node.balanceFactor -= 1;
      if (leftNode.balanceFactor > 0) {
        node.balanceFactor -= leftNode.balanceFactor;
      }

      leftNode.balanceFactor -= 1;
      if (node.balanceFactor < 0) {
        leftNode.balanceFactor += node.balanceFactor;
      }

      return leftNode;
    }


    // function leftBalance (node) {
    //   if (node.left.balanceFactor === -1) rotateLeft(node.left);
    //   return rotateRight(node);
    // }


    // function rightBalance (node) {
    //   if (node.right.balanceFactor === 1) rotateRight(node.right);
    //   return rotateLeft(node);
    // }


    class AVLTree {
      /**
       * Callback for comparator
       * @callback comparatorCallback
       * @param {Key} a
       * @param {Key} b
       * @returns {number}
       */

      /**
       * @class AVLTree
       * @constructor
       * @param  {comparatorCallback} [comparator]
       * @param  {boolean}            [noDuplicates=false] Disallow duplicates
       */
      constructor (comparator, noDuplicates = false) {
        this._comparator = comparator || DEFAULT_COMPARE;
        this._root = null;
        this._size = 0;
        this._noDuplicates = !!noDuplicates;
      }


      /**
       * Clear the tree
       * @return {AVLTree}
       */
      destroy() {
        return this.clear();
      }


      /**
       * Clear the tree
       * @return {AVLTree}
       */
      clear() {
        this._root = null;
        this._size = 0;
        return this;
      }

      /**
       * Number of nodes
       * @return {number}
       */
      get size () {
        return this._size;
      }


      /**
       * Whether the tree contains a node with the given key
       * @param  {Key} key
       * @return {boolean} true/false
       */
      contains (key) {
        if (this._root)  {
          var node       = this._root;
          var comparator = this._comparator;
          while (node)  {
            var cmp = comparator(key, node.key);
            if      (cmp === 0) return true;
            else if (cmp < 0)   node = node.left;
            else                node = node.right;
          }
        }
        return false;
      }


      /* eslint-disable class-methods-use-this */

      /**
       * Successor node
       * @param  {Node} node
       * @return {?Node}
       */
      next (node) {
        var successor = node;
        if (successor) {
          if (successor.right) {
            successor = successor.right;
            while (successor.left) successor = successor.left;
          } else {
            successor = node.parent;
            while (successor && successor.right === node) {
              node = successor; successor = successor.parent;
            }
          }
        }
        return successor;
      }


      /**
       * Predecessor node
       * @param  {Node} node
       * @return {?Node}
       */
      prev (node) {
        var predecessor = node;
        if (predecessor) {
          if (predecessor.left) {
            predecessor = predecessor.left;
            while (predecessor.right) predecessor = predecessor.right;
          } else {
            predecessor = node.parent;
            while (predecessor && predecessor.left === node) {
              node = predecessor;
              predecessor = predecessor.parent;
            }
          }
        }
        return predecessor;
      }
      /* eslint-enable class-methods-use-this */


      /**
       * Callback for forEach
       * @callback forEachCallback
       * @param {Node} node
       * @param {number} index
       */

      /**
       * @param  {forEachCallback} callback
       * @return {AVLTree}
       */
      forEach(callback) {
        var current = this._root;
        var s = [], done = false, i = 0;

        while (!done) {
          // Reach the left most Node of the current Node
          if (current) {
            // Place pointer to a tree node on the stack
            // before traversing the node's left subtree
            s.push(current);
            current = current.left;
          } else {
            // BackTrack from the empty subtree and visit the Node
            // at the top of the stack; however, if the stack is
            // empty you are done
            if (s.length > 0) {
              current = s.pop();
              callback(current, i++);

              // We have visited the node and its left
              // subtree. Now, it's right subtree's turn
              current = current.right;
            } else done = true;
          }
        }
        return this;
      }


      /**
       * Walk key range from `low` to `high`. Stops if `fn` returns a value.
       * @param  {Key}      low
       * @param  {Key}      high
       * @param  {Function} fn
       * @param  {*?}       ctx
       * @return {SplayTree}
       */
      range(low, high, fn, ctx) {
        const Q = [];
        const compare = this._comparator;
        let node = this._root, cmp;

        while (Q.length !== 0 || node) {
          if (node) {
            Q.push(node);
            node = node.left;
          } else {
            node = Q.pop();
            cmp = compare(node.key, high);
            if (cmp > 0) {
              break;
            } else if (compare(node.key, low) >= 0) {
              if (fn.call(ctx, node)) return this; // stop if smth is returned
            }
            node = node.right;
          }
        }
        return this;
      }


      /**
       * Returns all keys in order
       * @return {Array<Key>}
       */
      keys () {
        var current = this._root;
        var s = [], r = [], done = false;

        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              r.push(current.key);
              current = current.right;
            } else done = true;
          }
        }
        return r;
      }


      /**
       * Returns `data` fields of all nodes in order.
       * @return {Array<Value>}
       */
      values () {
        var current = this._root;
        var s = [], r = [], done = false;

        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              r.push(current.data);
              current = current.right;
            } else done = true;
          }
        }
        return r;
      }


      /**
       * Returns node at given index
       * @param  {number} index
       * @return {?Node}
       */
      at (index) {
        // removed after a consideration, more misleading than useful
        // index = index % this.size;
        // if (index < 0) index = this.size - index;

        var current = this._root;
        var s = [], done = false, i = 0;

        while (!done) {
          if (current) {
            s.push(current);
            current = current.left;
          } else {
            if (s.length > 0) {
              current = s.pop();
              if (i === index) return current;
              i++;
              current = current.right;
            } else done = true;
          }
        }
        return null;
      }


      /**
       * Returns node with the minimum key
       * @return {?Node}
       */
      minNode () {
        var node = this._root;
        if (!node) return null;
        while (node.left) node = node.left;
        return node;
      }


      /**
       * Returns node with the max key
       * @return {?Node}
       */
      maxNode () {
        var node = this._root;
        if (!node) return null;
        while (node.right) node = node.right;
        return node;
      }


      /**
       * Min key
       * @return {?Key}
       */
      min () {
        var node = this._root;
        if (!node) return null;
        while (node.left) node = node.left;
        return node.key;
      }


      /**
       * Max key
       * @return {?Key}
       */
      max () {
        var node = this._root;
        if (!node) return null;
        while (node.right) node = node.right;
        return node.key;
      }


      /**
       * @return {boolean} true/false
       */
      isEmpty() {
        return !this._root;
      }


      /**
       * Removes and returns the node with smallest key
       * @return {?Node}
       */
      pop () {
        var node = this._root, returnValue = null;
        if (node) {
          while (node.left) node = node.left;
          returnValue = { key: node.key, data: node.data };
          this.remove(node.key);
        }
        return returnValue;
      }


      /**
       * Find node by key
       * @param  {Key} key
       * @return {?Node}
       */
      find (key) {
        var root = this._root;
        // if (root === null)    return null;
        // if (key === root.key) return root;

        var subtree = root, cmp;
        var compare = this._comparator;
        while (subtree) {
          cmp = compare(key, subtree.key);
          if      (cmp === 0) return subtree;
          else if (cmp < 0)   subtree = subtree.left;
          else                subtree = subtree.right;
        }

        return null;
      }


      /**
       * Insert a node into the tree
       * @param  {Key} key
       * @param  {Value} [data]
       * @return {?Node}
       */
      insert (key, data) {
        if (!this._root) {
          this._root = {
            parent: null, left: null, right: null, balanceFactor: 0,
            key, data
          };
          this._size++;
          return this._root;
        }

        var compare = this._comparator;
        var node    = this._root;
        var parent  = null;
        var cmp     = 0;

        if (this._noDuplicates) {
          while (node) {
            cmp = compare(key, node.key);
            parent = node;
            if      (cmp === 0) return null;
            else if (cmp < 0)   node = node.left;
            else                node = node.right;
          }
        } else {
          while (node) {
            cmp = compare(key, node.key);
            parent = node;
            if      (cmp <= 0)  node = node.left; //return null;
            else                node = node.right;
          }
        }

        var newNode = {
          left: null,
          right: null,
          balanceFactor: 0,
          parent, key, data
        };
        var newRoot;
        if (cmp <= 0) parent.left  = newNode;
        else         parent.right = newNode;

        while (parent) {
          cmp = compare(parent.key, key);
          if (cmp < 0) parent.balanceFactor -= 1;
          else         parent.balanceFactor += 1;

          if        (parent.balanceFactor === 0) break;
          else if   (parent.balanceFactor < -1) {
            // inlined
            //var newRoot = rightBalance(parent);
            if (parent.right.balanceFactor === 1) rotateRight(parent.right);
            newRoot = rotateLeft(parent);

            if (parent === this._root) this._root = newRoot;
            break;
          } else if (parent.balanceFactor > 1) {
            // inlined
            // var newRoot = leftBalance(parent);
            if (parent.left.balanceFactor === -1) rotateLeft(parent.left);
            newRoot = rotateRight(parent);

            if (parent === this._root) this._root = newRoot;
            break;
          }
          parent = parent.parent;
        }

        this._size++;
        return newNode;
      }


      /**
       * Removes the node from the tree. If not found, returns null.
       * @param  {Key} key
       * @return {?Node}
       */
      remove (key) {
        if (!this._root) return null;

        var node = this._root;
        var compare = this._comparator;
        var cmp = 0;

        while (node) {
          cmp = compare(key, node.key);
          if      (cmp === 0) break;
          else if (cmp < 0)   node = node.left;
          else                node = node.right;
        }
        if (!node) return null;

        var returnValue = node.key;
        var max, min;

        if (node.left) {
          max = node.left;

          while (max.left || max.right) {
            while (max.right) max = max.right;

            node.key = max.key;
            node.data = max.data;
            if (max.left) {
              node = max;
              max = max.left;
            }
          }

          node.key  = max.key;
          node.data = max.data;
          node = max;
        }

        if (node.right) {
          min = node.right;

          while (min.left || min.right) {
            while (min.left) min = min.left;

            node.key  = min.key;
            node.data = min.data;
            if (min.right) {
              node = min;
              min = min.right;
            }
          }

          node.key  = min.key;
          node.data = min.data;
          node = min;
        }

        var parent = node.parent;
        var pp     = node;
        var newRoot;

        while (parent) {
          if (parent.left === pp) parent.balanceFactor -= 1;
          else                    parent.balanceFactor += 1;

          if        (parent.balanceFactor < -1) {
            // inlined
            //var newRoot = rightBalance(parent);
            if (parent.right.balanceFactor === 1) rotateRight(parent.right);
            newRoot = rotateLeft(parent);

            if (parent === this._root) this._root = newRoot;
            parent = newRoot;
          } else if (parent.balanceFactor > 1) {
            // inlined
            // var newRoot = leftBalance(parent);
            if (parent.left.balanceFactor === -1) rotateLeft(parent.left);
            newRoot = rotateRight(parent);

            if (parent === this._root) this._root = newRoot;
            parent = newRoot;
          }

          if (parent.balanceFactor === -1 || parent.balanceFactor === 1) break;

          pp     = parent;
          parent = parent.parent;
        }

        if (node.parent) {
          if (node.parent.left === node) node.parent.left  = null;
          else                           node.parent.right = null;
        }

        if (node === this._root) this._root = null;

        this._size--;
        return returnValue;
      }


      /**
       * Bulk-load items
       * @param  {Array<Key>}  keys
       * @param  {Array<Value>}  [values]
       * @return {AVLTree}
       */
      load(keys = [], values = [], presort) {
        if (this._size !== 0) throw new Error('bulk-load: tree is not empty');
        const size = keys.length;
        if (presort) sort(keys, values, 0, size - 1, this._comparator);
        this._root = loadRecursive(null, keys, values, 0, size);
        markBalance(this._root);
        this._size = size;
        return this;
      }


      /**
       * Returns true if the tree is balanced
       * @return {boolean}
       */
      isBalanced() {
        return isBalanced(this._root);
      }


      /**
       * String representation of the tree - primitive horizontal print-out
       * @param  {Function(Node):string} [printNode]
       * @return {string}
       */
      toString (printNode) {
        return print(this._root, printNode);
      }
    }

    AVLTree.default = AVLTree;

    class AVLIndex {
        constructor (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
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
            keys = oneOrMany(keys);
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
            items = oneOrMany(items);
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

    class InMemoryStore {
        constructor(keyFn, comparer) {
            this.indexes = new Map([]);
            this.entries = new Map([]);
            this.keyFn = keyFn;
            this.comparer = comparer || defaultComparer;
        }

        get isEmpty() {
            return this.entries.size === 0;
        }

        getIndexKeys(indexName) {
            return this.indexes.get(indexName).keys;
        }

        populate(items) {
            items = oneOrMany(items);
            this.indexes.forEach(index => index.populate(items));
            const data = items.map(item => [this.keyFn(item), item]);
            this.entries = new Map(data);
        }

        rebuild(items) {
            this.entries = new Map([]);
            this.indexes.forEach(index => index.clear());
            this.populate(items);
        }

        destroy() {
            this.indexes = new Map([]);
            this.entries = new Map([]);
            this.keyFn = undefined;
        }
    	
    	get(indexName, values) {
            const data = this.indexes.has(indexName) ? 
                this.indexes.get(indexName).findMany(values) : [];
            return extract(this.entries, data);
        }

        getOne(indexName, value) {
            const data = this.indexes.has(indexName) ? 
                this.indexes.get(indexName).find(value) : [];
            return extract(this.entries, data);
        }

        // Takes array of [indexName, [exactMatch, exactMatch]]
        getFromSet(valueSet) {
            const dataSets = valueSet.map((q) => {
                return this.get(q[0], q[1]);
            });
            const data = intersect(dataSets);
            return extract(this.entries, data);
        }

        buildIndex(indexName, ixFn) {
            return this.buildBinaryIndex(indexName, ixFn, this.comparer);
        }

        buildHashIndex(indexName, ixFn) {
            const newIndex = HashIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        buildBinaryIndex(indexName, ixFn) {
            const newIndex = BinaryIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        buildRBIndex(indexName, ixFn) {
            const newIndex = RBIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        buildAVLIndex(indexName, ixFn) {
            const newIndex = AVLIndex.build(indexName, this.keyFn, ixFn, this.entries, this.comparer);
            this.indexes.set(indexName, newIndex);
            return newIndex;
        }

        remove(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.removeOne(item);
            });
        }

        removeOne(item) {
            if (this.indexes.size > 0) {
                this.indexes.forEach(index => index.remove(item));
            }
            return this.entries.delete(this.keyFn(item));
        }

        removeKey(key) {
            const item = this.entries.get(key);
            if (this.indexes.size > 0) {
                this.indexes.forEach(index => index.remove(item));
            }
            return this.entries.delete(key);
        }

        add(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.updateOne(item);
            });
        }

        addOne(item) {
            this.updateOne(item);
        }

        update(items) {
            items = oneOrMany(items);
            items.forEach(item => {
                this.updateOne(item);
            });
        }

        updateOne(item) {
            let old;
            const key = this.keyFn(item);
            if (this.entries.has(key)) {
                old = this.entries.get(key);
            }
            if (this.indexes.size > 0) {
                this.indexes.forEach(index => index.update(item, old));
            }
            this.entries.set(key, item);
        }
    }

    return InMemoryStore;

})));
//# sourceMappingURL=in-memory-store.es6.js.map
