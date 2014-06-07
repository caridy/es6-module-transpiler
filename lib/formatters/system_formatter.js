/* jshint node:true, undef:true, unused:true */

var assert = require('assert');

var recast = require('recast');
var types = recast.types;
var n = types.namedTypes;
var b = types.builders;

var utils = require('../utils');
var sourcePosition = utils.sourcePosition;

var Replacement = require('../replacement');

/**
 * The 'commonjs' setting for referencing exports aims to produce code that can
 * be used in environments using the CommonJS module system, such as Node.js.
 *
 * @constructor
 */
function SystemFormatter() {
  this.importedModules = {};
}

/**
 * Returns an identifier which references the imported module named by
 * `identifier` for the given module `mod`. For example:
 *
 *    import something from "./foo/bar"
 *    $foodefer$$
 *
 *    // rsvp/utils.js, export function isFunction
 *    rsvp$utils$$
 *
 * @param {Module} mod
 * @return {ast-types.Identifier}
 */
SystemFormatter.prototype.importedReference = function(name) {
  return n.Identifier.check(name) ? identifier : b.identifier(name);
};

/**
 * Returns an expression which globally references the export named by
 * `identifier` for the given module `mod`. For example:
 *
 *    // rsvp/defer.js, export default
 *    rsvp$defer$$.default
 *
 *    // rsvp/utils.js, export function isFunction
 *    rsvp$utils$$.isFunction
 *
 * @param {Module} mod
 * @param {ast-types.Identifier} identifier
 * @return {ast-types.MemberExpression}
 */
SystemFormatter.prototype.reference = function(mod, identifier) {
  return b.memberExpression(
    b.identifier(mod.id),
    n.Identifier.check(identifier) ? identifier : b.identifier(identifier),
    false
  );
};

/**
 * Process a variable declaration found at the top level of the module. Since
 * we do not need to rewrite exported variables, we can leave variable
 * declarations alone.
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} nodePath
 * @return {?Array.<ast-types.Node>}
 */
SystemFormatter.prototype.processVariableDeclaration = function(/* mod, nodePath */) {
  return null;
};

/**
 * Process a variable declaration found at the top level of the module. Since
 * we do not need to rewrite exported functions, we can leave function
 * declarations alone.
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} nodePath
 * @returns {Array.<ast-types.Node>}
 */
SystemFormatter.prototype.processFunctionDeclaration = function(mod, nodePath) {
  return null;
};

/**
 * Because exported references are captured via a closure as part of a getter
 * on the `exports` object, there's no need to rewrite local references to
 * exported values. For example, `value` in this example can stay as is:
 *
 *   // a.js
 *   export var value = 1;
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} referencePath
 * @return {ast-types.Expression}
 */
SystemFormatter.prototype.exportedReference = function(/* mod, referencePath */) {
  return null;
};

/**
 * Gets a reference to an imported binding by getting the value from the
 * required module on demand. For example, this module:
 *
 *   // b.js
 *   import { value } from './a';
 *   console.log(value);
 *
 * Would be rewritten to look something like this:
 *
 *   var a$$ = require('./a');
 *   console.log(a$$.value):
 *
 * If the given reference does not refer to an imported binding then no
 * rewriting is required and `null` will be returned.
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} referencePath
 * @return {?ast-types.Expression}
 */
SystemFormatter.prototype.importedReference = function(mod, referencePath) {
  var specifier = mod.imports.findSpecifierForReference(referencePath);

  if (specifier) {
    return this.reference(
      specifier.declaration.source,
      specifier.from
    );
  } else {
    return null;
  }
};

/**
 * @param {Module} mod
 * @param {ast-types.Expression} declaration
 * @return {ast-types.Statement}
 */
