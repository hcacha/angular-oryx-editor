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
        'src/oryx/core/pathparser.js',
        'src/oryx/object.js',
        'src/oryx/clazz.js',        
        'src/oryx/enumerable.js',
        'src/oryx/array.js',
        'src/oryx/hash.js',
        'src/oryx/oryx.js',        
        'src/oryx/config.js',        
        'src/oryx/core/math/*.js',        
        'src/oryx/core/stencilSet/*.js',
        'src/oryx/core/uiobject.js',        
        'src/oryx/core/abstractshape.js',
        'src/oryx/core/canvas.js',
        'src/oryx/core/main.js',
        'src/oryx/core/shape.js',
        'src/oryx/core/bounds.js',
        'src/oryx/core/node.js',        
        'src/oryx/core/svg/*.js',
        'src/oryx/core/controls/*.js',
        'src/oryx/core/edge.js'
    ],
    jsFiles: [
        'src/oryx/**/*.js',
        '!src/oryx/**/*.spec.js'
    ],
    tsBaseFiles:[
        "typings/index.d.ts",
        'src/common/*.ts'
    ],
    jsAngularBaseFiles:[ 
        'src/**/*module.js',       
        'src/common/*.js'
    ],
    paths: 'src/bpmn-editor/',
    outputDir: 'dist/'
    //outputDir:'B:/ProyectosAATE\hcacha\Source\Repos AATE\Sistema Gestion Liberaciones e Interferencias\Presentation\SGLI.UI.MVC\wwwroot\lib\angular-oryx-editor'
};