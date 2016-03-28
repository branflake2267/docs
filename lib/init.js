'use strict';

const fs         = require('fs');
const argv       = require('argv');
const pkgJson    = require('./package.json');
const handlebars = require('handlebars');
const swag       = require('swag');
const Utils      = require('./modules/shared/Utils');

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

        /*
         * Register all of the Handlebar partials and helpers
         */

        let partialsDir = __dirname + '/modules/base/tpls';
        let filenames = fs.readdirSync(partialsDir);

        filenames.forEach(function (filename) {
            let matches = /^([^.]+).hbs$/.exec(filename),
                name, template;
            if (!matches) {
                return;
            }
            name = matches[1];
            template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
            handlebars.registerPartial(name, template);
        });

        if (args.mod != 'diff') {
            partialsDir = __dirname + '/product-templates/' + args.options.config;
            filenames = fs.readdirSync(partialsDir);

            filenames.forEach(function (filename) {
                let matches = /^([^.]+).hbs$/.exec(filename),
                    name, template;
                if (!matches) {
                    return;
                }
                name = matches[1];
                template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
                handlebars.registerPartial(name, template);
            });
        }

        /**
         * The {{#exists}} helper checks if a variable is defined.
         */
        handlebars.registerHelper('exists', function(variable, options) {
            if (variable != 'undefined' && variable) {
                return options.fn(this);
            }
        });

        handlebars.registerHelper('capitalize', function (str) {
            return Utils.capitalize(str);
        });

        /**
         * Strip HTML and truncate string
         */
        handlebars.registerHelper('striphtml', function(variable) {
            return Utils.striphtml(variable);
        });

        swag.registerHelpers(handlebars);

        /*
         * End Handlebars registration
         */

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
