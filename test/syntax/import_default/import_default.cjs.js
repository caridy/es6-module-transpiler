// A default import is correctly rewritten

if (typeof __es6_module_registry__ === "undefined") {
  __es6_module_registry__ = {};
}

var __es6_module__ = {
  "__es6_transpiled__": true
}

__es6_module_registry__["import_default"] = module.exports = __es6_module__;
var __imports_0__ = __es6_module_registry__["rsvp"] || require("rsvp");
console.log(__imports_0__["default"] || __imports_0__);
