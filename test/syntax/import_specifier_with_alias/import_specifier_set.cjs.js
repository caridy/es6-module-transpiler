// Rewriting named imports works correctly (including aliases)

if (typeof __es6_module_registry__ === "undefined") {
  __es6_module_registry__ = {};
}

var __es6_module__ = {
  "__es6_transpiled__": true
}

__es6_module_registry__["import_specifier_set"] = module.exports = __es6_module__;
var __imports_0__ = __es6_module_registry__["ember"] || require("ember");
var __imports_1__ = __es6_module_registry__["rsvp"] || require("rsvp");

// rewrite
console.log(__imports_0__.get, __imports_0__.set);

// don't rewrite
console.log(defer);

//rewrite
console.log(__imports_1__.defer);
