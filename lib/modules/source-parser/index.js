'use strict';

const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const compressor = require('node-minify');
const handlebars = require('handlebars');
const jsdom      = require('jsdom');
const marked     = require('sencha-marked');
const swag       = require('swag');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const debug      = require('../../Debug');
const wrench     = require('wrench');
const highlights = require('highlights');
const shell      = require('shelljs');

const highlighter = new highlights();
const containerTypes = {
    configs: "cfg",
    properties: "property",
    methods: "method",
    events: "event",
    vars: "var",
    "sass-mixins": "method",
    "static-methods": "static-method",
    "static-properties": "static-property"
}

const filemap = {};
const uniqueNames = {};

class Source extends Base {
    get defaultOptions () {
        return {
            destination : {
                type  : 'path',
                value : __dirname + '/../../output/src'
            },
            input       : {
                type  : 'path',
                value : __dirname + '/../../allfiles'
            },
            stylesheet  : __dirname + '/css/styles.css'
        };
    }

    static register (argv) {
        argv.mod({
            mod         : 'source-parser',
            description : 'Parse Source',
            options     : [
                {
                    name        : 'config',
                    short       : 'con',
                    type        : 'string',
                    description : 'The config file holding all of the configurations for the build process.',
                    example     : '`index source-parser --config=./classic-toolkit-config.json`'
                },
                {
                    name        : 'input',
                    short       : 'i',
                    type        : 'string',
                    description : 'The location where the markdown files are contained. Defaults to "./guides".',
                    example     : '`index guide-parser --input=./guides` or `index guide-parser -i ./guides`'
                },
                {
                    name        : 'destination',
                    short       : 'd',
                    type        : 'string',
                    description : 'The destination location of the generated markdown. Defaults to "./output".',
                    example     : '`index guide-parser --destination=./output` or `index guide-parser -d ./output`'
                },
                {
                    name        : 'pversion',
                    short       : 'pv',
                    type        : 'string',
                    description : 'The version of the product you are building',
                    example     : 'index source-parser -v 1.0.1'
                },
                {
                    name        : 'skip',
                    short       : 's',
                    type        : 'boolean',
                    description : 'Set to true to skip the build process'
                }
            ]
        });
    }

    /**
     * Add anchor names to lines
     * @param fileNum
     * @param lines
     * @param items
     */
    addAnchors(fileNum, lines, items) {
        let me = this;

        items.forEach(function(item) {
            let loc  = me.getItemLoc(item);

            if (loc[0] === fileNum) {
                lines[loc[1]] = '<a name="' + item.name + '">' + lines[loc[1]];
            }

            if (item.items) {
                item.items.forEach(function(container) {
                    let name = item.name + "-" + containerTypes[container.$type] + "-";

                    if (container.items) {
                        container.items.forEach(function(member) {
                            let loc  = me.getItemLoc(member);

                            if (loc && loc[1]) {
                                loc[1] = loc[1]-1;
                            }

                            if (loc && loc[0] === fileNum) {
                                lines[loc[1]] = '<a name="' + name + member.name + '">' + lines[loc[1]];
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Get the file specific index
     * @param item
     * @returns {*}
     */
    getFileSrc(item){
        return this.getItemLoc(item)[0];
    }

    /**
     * Get the location array
     * @param item
     * @returns {*}
     */
    getItemLoc(item){
        let txt  = item.src.text,
            name = item.src.name,
            fileSrc = (txt || name);

        if(!fileSrc) {
            return null;
        }

        fileSrc = fileSrc.split(',');

        return [+ fileSrc[0], + fileSrc[1]];
    }

    /**
     * Make sure file is unique
     * @param name
     * @returns {string}
     */
    uniquify(name) {
        let key  = name.toLowerCase(),
            num  = (uniqueNames[key] || (uniqueNames[key] = 0)) + 1;

        uniqueNames[key] = num;

        if (num > 1) {
            name += "-" + (num-1);
        }
        return name + '.html';
    }

    /**
     *
     */
    beforeExecute (fileArray) {
        new compressor.minify({
            type    : 'yui-css',
            fileIn  : [__dirname + '/css/styles.css'],
            fileOut : this.output + '/src/css/styles.css'
        });
    }

    run () {
        let me = this,
            template   = handlebars.compile(fs.readFileSync(__dirname + '/template.hbs', 'utf-8')),
            projectConfigs = require('../../configs/projectConfigs'),
            hasVersions = projectConfigs.productIndex[projectConfigs.normalizedProductList[me.config]].hasVersions,
            version    = this.pversion,
            output     = hasVersions ? path.join(me.destination, version) + '/' : me.destination + '/',
            allCls     = require('../../' + this.input +  me.allClasses),
            srcOutput  = output + 'src/',
            files      = allCls.files,
            items      = (allCls) ? allCls.global.items : null,
            imagePath  = (me.imagePath) ? me.imagePath : null,
            filePaths  = [];

        this.output = output;

        mkdirp.sync(output);

        //create the output directories
        mkdirp.sync(path.join(srcOutput, 'css'));
        mkdirp.sync(path.join(srcOutput, 'map'));

        if (imagePath) {
            wrench.copyDirSyncRecursive(imagePath, output + 'images/', {
                forceDelete: true
            });

            wrench.chmodSyncRecursive(output + 'images/', '0755');
        }

        if (me.beforeExecute) {
            // overwrite here if possible
            me.beforeExecute();
        }

        if (items) {
            items.forEach(function(item) {
                let filesrc = me.getFileSrc(item);

                filePaths[item.name] = me.uniquify(item.name);
            });
        }

        files.forEach(function(file,idx) {

            if (!filePaths[idx]) {
                let name = path.basename(file);

                filePaths[idx] = me.uniquify(name);
            }

            let fname = filePaths[idx],
                floc  = file,
                fsrc  = idx,
                outputName = srcOutput + fname,
                lines, html, view;

            // Normalize links to submodules relative to this location
            floc  = floc.replace('../../../../docs', '../docs');
            floc  = floc.replace('../../../../modules', '../modules');
            floc  = floc.replace('../node_modules', '../modules/orion/node_modules');
            floc = floc.replace('../src/', '../modules/SpaceSDK');

            debug.info('Reading ' + floc);

            html = highlighter.highlightSync({
                filePath: floc
            });

            lines = html.split('<div class="line">');

            me.addAnchors(fsrc,lines,items);

            lines.forEach(function(line, idx) {
                if (idx != 0) {
                    lines[idx] = '<a name="line' + idx + '">' + line;
                }
            });

            html = lines.join('<div class="line">');

            debug.info('Prettifying ' + floc);

            view = {
                content    : html,
                name       : fname.replace('.html',''),
                title      : me.title,
                version    : version,
                numVer     : me.numberVer,
                meta       : me.meta
            };

            fs.writeFileSync(outputName, template(view), 'utf-8');

            filemap[files[fsrc]] = fname;
        });

        fs.writeFileSync(path.join(srcOutput,'map','filemap.json'), JSON.stringify(filemap), 'utf-8');
    }
}

module.exports = Source;
