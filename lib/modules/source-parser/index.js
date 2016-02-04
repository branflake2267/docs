'use strict';

const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const compressor = require('node-minify');
const handlebars = require('handlebars');
const jsdom      = require('jsdom');
const marked     = require('sencha-marked');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const debug      = require('../../Debug');
const wrench     = require('wrench');
const hljs       = require('highlight.js');
const highlights = require('highlights');

const highlighter = new highlights();

const containertypes = {
    configs:          "cfg",
    properties:       "property",
    methods:          "method",
    events:           "event",
    vars:             "var",
    "sass-mixins":    "method",
    "static-methods": "static-method",
    "static-properties": "static-property"
}

const filemap = {};

class Source extends Base {
    get defaultOptions () {
        return {
            destination : {
                type  : 'path',
                value : __dirname + '/../../src/'
            },
            input       : {
                type  : 'path',
                value : __dirname + '/../../allfiles'
            },
            template  : __dirname + '/template.hbs',
            localsdk  : '/var/www/sites/SDK6/ext/',
            localprim : '/var/www/sites/docs/',
            localpkg : '/var/www/sites/SDK6/packages/'
        };
    }

    static register (argv) {
        argv.mod({
            mod         : 'source-parser',
            description : 'Parse Source',
            options     : [
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
     * @param filenum
     * @param lines
     * @param items
     */
    addAnchors(filenum, lines, items) {
        let me = this;

        items.forEach(function(item) {
            let loc  = me.getItemLoc(item);

            if (loc[0] === filenum) {
                lines[loc[1]] = '<a name="' + item.name + '">' + lines[loc[1]];
            }

            if (item.items) {
                item.items.forEach(function(container) {
                    let name = item.name + "-" + containertypes[container.$type] + "-";

                    if (container.items) {
                        container.items.forEach(function(member) {
                            let loc  = me.getItemLoc(member);

                            if (loc && loc[0] === filenum) {
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
            filesrc = (txt || name);

        if(!filesrc) {
            return null;
        }

        filesrc = filesrc.split(',');

        return [+ filesrc[0], + filesrc[1]];
    }

    run () {
        let me         = this,
            options    = this.options,
            input      = options.input,
            output     = options.destination,
            localsdk   = options.localsdk,
            localprim  = options.localprim,
            localpkg   = options.localpkg,
            allcls     = JSON.parse(fs.readFileSync(input + 'classic-all-classes.json', 'utf-8')),
            files      = allcls.files,
            items      = allcls.global.items,
            clsarr     = [], filearr = [], filepaths = [];

        mkdirp.sync(output);

        if (items) {
            /*items.forEach(function(item) {
                let filesrc = me.getFileSrc(item);

                clsarr.push([item.name, files[filesrc], filesrc]);
                filearr.push(files[filesrc]);
            });*/

            items.forEach(function(item) {
                let filesrc = me.getFileSrc(item);

                filepaths[filesrc[0]] = item.name + '.html';
            });
        }

        let uniqueNames = {};

        files.forEach(function(file,idx) {
            if (!filepaths[idx]) {
                let name = path.basename(file),
                    num  = (uniqueNames[name] || (uniqueNames[name] = 0)) + 1;

                uniqueNames[name] = num;

                filepaths[idx] = name + '-' + num + '.html';
            }

            let fname = filepaths[idx],
                floc  = file,
                fsrc  = idx,
                outputname = output + fname,
                lines, html;

            floc = floc.replace('../../../docs/', localprim).replace('../../ext/', localsdk).replace('../../packages/', localpkg);

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

            fs.writeFileSync(outputname, html, 'utf-8');

            filemap[files[fsrc]] = fname;
        });

        fs.writeFileSync(path.join(output,'filemap.json'), JSON.stringify(filemap), 'utf-8');
    }
}

module.exports = Source;
