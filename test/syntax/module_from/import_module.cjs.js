// Module imports are correctly handled

if (typeof __es6_module_registry__ === "undefined") {
  __es6_module_registry__ = {};
}

var __es6_module__ = {
  "__es6_transpiled__": true
}

__es6_module_registry__["import_module"] = module.exports = __es6_module__;
var __imports_0__ = __es6_module_registry__["foo"] || require("foo");
var __imports_1__ = __es6_module_registry__["app/foo/bar"] || require("./foo/bar");
console.log(__imports_0__, __imports_1__);
