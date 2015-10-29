'use strict';

const argv    = require('argv');
const pkgJson = require('./package.json');

module.exports = function(modules) {
    let map = {};

    //for `node index --version` command
    argv.version('v' + pkgJson.version);
    //for when the help screen shows, some text above the args
    argv.info(pkgJson.description);

    modules.forEach(function(module) {
        module = map[module] = require('./modules/' + module);

        module.register(argv);
    });

    //run the argv module to get the targets, options and module
    let args = argv.run();

    if (args.mod) {
        let cls = map[args.mod];

        if (cls) {
            cls = new cls(args.targets, args.options);

            if (cls.checkArgs()) {
                return cls.run();
            }
        }
    }

    argv.help();
};
