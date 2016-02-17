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
            stylesheet  : __dirname + '/css/styles.css',
            template  : __dirname + '/template.hbs'
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
                },{
                    name        : 'template',
                    short       : 't',
                    type        : 'string',
                    description : 'The handlebars template file. Defaults to "./modules/guide-parser/template.hbs".',
                    example     : '`index guide-parser --template=./modules/guide-parser/template.hbs` or `index guide-parser -t ./modules/guide-parser/template.hbs`'
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

    run () {
        let me = this,
            options = me.options,
            stylesheet = options.stylesheet,
            template = handlebars.compile(fs.readFileSync(options.template, 'utf-8')),
            configFile = fs.readFileSync(options.config, 'utf-8'),
            configs = JSON.parse(configFile),
            basePaths = JSON.parse(fs.readFileSync(configs.basePaths, 'utf-8')),
            input = configs.input.value || options.input,
            output = configs.destination.value || options.destination,
            localPrim = basePaths.localPrim || options.localPrim,
            localSDK = (basePaths.localSDK + basePaths.extFolder) || options.localSDK,
            imagePath = (configs.imagePath) ? (basePaths.localSDK + configs.imagePath) : null,
            localPkg = (basePaths.localSDK + basePaths.pkgFolder) || options.localPkg,
            localSpace = basePaths.localSpace || options.localSpace,
            allCls = JSON.parse(fs.readFileSync(input + configs.allClasses, 'utf-8')),
            srcOutput = output + 'src/',
            files = allCls.files,
            items = allCls.global.items,
            filePaths = [];

        mkdirp.sync(output);

        //create the output directories
        mkdirp.sync(path.join(srcOutput, 'css'));
        mkdirp.sync(path.join(srcOutput, 'map'));

        if (imagePath) {
            wrench.copyDirSyncRecursive(localSDK + '../docs/resources', output + 'images/', {
                forceDelete: true
            });

            wrench.chmodSyncRecursive(output + 'images/', '0755');
        }

        new compressor.minify({
            type    : 'yui-css',
            fileIn  : [stylesheet, __dirname + '/css/styles.css'],
            fileOut : srcOutput + '/css/styles.css'
        });

        if (items) {
            items.forEach(function(item) {
                let filesrc = me.getFileSrc(item);

                filePaths[filesrc] = me.uniquify(item.name);
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

            // This nonsense is to deal with my custom path for SDK6 instead of SDK
            floc = floc.replace('../../../docs/', localPrim).replace('../../ext/', localSDK).replace('../../packages/', localPkg);
            floc = floc.replace('../node_modules/', '../../orion/node_modules/');
            floc = floc.replace('../src/', localSpace);

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
                name       : fname
            };

            fs.writeFileSync(outputName, template(view), 'utf-8');

            filemap[files[fsrc]] = fname;
        });

        fs.writeFileSync(path.join(srcOutput,'map','filemap.json'), JSON.stringify(filemap), 'utf-8');
    }
}

module.exports = Source;
