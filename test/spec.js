var compile = require('../dist').compile;
var glob = require('glob').sync;
var mkdirp = require('mkdirp').sync;
var path = require('path');
var fs = require('fs');
var expect = require('chai').expect;

function compileToTmp(type, filename) {
  var in_ = fs.readFileSync(filename, 'utf8');

  var out = compile(in_, type, {
    registryName: filename,
    dirPath: 'app'
  });

  var relPath = path.relative(__dirname, filename);
  var outPath = path.join(__dirname, 'tmp', relPath);
  mkdirp(path.dirname(outPath));
  fs.writeFileSync(outPath, out.code);
}

describe('syntax conversion', function() {

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
          expect(compile(input, 'cjs', opts).code).to.equal(expected);
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
