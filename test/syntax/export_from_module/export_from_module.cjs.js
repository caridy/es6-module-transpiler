// Reexports from a module work

if (typeof __es6_module_registry__ === "undefined") {
  __es6_module_registry__ = {};
}

var __es6_module__ = {
  "__es6_transpiled__": true
}

__es6_module_registry__["export_from_module"] = module.exports = __es6_module__;
var __imports_0__ = __es6_module_registry__["path"] || require("path");
__es6_module__.join = __imports_0__.join;
__es6_module__.extname = __imports_0__.extname;
