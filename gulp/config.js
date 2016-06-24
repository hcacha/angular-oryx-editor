var args = require('minimist')(process.argv.slice(2));
var VERSION = args.version || require('../package.json').version;

module.exports={
     banner:
  '/*!\n' +
  ' * Angular oryx Editor\n' +
  ' * https://github.com/hcacha/angular-oryx-editor\n' +
  ' * @license MIT\n' +
  ' * v' + VERSION + '\n' +
  ' */\n',
    jsBaseFiles: [
        'src/object.js',
        'src/clazz.js',        
        'src/enumerable.js',
        'src/hash.js',
        'src/oryx.js',
        'src/config.js',
        'src/core/Math/*.js',        
        'src/core/StencilSet/*.js',
        'src/core/uiobject.js',        
        'src/core/abstractshape.js',
        'src/core/canvas.js',
        'src/core/main.js',
        'src/core/shape.js',
        'src/core/bounds.js'
    ],
    jsFiles: [
        'src/**/*.js',
        '!src/**/*.spec.js'
    ],
    paths: 'src/{components, services}/**',
    outputDir: 'dist/'
};