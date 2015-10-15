var argv    = require('argv'),
    package = require('./package.json'),
    debug   = require('./Debug'),
    diff    = require('./modules/diff'),
    parser  = require('./modules/json-parser'),
    args, cls;

if (!String.prototype.includes) {
  String.prototype.includes = function() {'use strict';
    return String.prototype.indexOf.apply(this, arguments) !== -1;
  };
}

debug.enable();
debug.disable('log');

argv.version('v' + package.version);
argv.info(package.description);

diff.register(argv);
parser.register(argv);

args = argv.run();

if (args.mod) {
    switch (args.mod) {
        case 'diff' :
            cls = diff;
            break;
        case 'json-parser' :
            cls = parser;
            break;
    }

    if (cls) {
        cls = new cls(args.targets, args.options);

        if (cls.checkArgs()) {
            cls.run();
        } else {
            argv.help();
        }
    }
} else {
    argv.help();
}
