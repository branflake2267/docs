'use strict';

const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const compressor = require('node-minify');
const handlebars = require('handlebars');
const marked     = require('sencha-marked');
const mkdirp     = require('mkdirp');
const Base       = require('../base');
const debug      = require('../../Debug');
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
};

const filemap = {}, uniqueNames = {};

class Source extends Base {
    /**
     * Add anchor names to lines
     * @param fileNum
     * @param lines
     * @param items
     */
    static addAnchors(fileNum, lines, items) {
        for (var i = 0, len = items.length; i < len; ++i) {
            let item = items[i],
                loc  = Source.getItemLoc(item);

            if (loc[0] === fileNum) {
                lines[loc[1]] = '<a name="' + item.name + '">' + lines[loc[1]];
            }

            if (item.items) {

                for (var j = 0, itemslen = item.items.length; j < itemslen; ++j) {
                    let container = item.items[j],
                        name = item.name + "-" + containerTypes[container.$type] + "-";

                    if (container.items) {
                        for (var k = 0, contlen = container.items.length; k < contlen; ++k) {
                            let member = container.items[k],
                                memloc  = Source.getItemLoc(member);

                            if (memloc && memloc[1]) {
                                memloc[1] = memloc[1]-1;
                            }

                            if (memloc && memloc[0] === fileNum) {
                                lines[memloc[1]] = '<a name="' + name + member.name + '">' + lines[memloc[1]];
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Get the location array
     * @param item
     * @returns {*}
     */
    static getItemLoc(item){
        if (item.src) {
            let txt  = item.src.text || null,
                name = item.src.name || null,
                fileSrc = (txt || name);

            if(!fileSrc) {
                return null;
            }

            fileSrc = fileSrc.split(',');

            return [+ fileSrc[0], + fileSrc[1]];
        } else {
            return null;
        }
    }

    /**
     * Make sure file is unique
     * @param name
     * @returns {string}
     */
    static uniquify(name) {
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
        let dt = new Date(),
            me = this,
            template   = handlebars.compile(fs.readFileSync(__dirname + '/template.hbs', 'utf-8')),
            version    = me.pversion,
            output     = me.docDir,
            allCls     = require('../../' + me.input +  me.allClasses),
            srcOutput  = path.join(output, 'src'),
            files      = allCls.files,
            items      = (allCls) ? allCls.global.items : null,
            filePaths  = [];

        me.output = output;

        mkdirp.sync(output);

        //create the output directories
        mkdirp.sync(path.join(srcOutput, 'css'));
        mkdirp.sync(path.join(srcOutput, 'map'));

        if (me.beforeExecute) {
            // overwrite here if possible
            me.beforeExecute();
        }

        if (items) {
            for (var k = 0, itemslen = items.length; k < itemslen; ++k) {
                let name = items[k].name;
                filePaths[name] = Source.uniquify(name);
            }
        }

        for (var i = 0, len = files.length; i < len; ++i) {
            let file = files[i],
                idx  = i;

            if (!filePaths[idx]) {
                let name = path.basename(file);

                filePaths[idx] = Source.uniquify(name);
            }

            let fname = filePaths[idx],
                floc  = file,
                fsrc  = idx,
                outputName = path.join(srcOutput, fname),
                lines, html, view;

            // Normalize links to sub-modules relative to this location
            floc  = floc.replace('../../../../docs', '../docs');
            floc  = floc.replace('../../../../modules', '../modules');
            floc  = floc.replace('../node_modules', '../modules/orion/node_modules');

            me.log('info', 'Reading ' + floc);

            html = highlighter.highlightSync({
                filePath: floc
            });

            lines = html.split('<div class="line">');

            Source.addAnchors(fsrc,lines,items);

            for (var j = 0, lineslen = lines.length; j < lineslen; ++j) {
                if (j != 0) {
                    lines[j] = '<a name="line' + j + '">' + lines[j];
                }
            }

            html = lines.join('<div class="line">');

            me.log('info', 'Prettifying ' + floc);

            view = {
                content    : html,
                name       : fname.replace('.html',''),
                title      : me.title,
                version    : version,
                numVer     : me.numberVer,
                meta       : me.meta
            };

            fs.writeFile(outputName, template(view), 'utf8', (err) => {
                if (err) throw err;
            });

            filemap[files[fsrc]] = fname;
        }

        fs.writeFileSync(path.join(srcOutput,'map','filemap.json'), JSON.stringify(filemap), 'utf-8');

        me.reconcileRepos(me.options, true);
        console.log(new Date() - dt);
    }
}

module.exports = Source;
