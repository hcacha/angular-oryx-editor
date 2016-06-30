var arrayProto = Array.prototype,
    _each = arrayProto.forEach;

if (!arrayProto.uniq) {
    arrayProto.uniq = function() {
        return this.reduce(function(accum, current) {
            if (accum.indexOf(current) < 0) {
                accum.push(current);
            }
            return accum;
        }, []);
    };
}
if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

function clone() {
    return arrayProto.slice.call(this, 0);
}

Object.extend(arrayProto, Enumerable);

if (arrayProto.entries === Enumerable.entries) {
    delete arrayProto.entries;
}
if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

if (!arrayProto.clone)
    arrayProto.clone = clone;

Object.extend(arrayProto, {
    _each: _each
});