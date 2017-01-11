'use strict';

const GP         = require('../guide-parser');
const fs         = require('fs');
const path       = require('path');
const util       = require('util');
const handlebars = require('handlebars');
const marked     = require('sencha-marked');
const utility    = require('util');
const ClassTree  = require('../class-tree');
const Tree       = require('../shared/Tree');
const Utils      = require('../shared/Utils');
const debug      = require('../../Debug');
const xmlbuild   = require('xmlbuilder');

const safeLinkRe  = /(\[]|\.\.\.)/g;
const widgetRe    = /widget\./g;
const memberTypes = ['cfg', 'property', 'method', 'event', 'css_var-S', 'css_mixin'];

const search = [];

class JsonParser extends ClassTree {
    constructor (options) {
        super(options);

        var me = this;

        /**
         * This helper marks up markdown found in deprecated messages.
         */
        handlebars.registerHelper('markme', function(template) {
            var text = template.fn(this);

            if (text) {
                return me.scrubCustom(text);
            }
        });

        this.createLinkMap(this.input, path.join(this.destination, this.pversion));
    }

    beforeExecute () {
        super.beforeExecute();
    }

    createLinkMap() {
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
    static inObject (str, obj) {
        let key;

        for(key in obj) {

            if (key.indexOf(str) > -1) {
                return obj[key];
            }
        }

        return false;
    }

    /**
     * Identify whether or not text represents a primitive.
     * @param text
     * @returns {boolean}
     */
    isPrimitive (text) {
        let primitives = ["Array", "Boolean", "Date", "Function", "Number", "Object", "RegExp", "String"];
        return (primitives.indexOf(text) != -1);
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
     * This is a temporary method to convert markdown to markup for certain text blocks.  Deprecated and Removed links
     * are not being converted so this is patch until we figure out why.
     * @param text
     */
    scrubCustom (text) {
        var me = this,
            linkRe = /{@link\s(.*?)}/gi,
            markedText;

        if (text) {
            markedText = text.replace(linkRe, function(match, contents) {
                var rawContents = contents.split(" "),
                    href     = rawContents.shift(),
                    text     = rawContents.join(' ');

                return me.createLink(href.replace("!", "-"), text);
            });
        }

        return markedText;
    }

    /**
     * @method createLink
     * @param href
     * @param text
     */
    createLink (href, text) {
        let linkmap = this.linkmap,
            openExternal = '',
            hash, split, final;

        if (href.includes('#') && href.charAt(0) != '#') {
            split = href.split('#');
            href  = split[0];
            hash  = '#' + split[1];
        }

        if (!text) {
            text = href;
        }

        for (var i = 0; i < linkmap.length; i++) {
            var item = linkmap[i];

            if (href === item['c']) {
                href = item['f'];
            }
        }

        if (!href.includes('.html') && href.charAt(0) != '#') {
            href += '.html';
        }

        if (hash) {
            href = href + hash;
        }

        for (var i = 0; i < memberTypes.length; i++) {
            var item = memberTypes[i];

            if (text.includes(item + '-')) {
                text = text.replace(item + '-', '');
            }
        }

        if (!href.includes('sencha.com') && (href.includes('http:')) || href.includes('https:')) {
            openExternal = "class='external-link' target='_blank' ";
        }

        final = "<a " + openExternal + "href='" + href + "'>" + text + "</a>";

        return (!this.isPrimitive(text)) ? final : text;
    }

    parseLink(fileString, name) {
        let cleanString = (fileString && fileString.indexOf('../') > -1) ? fileString.replace(/\.\.\//g,'') : fileString,
            parsedLink = JsonParser.inObject(cleanString, this.filemap),
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
        return (this.classNames.indexOf(item) != -1);
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

            for (var i = 0; i < text.length; i++) {
                var item = text[i];

                let link = item.replace(safeLinkRe, '');

                if (me.fileExists(link)) {
                    str.push(me.createLink(link, item));
                } else {
                    str.push(item);
                }
            }
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

    processHierarchy (cls) {
        var ret = '<div class="list">';

        ret += this.splitInline(JsonParser.processCommaLists(cls.extended, false, true, true), '<div class="hierarchy">');
        ret += '<div class="hierarchy">' + cls.name;
        ret += Utils.repeat('</div>', ret.split('<div').length - 1);

        return ret;
    }

    /**
     * @method processCommaLists
     * @param list The array of items to process
     * @param [sort] Sort the array elements
     * @param [trim] Pop the last element.  **Note:** Pop is processed before revers and sort.
     * @param [rev] Reverse the list
     */
    static processCommaLists (list, sort, trim, rev) {
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
    static getMemberLoc(item){
        if (item.src) {
            let txt  = item.src.text,
                name = item.src.name,
                fileSrc = (txt || name);

            if(!fileSrc) {
                return null;
            }

            fileSrc = fileSrc.split(',');

            return fileSrc[0];
        } else {
            return null;
        }
    }

    parser (classNames, outputDir) {
        outputDir = outputDir || this.destination;

        let me             = this,
            version        = me.pversion,
            productTree    = me.productTree,
            otherToolkit   = me.otherToolkit || null,
            toolkit        = me.toolkit,
            treetemplate   = handlebars.compile(handlebars.partials.treeHolderPartial),
            newtemplate    = handlebars.compile(me.template), // Compile the handlebars template with the view object
            searchObj, otherToolkitInstance, treeoutput, treeview;

        me.treetemplate = treetemplate;
        me.newtemplate  = newtemplate;

        if (me.otherToolkitConfig) {
            otherToolkitInstance = new JsonParser({
                config: me.otherToolkitConfig,
                pversion: me.getProductVersion() + '-' + otherToolkit
            })
        }

        if (classNames && classNames.length) {
            let root = xmlbuild.create('urlset').att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9"),
                enumProperty = null, guideJson,
                classMap = Object.assign({}, me.classMap),
                modern = false, classic = false, qspresent = false,
                sitemap, smOutput = [], xmlString, hasIndex, guideJsonObj, quickStartTree,
                tree, classicTree, modernTree;

            if (otherToolkit) {
                classicTree = toolkit === 'classic' ? me.createTree() : otherToolkitInstance.createTree();
                modernTree  = toolkit === 'modern'  ? me.createTree() : otherToolkitInstance.createTree();
            } else {
                tree = me.createTree();
            }

            if (tree) {
                me.prependHrefPath(tree, outputDir, outputDir);
            }
            if (classicTree) {
                classic = true;
                me.prependHrefPath(classicTree, outputDir, path.join(me.productDir, 'classic'));
            }
            if (modernTree) {
                modern = true;
                me.prependHrefPath(modernTree, outputDir, path.join(me.productDir, 'modern'));
            }
            if (me.hasGuides) {
                guideJsonObj = new GP(me.options).getGuideJson(true);
                quickStartTree = guideJsonObj.quickStartTree;
                guideJson = guideJsonObj.tree;
            }
            if (quickStartTree) {
                qspresent = true;
                me.prependHrefPath(quickStartTree, outputDir, path.join(me.productDir, 'guides'));
            }
            me.prependHrefPath(productTree, outputDir, outputDir);

            treeview = {
                classicJson    : classicTree || null,
                modernJson     : modernTree || null,
                apiJson        : tree || null,
                guideJson      : guideJson || null,
                quickStartJson : quickStartTree || null
            };

            treeoutput = me.treetemplate(treeview);

            Utils.each(classNames, function(name) {
                let obj                  = classMap[name],
                    cls                  = obj.global.items[0],
                    memberTypeGroups     = cls.items,              // this is an array of member types (an object for configs, methods, events, etc.)
                    types                = cls.$type,
                    fileName             = name +  '.html',
                    view                 = {},
                    tempMemberTypeGroups = [],
                    productVersion       = me.getProductVersion(),
                    removedMessage       = me.scrubCustom(cls.removedMessage),
                    output, alias, aliasName, clsSpec;

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
                    for (var i = 0; i < memberTypeGroups.length; i++) {
                        var memberType = memberTypeGroups[i];

                        me.processMemberTypeGroups(memberType, obj);
                    }

                    // remove any member groups that have no items (no non-hidden ones at least)
                    for (var i = 0; i < memberTypeGroups.length; i++) {
                        var grp = memberTypeGroups[i];

                        if (grp.items && grp.items.length) {
                            tempMemberTypeGroups.push(grp)
                        }
                    }

                    memberTypeGroups = tempMemberTypeGroups.length ? tempMemberTypeGroups : memberTypeGroups;

                    // if we have configs
                    if (obj.configs) {
                        // put any required configs ahead of the optional configs
                        obj.configs.items = obj.requiredConfigs.concat(obj.optionalConfigs);

                        // associate getter / setter methods with their root configs
                        for (var i = 0; i <  obj.configs.items.length; i++) {
                            var config = obj.configs.items[i];

                            // occasionally, a nameless entity enters, but shouldn't leave
                            if (config.name || config.inheritdoc) {
                                config.name = config.name || config.inheritdoc.substr(config.inheritdoc.indexOf('#') + 1); // fixes the issue where there's not a name, but there is inheritdoc
                                JsonParser.buildConfig(config, obj);
                            }
                        }
                    }

                    // re-sort the methods since in the buildConfig() call we may have
                    // injected some auto-generated setter / getter methods
                    if (obj.methods) {
                        obj.methods.items.sort(function(a, b) {
                            if (a.name < b.name) {
                                return -1;
                            }
                            if (a.name > b.name) {
                                return 1;
                            }

                            return 0;
                        });
                    }

                    // if we have static properties
                    if (obj.staticProperties) {
                        // and we also have properties, then add the static properties to the end 
                        // of the instance properties
                        JsonParser.addStaticValues('properties', obj, memberTypeGroups);
                    }

                    // then if we have static methods
                    if (obj.staticMethods) {
                        //do the same for static methods like we did for static properties
                        JsonParser.addStaticValues('methods', obj, memberTypeGroups);
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
                    me.headerLink.link = [obj.name];
                    me.headerLink.class = null;
                }

                if (cls.$type === 'enum') {
                    for (i = 0; i < memberTypeGroups.length; i++) {
                        let grp = memberTypeGroups[i];

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
                    }
                }

                // Prepare the handlebars view object
                view = {
                    name              : obj.name,
                    altNames          : cls.alternateClassNames ? cls.alternateClassNames.split(',').join('<br>')                    : '',
                    mixins            : cls.mixed               ? me.splitInline(cls.mixed, '<br>')                                  : '',
                    localMixins       : cls.mixins              ? me.splitInline(cls.mixins, '<br>')                                 : '',
                    requires          : cls.requires            ? me.splitInline(cls.requires, '<br>')                               : '',
                    uses              : cls.uses                ? me.splitInline(cls.uses, '<br>')                                   : '',
                    extends           : cls.extended            ? me.processHierarchy(cls)                                           : '',
                    extenders         : cls.extenders           ? me.splitInline(JsonParser.processCommaLists(cls.extenders, false), '<br>') : '',
                    mixers            : cls.mixers              ? me.splitInline(JsonParser.processCommaLists(cls.mixers, false), '<br>')    : '',
                    aliasName         : aliasName,
                    classAlias        : alias,
                    tier              : cls.tier,
                    classText         : me.scrubText(cls.text, cls),
                    classAccess       : cls.access,
                    deprecatedVersion : cls.deprecatedVersion,
                    deprecatedMessage : me.scrubCustom(cls.deprecatedMessage),
                    isDeprecated      : !!(cls.deprecatedMessage || cls.deprecatedVersion),
                    removedVersion    : cls.removedVersion,
                    removedMessage    : removedMessage,
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
                    multSrc           : me.multSrc,
                    srcFiles          : me.headerLink.link,
                    fileName          : me.headerLink.link[0].href,
                    date              : me.date,
                    docroot           : me.docroot,
                    version           : version,
                    imagePath         : path.relative(me.docDir, me.productDir + '/home-images') + '/',
                    cssPath           : path.relative(me.docDir, me.productDir + '/css') + '/',
                    homePath          : path.relative(me.docDir, me.productDir) + '/',
                    isApi             : true,
                    jsPath            : path.relative(me.docDir, me.productDir + '/js') + '/',
                    hasApi            : me.hasApi,
                    hasGuides         : me.hasGuides,
                    isEnum            : cls.$type === 'enum',
                    enumProperty      : enumProperty,
                    canonical         : me.docroot + me.toolkit + "/" + fileName,
                    product           : me.projectConfigs.normalizedProductList[me.config],
                    pversion          : me.pversion,
                    treeview          : treeoutput,
                    guideJson         : treeview.guideJson,
                    quickStartJson    : quickStartTree,
                    productTree       : productTree,
                    numVer            : me.numberVer,
                    meta              : me.meta,
                    hasVersions       : me.hasVersions,
                    helpText          : me.helpText,
                    helpToc           : me.helpToc,
                    myVersion         : productVersion,
                    modern            : modern,
                    classic           : classic
                };

                view.description = Utils.striphtml(view.classText);
                output = me.newtemplate(view);

                // wrap @example code blocks with anonymous fiddles
                output = me.decorateExamples(output);

                if (!hasIndex) {
                    let gjo, qst;

                    if (me.hasGuides) {
                        gjo = new GP(me.options).getGuideJson(true);
                        qst = gjo.quickStartTree;
                        guideJson = gjo.tree;
                    }
                    if (qst) {
                        me.prependHrefPath(qst, outputDir, path.join(me.productDir, 'guides'));
                    }
                    view.guideJson = guideJson;
                    view.quickStartJson = qst;

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

            fs.writeFileSync(path.join(me.productDir, 'js', 'searchIndex.js'), 'var searchIndex = ' + JSON.stringify(searchObj) + ';', 'utf-8');
        }
    }

    static addStaticValues(type, obj, memberTypeGroups) {
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

    static buildConfig(config, obj) {
        let idx;

        // connect the getter / setter to the config context if found
        config.getter = obj.instanceMethods['get' + Utils.capitalize(config.name)] || obj.instanceMethods['get' + config.name.toUpperCase()];
        config.setter = obj.instanceMethods['set' + Utils.capitalize(config.name)] || obj.instanceMethods['set' + config.name.toUpperCase()]; // edge cases like 'ui' and 'setUI'

        let g = config.getter;
        let s = config.setter;

        // if there is a getter / setter then also remove it from the methods
        if (g || config.accessor) {
            idx = g ? obj.methods.items.indexOf(g) : null;
            if (g) {
                g.isGetter = true;
            }

            let getterName = g ? g.name : 'get' + Utils.capitalize(config.name);
            let getterCfg = {
                name: getterName,
                $type: g ? 'placeholder-simple' : 'placeholder-accessor',
                access: g ? g.access : config.access,
                text: 'see: <a href="#method-' + getterName + '">' + config.name + '</a>',
                isInherited: g ? g.isInherited : config.isInherited,
                isAutoGetter: !g
            };
            if (idx) {
                obj.methods.items[idx] = getterCfg;
            } else {
                if (obj.methods) {
                    obj.methods.items.push(getterCfg);
                }            
            }
        }
        if (s || config.accessor) {
            idx = s ? obj.methods.items.indexOf(s) : null;
            if (s) {
                s.isSetter = true;
            }

            let setterName = s ? s.name : 'set' + Utils.capitalize(config.name);
            let setterCfg = {
                name: setterName,
                $type: s ? 'placeholder' : 'placeholder-accessor',
                access: s ? s.access : config.access,
                text: 'see: <a href="#method-' + setterName + '">' + config.name + '</a>',
                isInherited: s ? s.isInherited : config.isInherited,
                isAutoSetter: !s
            };
            if (idx) {
                obj.methods.items[idx] = setterCfg;
            } else {
                if (obj.methods) {
                    obj.methods.items.push(setterCfg);
                }
            }
        }

        // finally, note on any accessor configs when a getter / setter
        // should be added automatically for accessor configs that don't
        // have explicitly described getter / setter methods
        if (config.accessor) {
            config.autoGetter = g ? false : true;
            config.autoSetter = s ? false : true;
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
            let items = obj.global.items[0],
                extended = items.extended || [],
                extendz  = items.extends  || [],
                mixed    = items.mixed    || [],
                mixins   = items.mixins   || [],
                excl     = extended.concat(extendz, mixed, mixins),
                list = {},
                files = obj.files,
                name = obj.name,
                srcObj = {
                    class: name,
                    link: []
                },
                dot = name.lastIndexOf('.'),
                shortName = (dot > -1) ? name.substring(dot + 1) : name;

            for (let i = 0, len = excl.length; i < len; i++) {
                let cls = excl[i],
                    dot = cls.lastIndexOf('.'),
                    clsName = (dot > -1) ? cls.substring(dot + 1) : cls;

                list[clsName] = true;
            }

            for (let i = 0, len = files.length; i < len; i++) {
                let file = files[i],
                    fileName = file.substring((file.lastIndexOf('/') + 1), file.length - 3),
                    link = me.parseLink(file, name).link;

                if (shortName === fileName) {
                    let path = file.substring(file.indexOf('/modules/') + 9);
                    path = path.substring(path.indexOf('/') + 1);

                    srcObj.link.push({
                        href: './src/' + link + (name ? '#' + name : ''),
                        path: path
                    });
                } else {
                    if (i === 0) {
                        srcObj.link.push({
                            href: './src/' + link + (name ? '#' + name : ''),
                            path: ''
                        });
                    }
                }
            }

            me.multSrc = srcObj.link.length > 1;
            me.headerLink = srcObj;
        }

        if (members && members.length) {
            for (var i = 0; i < members.length; i++) {
                var member = members[i];

                // if the member is to be hidden we'll just remove it - else process it
                if (member.hide === true) {
                    removal.push(i);
                } else {
                    me.processMember(member, i, obj, type);
                }
            }
        }

        if (removal.length) {
            for (var i = removal.length-1; i>=0; i--) {
                members.splice(members[i], 1);
            }
        }
    }

    processMember(member, i, obj, type) {
        let me = this,
            files = obj.files,
            name = obj.name,
            memberFileLoc = JsonParser.getMemberLoc(member),
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
            for (var i = 0; i < member.items.length; i++) {
                var item = member.items[i];

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
                    //member.hasParams = true;
                }
                if (item.$type === 'property') {
                    member.properties.push(item);
                    member.hasProperties = true;
                }

                // process any sub-items that this param / property may have
                if (item.items) {
                    me.processMember(item, i, obj);
                }
            }

            // cache the private params in their own array for collection for removal
            // from the public params
            member.privateParams = [];
            // loop the params to see if there are any public params and if so say that
            // the member has params
            // also, collect up private params to be removed from the params list

            for (i = 0; i < member.params.length; i++) {
                var param = member.params[i];

                if (param.access === undefined) {
                    member.hasParams = true;
                }
                if (param.access === 'private') {
                    member.privateParams.push(param);
                }
            }
            // filter out the private params
            member.params = Utils.difference(member.params, member.privateParams);
        }

        if (type === 'methods') {
            obj.instanceMethods[member.name] = member;
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
