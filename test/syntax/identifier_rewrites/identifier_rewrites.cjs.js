// Imports are correctly rewritten based on scope

if (typeof __es6_module_registry__ === "undefined") {
  __es6_module_registry__ = {};
}

var __es6_module__ = {
  "__es6_transpiled__": true
}

__es6_module_registry__["scope_check"] = module.exports = __es6_module__;
var __imports_0__ = __es6_module_registry__["app/b"] || require("./b");

__es6_module__["default"] = function even(n) {
  // below should be rewritten...
  return n === 0 || (__imports_0__["default"] || __imports_0__)(n - 1);
};

// below should not
function foo(odd) {
  odd = 1;
}

// nor should this
function bar() {
  var odd;
  console.log(odd);
}

// nor should this
var foo = { odd: 1 };

// nor should this
var foo;

foo.odd = 'very';

// but this should!
console.log(__imports_0__["default"] || __imports_0__);
