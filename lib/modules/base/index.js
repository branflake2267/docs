'use strict';

const fs         = require('fs');
const path         = require('path');
const debug      = require('../../Debug');
const Utils      = require('../shared/Utils');
const handlebars = require('handlebars');
const wrench     = require('wrench');
const mkdirp     = require('mkdirp');
const compressor = require('node-minify');

var internalId = 0;

class Base {
    constructor (targets, options) {
        // make a copy of the defaultOptions to merge with the CLI passed options and the
        // config file options
        let defaultOptions = Object.assign({}, this.defaultOptions),
            configs, baseOptions;

        // try fetching the config file using the config option passed in the CLI
        try {
            configs = require('../../configs/' + options.config);
        // if it's not found then kick out an error and stop here
        } catch(e) {
            debug.info('You must pass the "--config" options for the product you are building for (i.e. --config=classic to process ExtJS classic)');
            process.exit(1);
        }

        // merge the configs file object onto the default options
        baseOptions = Object.assign(defaultOptions, configs);

        if (baseOptions) {
            let name, type, value;

            for (name in baseOptions) {
                type  = null;
                value = baseOptions[name];

                if (typeof value === 'object' && (value.type || value.value)) {
                    type  = value.type;
                    value = value.value;
                }

                if (options[name] === undefined) {
                    //default option is not present in the options passed

                    if (type && Utils[type]) {
                        //parse the default option
                        value = Utils[type](value);
                    }

                    options[name] = value;
                } else if (type && Utils[type]) {
                    //parse the option that was passed
                    options[name] = Utils[type](options[name]);
                }
            }
        }

        this.options = Object.assign(baseOptions, options);
        Object.assign(this, this.options);
        this.targets = targets;
    }

    /**
     * Method to register this module's command line arguments.
     *
     * @static
     * @cfg {argv} argv The argv node module.
     */
    static register (argv) {}

    /**
     * Checks to see if the required command line arguments are present.
     *
     * @return {Boolean}
     */
    checkArgs () {
        return true;
    }

    /**
     * Runs the module.
     */
    run () {
        debug.error('`run` method needs to be implemented');
    }

    /**
     * Create the index page using the passed data object
     * @param {Object} view The data to be applied to the handlebars template
     */
    createIndexPage (view) {
        let me = this,
            newhometemplate = handlebars.compile(me.hometemplate), // Compile the handlebars home template with the view object
            homeoutput      = newhometemplate(view);

        debug.info('Writing index.html');

        wrench.copyDirSyncRecursive(me.homepath + '/images', me.destination + 'home-images/', {
            forceDelete: true
        });

        wrench.copyDirSyncRecursive(__dirname + '/fonts', me.destination + 'fonts/', {
            forceDelete: true
        });

        wrench.chmodSyncRecursive(me.destination + 'home-images/', '0755');

        fs.writeFileSync(me.destination + 'index.html', homeoutput, 'utf-8');
    }

    /**
     *
     */
    beforeExecute (fileArray) {
        let me          = this,
            destination = path.join(me.destination, me.version),
            filemaploc  = destination + '/src/map/filemap.json',
            compress    = me.compress,  //true to compress js/css files, false to only concatenate
            dt          = new Date(),
            date        = dt.toLocaleString("en-us",{month:"long"}) + ", " + dt.getDate() + " " + dt.getFullYear() + " at " + dt.getHours() + ":" + dt.getMinutes(),
            libFiles    = fs.readdirSync(process.cwd());

        /**
         * Remove .tmp files if they exist
         */
        libFiles.forEach(function (file) {
            if (path.extname(file) == '.tmp') {
                fs.unlink(file);
            }
        });

        me.date         = date;
        me.template     = (me.template) ? fs.readFileSync(me.template, 'utf-8') : null;
        me.homepath     = me.hometemplate.path;
        me.hometemplate = fs.readFileSync(me.homepath + me.hometemplate.name, 'utf-8');
        me.smTemplate   = fs.readFileSync(__dirname + '/sitemap.hbs', 'utf-8');
        me.fileArray    = fileArray;

        if (!fs.existsSync(filemaploc)) {
            console.log("No file found at " + filemaploc);
        }
        try {
            me.filemap = JSON.parse(fs.readFileSync(filemaploc));
        } catch (err) {
            console.log("Problem reading or writing " + filemaploc + " : " + err.message)
        }

        //create the output directories
        //mkdirp.sync(destination + 'css/');
        //mkdirp.sync(destination + 'js/');

        new compressor.minify({
            type    : 'yui-js',
            fileIn  : [__dirname + '/../base/js/ace.js'],
            fileOut : destination + '/js/ace.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/worker-javascript.js'],
            fileOut : destination + '/js/worker-javascript.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/theme-chrome.js'],
            fileOut : destination + '/js/theme-chrome.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/../base/js/mode-javascript.js'],
            fileOut : destination + '/js/mode-javascript.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-css' : 'no-compress',
            fileIn  : [me.stylesheet, me.treestyle],
            fileOut : destination + '/css/app.css'
        });
    }

    /**
     * Progressive ID generator
     * @param {String} prefix String to prepend to the ID.  Default to 'e-'.
     */
    id (prefix) {
        prefix = prefix || 's-';
        return prefix + internalId++;
    }

    /**
     * Replace all "@example" blocks with the markup used for embedded anonymous fiddles
     * @param {String} str The string with @example blocks (maybe) to use as fiddles
     */
    wrapFiddles (str) {
        let me = this,
            fiddleWrap = '<div class="da-inline-code-wrap da-inline-code-wrap-fiddle" id="{2}">' +
                '<div class="da-inline-fiddle-nav">' +
                '<span class="da-inline-fiddle-nav-code da-inline-fiddle-nav-active x-fa fa-code">Code</span>' +
                '<span class="da-inline-fiddle-nav-fiddle x-fa fa-play-circle">Fiddle</span>' +
                '</div>' +
                '<div id="{0}" class="ace-ct">{1}</div>' +
                '</div>',
            out;

        out = str.replace(/(<pre><code>(?:@example))((?:.?\s?)*?)(?:<\/code><\/pre>)/mig, function (match, p1, p2) {
            let ret = p2.trim(),
            //id = Ext.id(null, 'da-ace-editor-'),
                id = me.id(),
                wrapId = me.id();

            ret = Utils.format(fiddleWrap, id, ret, wrapId);

            return ret;
        });

        return out;
    }
}

module.exports = Base;
