var browserify = require('browserify');
var watchify = require('watchify');
var through = require('through');
var fs = require('fs-extra');
var path = require('path');
var cp = require('child_process');

var exports = module.exports;

exports.createBuildDir = function() {
  var dir = 'build';
  fs.ensureDir(dir, function (err) {
    if (err) {
      console.log(err);
    }
  });
};

exports.startServer = function(entryPoint) {
  function globalOl(file) {
    var data = '';
    function write(buf) { data += buf; }
    function end() {
      this.queue(data.replace(/require\(["']openlayers['"]\)/g, 'window.ol'));
      this.queue(null);
    }
    return through(write, end);
  }

  var b = browserify({
    entries: [entryPoint ? entryPoint : './app.jsx'],
    debug: true,
    plugin: [watchify],
    cache: {},
    packageCache: {}
  }).transform(globalOl, {global: true});

  var outFile = './build/app-debug.js';
  var childProcess;

  b.on('update', function bundle(onError) {
    var stream = b.bundle();
    if (onError) {
      stream.on('error', function(err) {
        console.log(err.message);
        childProcess.kill('SIGINT');
        process.exit(1);
      });
    }
    stream.pipe(fs.createWriteStream(outFile));
  });

  b.bundle(function(err, buf) {
    if (err) {
      console.error(err.message);
      process.exit(1);
    } else {
      fs.writeFile(outFile, buf, 'utf-8');
      childProcess = cp.fork(path.join(path.dirname(require.resolve('openlayers')),
          '../tasks/serve-lib.js'), []);
    }
  });
};
