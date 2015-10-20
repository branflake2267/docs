var argv        = require('argv'),
    package     = require('./package.json'),
    debug       = require('./Debug'),
    diff        = require('./modules/diff'),
    parser      = require('./modules/json-parser'),
    classTree   = require('./modules/class-tree'),
    memberInfo  = require('./modules/member-info'),
    guideParser = require('./modules/guide-parser'),
    args, cls;

if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}

//enable the logger but disable the log level, info and error will still show
debug.enable();
debug.disable('log');

//register the modules
diff.register(argv);
parser.register(argv);
classTree.register(argv);
memberInfo.register(argv);
guideParser.register(argv);

//for `node index --version` command
argv.version('v' + package.version);
//for when the help screen shows, some text above the args
argv.info(package.description);

//run the argv module to get the targets, options and module
args = argv.run();

if (args.mod) {
    switch (args.mod) {
        case 'class-tree' :
            cls = classTree;
            break;
        case 'diff' :
            cls = diff;
            break;
        case 'guide-parser' :
            cls = guideParser;
            break;
        case 'json-parser' :
            cls = parser;
            break;
        case 'member-info' :
            cls = memberInfo;
            break;
    }

    if (cls) {
        cls = new cls(args.targets, args.options);

        if (cls.checkArgs()) {
            cls.run();
        } else {
            //required args were not present, show help screen
            argv.help();
        }
    }
} else {
    //no module found, `node index` was likely run
    argv.help();
}