SystemFormatter.prototype.defaultExport = function(mod, declaration) {
  mod.defaultIdentifier = b.identifier('__defaultModuleExport__');
  if (n.FunctionExpression.check(declaration)) {
    // export default function <name> () {}
    if (!declaration.id) {
      mod.defaultIdentifier = mod.defaultIdentifier;
      // anonymous functionDeclaration
      return b.expressionStatement(
        b.assignmentExpression(
          '=',
          mod.defaultIdentifier,
          declaration
        )
      );
    } else {
      mod.defaultIdentifier = b.identifier(declaration.id.name);
      // named functionDeclaration
      return b.functionDeclaration(b.identifier(declaration.id.name), declaration.params, declaration.body);
    }
  } else if (n.VariableDeclaration.check(declaration)) {
    mod.defaultIdentifier = b.identifier(declaration.declarations[0].id.name);
    // export default var foo = 1;
    return b.variableDeclaration('var', declaration.declarations);
  } else if (n.Identifier.check(declaration)) {
    mod.defaultIdentifier = b.identifier(declaration.name);
    // export default foo;
    return [];
  } else if (n.ClassDeclaration.check(declaration)) {
    mod.defaultIdentifier = b.identifier(declaration.id.name);
    // export default class foo {};
    return declaration;
  } else {
    // export default {foo: 1};
    return b.expressionStatement(
      b.assignmentExpression(
        '=',
        mod.defaultIdentifier,
        declaration
      )
    );
  }
};

/**
 * Replaces non-default exports. For declarations we simply remove the `export`
 * keyword. For export declarations that just specify bindings, e.g.
 *
 *   export { a, b };
 *
 * we remove them entirely since they'll be handled when we define properties on
 * the `exports` object.
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} nodePath
 * @return {?Replacement}
 */
SystemFormatter.prototype.processExportDeclaration = function(mod, nodePath) {
  var node = nodePath.node;

  if (n.FunctionDeclaration.check(node.declaration)) {
    return Replacement.swaps(nodePath, node.declaration);
  } else if (n.VariableDeclaration.check(node.declaration)) {
    return Replacement.swaps(nodePath, node.declaration);
  } else if (n.ClassDeclaration.check(node.declaration)) {
    return Replacement.swaps(nodePath, node.declaration);
  } else if (node.declaration) {
    throw new Error('unexpected export style, found a declaration of type: ' + node.declaration.type);
  } else {
    return Replacement.removes(nodePath);
  }
};

/**
 * Since import declarations only control how we rewrite references we can just
 * remove them -- they don't turn into any actual statements.
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} nodePath
 * @return {?Replacement}
 */
SystemFormatter.prototype.processImportDeclaration = function(mod, nodePath) {
  return Replacement.removes(nodePath);
};

/**
 * Since import declarations only control how we rewrite references we can just
 * remove them -- they don't turn into any actual statements.
 *
 * @param {Module} mod
 * @param {ast-types.NodePath} nodePath
 * @return {?Replacement}
 */
SystemFormatter.prototype.processModuleDeclaration = function(mod, nodePath) {
  var moduleDeclaration;
  for (var i = 0, length = mod.imports.declarations.length; i < length; i++) {
    var declaration = mod.imports.declarations[i];
    if (declaration.node === nodePath.node) {
      moduleDeclaration = declaration;
    }
  }
  assert.ok(
    moduleDeclaration,
      'expected a module declaration for ' + sourcePosition(nodePath.node)
  );

  var self = this;
  return Replacement.swaps(nodePath, [b.variableDeclaration(
    'var',
    [b.variableDeclarator(
      moduleDeclaration.id,
      b.callExpression(
        b.identifier('require'),
        [b.literal(moduleDeclaration.sourcePath)]
      )
    )]
  )]);
};

/**
 * Convert a list of ordered modules into a list of files.
 *
 * @param {Array.<Module>} modules Modules in execution order.
 * @return {Array.<ast-types.File}
 */
SystemFormatter.prototype.build = function(modules) {
  var self = this;
  return modules.map(function(mod) {

    var body = mod.ast.program.body,
      metas = self.buildMetas(mod);

    body.unshift(
      b.expressionStatement(b.literal('use strict')),
      self.buildExports(mod)
    );
    // console.log(require('util').inspect(body, true, 6));

    // replacing the body of the program with the wrapped System.import() call
    mod.ast.program.body = [b.expressionStatement(b.callExpression(b.memberExpression(b.identifier('System'), b.identifier('register'), false), [
        // module name argument
        b.literal(mod.name),
        // wrapper function
        b.functionExpression(null, [], b.blockStatement([
          // var __es6_module__ = {};
          b.variableDeclaration(
            'var',
            [b.variableDeclarator(
              b.identifier('__es6_module__'),
              b.objectExpression([])
            )]
          ),
          // return { mod: __es6_module__, deps: [], exports: [], execute: function (<deps*>) {} }
          b.returnStatement(b.objectExpression([
            b.property(
              'init',
              b.literal('exports'),
              b.identifier('__es6_module__')
            ),
            b.property(
              'init',
              b.literal('bindings'),
              // exported token array
              self.buildExportNames(mod)
            ),
            b.property(
              'init',
              b.literal('deps'),
              // depedencies array
              b.arrayExpression(metas.deps)
            ),
            b.property(
              'init',
              b.literal('fn'),
              // module body
              b.functionExpression(null, metas.imported, b.blockStatement(body))
            )
          ]))
        ]))
    ]))];

    mod.ast.filename = mod.relativePath;
    return mod.ast;
  });
};

