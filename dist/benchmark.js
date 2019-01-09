/**
 * in-memory-store v1.0.5
 * JavaScript memory store for key/value with indexed lookups based on hash and binary search.
 *
 * @author Simon Lerpiniere
 * @license Apache-2.0
 * @preserve
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global['in-memory-store'] = {})));
}(this, (function (exports) { 'use strict';

    /**
    * Callback for comparer
    * @callback comparerCallback
    * @param   {Key} a
    * @param   {Key} b
    * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
    */

    /**
     * Callback for item identifier
     * @callback itemCallback
     * @param   {any} item
     * @returns {any} unique value to identify the item
     */

    /**
     * Callback for key value
     * @callback keyCallback
     * @param   {any} item
     * @returns {any} value to index this item on
     */

    /**
     * Converts a passed value into an array.  Useful if you don't know
     * if your passed parameter is an array or single value.
     * @param  {any} items single item, array or javascript Map object
     * @return {Array<any>} array of passed item(s)
     */
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

    /**
     * Returns whether or not a < b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a <= b
     */
    function lte(comparer, a, b) {
        return comparer(a, b) <= 0;
    }

    /**
     * Returns whether or not a > b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a => b
     */
    function gte(comparer, a, b) {
        return comparer(a, b) >= 0;
    }

    /**
     * Returns whether or not a < b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a < b
     */
    function lt(comparer, a, b) {
        return comparer(a, b) < 0;
    }

    /**
     * Returns whether or not a > b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a > b
     */
    function gt(comparer, a, b) {
        return comparer(a, b) > 0;
    }

    /**
     * Returns whether or not a === b
     * @param  {comparerCallback} comparer comparer to use
     * @param  {any} a 
     * @param  {any} b 
     * @return {boolean} whether or not a === b
     */
    function eq(comparer, a, b) {
        return comparer(a, b) === 0;
    }

    /**
     * Default comparer equal to as used on Array.sort
     * @param  {any} a 
     * @param  {any} b 
     * @return {number} result of comparison
     */
    function defaultComparer(a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
    }

    /**
     * Wraps any comparer with a call to .key on both a and b.
     * Useful if you comparer is a value comparer but the values
     * are objects with keys to compare.
     * @param  {comparerCallback} comparer comparer to use
     * @return {comparerCallback} comparer wrapped in .key calls
     */
    function keyWrapComparer(comparer) {
        return function(a, b) {
            return comparer(a.key, b.key);
        };
    }

    /**
     * Intersects N arrays
     * @param  {Array<Array<any>>} arrays N arrays with values to intersect
     * @return {Array<any>} array of values where that value is in all array
     */
    function intersect(arrays) {
        var ordered = (arrays.length === 1
            ? arrays : 
            arrays.sort(function (a1,a2) { return a1.length - a2.length; }));
        var shortest = ordered[0],
            set = new Set(), 
            result = [];

        for (var i=0; i < shortest.length; i++) {
            var item = shortest[i];
            var every = true; // don't use ordered.every ... it is slow
            for(var j=1;j<ordered.length;j++) {
                if(ordered[j].includes(item)) { continue; }
                every = false;
                break;
            }
            // ignore if not in every other array, or if already captured
            if(!every || set.has(item)) { continue; }
            // otherwise, add to book keeping set and the result
            set.add(item);
            result[result.length] = item;
        }
        return result;
    }

    /**
     * Extracts items passed by an array of keys from the passed map.
     * @param  {Map} map javascript map object containing all keys and values
     * @param  {Array<any>} keys keys to extract from the map
     * @return {Array<any>} array of values extracted from the passed map
     */
    function extract(map, keys) {
        var r = [];
        keys = oneOrMany(keys);
        map = map || new Map([]);
        
        keys.forEach(function (key) {
            if (map.has(key)) {
                r.push(map.get(key));
            }
        });    
        return r;
    }

    /**
     * Key value storage with support for grouping/returning items by index value
     */
    var InMemoryStore = function InMemoryStore(keyFn) {
         this.indexes = new Map([]);
         this.entries = new Map([]);
         this.keyFn = keyFn;        
     };

    var prototypeAccessors = { isEmpty: { configurable: true },size: { configurable: true } };

     /**
      * Returns whether the store is empty
      * @return {boolean}
      */
     prototypeAccessors.isEmpty.get = function () {
         return this.entries.size === 0;
     };

     /**
      * Returns the number of items in the store
      * @return {number}
      */
     prototypeAccessors.size.get = function () {
         return this.entries.size;
     };

     /**
      * Returns whether or not this store is empty
      * @abstract
      * @return {boolean}
      */
     prototypeAccessors.isEmpty.get = function () {
         return this.size === 0;
     };

     /**
      * Returns all keys wihin the specified index
      * @return {Array<Key>}
      */
     InMemoryStore.prototype.getIndexKeys = function getIndexKeys (indexName) {
         return this.indexes.get(indexName).keys;
     };

     /**
      * Populates a new store with items using bulk load methods for indexes if available
      * @param  {Array<any>} items items to populate store with
      */
     InMemoryStore.prototype.populate = function populate (items) {
            var this$1 = this;

         if (!this.isEmpty) {
             throw new Error(("Store must be empty to use populate. \n                Store currently has " + (this.size) + " items."));
         }

         items = oneOrMany(items);
         this.indexes.forEach(function (index) { return index.populate(items); });
         var data = items.map(function (item) { return [this$1.keyFn(item), item]; });
         this.entries = new Map(data);
     };

     /**
      * Clears and re-populates a new store with items using bulk 
      * load methods for indexes if available
      * @param  {Array<any>} items items to populate store with
      */
     InMemoryStore.prototype.rebuild = function rebuild (items) {
         this.entries = new Map([]);
         this.indexes.forEach(function (index) { return index.clear(); });
         this.populate(items);
     };

     /**
      * Clear the store
      * @return {InMemoryStore}
      */
     InMemoryStore.prototype.destroy = function destroy () {
         this.indexes = new Map([]);
         this.entries = new Map([]);
         this.keyFn = undefined;
     };
        
     /**
      * Whether the store contains an item with the given key
      * @param  {Key} key
      * @return {boolean} true/false
      */
     InMemoryStore.prototype.has = function has (item) {
         return this.entries.has(this.keyFn(item));
     };

     /**
      * Returns items within specified index matching passed values
      * @param  {string} indexName index to search
      * @param  {Array<any>} values specified index values
      * @return {Array<any>} values found
      */
    	InMemoryStore.prototype.get = function get (indexName, values) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).findMany(values) : [];
         return extract(this.entries, data);
     };

     /**
      * Returns items within specified index matching passed value
      * @param  {string} indexName index to search
      * @param  {any} value specified index value
      * @return {Array<any>} values found
      */
     InMemoryStore.prototype.getOne = function getOne (indexName, value) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).find(value) : [];
         return extract(this.entries, data);
     };

     // Takes array of [indexName, [exactMatch, exactMatch]]
     /**
      * Searches many indexes each with many values and intersects the results
      * @param  {Array<string, Array<any>>} valueSet [indexName, [exactMatch, exactMatch]]
      * @return {Array<any>} values found
      */
     InMemoryStore.prototype.getFromSet = function getFromSet (valueSet) {
            var this$1 = this;

         var dataSets = valueSet.map(function (q) {
             return this$1.get(q[0], q[1]);
         });
         var data = intersect(dataSets);
         return extract(this.entries, data);
     };

     /**
      * Returns all entries less than the passed value according to the
      * indexes comparer.
      * @param  {string} indexName index to search
      * @param {any} value 
      */
     InMemoryStore.prototype.lt = function lt$$1 (indexName, value) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).lt(value) : [];
         return extract(this.entries, data);
     };

     /**
      * Returns all entries less or equal to the passed value according to the
      * indexes comparer.
      * @param  {string} indexName index to search
      * @param {any} value 
      */
     InMemoryStore.prototype.lte = function lte$$1 (indexName, key) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).lte(value) : [];
         return extract(this.entries, data);
     };

     /**
      * Returns all entries greater than the passed value according to the
      * indexes comparer.
      * @param  {string} indexName index to search
      * @param {any} value 
      */
     InMemoryStore.prototype.gt = function gt$$1 (indexName, value) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).gt(value) : [];
         return extract(this.entries, data);
     };

     /**
      * Returns all entries greater than or equal to the passed value according to the
      * indexes comparer.
      * @param  {string} indexName index to search
      * @param {any} value 
      */
     InMemoryStore.prototype.gte = function gte$$1 (indexName, value) {
         var data = this.indexes.has(indexName) ? 
             this.indexes.get(indexName).gte(value) : [];
         return extract(this.entries, data);
     };

     /**
      * Adds a new index onto this store if it does not already exist. Populates index with entries
      * if index not already populated.
      * @param  {BaseIndex} index index ensure exists and is populated
      * @return {boolean} true if index was added by this operation, false if already exists.
      */
     InMemoryStore.prototype.ensureIndex = function ensureIndex (index) {
         if (!this.indexes.has(index.name)) {
             this.indexes.set(index.name, index);
             if (index.isEmpty) {
                 index.populate(this.entries);
             }
             return true;
         } else {
             return false;
         }
     };

     /**
      * Removes items from the store and any associated indexes
      * @param  {Array<any>} items items to remove
      * @return {Array<boolean>} whether each remove succeeded (false if not found)
      */
     InMemoryStore.prototype.remove = function remove (items) {
            var this$1 = this;

         items = oneOrMany(items);
         return items.map(function (item) { return this$1.removeOne(item); });
     };

     /**
      * Removes an item from the store and any associated indexes
      * @param  {any} item item to remove
      * @return {boolean} whether remove succeeded (false if not found)
      */
     InMemoryStore.prototype.removeOne = function removeOne (item) {
         if (this.indexes.size > 0) {
             this.indexes.forEach(function (index) { return index.remove(item); });
         }
         return this.entries.delete(this.keyFn(item));
     };

     /**
      * Removes an item from the store by key and any associated indexes
      * @param  {any} key key of item to remove
      * @return {boolean} whether remove succeeded (false if not found)
      */
     InMemoryStore.prototype.removeKey = function removeKey (key) {
         var item = this.entries.get(key);
         if (!item) {
             return false;
         }
         if (this.indexes.size > 0) {
             this.indexes.forEach(function (index) { return index.remove(item); });
         }
         return this.entries.delete(key);
     };

     /**
      * Adds items to the store and updated any associated indexes
      * @param  {Array<any>} items items to add
      */
     InMemoryStore.prototype.add = function add (items) {
            var this$1 = this;

         items = oneOrMany(items);
         items.map(function (item) { return this$1.updateOne(item); });
     };

     /**
      * Adds an item to the store and updated any associated indexes
      * @param  {any} item item to add
      */
     InMemoryStore.prototype.addOne = function addOne (item) {
         this.updateOne(item);
     };

     /**
      * Updates items to the store and updated any associated indexes
      * @param  {Array<any>} items items to update
      */
     InMemoryStore.prototype.update = function update (items) {
            var this$1 = this;

         items = oneOrMany(items);
         items.forEach(function (item) {
             this$1.updateOne(item);
         });
     };

     /**
      * Updates an item in the store and updated any associated indexes
      * @param  {any} item item to update
      */
     InMemoryStore.prototype.updateOne = function updateOne (item) {
         var old;
         var key = this.keyFn(item);
         if (this.entries.has(key)) {
             old = this.entries.get(key);
         }
         if (this.indexes.size > 0) {
             this.indexes.forEach(function (index) { return index.update(item, old); });
         }
         this.entries.set(key, item);
     };

    Object.defineProperties( InMemoryStore.prototype, prototypeAccessors );

    /**
     * Prints tree horizontally
     * @param  {Node}                       root
     * @param  {Function(node:Node):String} [printNode]
     * @return {String}
     */
    function print (root, printNode) {
      if ( printNode === void 0 ) printNode = function (n) { return n.key; };

      var out = [];
      row(root, '', true, function (v) { return out.push(v); }, printNode);
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
        out(("" + prefix + (isTail ? '└── ' : '├── ') + (printNode(root)) + "\n"));
        var indent = prefix + (isTail ? '    ' : '│   ');
        if (root.left)  { row(root.left,  indent, false, out, printNode); }
        if (root.right) { row(root.right, indent, true,  out, printNode); }
      }
    }


    /**
     * Is the tree balanced (none of the subtrees differ in height by more than 1)
     * @param  {Node}    root
     * @return {Boolean}
     */
    function isBalanced(root) {
      if (root === null) { return true; } // If node is empty then return true

      // Get the height of left and right sub trees
      var lh = height(root.left);
      var rh = height(root.right);

      if (Math.abs(lh - rh) <= 1 &&
          isBalanced(root.left)  &&
          isBalanced(root.right)) { return true; }

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
      var size = end - start;
      if (size > 0) {
        var middle = start + Math.floor(size / 2);
        var key    = keys[middle];
        var data   = values[middle];
        var node   = { key: key, data: data, parent: parent };
        node.left    = loadRecursive(node, keys, values, start, middle);
        node.right   = loadRecursive(node, keys, values, middle + 1, end);
        return node;
      }
      return null;
    }


    function markBalance(node) {
      if (node === null) { return 0; }
      var lh = markBalance(node.left);
      var rh = markBalance(node.right);

      node.balanceFactor = lh - rh;
      return Math.max(lh, rh) + 1;
    }


    function sort(keys, values, left, right, compare) {
      if (left >= right) { return; }

      // eslint-disable-next-line no-bitwise
      var pivot = keys[(left + right) >> 1];
      var i = left - 1;
      var j = right + 1;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        do { i++; } while (compare(keys[i], pivot) < 0);
        do { j--; } while (compare(keys[j], pivot) > 0);
        if (i >= j) { break; }

        var tmp = keys[i];
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

      if (rightNode.left) { rightNode.left.parent = node; }

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
      if (node.left) { node.left.parent = node; }

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


    var AVLTree = function AVLTree (comparator, noDuplicates) {
      if ( noDuplicates === void 0 ) noDuplicates = false;

      this._comparator = comparator || DEFAULT_COMPARE;
      this._root = null;
      this._size = 0;
      this._noDuplicates = !!noDuplicates;
    };

    var prototypeAccessors$1 = { size: { configurable: true } };


    /**
     * Clear the tree
     * @return {AVLTree}
     */
    AVLTree.prototype.destroy = function destroy () {
      return this.clear();
    };


    /**
     * Clear the tree
     * @return {AVLTree}
     */
    AVLTree.prototype.clear = function clear () {
      this._root = null;
      this._size = 0;
      return this;
    };

    /**
     * Number of nodes
     * @return {number}
     */
    prototypeAccessors$1.size.get = function () {
      return this._size;
    };


    /**
     * Whether the tree contains a node with the given key
     * @param{Key} key
     * @return {boolean} true/false
     */
    AVLTree.prototype.contains = function contains (key) {
      if (this._root){
        var node     = this._root;
        var comparator = this._comparator;
        while (node){
          var cmp = comparator(key, node.key);
          if    (cmp === 0) { return true; }
          else if (cmp < 0) { node = node.left; }
          else              { node = node.right; }
        }
      }
      return false;
    };


    /* eslint-disable class-methods-use-this */

    /**
     * Successor node
     * @param{Node} node
     * @return {?Node}
     */
    AVLTree.prototype.next = function next (node) {
      var successor = node;
      if (successor) {
        if (successor.right) {
          successor = successor.right;
          while (successor.left) { successor = successor.left; }
        } else {
          successor = node.parent;
          while (successor && successor.right === node) {
            node = successor; successor = successor.parent;
          }
        }
      }
      return successor;
    };


    /**
     * Predecessor node
     * @param{Node} node
     * @return {?Node}
     */
    AVLTree.prototype.prev = function prev (node) {
      var predecessor = node;
      if (predecessor) {
        if (predecessor.left) {
          predecessor = predecessor.left;
          while (predecessor.right) { predecessor = predecessor.right; }
        } else {
          predecessor = node.parent;
          while (predecessor && predecessor.left === node) {
            node = predecessor;
            predecessor = predecessor.parent;
          }
        }
      }
      return predecessor;
    };
    /* eslint-enable class-methods-use-this */


    /**
     * Callback for forEach
     * @callback forEachCallback
     * @param {Node} node
     * @param {number} index
     */

    /**
     * @param{forEachCallback} callback
     * @return {AVLTree}
     */
    AVLTree.prototype.forEach = function forEach (callback) {
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
          } else { done = true; }
        }
      }
      return this;
    };


    /**
     * Walk key range from `low` to `high`. Stops if `fn` returns a value.
     * @param{Key}    low
     * @param{Key}    high
     * @param{Function} fn
     * @param{*?}     ctx
     * @return {SplayTree}
     */
    AVLTree.prototype.range = function range (low, high, fn, ctx) {
      var Q = [];
      var compare = this._comparator;
      var node = this._root, cmp;

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
            if (fn.call(ctx, node)) { return this; } // stop if smth is returned
          }
          node = node.right;
        }
      }
      return this;
    };


    /**
     * Returns all keys in order
     * @return {Array<Key>}
     */
    AVLTree.prototype.keys = function keys () {
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
          } else { done = true; }
        }
      }
      return r;
    };


    /**
     * Returns `data` fields of all nodes in order.
     * @return {Array<Value>}
     */
    AVLTree.prototype.values = function values () {
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
          } else { done = true; }
        }
      }
      return r;
    };


    /**
     * Returns node at given index
     * @param{number} index
     * @return {?Node}
     */
    AVLTree.prototype.at = function at (index) {
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
            if (i === index) { return current; }
            i++;
            current = current.right;
          } else { done = true; }
        }
      }
      return null;
    };


    /**
     * Returns node with the minimum key
     * @return {?Node}
     */
    AVLTree.prototype.minNode = function minNode () {
      var node = this._root;
      if (!node) { return null; }
      while (node.left) { node = node.left; }
      return node;
    };


    /**
     * Returns node with the max key
     * @return {?Node}
     */
    AVLTree.prototype.maxNode = function maxNode () {
      var node = this._root;
      if (!node) { return null; }
      while (node.right) { node = node.right; }
      return node;
    };


    /**
     * Min key
     * @return {?Key}
     */
    AVLTree.prototype.min = function min () {
      var node = this._root;
      if (!node) { return null; }
      while (node.left) { node = node.left; }
      return node.key;
    };


    /**
     * Max key
     * @return {?Key}
     */
    AVLTree.prototype.max = function max () {
      var node = this._root;
      if (!node) { return null; }
      while (node.right) { node = node.right; }
      return node.key;
    };


    /**
     * @return {boolean} true/false
     */
    AVLTree.prototype.isEmpty = function isEmpty () {
      return !this._root;
    };


    /**
     * Removes and returns the node with smallest key
     * @return {?Node}
     */
    AVLTree.prototype.pop = function pop () {
      var node = this._root, returnValue = null;
      if (node) {
        while (node.left) { node = node.left; }
        returnValue = { key: node.key, data: node.data };
        this.remove(node.key);
      }
      return returnValue;
    };


    /**
     * Find node by key
     * @param{Key} key
     * @return {?Node}
     */
    AVLTree.prototype.find = function find (key) {
      var root = this._root;
      // if (root === null)  return null;
      // if (key === root.key) return root;

      var subtree = root, cmp;
      var compare = this._comparator;
      while (subtree) {
        cmp = compare(key, subtree.key);
        if    (cmp === 0) { return subtree; }
        else if (cmp < 0) { subtree = subtree.left; }
        else              { subtree = subtree.right; }
      }

      return null;
    };


    /**
     * Insert a node into the tree
     * @param{Key} key
     * @param{Value} [data]
     * @return {?Node}
     */
    AVLTree.prototype.insert = function insert (key, data) {
      if (!this._root) {
        this._root = {
          parent: null, left: null, right: null, balanceFactor: 0,
          key: key, data: data
        };
        this._size++;
        return this._root;
      }

      var compare = this._comparator;
      var node  = this._root;
      var parent= null;
      var cmp   = 0;

      if (this._noDuplicates) {
        while (node) {
          cmp = compare(key, node.key);
          parent = node;
          if    (cmp === 0) { return null; }
          else if (cmp < 0) { node = node.left; }
          else              { node = node.right; }
        }
      } else {
        while (node) {
          cmp = compare(key, node.key);
          parent = node;
          if    (cmp <= 0){ node = node.left; } //return null;
          else              { node = node.right; }
        }
      }

      var newNode = {
        left: null,
        right: null,
        balanceFactor: 0,
        parent: parent, key: key, data: data
      };
      var newRoot;
      if (cmp <= 0) { parent.left= newNode; }
      else       { parent.right = newNode; }

      while (parent) {
        cmp = compare(parent.key, key);
        if (cmp < 0) { parent.balanceFactor -= 1; }
        else       { parent.balanceFactor += 1; }

        if      (parent.balanceFactor === 0) { break; }
        else if (parent.balanceFactor < -1) {
          // inlined
          //var newRoot = rightBalance(parent);
          if (parent.right.balanceFactor === 1) { rotateRight(parent.right); }
          newRoot = rotateLeft(parent);

          if (parent === this._root) { this._root = newRoot; }
          break;
        } else if (parent.balanceFactor > 1) {
          // inlined
          // var newRoot = leftBalance(parent);
          if (parent.left.balanceFactor === -1) { rotateLeft(parent.left); }
          newRoot = rotateRight(parent);

          if (parent === this._root) { this._root = newRoot; }
          break;
        }
        parent = parent.parent;
      }

      this._size++;
      return newNode;
    };


    /**
     * Removes the node from the tree. If not found, returns null.
     * @param{Key} key
     * @return {?Node}
     */
    AVLTree.prototype.remove = function remove (key) {
      if (!this._root) { return null; }

      var node = this._root;
      var compare = this._comparator;
      var cmp = 0;

      while (node) {
        cmp = compare(key, node.key);
        if    (cmp === 0) { break; }
        else if (cmp < 0) { node = node.left; }
        else              { node = node.right; }
      }
      if (!node) { return null; }

      var returnValue = node.key;
      var max, min;

      if (node.left) {
        max = node.left;

        while (max.left || max.right) {
          while (max.right) { max = max.right; }

          node.key = max.key;
          node.data = max.data;
          if (max.left) {
            node = max;
            max = max.left;
          }
        }

        node.key= max.key;
        node.data = max.data;
        node = max;
      }

      if (node.right) {
        min = node.right;

        while (min.left || min.right) {
          while (min.left) { min = min.left; }

          node.key= min.key;
          node.data = min.data;
          if (min.right) {
            node = min;
            min = min.right;
          }
        }

        node.key= min.key;
        node.data = min.data;
        node = min;
      }

      var parent = node.parent;
      var pp   = node;
      var newRoot;

      while (parent) {
        if (parent.left === pp) { parent.balanceFactor -= 1; }
        else                  { parent.balanceFactor += 1; }

        if      (parent.balanceFactor < -1) {
          // inlined
          //var newRoot = rightBalance(parent);
          if (parent.right.balanceFactor === 1) { rotateRight(parent.right); }
          newRoot = rotateLeft(parent);

          if (parent === this._root) { this._root = newRoot; }
          parent = newRoot;
        } else if (parent.balanceFactor > 1) {
          // inlined
          // var newRoot = leftBalance(parent);
          if (parent.left.balanceFactor === -1) { rotateLeft(parent.left); }
          newRoot = rotateRight(parent);

          if (parent === this._root) { this._root = newRoot; }
          parent = newRoot;
        }

        if (parent.balanceFactor === -1 || parent.balanceFactor === 1) { break; }

        pp   = parent;
        parent = parent.parent;
      }

      if (node.parent) {
        if (node.parent.left === node) { node.parent.left= null; }
        else                         { node.parent.right = null; }
      }

      if (node === this._root) { this._root = null; }

      this._size--;
      return returnValue;
    };


    /**
     * Bulk-load items
     * @param{Array<Key>}keys
     * @param{Array<Value>}[values]
     * @return {AVLTree}
     */
    AVLTree.prototype.load = function load (keys, values, presort) {
        if ( keys === void 0 ) keys = [];
        if ( values === void 0 ) values = [];

      if (this._size !== 0) { throw new Error('bulk-load: tree is not empty'); }
      var size = keys.length;
      if (presort) { sort(keys, values, 0, size - 1, this._comparator); }
      this._root = loadRecursive(null, keys, values, 0, size);
      markBalance(this._root);
      this._size = size;
      return this;
    };


    /**
     * Returns true if the tree is balanced
     * @return {boolean}
     */
    AVLTree.prototype.isBalanced = function isBalanced$1 () {
      return isBalanced(this._root);
    };


    /**
     * String representation of the tree - primitive horizontal print-out
     * @param{Function(Node):string} [printNode]
     * @return {string}
     */
    AVLTree.prototype.toString = function toString (printNode) {
      return print(this._root, printNode);
    };

    Object.defineProperties( AVLTree.prototype, prototypeAccessors$1 );

    AVLTree.default = AVLTree;

    /**
     * Base index for use with in-memory-store
     */
    var BaseIndex = function BaseIndex (name, itemFn, keyFn) {
        if (this.constructor === BaseIndex) {
            throw new TypeError("Cannot construct BaseIndex directly");
        }

        this.name = name;
        this.itemFn = itemFn;
        this.keyFn = keyFn;
    };

    var prototypeAccessors$2 = { isEmpty: { configurable: true },keys: { configurable: true } };

    /**
     * Returns whether or not this index is empty
     * @abstract
     * @return {boolean}
     */
    prototypeAccessors$2.isEmpty.get = function () {
        throw new TypeError("Must implement isEmpty property");
    };

    /**
     * Returns all keys
     * @abstract
     * @return {Array<Key>}
     */
    prototypeAccessors$2.keys.get = function () {
        throw new TypeError("Must implement keys property");
    };    

    /**
     * Removes all items from the index
     * @abstract
     */
    BaseIndex.prototype.clear = function clear () {
        throw new TypeError("Must implement clear method");
    };

    /**
     * Returns items within matching passed index keys
     * @param  {Array<any>} keys specified index keys
     * @return {Array<any>} values found
     */
    BaseIndex.prototype.findMany = function findMany (keys) {
            var this$1 = this;

        keys = oneOrMany(keys);
        var data = keys.map(function (m) { return this$1.find(m); });
        return [].concat.apply([], data);
    };

    /**
     * Returns items matching passed index key
     * @abstract
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
    BaseIndex.prototype.find = function find (key) {
        throw new TypeError("Must implement find method");
    };

    /**
     * Removes an item
     * @abstract
     * @param  {any} item item to remove
     */
    BaseIndex.prototype.remove = function remove (item) {
        throw new TypeError("Must implement build method");
    };

    /**
     * Populates this index with new items and indexes as per itemFn and keyFn defined on index creation
     * @param  {Array<any>} items items to populate store with
     */
    BaseIndex.prototype.populate = function populate (items) {
            var this$1 = this;

        if (!this.isEmpty) {
            throw new Error(((typeof this) + " index must be empty in order to use populate"));
        }

        items = oneOrMany(items);
        items.forEach(function (item) { return this$1.insert(item); });
    };

    /**
     * Adds an item with indexes as per itemFn and keyFn defined on index creation
     * @abstract
     * @param  {any} item item to add to index
     */
    BaseIndex.prototype.insert = function insert (item) {
        throw new TypeError("Must implement insert method");
    };

    /**
     * Updates an item by removing any associated index entry based on oldItem and adding new index
     * entries based on the new item.  Important to pass oldItem otherwise index may contain entries from
     * item in wrong indexed key.
     * @param  {any} oldItem item as it was prior to being updated
     * @param  {any} item item as it is now
     */
    BaseIndex.prototype.update = function update (item, olditem) {
        this.remove(olditem);
        this.insert(item);
    };

    Object.defineProperties( BaseIndex.prototype, prototypeAccessors$2 );

    /**
     * Index based on AVL Tree object for key/value storage. Groups items by index value, 
     * stores items within index value as array using linear search.
     * @extends {BaseIndex}
     */
    var AVLIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function AVLIndex (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new AVLTree(comparer);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) AVLIndex.__proto__ = BaseIndex$$1;
        AVLIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        AVLIndex.prototype.constructor = AVLIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.size === 0;
        };

        /**
         * Returns all keys
         * @return {Array<Key>}
         */
        prototypeAccessors.keys.get = function () {
            return this.index.keys();
        };

        /**
         * Removes all items from the index
         */
        AVLIndex.prototype.clear = function clear () {
            this.index.clear();
        };

        /**
         * Returns all entries less than the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.lt = function lt$$1 (key) {
            var lastKey;
            var data = [];
            this.index.range(this.index.min, key, function (n) {
                lastKey = n.key;
                data.push(n.data);
            });
            if (data.length === 0) {
                return [];
            }
            // Since Tree is unique, we only need to check last key to omit
            if (eq(this.comparer, lastKey, key)) {
                data.pop();
            }
            return data;
        };

        /**
         * Returns all entries less or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.lte = function lte$$1 (key) {
            var data = [];
            this.index.range(this.index.min, key, function (n) {
                data.push(n.data);
            });
            return data;
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.gt = function gt$$1 (key) {
            var firstKey;
            var data = [];
            this.index.range(key, this.index.max, function (n) {
                if (firstKey === undefined) {
                    firstKey = n.key;
                }
                data.push(n.data);
            });
            if (data.length === 0) {
                return [];
            }
            // Since Tree is unique, we only need to check first key to omit
            if (eq(this.comparer, firstKey, key)) {
                data.shift();
            }
            return data;
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        AVLIndex.prototype.gte = function gte$$1 (key) {
            var data = [];
            this.index.range(key, this.index.max, function (n) {
                data.push(n.data);
            });
            return data;
        };

        /**
         * Returns items matching passed index key
         * @param  {any} key specified index key
         * @return {Array<any>} values found
         */
        AVLIndex.prototype.find = function find (key) {
            var found = this.index.find(key);
            if (found) {
                return found.data;
            } else {
                return [];
            }
        };

        /**
         * Removes an item
         * @param  {any} item item to remove
         */
        AVLIndex.prototype.remove = function remove (item) {
            var key = this.keyFn(item);
            var entry = this.index.find(key);

            if (entry) {
                var it = this.itemFn(item);
                var arr = entry.data;
                var i = arr.indexOf(it);
                if (i > -1) {
                    arr.splice(i, 1);
                }
                if (arr.length === 0) {
                    this.index.remove(key);
                }
            }
        };
        
        /**
         * Adds an item with indexes as per itemFn and keyFn defined on index creation
         * @param  {any} item item to add to index
         */
        AVLIndex.prototype.insert = function insert (item) {
            var key = this.keyFn(item);
            var it = this.itemFn(item);
            var entry = this.index.find(key);
            
            if (entry) {
                entry.data.push(it);
            } else {
                this.index.insert(key, [it]);
            }
        };

        Object.defineProperties( AVLIndex.prototype, prototypeAccessors );

        return AVLIndex;
    }(BaseIndex));

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

    // Not intended for production use.

    var RBIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function RBIndex (name, itemFn, keyFn, comparer) {
            this.comparer = keyWrapComparer(comparer || defaultComparer);
            this.index = new bintrees_1(this.comparer);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) RBIndex.__proto__ = BaseIndex$$1;
        RBIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        RBIndex.prototype.constructor = RBIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.size === 0;
        };
        
        prototypeAccessors.keys.get = function () {
            var arr = [];
            this.index.each(function (f) { return arr.push(f.key); });
            return arr;
        };

        RBIndex.prototype.clear = function clear () {
            this.index.clear();
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

        Object.defineProperties( RBIndex.prototype, prototypeAccessors );

        return RBIndex;
    }(BaseIndex));

    /**
     * Index based on javascript Map object for key/value storage. Groups items by index value, 
     * stores items within index value as array using linear search.
     * @extends {BaseIndex}
     */
    var HashIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function HashIndex (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new Map([]);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) HashIndex.__proto__ = BaseIndex$$1;
        HashIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        HashIndex.prototype.constructor = HashIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.size === 0;
        };

        /**
         * Returns all keys
         * @return {Array<Key>}
         */
        prototypeAccessors.keys.get = function () {
            return Array.from(this.index.keys());
        };

        /**
         * Returns all entries less than the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        HashIndex.prototype.lt = function lt$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return lt(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Returns all entries less or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        HashIndex.prototype.lte = function lte$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return lte(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Returns all entries greater than the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        HashIndex.prototype.gt = function gt$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return gt(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        HashIndex.prototype.gte = function gte$$1 (key) {
            var this$1 = this;

            var keys = this.keys.filter(function (k) {
                return gte(this$1.comparer, k, key);
            });
            return this.findMany(keys);
        };

        /**
         * Removes all items from the index
         */
        HashIndex.prototype.clear = function clear () {
            this.index = new Map([]);
        };

        /**
         * Returns items matching passed index key
         * @param  {any} key specified index key
         * @return {Array<any>} values found
         */
        HashIndex.prototype.find = function find (key) {
            return this.index.get(key);
        };

        /**
         * Removes an item
         * @param  {any} item item to remove
         */
        HashIndex.prototype.remove = function remove (item) {
            var key = this.keyFn(item);
            if (this.index.has(key)) {
                var col = this.index.get(key);
                var it = this.itemFn(item);
                var i = col.indexOf(it);
                if (i > -1) {
                    col.splice(i, 1);
                }
                if (col.length === 0) {
                    this.index.delete(key);
                }
            }
        };

        /**
         * Adds an item with indexes as per itemFn and keyFn defined on index creation
         * @param  {any} item item to add to index
         */
        HashIndex.prototype.insert = function insert (item) {
            var key = this.keyFn(item);
            var it = this.itemFn(item);
            if (it && key) {
                if (this.index.has(key)) {
                    this.index.get(key).push(it);
                } else {
                    this.index.set(key, [it]);
                }
            }
        };

        Object.defineProperties( HashIndex.prototype, prototypeAccessors );

        return HashIndex;
    }(BaseIndex));

    /**
     * Binary key/value storage backed by native javascript array. Performs binary search on entries and
     * keeps items in sorted order based on comparer.
     */
    var BinaryArray = function BinaryArray (comparer) {
        this.arr = [];
        this.comparer = comparer || defaultComparer;
    };

    var prototypeAccessors$3 = { keys: { configurable: true },length: { configurable: true } };
        
    /**
     * Removes all items from the index
     */
    BinaryArray.prototype.clear = function clear () {
        this.arr = [];
    };

    /**
     * Returns an array of keys store in this Key Value array
     * @returns {Array<any>} all keys
     */
    prototypeAccessors$3.keys.get = function () {
        return this.arr.map(function (m) { return m.key; });
    };

    /**
     * Returns the number of items in this BinaryArray
     * @returns {number}
     */
    prototypeAccessors$3.length.get = function () {
        return this.arr.length;
    };

    /**
     * Returns all entries less than the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.lt = function lt$$1 (key) {
        var i = this.insertPos(key);
        var data = this.arr.slice(0, i);
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns all entries less or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.lte = function lte$$1 (key) {
        var i = this.insertPos(key);
        var data = i >= 0 ? this.arr.slice(0, i + 1) : [];
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns all entries greater than the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.gt = function gt$$1 (key) {
        var i = this.insertPos(key);
        var data = i < this.arr.length ? this.arr.slice(i + 1, this.arr.length) : [];
        return data;
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns all entries greater than or equal to the passed key according to the
     * indexes comparer.
     * @param {any} key 
     */
    BinaryArray.prototype.gte = function gte$$1 (key) {
        var i = this.insertPos(key);
        var data = i < this.arr.length ? this.arr.slice(i, this.arr.length) : [];
        return data.map(function (d) { return d.value; });
    };

    /**
     * Returns the index in this array of the specified key
     * @param {any} key 
     * @returns {number}
     */
    BinaryArray.prototype.indexOf = function indexOf (key) {
        var i = this.insertPos(key);
        if (this.arr[i] && eq(this.comparer, this.arr[i].key, key)) {
            return i;
        } else {
            return -1;
        }
    };

    /**
     * The insert position where to insert an item into the underlying sorted array.     
     * @param {any} key key to find in the array
     * @returns {number} position at which a new item should be inserted into this array
     */
    BinaryArray.prototype.insertPos = function insertPos (key) {
        var low = 0, high = this.arr.length, mid;
        while (low < high) {
            // faster version of Math.floor((low + high) / 2)
            mid = (low + high) >>> 1; 
            lt(this.comparer, this.arr[mid].key, key) ? low = mid + 1 : high = mid;
        }
        return low;
    };

    /**
     * Returns items matching passed index key
     * @param  {any} key specified index key
     * @return {Array<any>} values found
     */
    BinaryArray.prototype.get = function get (key) {
        var i = this.indexOf(key);
        if (i > -1) {
            return this.arr[i].value;
        }
    };

    /**
     * Removes an item by key
     * @param  {any} key key of item to remove
     */
    BinaryArray.prototype.remove = function remove (key) {
        var i = this.indexOf(key);
        if (i > -1) {
            this.removeAt(i);
        }
    };

    /**
     * Adds an key/value with array
     * @param  {any} key key to add
     * @param  {any} value item related to the specified key
     */
    BinaryArray.prototype.add = function add (key, value) {
        var ix = this.insertPos(key);
        this.addAt(ix, key, value);
    };

    /**
     * Adds a key/value entry at a specified position in the array.
     * Will not replace any existing item in that postion, instead
     * inserting before it.
     * @param {number} pos index of where to add this entry
     * @param {any} key key to add
     * @param {any} value item related to the specified key
     */
    BinaryArray.prototype.addAt = function addAt (pos, key, value) {
        var item = { key: key, value: value };
        this.arr.splice(pos, 0, item);
    };

    /**
     * Removes a key/value entry at a specified position
     * @param {number} pos index of the item to remove.
     */
    BinaryArray.prototype.removeAt = function removeAt (pos) {
        this.arr.splice(pos, 1);
    };

    /**
     * Returns key matching passed index position
     * @param  {number} pos index of where to add this entry
     * @return {any} key found at this position
     */
    BinaryArray.prototype.getAt = function getAt (pos) {
        return this.arr[pos];
    };

    Object.defineProperties( BinaryArray.prototype, prototypeAccessors$3 );

    /**
     * Index based on BinaryArray for key/value storage. Groups items by index value, 
     * stores items within index value as array using linear search.
     * @extends {BaseIndex}
     */
    var BinaryIndex = /*@__PURE__*/(function (BaseIndex$$1) {
        function BinaryIndex (name, itemFn, keyFn, comparer) {
            this.comparer = comparer || defaultComparer;
            this.index = new BinaryArray(this.comparer);
            BaseIndex$$1.call(this, name, itemFn, keyFn);
        }

        if ( BaseIndex$$1 ) BinaryIndex.__proto__ = BaseIndex$$1;
        BinaryIndex.prototype = Object.create( BaseIndex$$1 && BaseIndex$$1.prototype );
        BinaryIndex.prototype.constructor = BinaryIndex;

        var prototypeAccessors = { isEmpty: { configurable: true },keys: { configurable: true } };

        /**
         * Returns whether or not this index is empty
         * @abstract
         * @return {boolean}
         */
        prototypeAccessors.isEmpty.get = function () {
            return this.index.length === 0;
        };

        /**
         * Returns all keys
         * @return {Array<Key>}
         */
        prototypeAccessors.keys.get = function () {
            return this.index.keys;
        };

        /**
         * Removes all items from the index
         */
        BinaryIndex.prototype.clear = function clear () {
            this.index = new BinaryArray(this.comparer);
        };

        /**
         * Returns all entries less than the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        BinaryIndex.prototype.lt = function lt$$1 (key) {
            return this.index.lt(key);
        };

        /**
         * Returns all entries less or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        BinaryIndex.prototype.lte = function lte$$1 (key) {
            return this.index.lte(key);
        };

        /**
         * Returns all entries greater than the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        BinaryIndex.prototype.gt = function gt$$1 (key) {
            return this.index.gt(key);
        };

        /**
         * Returns all entries greater than or equal to the passed key according to the
         * indexes comparer.
         * @param {any} key 
         */
        BinaryIndex.prototype.gte = function gte$$1 (key) {
            return this.index.gte(key);
        };

        /**
         * Returns items matching passed index key
         * @param  {any} key specified index key
         * @return {Array<any>} values found
         */
        BinaryIndex.prototype.find = function find (key) {
            return this.index.get(key);
        };

        /**
         * Removes an item
         * @param  {any} item item to remove
         */
        BinaryIndex.prototype.remove = function remove (item) {
            var key = this.keyFn(item);
            var pos = this.index.indexOf(key);
            
            if (pos > -1) {
                var entry = this.index.getAt(pos);
                var it = this.itemFn(item);
                var i = entry.value.indexOf(it);
                if (i > -1) {
                    entry.value.splice(i, 1);
                }
                if (entry.value.length === 0) {
                    this.index.removeAt(pos);
                }
            }
        };
        
        /**
         * Adds an item with indexes as per itemFn and keyFn defined on index creation
         * @param  {any} item item to add to index
         */
        BinaryIndex.prototype.insert = function insert (item) {
            var key = this.keyFn(item);
            var it = this.itemFn(item);
            var pos = this.index.insertPos(key);
            var entry = this.index.getAt(pos);
            
            if (entry && eq(this.comparer, entry.key, key)) {
                entry.value.push(it);
            } else {
                this.index.addAt(pos, key, [it]); 
            }
        };

        Object.defineProperties( BinaryIndex.prototype, prototypeAccessors );

        return BinaryIndex;
    }(BaseIndex));

    // Exports all modules needed for our benchmark test

    exports.InMemoryStore = InMemoryStore;
    exports.AVLIndex = AVLIndex;
    exports.RBIndex = RBIndex;
    exports.HashIndex = HashIndex;
    exports.BinaryIndex = BinaryIndex;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=benchmark.js.map
