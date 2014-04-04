var compile = require('../dist').compile;
var glob = require('glob').sync;
var mkdirp = require('mkdirp').sync;
var path = require('path');
var fs = require('fs');
var expect = require('chai').expect;
var SourceMapConsumer = require('source-map').SourceMapConsumer;

function compileToTmp(type, filename) {
  var in_ = fs.readFileSync(filename, 'utf8');

  var relPath = path.relative(__dirname, filename);
  var out = compile(in_, type, {
    registryName: relPath,
    dirPath: 'app',
    recast: {
      tabWidth: 2
    }
  });

  var outPath = path.join(__dirname, 'tmp', relPath);
  mkdirp(path.dirname(outPath));
  fs.writeFileSync(outPath, out.code);
  fs.writeFileSync(outPath + '.map', JSON.stringify(out.map));
}

describe.only('syntax conversion', function() {

  var fixtureFolders = glob(__dirname + '/syntax/*/');

  fixtureFolders.forEach(function(folder) {
    var inputFilename = glob('*.es6.js', { cwd: folder })[0];

    if (!inputFilename) {
      throw new Error('No *.es6.js file found in ' + folder);
    }

    var specName = path.basename(folder).split('_').join(' ');

    describe(specName, function() {
      var input = fs.readFileSync(path.join(folder, inputFilename), {encoding: 'utf8'});

      // get amd/cjs/yui files
      var amdFilename = glob('*.amd.js', { cwd: folder })[0];
      var cjsFilename = glob('*.cjs.js', { cwd: folder })[0];
      var yuiFilename = glob('*.yui.js', { cwd: folder })[0];

      var opts = {
        registryName: inputFilename.replace(/\.es6\.js/, ''),
        dirPath: 'app'
      };

      if (cjsFilename) {
        it('matches CJS output', function() {
          var expected = fs.readFileSync(path.join(folder, cjsFilename), {encoding: 'utf8'});
          var code = compile(input, 'cjs', opts).code;
          fs.writeFileSync(path.join(__dirname + '/tmp/syntax', cjsFilename), code);
          expect(code).to.equal(expected);
        });
      }
      // if (amdFilename) {
      //   it('matches AMD output', function() {
      //     var expected = fs.readFileSync(path.join(folder, amdFilename), {encoding: 'utf8'});
      //     expect(compile(input, 'amd', opts).code).to.equal(expected);
      //   });
      // }
      // if (yuiFilename) {
      //   it('matches YUI output', function() {
      //     var expected = fs.readFileSync(path.join(folder, yuiFilename), {encoding: 'utf8'});
      //     expect(compile(input, 'yui', opts).code).to.equal(expected);
      //   });
      // }
    });
  });
});

describe('behavior', function() {
  describe('cycles', function() {

    it('work in CJS', function() {

      compileToTmp('cjs', __dirname + '/functional/cycles/even.js');
      compileToTmp('cjs', __dirname + '/functional/cycles/odd.js');

      var even = require('./tmp/functional/cycles/even').default;
      var odd = require('./tmp/functional/cycles/odd').default;

      expect(odd(5)).to.equal(true);
      expect(odd(6)).to.equal(false);

      expect(even(5)).to.equal(false);
      expect(even(6)).to.equal(true);
    });

    // it('work in AMD', function() {
    // });
    //
    // it('work in YUI', function() {
    // });
  });
});

describe('source maps', function() {
  // current output for reference:
  // http://bit.ly/1mGmXCo
  // to regenerate, uncomment:
  // compileToTmp('cjs', __dirname + '/maps/test.js');

  var src = fs.readFileSync(__dirname + '/maps/test.js', {encoding: 'utf8'});
  var out = compile(src, 'cjs', {
    registryName: 'test.js',
    dirPath: 'app'
  });

  var smc = new SourceMapConsumer(out.map);

  var generatedPositionFor = function(pos) {
    var genPos = smc.generatedPositionFor({source: 'test.js', line: pos[0], column: pos[1]});
    return [genPos.line, genPos.column];
  };

  describe('import statements', function() {
    it('are mapped to where __import_X__ is defined', function() {
      expect(generatedPositionFor([1, 0])).to.deep.equal([10, 0]);
    });
  });

  describe('rewritten identifiers', function() {
    it('are mapped to the original identifier', function() {
      expect(generatedPositionFor([5, 13])).to.deep.equal([12, 10]);
    });
  });

  describe('export statements', function() {
    it('are mapped to their equivalent export assignments', function() {
      expect(generatedPositionFor([9, 0])).to.deep.equal([14, 0]);
    });
  });

  describe('unchanged lines', function() {
    it('are mapped 1:1', function() {
      expect(generatedPositionFor([3, 3])).to.deep.equal([11, 3]);
    });
  });

});
