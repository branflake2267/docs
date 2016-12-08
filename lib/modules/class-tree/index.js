'use strict';

const fs     = require('fs');
const util   = require('util');
const path   = require('path');
const Utils  = require('../shared/Utils');
const mkdirp = require('mkdirp');
const Base   = require('../base');
const debug  = require('../../Debug');
const Tree   = require('../shared/Tree');

const hashStartRe = /^#/;
const linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const imgRe       = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;

class ClassTree extends Base {
    constructor (options) {
        super(options);

        this.classes  = [];
    }

    run (skipBefore) {
        let dt = new Date();
        let me = this;

        if (me.beforeExecute && !skipBefore) {
            // overwrite here if possible
            me.beforeExecute();
        }

        me.execute(me.input, me.destination);
        console.log(new Date() - dt);
    }

    execute (inputDir, outputDir) {
        this.parser(this.classNames, this.docDir);
    }

    /**
     *
     */
    processMemberSearch(member, i, json, type, searchIndex) {
        if (!member.hide && !member.from) {
            let acc = member.access === 'private' ? 'i' : (member.access === 'protected' ? 'o' : 'p'),
                extras;

            if (member.removedVersion) {
                extras = 'r';
            } else if (member.deprecatedVersion) {
                extras = 'd';
            } else if (member.static) {
                extras = 's';
            } else if (member.readonly) {
                extras = 'ro';
            };

            // add any SASS mixin params found to the search index so they're discoverable in a global search
            if (member.$type === 'css_mixin' && member.items && member.items.length) {
                Utils.each(member.items, function (param) {
                    searchIndex[i]['z.' + param.name] = {
                        a: acc,
                        t: member.name
                    };
                });
            }

            searchIndex[i][json.typeRef[type] + '.' + member.name] = {
                a: acc
            };

            if (extras) {
                searchIndex[i][json.typeRef[type] + '.' + member.name].x = extras;
            }

            if (member.accessor) {
                searchIndex[i][json.typeRef[type] + '.' + member.name].g = 1;
            }
        }
    }

    /**
     * @param {String} suffix A suffix to append to the search key.  Helpful when you are
     * combining multiple search results together.
     */
    getSearch(suffix) {
        let me = this,
            map = me.classMap,
            toolkit = me.toolkit,
            searchIndex = {},
            i = 0,
            typeRef = {
                configs: 'c',
                properties: 'p',
                "static-properties": 'sp',
                methods: 'm',
                "static-methods": 'sm',
                events: 'e',
                vars: 'v',
                "sass-mixins": 'x',
                "sass-mixin-params": 'z'
            };

        suffix = suffix || '';

        Utils.each(map, function (name, json) {
            let cls = json.global.items[0],
                memberTypeGroups = cls.items,
                key = i + suffix;

            json.typeRef = typeRef;

            searchIndex[key] = {
                n: cls.name,
                t: toolkit ? toolkit : null
            };

            if (cls.access) {
                searchIndex[key].a = 'i';
            }
            if (cls.alias) {
                let alias = cls.alias.split(',');
                searchIndex[key].x = alias;
            }
            if (cls.alternateClassNames) {
                let classNames = cls.alternateClassNames.split(',');
                searchIndex[key].g = classNames;
                classNames.forEach(function (altName) {
                    searchIndex[altName + key] = {
                        n: altName,
                        t: toolkit ? toolkit : null,
                        a: cls.access ? 'i' : null
                    };
                });
            }

            if (memberTypeGroups && memberTypeGroups.length) {
                memberTypeGroups.forEach(function(memberType) {
                    let members = memberType.items,
                        type    = memberType.$type;

                    if (members && members.length) {
                        members.forEach(function(member, j){
                            me.processMemberSearch(member, key, json, type, searchIndex);
                        });
                    }
                });
            }

            i++;
        });

        return searchIndex;
    }

    /**
     * Creates the tree information to be injected as the tree.js file on page load
     * @returns {*}
     */
    createTree () {
        let me      = this,
            classes = me.classNames,
            map     = me.classMap,
            toolkit = me.toolkit,
            tree;

        me.log('info', 'Creating Class Tree');

        tree = new Tree({
            nodeParser : function(node) {
                let item = map[node.className];

                if (item) {
                    let root     = item.global.items[0],
                        access   = root.access;

                    if(root.extended && root.extended.indexOf('Ext.Component') != -1) {
                        node.type = 'component';
                    } else {
                        node.type = 'class';
                    }

                    if(root.singleton === true) {
                        node.type = 'singleton';
                        node.isSingleton = true;
                    }

                    if (root.$type != "class" && root.$type != "enum") {
                        node.type = 'orphan';
                    }

                    if (access) {
                        node.access = access;
                    }
                }

                node.expanded = (node.className === 'Ext' || node.className === 'ST');

                if (node.className === 'Ext' || node.className === 'ST') {
                    node.first = true;
                }

                //node.elIdSlug = node.className.replace(/\./g, '-').toLowerCase();
                node.elIdSlug = (toolkit ? (toolkit + '-') : '') + node.className.replace(/\./g, '-').toLowerCase();

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
         outputDir = outputDir || this.destination;
         let tree = JSON.stringify(this.createTree(), null, this.options.compress ? 0 : 4);

         this.log('info', 'Writing', 'class_tree.json');

         mkdirp.sync(outputDir);

         fs.writeFileSync(outputDir + 'class_tree.json', tree, 'utf-8');
     }
}

module.exports = ClassTree;
