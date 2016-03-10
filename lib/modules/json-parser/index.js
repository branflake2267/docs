'use strict';

const fs         = require('fs');
const util       = require('util');
const handlebars = require('handlebars');
const mkdirp     = require('mkdirp');
const wrench     = require('wrench');
const marked     = require('sencha-marked');
const swag       = require('swag');
const utility    = require('util');
const compressor = require('node-minify');
const ClassTree  = require('../class-tree');
const Tree       = require('../shared/Tree');
const Utils      = require('../shared/Utils');
const debug      = require('../../Debug');
const xmlbuild   = require('xmlbuilder');

const hashStartRe = /^#/;
const linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const imgRe       = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const safeLinkRe  = /(\[\]|\.\.\.)/g;
const widgetRe    = /widget./g;

const search = [];

/*
 * Register all of the Handlebar partials and helpers
 */
const partialsDir = __dirname + '/tpls';
const filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
    let matches = /^([^.]+).hbs$/.exec(filename),
        name, template;
    if (!matches) {
        return;
    }
    name = matches[1];
    template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
    handlebars.registerPartial(name, template);
});

/**
 * The {{#exists}} helper checks if a variable is defined.
 */
handlebars.registerHelper('exists', function(variable, options) {
    if (variable != 'undefined' && variable) {
        return options.fn(this);
    }
});

handlebars.registerHelper('capitalize', function (str) {
    return Utils.capitalize(str);
});

/**
 * Strip HTML and truncate string
 */
handlebars.registerHelper('striphtml', function(variable) {
    if (variable != 'undefined' && variable) {
        variable = variable.replace('</h1>', ' ').replace(/<(?:.|\n)*?>/gm, '').replace(/\r?\n|\r/g, '');
        return variable.substring(0, 157) + '...';
    }
});

swag.registerHelpers(handlebars);

/*
 * End Handlebars registration
 */

var internalId = 0;

