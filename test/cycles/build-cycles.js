var transpiler = require('../../dist');
var fs = require('fs');

function compileToTmp(filename) {
  var in_ = fs.readFileSync(filename, 'utf8');

  var out = transpiler.transpile(in_, 'cjs', {
    registryName: filename,
    dirPath: 'app'
  });

  fs.writeFileSync(require('path').join('./tmp', filename), out.code);
}

compileToTmp('./a.js');
compileToTmp('./b.js');
