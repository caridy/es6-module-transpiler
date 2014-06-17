/* jshint node:true, undef:true, unused:true */

var Module = require('../module');

/**
 * Provides "mock" Module object for external modules which should be ignored.
 *
 * @constructor
 */
function ExternalResolver(externalModules) {
  // When `externalModules` is specificed, restrict to modules named in list.
  if (Array.isArray(externalModules) && externalModules.length) {
      this.externalModules = externalModules;
  }
}

/**
 * Resolves `importedPath` imported by the given module `fromModule` to a
 * an external module.
 *
 * @param {string} importedPath
 * @param {?Module} fromModule
 * @param {Container} container
 * @return {?Module}
 */
ExternalResolver.prototype.resolveModule = function (importedPath, fromModule, container) {
  var isExternal, module;

  if (this.externalModules) {
      isExternal = this.externalModules.indexOf(importedPath) >= 0;
  } else {
      isExternal = importedPath.charAt(0) !== '.';
  }

  if (isExternal) {
      module = container.getCachedModule(importedPath);

      if (!module) {
        module = new Module(importedPath, importedPath, container);
        module.external = true;
        console.log('INFO: External module detected: "%s"', importedPath);
      }

      return module;
  }

  return null;
};

module.exports = ExternalResolver;
