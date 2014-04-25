var _ = require('underscore');

var esprima = require('esprima');
var recast = require('recast');
var path = require('path');

var n = recast.types.namedTypes;
var b = recast.types.builders;

class Rewriter {
  constructor(src, opts) {
    if ( !opts.registryName ) {
      throw new Error('You must pass a registryName to use');
    }

    this.registryName = opts.registryName;
    this.moduleName = opts.moduleName;
    this.dirPath = opts.dirPath;  // used to resolve relative imports

    this.recastOpts = {
      esprima: esprima,
      // TODO: these names aren't always going to work!
      // allow user configuration, there's no global way to infer this
      sourceFileName: path.basename(this.registryName),
      sourceMapName: path.basename(this.registryName) + '.map'
    };

    _.extend(this.recastOpts, opts.recast);

    this.ast = recast.parse(src, this.recastOpts);

    // a mapping of imported modules to their unique identifiers
    // i.e. `./a` -> `__import_0__`
    this.importedModuleIdx = {};

    // a list of each module that's been imported so far
    this.importedModules = {};

    // a mapping of imported identifiers to their original name and module
    // identifier
    // `import {a as b} from "foo" ->
    // { b: { name: a, moduleIdentifier: __import_0__, isModuleInstance: true|undefined }}
    this.identifiers = {};

    // used to generate __import_n__ identifiers
    this.importCounter = 0;
  }

  trackModule(node) {
    var source = node.value;

    if ( this.importedModuleIdx[source] === undefined ) {
      /* jshint ignore:start */
      var identifier = `__imports_${this.importCounter}__`;
      /* jshint ignore:end */
      this.importedModuleIdx[source] = this.importCounter;
      this.importCounter += 1;
    }
  }

  /* Add each imported specifier to this.identifiers */
  trackImport(node, specifier) {
    var alias = (specifier.name || specifier.id).name;
    var importName;
    if (node.kind === 'default') {
      importName = 'default';
    } else {
      importName = specifier.id.name;
    }

    this.identifiers[alias] = {
      name: importName,
      importIdentifier: this.importedModuleIdentifierFor(node.source.value)
    };
  }

  trackModuleInstance(node) {
    var alias = node.id.name;

    this.identifiers[alias] = {
      isModuleInstance: true,
      importIdentifier: this.importedModuleIdentifierFor(node.source.value)
    };
  }

  replaceImportedIdentifier(identifier) {
    if ( identifier.isModuleInstance ) {
      return b.identifier(identifier.importIdentifier);
    }

    var isDefault = identifier.name === 'default';

    if ( isDefault ) {
      return b.logicalExpression(
        '||',
        b.memberExpression(
          b.identifier(identifier.importIdentifier),
          b.literal('default'),
          true
        ),
        b.identifier(identifier.importIdentifier)
      );
    }

    return b.memberExpression(
      b.identifier(identifier.importIdentifier),
      b.identifier(identifier.name),
      false
    );
  }

  rewrite() {
    var rewriter = this;  // traverse cb needs to be able to ref its `this`

    this.insertPreamble();

    recast.types.traverse(this.ast.program, function(node) {
      var replacement;

      this.scope.scan();  // always track scope, otherwise things get weird

      if ( n.ImportDeclaration.check(node) ) {
        rewriter.trackModule(node.source);
        node.specifiers.forEach(rewriter.trackImport.bind(rewriter, node));
        replacement = rewriter.replaceImportDeclaration(node.source.value);

      } else if ( n.ExportDeclaration.check(node) ) {
        if ( node.declaration ) {
          replacement = rewriter.replaceExportDeclaration(node.declaration);
        } else if ( node.specifiers ) {
          replacement = rewriter.replaceExportSpecifiers(node);
        }

      } else if ( n.ModuleDeclaration.check(node) ) {
        rewriter.trackModule(node.source);
        rewriter.trackModuleInstance(node);
        replacement = rewriter.replaceImportDeclaration(node.source.value);

      } else if ( n.Identifier.check(node) ) {
        if ( node.name in rewriter.identifiers ) {

          var parent = this.parent.node;

          // given node.name = foo...
          // don't rewrite bar.foo
          if ( n.MemberExpression.check(parent) && parent.property === node ) {
            return;
          }
          // don't rewrite key in { foo: bar }
          if ( n.Property.check(parent) && parent.key === node ) {
            return;
          }

          var scope = this.scope.lookup(node.name);

          if ( scope.depth === 0 ) {
            replacement = rewriter.replaceImportedIdentifier(rewriter.identifiers[node.name]);
          }
        }

      }

      if ( replacement !== undefined ) {
        if ( Array.isArray(replacement) ) {
          this.replace.apply(this, replacement);
        } else {
          this.replace(replacement);
        }
      }
    });

    if ( this.postRewrite ) {
      this.postRewrite();
    }

    return recast.print(this.ast, this.recastOpts);
  }

  resolvePath(filename) {

    var start = filename.substring(0, 2);
    if (start !== './' && start !== '..') {
      // non-relative paths are used as-is
      return filename;
    }

    // Can't resolve path without a set dirPath, die to prevent footgunning
    if ( !this.dirPath ) {
      throw new Error('Can\'t resolve relative path without being passed a dirPath!');
    }

    return path.join(this.dirPath, filename);
  }

  importedModuleIdentifierFor(moduleName) {
    /* jshint ignore:start */
    var identifier = `__imports_${this.importedModuleIdx[moduleName]}__`;
    /* jshint ignore:end */
    return identifier;
  }

}

module.exports = Rewriter;
