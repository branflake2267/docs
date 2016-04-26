'use strict';

const fs     = require('fs');
const util   = require('util');
const Utils  = require('../shared/Utils');
const junk   = require('junk');
const mkdirp = require('mkdirp');
const Base   = require('../base');
const debug  = require('../../Debug');
const Tree   = require('../shared/Tree');
const fileArray = [];

class ClassTree extends Base {
    constructor (targets, options) {
        super(targets, options);

        this.classes  = [];
        this.classMap = {};
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
            }
        };
    }

    static register (argv) {
        argv.mod({
            mod         : 'class-tree',
            description : 'Parse class tree into JSON',
            options     : [
                {
                    name        : 'input',
                    short       : 'i',
                    type        : 'string',
                    description : 'The location where the JSON files are contained. Defaults to "./json".',
                    example     : '`index json-parser --input=./json` or `index json-parser -i ./json`'
                },
                {
                    name        : 'destination',
                    short       : 'd',
                    type        : 'string',
                    description : 'The destination location of the generated JSON. Defaults to "./output".',
                    example     : '`index json-parser --destination=./output` or `index json-parser -d ./output`'
                },
                {
                    name        : 'compress',
                    short       : 'c',
                    type        : 'boolean',
                    description : 'Whether or not to compress the JSON or leave whitespaces. Defaults to `false`.',
                    example     : '`index json-parser --compress` or `index json-parser -c'
                }
            ]
        });
    }

    run (skipBefore) {
        let me = this;

        if (me.beforeExecute && !skipBefore) {
            // overwrite here if possible
            me.beforeExecute(fileArray);
        }

        me.execute(me.input, me.destination);
    }

    execute (inputDir, outputDir) {
        let me = this;

        //Read all of our DOXI JSON output files into data object
        let files = fs.readdirSync(inputDir);

        let tempData = [];

        /*if (error) {
            throw(error);
        }*/

        if (!files) {
            throw ('You seem to be missing your json folder...exiting parser');
        }

        if (files) {
            files.forEach(function(file) {
                if (junk.not(file) && !file.includes('-all-classes')) {
                    debug.info('Reading ', file);

                    let json = fs.readFileSync(inputDir + file, 'utf-8');

                    tempData.push([me.addClass(file, json), file]);

                    if(fileArray.indexOf(file) == -1) {
                        fileArray.push(file);
                    }
                }
            });
        }

        debug.info('Finished reading files into memory...');

        // Send all of the tempData to JSON Parser
        me.parser(tempData, outputDir);
    }

    addClass (file, json) {
        let name = file.replace('.json', '');

        this.classes.push(name);

        this.classMap[name] = JSON.parse(json);

        return json;
    }

    /**
     * Creates the tree information to be injected as the tree.js file on page load
     * @returns {*}
     */
    createTree () {
        let me      = this,
            classes = me.classes,
            map     = me.classMap,
            tree;

        debug.info('Creating Class Tree');

        tree = new Tree({
            nodeParser : function(node) {
                let item = map[node.className];

                if (item) {
                    let root   = item.global.items[0],
                        access = root.access;

                    if(root.extended && root.extended.indexOf('Ext.Component') != -1) {
                        node.type = 'component';
                    } else {
                        node.type = 'class';
                    }

                    if(root.singleton === true) {
                        node.type = 'singleton'
                    }

                    if (access) {
                        node.access = access;
                    }
                }

                node.expanded = (node.className === 'Ext' || node.className === 'ST');

                if (node.className === 'Ext' || node.className === 'ST') {
                    node.first = true;
                }

                node.elIdSlug = node.className.replace(/\./g, '-').toLowerCase();

                return node;
            }
        }).fromArray(classes);

        return tree;
    }

    /**
     * Parse all of the incoming data into a json file for later compression and consumption
     * @param datas
     * @param outputDir
     */
    parser (datas, outputDir) {
        let tree = JSON.stringify(this.createTree(), null, this.options.compress ? 0 : 4);

        debug.info('Writing', 'class_tree.json');

        mkdirp.sync(outputDir);

        fs.writeFileSync(outputDir + 'class_tree.json', tree, 'utf-8');
    }
}

module.exports = ClassTree;
