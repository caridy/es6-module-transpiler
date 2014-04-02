// This rewriter further wraps the CJS rewriter's output in an AMD module declaration. This should
// work for RequireJS and Almond, which include RJS compatibility layers.

var recast = require("recast");
var n = recast.types.namedTypes;
var b = recast.types.builders;

var CJSRewriter = require('../cjs_rewriter');

class AMDWrappedCJSRewriter extends CJSRewriter {
  postRewrite() {
    // wrap ast.program.body in a function
    var body = this.ast.program.body;
    //define(function(require, exports, module) {
    var amdWrapped = b.expressionStatement(
      b.callExpression(
        b.identifier('define'), [
          b.functionExpression(
            null,
            [b.identifier('require'), b.identifier('exports'), b.identifier('module')],
            b.blockStatement(body)
          )
        ]
      )
    );

    this.ast.program.body = [amdWrapped];
  }
}

module.exports = AMDWrappedCJSRewriter;