class JsonParser extends ClassTree {
    /**
     * Progressive ID generator
     * @param {String} prefix String to prepend to the ID.  Default to 'e-'.
     */
    id (prefix) {
        prefix = prefix || 's-';
        return prefix + internalId++;
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
            footer : 'Sencha Docs - <a href="https://www.sencha.com/legal/terms-of-use/" target="_blank">Terms of Use</a>'
        };
    }

    beforeExecute (fileArray) {
        //let options = this.options;

        super.beforeExecute(fileArray);
debug.info(__dirname);
        new compressor.minify({
            type    : this.compress ? 'yui-js' : 'no-compress',
            fileIn  : [this.extl, this.treeview, './modules/base/js/main.js'],
            fileOut : this.destination + '/js/app.js'
        });
    }

    static register (argv) {
        argv.mod({
            mod         : 'json-parser',
            description : 'Parse JSON',
            options     : [
                {
                    name        : 'config',
                    short       : 'con',
                    type        : 'string',
                    description : 'The config file holding all of the configurations for the build process.',
                    example     : '`index json-parser --config=./classic-toolkit-config.json`'
                },
                {
                    name        : 'input',
                    short       : 'i',
                    type        : 'string',
                    description : 'The location where the JSON files are contained. Defaults to "./json".',
                    example     : '`index json-parser --input=./json` or `index json-parser -i ./json`'
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
                }
            ]
        });
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

    scrubText (text) {
        if (!text) {
            return '';
        }

        return marked(text, {
            addHeaderId : false
        });
    }

    createLink (href, text) {
        if (!text) {
            text = href;
        }

        if (!href.includes('.html')) {
            href += '.html';
        }

        return "<a href='" + href + "'>" + text + "</a>";
    }

    parseLink(fileString, name) {
        let cleanString = (fileString && fileString.indexOf('../') > -1) ? fileString.replace(/\.\.\//g,'') : fileString,
            parsedLink = this.inObject(cleanString, this.fileMap),
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
        let thisfile = item + '.json';

        if(this.fileArray.indexOf(thisfile) != -1) {
            return true;
        }else {
            return false;
        }
    }

    capitalize (str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    removeAt (arr, i) {
        arr.splice(i, 1);
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

    processExtends (list) {
        let arr = list.split(',');

        arr.pop();

        return arr.reverse().join(',');
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

    isArray (value) {
        return toString.call(value) === '[object Array]';
    }

    from (obj) {
        return this.isArray(obj) ? obj : [obj];
    }

    parser (datas, outputDir) {
        let me   = this,
            searchIndex = {};

        if (datas && datas.length) {
            let tree = JSON.stringify(me.createTree()),
                root = xmlbuild.create('urlset').att("xmlns","http://www.sitemaps.org/schemas/sitemap/0.9"),
                sitemap, smOutput = [], xmlString;

            datas.forEach(function(data, idx) {
                let obj              = JSON.parse(data[0]),
                    cls              = obj.global.items[0],
                    memberTypeGroups = cls.items,              // this is an array of member types (an object for configs, methods, events, etc.)
                    types            = cls.$type,
                    fileName         = data[1].replace('json', 'html'),
                    view             = {},
                    newtemplate, output, alias, aliasName;

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
                obj.typeRef = {
                    configs: 'c',
                    properties: 'p',
                    "static-properties": 'sp',
                    methods: 'm',
                    "static-methods": 'sm',
                    events: 'e',
                    vars: 'v',
                    "sass-mixins": 'x'
                };

                searchIndex[idx] = {
                    n: obj.name
                };

                if (cls.access) {
                    searchIndex[idx].a = 'i';
                }
                if (cls.alias) {
                    let alias = cls.alias.split(',');
                    searchIndex[idx].x = alias;
                }
                if (cls.alternateClassNames) {
                    let classNames = cls.alternateClassNames.split(',');
                    searchIndex[idx].g = classNames;
                }

                // Loop through memberTypeGroups so we can markup our member text
                if (memberTypeGroups && memberTypeGroups.length) {
                    memberTypeGroups.forEach(function(memberType) {
                       me.processMemberTypeGroups(memberType, idx, obj, searchIndex);
                    });

                    // if we have configs
                    if (obj.configs) {
                        // put any required configs ahead of the optional configs
                        obj.configs.items = obj.requiredConfigs.concat(obj.optionalConfigs);

                        // associate getter / setter methods with their root configs
                        obj.configs.items.forEach(function (config) {
                            config.name = config.name || config.inheritdoc.substr(config.inheritdoc.indexOf('#') + 1); // fixes the issue where there's not a name, but there is inheritdoc
                            me.buildConfig(config, obj);
                        });
                    }

                    // if we have static properties
                    if (obj.staticProperties) {
                        // and we also have properties, then add the static properties to the end 
                        //of the instance properties
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

                //if (me.headerLink) {
                    aliasName = cls.alias ? (cls.alias.includes('widget.') ? 'xtype' : cls.alias.substr(0, cls.alias.indexOf('.'))) : '';
                    alias = cls.alias ? (cls.alias.includes('widget.') ? cls.alias.replace(widgetRe, '') : cls.alias) : null;
                    if (alias) {
                        alias = alias.replace(',', ', ');
                    }
                   
                    // Prepare the handlebars view object
                    view = {
                        name              : obj.name,
                        altNames          : cls.alternateClassNames                    ? cls.alternateClassNames.split(',').join('<br>')         : '',
                        mixins            : cls.mixed                                  ? me.splitInline(cls.mixed, '<br>')                       : '',
                        requires          : cls.requires                               ? me.splitInline(cls.requires, '<br>')                    : '',
                        extends           : cls.extended                               ? me.splitInline(me.processExtends(cls.extended), '<br>') : '',
                        aliasName         : aliasName,
                        classAlias        : alias,
                        classText         : me.scrubText(cls.text),
                        classAccess       : cls.access,
                        deprecatedVersion : cls.deprecatedVersion,
                        deprecatedMessage : me.scrubText(cls.deprecatedMessage),
                        isDeprecated      : !!(cls.deprecatedMessage || cls.deprecatedVersion),
                        removedVersion    : cls.removedVersion,
                        removedMessage    : me.scrubText(cls.removedMessage),
                        isremoved         : !!(cls.removedMessage || cls.removedVersion),
                        singleton         : cls.singleton,
                        classType         : types,
                        memberTypeGroups  : memberTypeGroups,
                        footer            : me.footer,
                        header            : me.header,
                        title             : me.title,
                        headhtml          : me.headhtml,
                        fileName          : 'src/' + me.headerLink.link + (me.headerLink.class ? '#' + me.headerLink.class : ''),
                        date              : me.date,
                        docroot           : me.docroot
                    };

                    newtemplate = handlebars.compile(me.template); // Compile the handlebars template with the view object
                    output      = newtemplate(view);

                    // wrap @example code blocks with anonymous fiddles
                    output = me.wrapFiddles(output);

                    if (idx === 0) {
                        /*let newhometemplate = handlebars.compile(me.hometemplate), // Compile the handlebars home template with the view object
                            homeoutput      = newhometemplate(view);

                        debug.info('Writing index.html');

                        wrench.copyDirSyncRecursive(me.homepath + '/images', me.destination + 'home-images/', {
                            forceDelete: true
                        });

                        wrench.chmodSyncRecursive(me.destination + 'home-images/', '0755');

                        fs.writeFileSync(me.destination + 'index.html', homeoutput, 'utf-8');*/
                        me.createIndexPage(view);
                    }

                    debug.info('Writing', fileName);

                    smOutput.push({fileName: fileName, name: obj.name});

                    fs.writeFileSync(me.destination + fileName, output, 'utf-8');
                    delete me.headerLink;
               //}
            });

            // Prepare the handlebars view object
            let smView = {
                title    : me.title,
                links    : smOutput,
                headhtml : me.headhtml,
                footer   : me.footer,
                docroot  : me.docroot
            };

            me.smTemplate = handlebars.compile(me.smTemplate); // Compile the handlebars template with the view object
            sitemap       = me.smTemplate(smView);

            for(var i = 1; i <= smOutput.length; i++) {
                if (smOutput[i]) {
                    //var ele = root.ele('url');
                    var obj = {
                        url : {
                            loc: this.docroot + smOutput[i].fileName
                        }
                    };

                    root.ele(obj);
                }
            }

            xmlString = root.doc().end({ pretty: true, indent: '  ', newline: '\n' });


            debug.info('Writing Site Maps');
            fs.writeFileSync(me.destination + 'sitemap.html', sitemap, 'utf-8');

            fs.writeFileSync(me.destination + 'api-sitemap.xml', xmlString, 'utf-8');

            debug.info('Writing Tree JSON');
            fs.writeFileSync(me.destination + 'js/tree.js', 'ExtL.treeData = ' + tree + ';', 'utf-8');

            debug.info('Writing Search Index');
            fs.writeFileSync(me.destination + 'js/searchIndex.js', 'var searchIndex = ' + JSON.stringify(searchIndex) + ';', 'utf-8');
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
        // connect the getter / setter to the config context if found
        config.getter = obj.instanceMethods['get' + this.capitalize(config.name)];
        config.setter = obj.instanceMethods['set' + this.capitalize(config.name)];

        // if there is a getter / setter then also remove it from the methods
        if (config.getter) {
            config.getter.isGetter = true;
            this.removeAt(obj.methods.items, obj.methods.items.indexOf(config.getter));
        }
        if (config.setter) {
            config.setter.isSetter = true;
            this.removeAt(obj.methods.items, obj.methods.items.indexOf(config.setter));
        }

        // finally, note on any accessor configs when a getter / setter
        // should be added automatically for accessor configs that don't
        // have explicitly described getter / setter methods
        if (config.accessor) {
            config.autoGetter = config.getter ? false : true;
            config.autoSetter = config.setter ? false : true;
        }
    }

    processMemberTypeGroups (memberType, topLoopIndex, obj, searchIndex) {
         // the member is the object of a particular type (configs, properties, methods, events, etc.)
        // and members is an array of all of the members of that type
        let me = this,
            members = memberType.items,
            type    = memberType.$type;

        // set the order priority for the sort later for the
        // desired output order
        memberType.outputPriority = obj.priority[type];

        // store these so we can concatenate the statics to the
        // owner type
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
                me.processMember(member, i, topLoopIndex, obj, type, searchIndex);
            });
        }
    }

    processMember(member, i, topLoopIndex, obj, type, searchIndex) {      
        let me = this,
            files = obj.files,
            name = obj.name,
            memberFileLoc = me.getMemberLoc(member),
            memberFile    = files[memberFileLoc],
            fileLink      = me.parseLink(memberFile, name).link;

        if (member.type != null) {
            member.type = me.splitInline(member.type,  ' / ');
        }
        member.text = me.scrubText(member.text);
        if (member.$type === 'param') {
            member.hasParams = true;
        }

        // indicate whether the member has any params
        member.hasParams = false;
        if (type === 'events' || type === 'methods' || type === 'static-methods') {
            if (member.items) {

                member.items.forEach(function(membertype) {
                    // prepare the param and return text
                    if (membertype.$type === 'param' || membertype.$type === 'return') {
                        membertype.text = me.scrubText(membertype.text);
                    }
                    // linkify the return types
                    if (membertype.$type === 'return' || membertype.$type === 'param') {
                        membertype.type = me.splitInline(membertype.type,  ' / ');
                    }
                });

                // loop through all params / returns and see if
                // there are any params and if so flag that on
                // the member (class member)
                member.items.some(function (item) {
                    if (item.$type === 'param') {
                        member.hasParams = true;
                    }

                    // if the item type is a param break the loop
                    return item.$type === 'param';
                });

                if (type === 'methods') {
                    obj.instanceMethods[member.name] = member;
                }
            }
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

        if (!member.from) {
            //memberarr.push([member.name, [idx, priority[type]]]);
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

            searchIndex[topLoopIndex][obj.typeRef[type] + '.' + member.name] = {
                a: member.access === 'private' ? 'i' : (member.access === 'protected' ? 'o' : 'p')
            };

            if (extras) {
                searchIndex[topLoopIndex][obj.typeRef[type] + '.' + member.name].x = extras;
            }

            if (member.accessor) {
                searchIndex[topLoopIndex][obj.typeRef[type] + '.' + member.name].g = 1;
            }
        }
    }

    addClass (file, json) {
        let me = this;

        json = json.replace(imgRe, function(match, img) {
            return "<img src='images/"+ img +"'/>";
        });

        return super.addClass(file, json).replace(linkRe, function(match, link, text) {
            link = link.replace('!','-');

            if (!text) {
                text = link;
            }

            if (link.charAt(0) != '#') {
                if (link.includes('#')) {
                    link = link.replace('#', '.html#');
                } else {
                    link = link + '.html';
                }
            } else {
                link = file.replace('.json', '') + '.html' + link;
            }

            return me.createLink(link, text.replace(hashStartRe, ''));
        });
    }
}

module.exports = JsonParser;
