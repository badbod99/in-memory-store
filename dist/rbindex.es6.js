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

    function defaultComparer(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
    }

    function keyWrapComparer(comparer) {
        return function(a, b) {
            return comparer(a.key, b.key);
        };
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

    var RBIndex = function RBIndex (name, itemFn, keyFn, comparer) {
        this.comparer = keyWrapComparer(comparer || defaultComparer);
        this.index = new bintrees_1(this.comparer);
        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    };

    var prototypeAccessors = { keys: { configurable: true } };
        
    RBIndex.build = function build (name, itemFn, keyFn, items, comparer) {
        var bin = new RBIndex(name, itemFn, keyFn, comparer);
        bin.populate(items);
        return bin;
    };

    prototypeAccessors.keys.get = function () {
        var arr = [];
        this.index.each(function (f) { return arr.push(f.key); });
        return arr;
    };

    RBIndex.prototype.clear = function clear () {
        this.index.clear();
    };

    RBIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.find(m); });
        return [].concat.apply([], data);
    };

    RBIndex.prototype.find = function find (key) {
        var found = this.index.find({ key: key });
        if (found) {
            return found.value;
        } else {
            return [];
        }
    };

    RBIndex.prototype.remove = function remove (item) {
        var key = this.keyFn(item);
        var entry = this.index.find({ key: key });

        if (entry) {
            var it = this.itemFn(item);
            var arr = entry.value;
            var i = arr.indexOf(it);
            if (i > -1) {
                arr.splice(i, 1);
            }
            if (entry.value.length === 0) {
                this.index.remove({ key: key });
            }
        }
    };

    RBIndex.prototype.populate = function populate (items) {
            var this$1 = this;

        items = oneOrMany(items);
        items.forEach(function (item) { return this$1.insert(item); });
    };
        
    RBIndex.prototype.insert = function insert (item) {
        var key = this.keyFn(item);
        var it = this.itemFn(item);
        var entry = this.index.find({ key: key });
            
        if (entry) {
            entry.value.push(it);
        } else {
            this.index.insert({key: key, value: [it]});
        }
    };

    RBIndex.prototype.update = function update (item, olditem) {
        this.remove(olditem);
        this.insert(item);
    };

    Object.defineProperties( RBIndex.prototype, prototypeAccessors );

    return RBIndex;

})));
//# sourceMappingURL=rbindex.es6.js.map
