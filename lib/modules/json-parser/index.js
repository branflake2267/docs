'use strict';

const GP         = require('../guide-parser');
const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const handlebars = require('handlebars');
const mkdirp     = require('mkdirp');
const wrench     = require('wrench');
const junk       = require('junk');
const marked     = require('sencha-marked');
const utility    = require('util');
const compressor = require('node-minify');
const ClassTree  = require('../class-tree');
const Tree       = require('../shared/Tree');
const Utils      = require('../shared/Utils');
const debug      = require('../../Debug');
const xmlbuild   = require('xmlbuilder');

const safeLinkRe  = /(\[\]|\.\.\.)/g;
const widgetRe    = /widget./g;
const memberTypes = ['cfg', 'property', 'method', 'event', 'css_var-S', 'css_mixin'];

const search = [];

class JsonParser extends ClassTree {
    constructor (options) {
        super(options);

        this.createLinkMap(this.input, path.join(this.destination, this.pversion));
    }

    beforeExecute () {
        super.beforeExecute();
    }

    createLinkMap(input, output) {
        this.log('info', 'Creating a map link.  It\'s dangerous to go alone');

        let me = this,
            linkmap = [],
            map = me.classMap;

        Utils.each(map, function (key, value) {
            let name = value.global.items[0].name,
                fname = key + '.html';

            linkmap.push({
                f: fname,
                c: name
            });
        });

        me.linkmap = linkmap;
    }

    /**
     * Determine whether or not a string matches a key in an object
     * @param str
     * @param obj
     * @returns {*}
     */
    inObject (str, obj) {
        let key;

        for(key in obj) {

            if (key.indexOf(str) > -1) {
                return obj[key];
            }
        }

        return false;
    }

    scrubText (text, cls) {
        var idRe = /[^\w]+/g;

        if (!text) {
            return '';
        }

        return marked(text, {
            addHeaderId: !cls ? false : function (text, level, raw) {
                return cls.name.toLowerCase().replace(idRe, '-') + '_' + raw.toLowerCase().replace(idRe, '-');
            },
            appendLink: true,
            decorateExternal: true
        });
    }

    /**
     * @method createLink
     * @param href
     * @param text
     */
    createLink (href, text) {
        let linkmap = this.linkmap,
            me      = this,
            openExternal = '',
            hash, split;

        if (href.includes('#') && href.charAt(0) != '#') {
            split = href.split('#');
            href  = split[0];
            hash  = '#' + split[1];
        }

        if (!text) {
            text = href;
        }

        linkmap.forEach(function (item) {
            if (href === item['c']) {
                href = item['f'];
            }
        });

        if (hash) {
            href = href + hash;
        }

        if (!href.includes('.html') && href.charAt(0) != '#') {
            href += '.html';
        }

        memberTypes.forEach(function (item) {
            if (text.includes(item + '-')) {
                text = text.replace(item + '-', '');
            }
        });

        if (!href.includes('sencha.com') && (href.includes('http:')) || href.includes('https:')) {
            openExternal = "class='external-link' target='_blank' ";
        }

        return "<a " + openExternal + "href='" + href + "'>" + text + "</a>";
    }

