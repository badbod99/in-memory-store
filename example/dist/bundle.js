(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var _inMemoryStore = _interopRequireDefault(require("./src/in-memory-store"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var store = new _inMemoryStore.default(function (item) {
  return item.id;
});
var racers = [{
  id: '1',
  name: 'Simon Lerpiniere',
  category: '2nd'
}, {
  id: '2',
  name: 'Matt Dudman',
  category: '1st'
}];
store.populate(racers);
var ul = document.getElementById('racer-list');
ul.innerHTML = '';

},{"./src/in-memory-store":2}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _hashindex = _interopRequireDefault(require("./indexes/hashindex"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var InMemoryStore =
/*#__PURE__*/
function () {
  function InMemoryStore(keyFn, items) {
    _classCallCheck(this, InMemoryStore);

    this.indexes = new Map([]);
    this.items = new Map([]);
    this.keyFn = keyFn;
    this.populate(items);
  }

  _createClass(InMemoryStore, [{
    key: "populate",
    value: function populate(items) {
      var _this = this;

      items = items || [];
      this.indexes.forEach(function (index) {
        return index.populate(items);
      });
      var data = items.map(function (item) {
        return [_this.keyFn(item), item];
      });
      this.items = new Map(data);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.indexes = new Map([]);
      this.items = new Map([]);
    }
  }, {
    key: "rebuild",
    value: function rebuild(items) {
      this.destroy();
      this.populate(items);
    }
  }, {
    key: "get",
    value: function get(key) {
      return this.items.get(key);
    }
  }, {
    key: "get",
    value: function get(indexName, values) {
      var data = this.indexes.has(indexName) ? this.indexes.get(indexName).get(values) : [];
      return this.extract(this.items, data);
    } // Takes array of [indexName, [exactMatch, exactMatch]]

  }, {
    key: "getFromSet",
    value: function getFromSet(valueSet) {
      var _this2 = this;

      var dataSets = valueSet.map(function (q) {
        return _this2.getMany(q[0], q[1]);
      });
      var data = this.intersect(dataSets);
      return this.extract(this.items, data);
    }
  }, {
    key: "buildIndex",
    value: function buildIndex(indexName, valueGetter) {
      var newIndex = _hashindex.default.build(indexName, this.keyFn, valueGetter, this.items);

      this.indexes.set(indexName, newIndex);
    }
  }, {
    key: "remove",
    value: function remove(item) {
      this.indexes.forEach(function (index) {
        return index.remove(item);
      });
      return this.items.delete(this.keyFn(item));
    }
  }, {
    key: "removeKey",
    value: function removeKey(key) {
      var item = this.items.get(item);
      this.remove(item);
    }
  }, {
    key: "add",
    value: function add(item) {
      this.update(item);
      return this.items.set(this.keyFn(item), item);
    }
  }, {
    key: "update",
    value: function update(item) {
      var old;
      var key = this.keyFn(item);

      if (this.items.has(key)) {
        old = this.items.get(key);
      }

      this.indexes.forEach(function (index) {
        return index.update(item, old);
      });
      return this.items.set(key, item);
    }
  }, {
    key: "updateMany",
    value: function updateMany(items) {
      items.forEach(function (item) {
        return update(item);
      });
    } // -------------------------------
    // Helper JS functions for map/array
    // -------------------------------

  }, {
    key: "intersect",
    value: function intersect(arrays) {
      var ordered = arrays.length === 1 ? arrays : arrays.sort(function (a1, a2) {
        return a1.length - a2.length;
      });
      var shortest = ordered[0],
          set = new Set(),
          result = [];

      for (var i = 0; i < shortest.length; i++) {
        var item = shortest[i];
        var every = true; // don't use ordered.every ... it is slow

        for (var j = 1; j < ordered.length; j++) {
          if (ordered[j].includes(item)) continue;
          every = false;
          break;
        } // ignore if not in every other array, or if already captured


        if (!every || set.has(item)) continue; // otherwise, add to bookeeping set and the result

        set.add(item);
        result[result.length] = item;
      }

      return result;
    }
  }, {
    key: "extract",
    value: function extract(map, keys) {
      var r = [];
      keys.forEach(function (key) {
        if (map.has(key)) {
          r.push(map.get(key));
        }
      });
      return r;
    }
  }, {
    key: "isEmpty",
    get: function get() {
      return this.items.size === 0;
    }
  }]);

  return InMemoryStore;
}();

var _default = InMemoryStore;
exports.default = _default;

},{"./indexes/hashindex":3}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var HashIndex =
/*#__PURE__*/
function () {
  function HashIndex(name, keyGetter, valueGetter, items) {
    _classCallCheck(this, HashIndex);

    this.index = new Map([]);
    this.name = name;
    this.keyFn = keyGetter;
    this.valFn = valueGetter;

    if (items) {
      this.populate(items);
    }
  }

  _createClass(HashIndex, [{
    key: "populate",
    value: function populate(items) {
      var _this = this;

      items.forEach(function (item) {
        var val = _this.valFn(item);

        var col = _this.index.get(val);

        var key = _this.keyFn(item);

        if (!col) {
          _this.index.set(val, [key]);
        } else {
          col.push(key);
        }
      });
    }
  }, {
    key: "get",
    value: function get(values) {
      var _this2 = this;

      if (Array.isArray(values)) {
        var data = values.map(function (m) {
          return _this2.index.get(m);
        });
        return [].concat.apply([], data);
      }

      return this.index.get(values);
    }
  }, {
    key: "remove",
    value: function remove(item) {
      if (item) {
        var val = this.valFn(item);
        var key = this.keyFn(item);

        if (this.index.has(val)) {
          var col = this.index.get(val);
          var i = col.indexOf(key);

          if (i > -1) {
            col.splice(i, 1);
          }

          if (col.length === 0) {
            this.index.delete(val);
          }
        }
      }
    }
  }, {
    key: "add",
    value: function add(item) {
      var value = this.valFn(item);
      var key = this.keyFn(item);

      if (key && value) {
        if (this.index.has(value)) {
          this.index.get(value).push(key);
        } else {
          this.index.set(value, [key]);
        }
      }
    }
  }, {
    key: "update",
    value: function update(item, olditem) {
      this.remove(olditem);
      this.add(item);
    }
  }], [{
    key: "build",
    value: function build(name, keyGetter, valueGetter, items) {
      return new HashIndex(name, keyGetter, valueGetter, items);
    }
  }]);

  return HashIndex;
}();

var _default = HashIndex;
exports.default = _default;

},{}]},{},[1]);