/**
 * Build an array with the names of exported name. This is used
 * by loader to creating the bindings before executing the module body.
 *
 * @private
 * @param {Module} mod
 * @return {ast-types.ArrayExpression}
 */
SystemFormatter.prototype.buildExportNames = function(mod) {
  var identifiers = [];
  mod.exports.names.forEach(function (id) {
    identifiers.push(b.literal(id));
  });
  return b.arrayExpression(identifiers);
};

/**
 * Build a series of identifiers based on the imports (and exports with sources)
 * in the given module.
 *
 * @private
 * @param {Module} mod
 * @return {ast-types.Array}
 */
SystemFormatter.prototype.buildMetas = function(mod) {
  var requiredModules = [];
  var importedModules = [];
  var importedIdentifiers = [];

  // `(import|export) { ... } from 'math'`
  [mod.imports, mod.exports].forEach(function(declarations) {
    declarations.modules.forEach(function(sourceModule) {
      console.log(sourceModule);
      if (~requiredModules.indexOf(sourceModule)) {
        return;
      }
      requiredModules.push(sourceModule);
      importedIdentifiers.push(b.identifier(sourceModule.id));

      var matchingDeclaration;
      declarations.declarations.some(function(declaration) {
        if (declaration.source === sourceModule) {
          matchingDeclaration = declaration;
          return true;
        }
      });

      assert.ok(
        matchingDeclaration,
        'no matching declaration for source module: ' + sourceModule.relativePath
      );

      importedModules.push(b.literal(matchingDeclaration.sourcePath))

    });
  });

  return {
    imported: importedIdentifiers,
    deps: importedModules
  };
};

/**
 * @private
 * @param {Module} mod
 * @return {ast-types.Statement}
 */
SystemFormatter.prototype.buildExports = function(mod) {
  var self = this;
  var properties = [];
console.log(mod.defaultIdentifier);
  mod.exports.names.forEach(function(name) {
    var specifier = mod.exports.findSpecifierByName(name);

    assert.ok(
      specifier,
      'no export specifier found for export name `' +
      name + '` from ' + mod.relativePath
    );

    if (!specifier.from) {
      return;
    }

    var from =
      specifier.importSpecifier ?
        self.reference(
          specifier.importSpecifier.declaration.source,
          specifier.importSpecifier.from
        ) :
      specifier.declaration.source ?
        self.reference(
          specifier.declaration.source,
          specifier.name
        ) :
        b.identifier(specifier.from);

    properties.push(b.property(
      'init',
      b.identifier(name),
      b.objectExpression([
        // Simulate named export bindings with a getter.
        b.property(
          'init',
          b.identifier('get'),
          b.functionExpression(
            null,
            [],
            b.blockStatement([b.returnStatement(from)])
          )
        ),
        b.property(
          'init',
          b.identifier('enumerable'),
          b.literal(true)
        )
      ])
    ));
  });

  if (mod.defaultIdentifier) {
    properties.push(b.property(
      'init',
      b.identifier('default'),
      b.objectExpression([
        // Simulate named export bindings with a getter.
        b.property(
          'init',
          b.identifier('get'),
          b.functionExpression(
            null,
            [],
            b.blockStatement([b.returnStatement(mod.defaultIdentifier)])
          )
        ),
        b.property(
          'init',
          b.identifier('enumerable'),
          b.literal(true)
        )
      ])
    ));
  }

  var exportObject = b.identifier('__es6_module__');

  if (properties.length > 0) {
    exportObject = b.callExpression(
      b.memberExpression(
        b.identifier('Object'),
        b.identifier('defineProperties'),
        false
      ),
      [
        exportObject,
        b.objectExpression(properties)
      ]
    );
  }

  return b.expressionStatement(
    b.callExpression(
      b.memberExpression(
        b.identifier('Object'),
        b.identifier('seal'),
        false
      ),
      [exportObject]
    )
  );
};

module.exports = SystemFormatter;
