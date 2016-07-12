'use strict';

const fs         = require('fs');
const pkgJson    = require('./package.json');
const handlebars = require('handlebars');
const swag       = require('swag');
const Utils      = require('./modules/shared/Utils');
const args = require('yargs')
    .version('v', pkgJson.description, pkgJson.version)
    .usage('Usage: node $0 <command> [--con "Config file"] [--pv "Product Version"] [--c "File Compression"] [--i "API Doc Input Folder"] [--d "Output Folder"] [--t "Main Template File"] [--s "Stylesheet"]')
    .option({
        'config': {
            alias       : 'con',
            type        : 'string',
            description : 'The config file holding all of the configurations for the build process.',
            example     : '`index json-parser --config=./classic-toolkit-config.json`',
            demand      : true
        },
        'pversion': {
            alias       : 'pv',
            type        : 'string',
            description : 'The version of the product you are building',
            example     : 'index source-parser -v 1.0.1'
        },
        'compress': {
            alias       : 'c',
            type        : 'boolean',
            description : 'Whether or not to compress the JSON or leave whitespaces. Defaults to `false`.',
            example     : '`index json-parser --compress` or `index json-parser -c'
        },
        'input': {
            alias       : 'i',
            type        : 'string',
            description : 'The location where the JSON files are contained. Defaults to "./json".',
            example     : '`index json-parser --input=./json` or `index json-parser -i ./json`',
        },
        'destination': {
            alias       : 'd',
            type        : 'string',
            description : 'The destination location of the generated html. Defaults to "./output".',
            example     : '`index json-parser --destination=./output` or `index json-parser -d ./output`'
        },
        'template': {
            alias       : 't',
            type        : 'string',
            description : 'The handlebars template file. Defaults to "./modules/json-parser/template.hbs".',
            example     : '`index json-parser --template=./modules/json-parser/template.hbs` or `index json-parser -t ./modules/json-parser/template.hbs`'
        },
        'stylesheet': {
            alias       : 's',
            type        : 'string',
            description : 'The CSS stylesheet for use in the template. Defaults to "./modules/json-parser/css/styles.css".',
            example     : '`index json-parser --stylesheet=./modules/json-parser/css/styles.css` or `index json-parser -s ./modules/json-parser/css/styles.css`'
        },
        'skip': {
            alias       : 'sk',
            type        : 'boolean',
            description : '-skip=true will skip downloading the product source from the git repo',
            example     : '`index source-parser --con=classic --pv=6.2.0-classic --sk=true'
        }
    })
    .command('command', 'Parser to run', { alias: 'command' })
    .example('node $0 source-parser --con=classic --pv=6.2.0-classic', "Creates the input JSON files from all classes in Ext JS 6.2.0 (classic toolkit) as well as the source .html files used to view each class' source")
    .example('node $0 source-parser --con=classic --pv=6.2.0-classic --sk=true', 'same, but will skip downloading the product source from the git repo')
    .example("node $0 json-parser --con=classic --pv=6.2.0-classic", "Outputs the API docs and product index page for Ext JS 6.2.0 (classic toolkit)")
    .example("node $0 json-parser --con=classic --pv=6.2.0-classic --c=false", "same, but with uncompressed output (debugging)")
    .example("node $0 guide-parser --con=classic --pv=6.2.0-classic", "Outputs the guides and product index page for Ext JS 6.2.0 (classic toolkit)")
    .example("node $0 landing-page --con=landing", "Creates the docs main landing page for all products")
    .help('h')
    .alias('h', 'help')
    .wrap()
    .argv;

/**
 * Register all handlebars helpers
 */
const registerHelpers = function () {
    /**
     * The {{#exists}} helper checks if a variable is defined.
     */
    handlebars.registerHelper('exists', function(variable, options) {
        if (variable != 'undefined' && variable) {
            return options.fn(this);
        }
    });

    /**
     * The {{#capitalize}} helper capitalizes the first letter of the passed string
     * @param {String} str The string to capitalize
     * @return {String} The capitalized string
     */
    handlebars.registerHelper('capitalize', function (str) {
        return Utils.capitalize(str);
    });

    /**
     * {{#stripheml}} Strips HTML and truncates the string
     * @param {String} variable The string to strip and truncate
     * @return {String} The processed string
     */
    handlebars.registerHelper('striphtml', function(variable) {
        return Utils.striphtml(variable);
    });

    // initialize the swag module
    swag.registerHelpers(handlebars);
};

/**
 * Register all handlebars partials
 * @param {Object} args The args object for the current module
 */
const registerPartials = function (args) {
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
        partialsDir = __dirname + '/product-templates/' + args.config;
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
};

module.exports = function(modules) {
    let map = {},
        mod = args.mod = args._[0];

    registerPartials(args);
    registerHelpers();

    let cls = require('./modules/' + mod);

    if (cls) {
        cls = new cls([], args);

        if (cls.checkArgs()) {
            return cls.run();
        }
    }
};
