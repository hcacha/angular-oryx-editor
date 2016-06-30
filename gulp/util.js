var config = require('./config');
var gulp = require('gulp');
var gutil = require('gulp-util');
var filter = require('gulp-filter');
var plumber = require('gulp-plumber');
var utils = require('../scripts/gulp-utils.js');
var constants = require('./const');
var insert = require('gulp-insert');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var series = require('stream-series');
var path = require('path');
var concat = require('gulp-concat');
var gulpif = require('gulp-if');

var VERSION = constants.VERSION;
var BUILD_MODE = constants.BUILD_MODE;
var IS_DEV = constants.IS_DEV;
var tsc=require("gulp-typescript");

exports.buildJs = buildJs;

function buildJs () {
  //var jsFiles = config.jsBaseFiles.concat([path.join(config.paths, '*.js')]);
  var jsFiles = config.jsBaseFiles;
  var outputDir=config.outputDir+'oryx';

  gutil.log("building js files...");

  var jsBuildStream = gulp.src( jsFiles )
      .pipe(filterNonCodeFiles())      
      .pipe(plumber())      
      .pipe(utils.addJsWrapperOryx(true));

  var jsProcess = series(jsBuildStream)
      .pipe(concat('oryx.js'))
      .pipe(BUILD_MODE.transform())
      .pipe(insert.prepend(config.banner))
      .pipe(insert.append(';window.ORYX={version:{full: "' + VERSION +'"}};module.exports=ORYX;'))
      .pipe(gulp.dest(outputDir))
      //.pipe(gulpif(!IS_DEV, uglify({ preserveComments: 'some' })))
      .pipe(rename({ extname: '.min.js' }))
      .pipe(gulp.dest(outputDir));

  return series(jsProcess);  
  
}
function filterNonCodeFiles() {
  return filter(function(file) {
    return !/demo|module\.json|script\.js|\.spec.js|README/.test(file.path);
  });
}

exports.buildTs=buildTs;

function buildTs () {
  var tsProject = tsc.createProject("jsconfig.json");
  var tsFiles = config.tsBaseFiles.concat([path.join(config.paths, '*.ts')]);

  gutil.log("building ts files...");

  return gulp.src(tsFiles)
        .pipe(tsc(tsProject))
        .pipe(gulp.dest(function(file) {
          return file.base;
        }));

  
}
exports.bundleTs=bundleTs;

function bundleTs () {
  var jsFiles = config.jsAngularBaseFiles.concat([path.join(config.paths, '*.js')]);
  var outputDir=config.outputDir+'angular-oryx-editor';

  gutil.log("building js files...");

  var jsBuildStream = gulp.src( jsFiles )
      .pipe(filterNonCodeFiles())      
      .pipe(plumber())      
      .pipe(utils.addJsWrapper(true));

  var jsProcess = series(jsBuildStream)
      .pipe(concat('angular-oryx-editor.js'))
      .pipe(BUILD_MODE.transform())
      .pipe(insert.prepend(config.banner))      
      .pipe(gulp.dest(outputDir))
      //.pipe(gulpif(!IS_DEV, uglify({ preserveComments: 'some' })))
      .pipe(rename({ extname: '.min.js' }))
      .pipe(gulp.dest(outputDir));

  return series(jsProcess);    
}