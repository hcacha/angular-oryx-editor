var through2 = require('through2');
var findUtil=require("../config/oryxData");
var path = require('path');

exports.addJsWrapper = function(enforce) {
  return through2.obj(function(file, enc, next) {
        
    var indexFound = findUtil.ignoreWrap.indexOf(path.basename(file.history[0]));

    if (!!enforce && indexFound==-1) {
      file.contents = new Buffer([
          !!enforce ? '(function(ORYX){' : '(function(ORYX){',
          '"use strict";\n',
          file.contents.toString(),
          !!enforce ? '})(ORYX);' : '})(ORYX);'
      ].join('\n'));
    }
    this.push(file);
    next();
  });
};