    parseLink(fileString, name) {
        let cleanString = (fileString && fileString.indexOf('../') > -1) ? fileString.replace(/\.\.\//g,'') : fileString,
            parsedLink = this.inObject(cleanString, this.filemap),
            classLink = name;

        return {
            link : parsedLink || (classLink + '.html'),
            class: (parsedLink && parsedLink !== (classLink + '.html')) ? classLink : null
        };
    }

    /**
     * Check to see if this file exists within the array of files we've kept
     * @param item
     * @returns {boolean}
     */
    fileExists (item) {
        //let thisfile = item + '.json';
        let thisfile = item;

        return !!(this.classNames.indexOf(thisfile) != -1);
    }

    splitInline (text, joinStr) {
        if (!text) {
            return '';
        }

        text.replace(/\|/, '/');
        let me = this,
            str = [],
            delimiter = text.includes(',') ? ',' : (text.includes('/') ? '/' : ','),
            joinWith = joinStr || delimiter;

        if (text && text.includes(delimiter)) {
            text = text.split(delimiter);

            text.forEach(function (item) {
                let link = item.replace(safeLinkRe, '');

                if (me.fileExists(link)) {
                    str.push(me.createLink(link, item));
                } else {
                    str.push(item);
                }
            });
        } else {
            let link = text.replace(safeLinkRe, '');

            if (me.fileExists(link)) {
                str.push(me.createLink(link, text));
            } else{
                str.push(text);
            }
        }

        return str.join(joinWith);
    }

    /**
     *
     */
    processHierarchy (cls) {
        var ret = '<div class="list">';

        ret += this.splitInline(this.processCommaLists(cls.extended, false, true, true), '<div class="hierarchy">');
        ret += '<div class="hierarchy">' + cls.name;
        ret += Utils.repeat('</div>', ret.split('<div').length - 1);

        return ret;
    }

    /**
     * @method processCommaLists
     * @param list The array of items to process
     * @param [sort] Sort the array elements
     * @param [trim] Pop the last element.  **Note:** Pop is processed before revers and
     * sort.
     * @param [rev] Reverse the list
     */
    processCommaLists (list, sort, trim, rev) {
        let arr = list.split(',');

        if (trim) {
            arr.pop();
        }

        if (rev) {
            arr.reverse();
        }

        if (sort) {
            arr.sort();
        }

        return arr.join(',');
    }

    /**
     * Get a member's location array
     * @param item
     * @returns {*}
     */
    getMemberLoc(item){
        let txt  = item.src.text,
            name = item.src.name,
            fileSrc = (txt || name);

        if(!fileSrc) {
            return null;
        }

        fileSrc = fileSrc.split(',');

        return fileSrc[0];
    }

    /**
     *
     */
    /*getSearch () {
        return super.getSearch();
    }*/

    /**
     *
     */
    /*prepareTreeHref (tree) {
        tree = Utils.from(tree);

        let me = this;

        Utils.each(tree, function (item) {
            if (item.href) {
                item.href = path.join(me.docDir, item.href);
            }
            if (item.children) {
                me.prepareTreeHref(item.children);
            }
        });
    }*/

    parser (classNames, outputDir) {
        outputDir = outputDir || this.destination;

        let me             = this,
            version        = me.pversion,
            versionNumber  = version ? version.split("-")[0] : version,
            productTree    = me.productTree,
            //searchIndex    = {},
            otherToolkit   = me.otherToolkit || null,
            toolkit        = me.toolkit,
            searchObj, otherToolkitInstance;

        if (me.otherToolkitConfig) {
            otherToolkitInstance = new JsonParser({
                config: me.otherToolkitConfig,
                pversion: me.getProductVersion() + '-' + otherToolkit
            })
        }

        if (classNames && classNames.length) {
            //let tree = me.createTree(),
            let root = xmlbuild.create('urlset').att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9"),
                enumProperty = null,
                myGuideParser, guideJson,
                classMap = Object.assign({}, me.classMap),
                sitemap, smOutput = [], xmlString, hasIndex, guideJsonObj, quickStartTree,
                tree, classicTree, modernTree;

            if (otherToolkit) {
                classicTree = toolkit === 'classic' ? me.createTree() : otherToolkitInstance.createTree();
                modernTree  = toolkit === 'modern'  ? me.createTree() : otherToolkitInstance.createTree();
            } else {
                tree = me.createTree();
            }

            //me.prepareTreeHref(tree);

            //if (otherToolkit) {
                //me.toolkitLink = versionNumber + '-' + otherToolkit;
                //me.toolkitLink = path.join(me.productDir, otherToolkit);
            //}

            if (me.hasGuides) {
                guideJsonObj = new GP(me.options).getGuideJson(true);
                quickStartTree = guideJsonObj.quickStartTree;
                guideJson = guideJsonObj.tree;
            }

            Utils.each(classNames, function(name) {
                let obj                  = classMap[name],
                    cls                  = obj.global.items[0],
                    memberTypeGroups     = cls.items,              // this is an array of member types (an object for configs, methods, events, etc.)
                    types                = cls.$type,
                    fileName             = name +  '.html',
                    view                 = {},
                    tempMemberTypeGroups = [],
                    newtemplate, output, alias, aliasName, clsSpec;

                me.processText(cls);

                if(cls.extended && cls.extended.indexOf('Ext.Component') != -1) {
                    clsSpec = 'component';
                } else if (cls.singleton === true) {
                    clsSpec = 'singleton'
                } else {
                    clsSpec = 'class';
                }

                obj.requiredConfigs = [];
                obj.optionalConfigs = [];
                obj.instanceMethods = {};
                obj.name = cls.name; // The class name
                obj.priority = {
                    configs: 0,
                    properties: 1,
                    "static-properties": 2,
                    methods: 3,
                    "static-methods": 4,
                    events: 5,
                    vars: 6,
                    "sass-mixins": 7
                };

                // Loop through memberTypeGroups so we can markup our member text
                if (memberTypeGroups && memberTypeGroups.length) {
                    memberTypeGroups.forEach(function(memberType) {
                        me.processMemberTypeGroups(memberType, obj);
                    });

                    // remove any member groups that have no items (no non-hidden ones at least)
                    memberTypeGroups.forEach(function (grp) {
                        if (grp.items && grp.items.length) {
                            tempMemberTypeGroups.push(grp)
                        }
                    });
                    memberTypeGroups = tempMemberTypeGroups.length ? tempMemberTypeGroups : memberTypeGroups;

                    // if we have configs
                    if (obj.configs) {
                        // put any required configs ahead of the optional configs
                        obj.configs.items = obj.requiredConfigs.concat(obj.optionalConfigs);

                        // associate getter / setter methods with their root configs
                        obj.configs.items.forEach(function (config) {
                            // occassionally, a nameless entity enters, but shouldn't leave
                            if (config.name || config.inheritdoc) {
                                config.name = config.name || config.inheritdoc.substr(config.inheritdoc.indexOf('#') + 1); // fixes the issue where there's not a name, but there is inheritdoc
                                me.buildConfig(config, obj);
                            }

                        });
                    }

                    // if we have static properties
                    if (obj.staticProperties) {
                        // and we also have properties, then add the static properties to the end 
                        // of the instance properties
                        me.addStaticValues('properties', obj, memberTypeGroups);
                    }

                    // then if we have static methods
                    if (obj.staticMethods) {
                        //do the same for static methods like we did for static properties
                        me.addStaticValues('methods', obj, memberTypeGroups);
                    }

                    // sort the member types into the desired output order
                    memberTypeGroups.sort(function(a, b) {
                      return a.outputPriority - b.outputPriority;
                    });
                }

                aliasName = cls.alias ? (cls.alias.includes('widget.') ? 'xtype' : cls.alias.substr(0, cls.alias.indexOf('.'))) : '';
                alias = cls.alias ? (cls.alias.includes('widget.') ? cls.alias.replace(widgetRe, '') : cls.alias) : null;
                if (alias) {
                    alias = alias.replace(',', ', ');
                }

                if (!me.headerLink) {
                    me.headerLink = {};
                    me.headerLink.link = obj.name;
                    me.headerLink.class = null;
                }

                if (cls.$type === 'enum') {
                    memberTypeGroups.forEach(function (grp) {
                        if (grp.$type === 'properties') {
                            grp.items.sort(function (a, b) {
                                if (a.name < b.name) {
                                    return -1;
                                } else if (a.name > b.name) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            });
                            enumProperty = grp.items[0].name;
                        }
                    });
                }

                //me.prependHrefPath(tree, outputDir);
                if (tree) {
                    me.prependHrefPath(tree, outputDir, outputDir);
                }
                if (classicTree) {
                    me.prependHrefPath(classicTree, outputDir, path.join(me.productDir, 'classic'));
                }
                if (modernTree) {
                    me.prependHrefPath(modernTree, outputDir, path.join(me.productDir, 'modern'));
                }
                /*if (me.hasGuides) {
                    //me.prependHrefPath(guideJson, outputDir);
                    me.prependHrefPath(guideJson, outputDir, path.join(me.productDir, 'guides'));
                }*/
                if (quickStartTree) {
                    //me.prependHrefPath(quickStartTree, outputDir);
                    me.prependHrefPath(quickStartTree, outputDir, path.join(me.productDir, 'guides'));
                }
                //me.prependHrefPath(productTree, outputDir);
                me.prependHrefPath(productTree, outputDir, outputDir);

                // Prepare the handlebars view object
                view = {
                    name              : obj.name,
                    altNames          : cls.alternateClassNames ? cls.alternateClassNames.split(',').join('<br>')                    : '',
                    mixins            : cls.mixed               ? me.splitInline(cls.mixed, '<br>')                                  : '',
                    localMixins       : cls.mixins              ? me.splitInline(cls.mixins, '<br>')                                  : '',
                    requires          : cls.requires            ? me.splitInline(cls.requires, '<br>')                               : '',
                    uses              : cls.uses                ? me.splitInline(cls.uses, '<br>')                                   : '',
                    extends           : cls.extended            ? me.processHierarchy(cls)                                           : '',
                    extenders         : cls.extenders           ? me.splitInline(me.processCommaLists(cls.extenders, false), '<br>') : '',
                    mixers            : cls.mixers              ? me.splitInline(me.processCommaLists(cls.mixers, false), '<br>')    : '',
                    aliasName         : aliasName,
                    classAlias        : alias,
                    classText         : me.scrubText(cls.text, cls),
                    classAccess       : cls.access,
                    deprecatedVersion : cls.deprecatedVersion,
                    deprecatedMessage : me.scrubText(cls.deprecatedMessage),
                    isDeprecated      : !!(cls.deprecatedMessage || cls.deprecatedVersion),
                    removedVersion    : cls.removedVersion,
                    removedMessage    : me.scrubText(cls.removedMessage),
                    isremoved         : !!(cls.removedMessage || cls.removedVersion),
                    singleton         : cls.singleton,
                    abstract          : cls.abstract,
                    classType         : types,
                    clsSpec           : clsSpec,
                    memberTypeGroups  : memberTypeGroups,
                    header            : me.header,
                    title             : me.title,
                    myToolkit         : me.toolkit,
                    toolkit           : otherToolkit ? Utils.capitalize(otherToolkit) : '',
                    toolkitLink       : me.toolkitLink,
                    headhtml          : me.headhtml,
                    fileName          : './src/' + me.headerLink.link + (me.headerLink.class ? '#' + me.headerLink.class : ''),
                    date              : me.date,
                    docroot           : me.docroot,
                    version           : version,
                    //imagePath         : 'home-images/',
                    imagePath         : path.relative(me.docDir, me.productDir + '/home-images') + '/',
                    stylesheet        : 'app.css',
                    //cssPath           : 'css/',
                    cssPath           : path.relative(me.docDir, me.productDir + '/css') + '/',
                    //homePath          : '',
                    homePath          : path.relative(me.docDir, me.productDir) + '/',
                    isApi             : true,
                    //jsPath            : 'js/',
                    jsPath            : path.relative(me.docDir, me.productDir + '/js') + '/',
                    hasApi            : me.hasApi,
                    hasGuides         : me.hasGuides,
                    isEnum            : cls.$type === 'enum',
                    enumProperty      : enumProperty,
                    canonical         : me.docroot + fileName,
                    product           : me.projectConfigs.normalizedProductList[me.config],
                    pversion          : me.pversion,
                    apiJson           : tree,
                    classicJson       : classicTree,
                    modernJson        : modernTree,
                    guideJson         : guideJson,
                    productTree       : productTree,
                    numVer            : me.numberVer,
                    meta              : me.meta,
                    hasVersions       : me.hasVersions,
                    helpText          : me.helpText,
                    helpToc           : me.helpToc,
                    quickStartJson    : quickStartTree
                };

                view.description = Utils.striphtml(view.classText);

                newtemplate = handlebars.compile(me.template); // Compile the handlebars template with the view object
                output      = newtemplate(view);

                // wrap @example code blocks with anonymous fiddles
                output = me.decorateExamples(output);

                if (!hasIndex) {
                    // use the description from the config file for the index page
                    view.description = me.description;
                    view.title = me.title;
                    view.canonical = me.docroot + 'index.html';
                    view.name = null;

                    me.createIndexPage(view);
                    hasIndex = true;
                }

                me.log('info', 'Writing: ' + fileName);

                smOutput.push({fileName: me.docroot + fileName, name: obj.name});

                fs.writeFileSync(outputDir + '/' + fileName, output, 'utf-8');
                delete me.headerLink;
            });

            for(var i = 1; i <= smOutput.length; i++) {
                if (smOutput[i]) {
                    var obj = {
                        url : {
                            loc: smOutput[i].fileName
                        }
                    };

                    root.ele(obj);
                }
            }

            xmlString = root.doc().end({ pretty: true, indent: '  ', newline: '\n' });

            me.log('info', 'Writing Site Maps');

            fs.writeFileSync(outputDir + '/api-sitemap.xml', xmlString, 'utf-8');

            me.log('info', 'Writing Search Index');

            searchObj = me.getSearch('a');

            if (me.otherToolkitConfig) {
                searchObj = Object.assign(searchObj, otherToolkitInstance.getSearch('b'));
            }

            //fs.writeFileSync(path.join(me.productDir, 'js', 'searchIndex.js'), 'var searchIndex = ' + JSON.stringify(me.getSearch('c')) + ';', 'utf-8');
            fs.writeFileSync(path.join(me.productDir, 'js', 'searchIndex.js'), 'var searchIndex = ' + JSON.stringify(searchObj) + ';', 'utf-8');
        }
    }

    addStaticValues(type, obj, memberTypeGroups) {
        let staticField = 'static' + type.charAt(0).toUpperCase() + type.slice(1);
        if (obj[type] && obj[type].items) {
            obj[type].items = obj[type].items.concat(obj[staticField].items);
        } else {
            // else have the static properties effectively take the place
            // of the instance properties and let the templater sort out the rest
            obj[staticField].outputPriority = type === 'properties' ? 1 : 3;
            obj[staticField].$type = type;
        }
        memberTypeGroups.splice(memberTypeGroups.indexOf(obj[staticField]), 1);
    }

    buildConfig(config, obj) {
        var idx;

        // connect the getter / setter to the config context if found
        config.getter = obj.instanceMethods['get' + Utils.capitalize(config.name)] || obj.instanceMethods['get' + config.name.toUpperCase()];
        config.setter = obj.instanceMethods['set' + Utils.capitalize(config.name)] || obj.instanceMethods['set' + config.name.toUpperCase()]; // edge cases like 'ui' and 'setUI'

        // if there is a getter / setter then also remove it from the methods
        if (config.getter) {
            idx = obj.methods.items.indexOf(config.getter);
            config.getter.isGetter = true;
            /*Utils.removeAt(obj.methods.items, idx);
            obj.methods.items.splice(idx, 0, {
                name: config.getter.name,
                $type: 'placeholder',
                access: config.getter.access,
                text: 'see: <a href="#method-' + config.getter.name + '">' + config.name + '</a>',
                isInherited: config.getter.isInherited
            });*/
            obj.methods.items[idx] = {
                name: config.getter.name,
                $type: 'placeholder',
                access: config.getter.access,
                text: 'see: <a href="#method-' + config.getter.name + '">' + config.name + '</a>',
                isInherited: config.getter.isInherited
            };
        }
        if (config.setter) {
            idx = obj.methods.items.indexOf(config.setter);
            config.setter.isSetter = true;
            //Utils.removeAt(obj.methods.items, obj.methods.items.indexOf(config.setter));
            obj.methods.items[idx] = {
                name: config.setter.name,
                $type: 'placeholder',
                access: config.setter.access,
                text: 'see: <a href="#method-' + config.setter.name + '">' + config.name + '</a>',
                isInherited: config.setter.isInherited
            };
        }

        // finally, note on any accessor configs when a getter / setter
        // should be added automatically for accessor configs that don't
        // have explicitly described getter / setter methods
        if (config.accessor) {
            config.autoGetter = config.getter ? false : true;
            config.autoSetter = config.setter ? false : true;
        }
    }

    processMemberTypeGroups (memberType, obj) {
        // the member is the object of a particular type (configs, properties, methods, events, etc.)
        // and members is an array of all of the members of that type
        let me = this,
            members = memberType.items,
            type    = memberType.$type,
            removal = [];

        // set the order priority for the sort later for the
        // desired output order
        memberType.outputPriority = obj.priority[type];

        // store these so we can concatenate the statics to the owner type
        if (type === 'properties') {
            obj.properties = memberType;
        }
        if (type === 'methods') {
            obj.methods = memberType;
        }
        if (type === 'static-properties') {
            obj.staticProperties = memberType;
        }
        if (type === 'static-methods') {
            obj.staticMethods = memberType;
        }

        // This property is used in titling the headings of each member section
        if (type === 'sass-mixins') {
            memberType.typeText = 'theme mixins';
        } else if (type === 'vars') {
            memberType.typeText = 'theme variables'
        } else {
            memberType.typeText = type;
        }

        // store these so we can concatenate the required and optional
        // configs
        if (type === 'configs') {
            obj.configs = memberType;
        }

        if (!me.headerLink && obj.files.length) {
            me.headerLink = me.parseLink(obj.files[0], obj.name);
        }

        if (members && members.length) {
            members.forEach(function(member, i){
                // if the member is to be hidden we'll just remove it - else process it
                if (member.hide === true) {
                    removal.push(i);
                } else {
                    me.processMember(member, i, obj, type);
                }
            });
        }

        if (removal.length) {
            removal.reverse().forEach(function (idx) {
                members.splice(idx, 1);
            });
        }
    }

    processMember(member, i, obj, type) {
        let me = this,
            files = obj.files,
            name = obj.name,
            memberFileLoc = me.getMemberLoc(member),
            memberFile    = files[memberFileLoc],
            fileLink      = me.parseLink(memberFile, name).link,
            acc;

        if (type === 'vars') {
            member.$type = 'css_var-S'
        }
        if (type === 'sass-mixins') {
            member.$type = 'css_mixin'
        }

        if (member.type != null) {
            member.type = me.splitInline(member.type,  ' / ');
        }
        member.text = me.scrubText(member.text);

        if (member.$type === 'param') {
            member.hasParams = true;
        }

        // indicate whether the member has any params
        member.hasParams = false;
        member.params = [];
        // indicate whether the member has a returns value
        member.hasReturn = false;
        member.returns = [];
        // indicate whether the member has any properties
        member.hasProperties = false;
        member.properties = [];

        if (member.items) {

            member.items.forEach(function(item) {
                // prepare the param and return text
                if (item.text && (item.$type === 'param' || item.$type === 'return' || item.$type === 'property')) {
                    item.text = me.scrubText(item.text);
                }
                // linkify the return types
                if (item.$type === 'return' || item.$type === 'param') {
                    item.type = me.splitInline(item.type,  ' / ');
                }
                if (item.$type === 'return') {
                    member.returns.push(item);
                    member.hasReturn = true;
                }
                if (item.$type === 'param') {
                    member.params.push(item);
                    member.hasParams = true;
                }
                if (item.$type === 'property') {
                    member.properties.push(item);
                    member.hasProperties = true;
                }

                // process any sub-items that this param / property may have
                if (item.items) {
                    //me.processMember(item, i, obj, type);
                    me.processMember(item, i, obj);
                }
            });

            if (type === 'methods') {
                obj.instanceMethods[member.name] = member;
            }
        }

        if (type === 'events' || type === 'methods' || type === 'static-methods' || type === 'sass-mixins') {
            member.listParams = member.hasParams;
            member.listReturn = member.hasReturn;
        }

        // collect up the required and optional configs for
        // sorting later
        if (type === 'configs') {
            member.$type = 'cfg';
            if (member.required === true) {
                obj.requiredConfigs.push(member);
            } else {
                obj.optionalConfigs.push(member);
            }
        }

        // find the source class and note whether the member
        // comes from an ancestor class
        member.srcClass = member.from || name;
        member.isInherited = member.srcClass !== name;
        member.fromObject = member.from === 'Object';
        member.linkType = member.$type;

        member.hide = member.fromObject;

        if (member.static) {
            member.linkType = 'static-' + member.linkType;
        }

        member.srcLink = '<div class="viewSource">' +
                         '<a target="_blank" href="src/' +
                            fileLink + '#' + member.srcClass + '-' + member.linkType + '-' + member.name + '">' +
                         'view source</a></div>';

        member.access = member.access || 'public';
        member.accessMini = member.access.substr(0, 3);

        if (!member.from) {
            let extras;

            if (member.removedVersion) {
                extras = 'r';
            } else if (member.deprecatedVersion) {
                extras = 'd';
            } else if (member.static) {
                extras = 's';
            } else if (member.readonly) {
                extras = 'ro';
            }

            // cache the shortcut name for the member access level
            acc = member.access === 'private' ? 'i' : (member.access === 'protected' ? 'o' : 'p');
        }

        if (member.static === true) {
            member.$type = 'static-' + member.$type;
        }
    }
}

module.exports = JsonParser;
