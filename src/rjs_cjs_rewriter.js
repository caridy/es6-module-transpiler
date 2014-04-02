// This rewriter further wraps the CJS rewriter's output in an AMD module declaration. This should
// work for RequireJS and Almond, which include RJS compatibility layers.

var recast = require("recast");
var n = recast.types.namedTypes;
var b = recast.types.builders;

var CJSRewriter = require('./cjs_rewriter');

// say that five times fast
class RequireJSCJSRewriter extends CJSRewriter {
  postRewrite(ast) {
    // wrap ast.program.body in a function
    var body = ast.program.body;
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

    // TODO: this should probably be some kind of replace! have a feeling this doesn't work for
    // src maps (though there are much greater issues than that right now)
    ast.program.body = [amdWrapped];
  }
}

module.exports = RequireJSCJSRewriter;
