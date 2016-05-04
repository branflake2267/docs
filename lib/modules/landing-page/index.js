'use strict';

const Base   = require('../base');
const compressor = require('node-minify');

const fileArray = [];

class LandingPage extends Base {
    static register (argv) {
        argv.mod({
            mod         : 'landing-page',
            description : 'Create docs main landing page',
            options     : [
                {
                    name        : 'config',
                    short       : 'con',
                    type        : 'string',
                    description : 'The config file holding all of the configurations for the build process.',
                    example     : '`index landing-page --config=landing`'
                },
                {
                    name        : 'stylesheet',
                    short       : 's',
                    type        : 'string',
                    description : 'The CSS stylesheet for use in the template. Defaults to "./modules/json-parser/css/styles.css".',
                    example     : '`index json-parser --stylesheet=./modules/json-parser/css/styles.css` or `index json-parser -s ./modules/json-parser/css/styles.css`'
                },
                {
                    name        : 'template',
                    short       : 't',
                    type        : 'string',
                    description : 'The handlebars template file. Defaults to "./modules/json-parser/template.hbs".',
                    example     : '`index json-parser --template=./modules/json-parser/template.hbs` or `index json-parser -t ./modules/json-parser/template.hbs`'
                },
                {
                    name        : 'destination',
                    short       : 'd',
                    type        : 'string',
                    description : 'The destination location of the generated html. Defaults to "./output".',
                    example     : '`index json-parser --destination=./output` or `index json-parser -d ./output`'
                },
                {
                    name        : 'compress',
                    short       : 'c',
                    type        : 'boolean',
                    description : 'Whether or not to compress the JSON or leave whitespaces. Defaults to `false`.',
                    example     : '`index json-parser --compress` or `index json-parser -c'
                },
                {
                    name        : 'pversion',
                    short       : 'pv',
                    type        : 'string',
                    description : 'The version of the product you are building',
                    example     : 'index source-parser -v 1.0.1'
                }
            ]
        });
    }

    get defaultOptions () {
        return {
            compress    : false,
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/'
            },
            input       : {
                type  : 'path',
                value : __dirname + '/../../json/'
            },
            stylesheet  : __dirname + '/../base/css/styles.css',
            treestyle   : __dirname + '/../base/css/treeview.css',
            extl        : __dirname + '/../base/js/ExtL.js',
            treeview    : __dirname + '/../base/js/treeview.js',
            template    : __dirname + '/template.hbs',
            hometemplate    : __dirname + '/hometemplate.hbs',
            title : '',
            headerhtml: '',
            footer : 'Sencha Docs'
        };
    }

    run () {
        let me = this;

        if (me.beforeExecute) {
            // overwrite here if possible
            me.beforeExecute(fileArray);
        }

        me.execute();
    }

    beforeExecute (fileArray) {
        //let options = this.options;

        super.beforeExecute(fileArray);

        new compressor.minify({
            type    : this.compress ? 'yui-js' : 'no-compress',
            fileIn  : [this.extl, this.treeview, './modules/base/js/main.js'],
            fileOut : this.destination + '/js/app.js'
        });
    }

    execute () {
        let me = this,
            productMapJson = require('../base/product-map');

        me.prependHrefPath(productMapJson, me.destination);

        me.createIndexPage({
            date: me.date,
            title: me.title,
            docroot: me.docroot,
            headhtml: me.headhtml,
            version : me.pversion,
            description: me.description,
            stylesheet : 'app.css',
            canonical : me.docroot + 'index.html',
            productMapJson: productMapJson,
            numVer : me.numberVer,
            meta : me.meta,
            isLanding: true
        });
    }
}

module.exports = LandingPage;
