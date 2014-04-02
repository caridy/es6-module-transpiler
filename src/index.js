require('../lib/traceur-runtime');

var rewriters = {
  cjs: require('./rewriters/cjs_rewriter'),
  amdWrappedCjs: require('./rewriters/amd_wrapped_cjs_rewriter'),
  amd: require('./rewriters/amd_rewriter'),
  yui: require('./rewriters/yui_rewriter')
};

function transpile(src, type, opts) {
  var Rewriter = rewriters[type];
  if ( !Rewriter ) {
    /* jshint ignore:start */
    throw new Error(`No transpiler found for type ${type}!`);
    /* jshint ignore:end */
  }

  return new Rewriter(src, opts).rewrite();
}

module.exports = {
  transpile: transpile,
  compile: transpile // nicer word!
};
