'use strict';

const fs         = require('fs');
const util       = require('util');
const handlebars = require('handlebars');
const mkdirp     = require('mkdirp');
const marked     = require('sencha-marked');
const swag       = require('swag');
const compressor = require('node-minify');
const ClassTree  = require('../class-tree');
const Tree       = require('../shared/Tree');
const Utils      = require('../shared/Utils');
const debug      = require('../../Debug');

const exampleRe   = /@example/g;
const hashStartRe = /^#/;
const linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const imgRe       = /{\s*@img(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const safeLinkRe  = /(\[\]|\.\.\.)/g;
const widgetRe    = /widget./g;

/**
 * The {{#exists}} helper checks if a variable is defined.
 */
handlebars.registerHelper('exists', function(variable, options) {
    if (variable != 'undefined' && variable) {
        return options.fn(this);
    }
});


/**
 * The {{#process-member}} helper to generate class member markup
 */
handlebars.registerPartial('processMember', (function() {
    var src = '{{#unless hide}}' +
        '<div class="classmembers member{{#access}}-{{{.}}}{{/access}} {{#if static}}isStatic{{else}}isNotStatic{{/if}} {{#is $type "config"}}{{#if required}}isRequired{{else}}isNotRequired{{/if}}{{/is}} {{#isInherited}}isInherited{{/isInherited}} {{#fromObject}}fromObject{{/fromObject}}" data-member-name="{{{name}}}" {{#accessor}} data-accessor="true"{{/accessor}}{{#inheritdoc}} data-inherited="true"{{/inheritdoc}}>' +
            '<div class="source-class">{{srcClass}}</div>' +
            '<h2 id="{{{$type}}}-{{{name}}}" class="member-header">' +
                '<a href="#{{{$type}}}-{{{name}}}" class="member-name">' +
                    '{{{name}}}' +

                    '{{#if hasParams}}<span class="params-list">({{/if}}' +

                    '{{#items}}' +
                        '{{#is $type "param"}}' +
                            '{{#unless @first}}, {{/unless}}' +
                            '{{{name}}}' +
                            '{{#if @last}}' +
                                '{{#is ../$type "event"}}, eOpts{{/is}}' +
                            '{{/if}}' +
                        '{{/is}}' +

                    '{{/items}}' +

                    '{{#if hasParams}}' +
                        ')</span>' +
                    '{{/if}}' +
                '</a>' +
                '{{#items}}' +
                    '{{#is $type "return"}}' +
                        '<span class="memberType">{{{type}}}</span>' +
                    '{{/is}}' +
                '{{/items}}' +
                '{{#type}}' +
                    '<span class="memberType">{{{.}}}</span>' +
                '{{/type}}' +
                '{{#chainable}}' +
                    '<span class="chainable">chainable</span>' +
                '{{/chainable}}' +
                '{{#preventable}}' +
                    '<span class="preventable">preventable</span>' +
                '{{/preventable}}' +
                '{{#readonly}}' +
                    '<span class="readonly">readonly</span>' +
                '{{/readonly}}' +
                '{{#static}}' +
                    '<span class="static">static</span>' +
                '{{/static}}' +
                '{{#required}}' +
                    '<span class="required">required</span>' +
                '{{/required}}' +
                '{{#template}}' +
                    '<span class="template">template</span>' +
                '{{/template}}' +
                '{{#access}}' +
                    '<span class="{{{.}}}">{{{.}}}</span>' +
                '{{/access}}' +
            '</h2>' +
            '{{#text}}' +
                '<p>{{{.}}}</p>' +
            '{{/text}}' +
            '{{#exists value}}' +
                '<p class="defaults-to-dec">Defaults to: {{{value}}}</p>' +
            '{{/exists}}' +
            '{{#since}}' +
                '<p class="since-dec">Available since: {{{.}}}</p>' +
            '{{/since}}' +
            '{{#items}}' +
                '{{#is $type "param"}}' +
                    '{{#if @first}}' +
                        '<h3 class="detail-header">Parameters</h3>' +
                    '{{/if}}' +

                    '<p><span class="params-list">{{{name}}}</span> :' +
                        '{{#if type}}' +
                            '<span class="memberType">{{{type}}}</span>' +
                        '{{else}}' +
                            '<span class="memberType">Object</span>' +
                        '{{/if}}' +

                    '</p>' +
                    '<p>{{{text}}}</p>' +
                '{{/is}}' +

                '{{#is $type "property"}}' +
                    '{{#unless @index}}' +
                        '<h3 class="detail-header">Properties</h3>' +
                    '{{/unless}}' +

                    '<p><span class="params-list">{{{name}}}</span> : <span class="memberType">{{{type}}}</span></p>' +
                    '<p>{{{text}}}</p>' +
                '{{/is}}' +

                '{{#is $type "return"}}' +
                    '<h3 class="detail-header">Returns</h3>' +
                    '<p><span class="memberType">{{{type}}}</span></p>' +
                    '<p>{{{text}}}</p>' +
                '{{/is}}' +

                '{{#if @last}}' +
                    '{{#is ../$type "event"}}' +
                        '<p>eOpts : <span class="memberType"><a href="Object.html">Object</a></span></p>' +
                        '<p>The options object passed to <a href="Ext.util.Observable.html">Ext.util.Observable.addListener</a>.</p>' +
                    '{{/is}}' +
                '{{/if}}' +
            '{{/items}}' +
            '{{#deprecatedMessage}}' +
                '<p class="deprecated-dec">Deprecated: {{{.}}}</p>' +
            '{{/deprecatedMessage}}' +
            '{{#preventable}}' +
                '<p class="preventable-dec">This action following this event is preventable. When any' +
                    'of the listeners returns false, the action is cancelled.</p>' +
            '{{/preventable}}' +
            '{{#removedVersion}}' +
                '<p class="removed-dec">This method has been REMOVED since {{{.}}}</p>' +
            '{{/removedVersion}}' +
            '{{#template}}' +
                '<p class="template-dec">This is a template method. a hook into the functionality of this' +
                    'class. Feel free to override it in child classes.</p>' +
            '{{/template}}' +
            '{{#if getter}}' +
                '<div class="accessor-method isGetter">' +
                    '{{> processMember getter}}' +
                '</div>' +
            '{{/if}}' +
            '{{#autoGetter}}' +
                '<div class="accessor-method isGetter">' +
                    'Returns the value of {{name}}' +
                '</div>' +
            '{{/autoGetter}}' +
            '{{#if setter}}' +
                '<div class="accessor-method isSetter">' +
                    '{{> processMember setter}}' +
                '</div>' +
            '{{/if}}' +
            '{{#autoSetter}}' +
                '<div class="accessor-method isSetter">' +
                    'Sets the value of {{name}}' +
                '</div>' +
            '{{/autoSetter}}' +
        '</div>' +
    '{{/unless}}';

    return src;
})());


swag.registerHelpers(handlebars);

var existsCache = [];

class JsonParser extends ClassTree {
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
            stylesheet  : __dirname + '/css/styles.css',
            template    : __dirname + '/template.hbs',
            hometemplate    : __dirname + '/hometemplate.hbs',
            title : '',
            headerhtml: '',
            footer : 'Sencha Docs - <a href="https://www.sencha.com/legal/terms-of-use/" target="_blank">Terms of Use</a>'
        };
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

    beforeExecute (inputDir, output, configs) {
        let options      = this.options,
            input        = configs.input.value || inputDir,
            destination  = configs.destination.value || output,
            template     = configs.template    || options.template,
            hometemplate = configs.hometemplate|| options.hometemplate,
            compress     = configs.compress    || options.compress, //true to compress js/css files, false to only concatenate
            stylesheet   = configs.stylesheet  || options.stylesheet,
            footer       = configs.footer      || options.footer,
            title        = configs.title       || options.title,
            headhtml     = configs.headhtml    || options.headhtml;

        this.input = input;
        this.destination = destination;
        this.template = fs.readFileSync(template, 'utf-8');
        this.hometemplate = fs.readFileSync(hometemplate, 'utf-8');
        this.title = title;
        this.footer = footer;
        this.headhtml = headhtml;

        //create the output directories
        mkdirp.sync(destination + 'css/');
        mkdirp.sync(destination + 'js/');

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/js/ExtL.js', __dirname + '/js/treeview.js', __dirname + '/js/main.js'],
            fileOut : destination + '/js/app.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/js/ExtL.js', __dirname + '/js/treeview.js'],
            fileOut : destination + '/js/home.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-css' : 'no-compress',
            fileIn  : [stylesheet, __dirname + '/css/treeview.css'],
            fileOut : destination + '/css/app.css'
        });
    }

    scrubText (text) {
        if (!text) {
            return '';
        }

        // Remove the example tag
        text = text.replace(exampleRe, '');

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

    fileExists (item) {

        /*
         * Possibly add items to cache and check cache
         * before checking file system.  So far, this has
         * actually slowed things down, so I'm putting a
         * pin in it.
         *
         *     existsCache.push({item:item,exists:true});
         */

        let file = './json/' + item + '.json';

        try {
            return fs.statSync(file).isFile();
        } catch(err) {
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

    parser (datas, outputDir) {
        let me = this;

        if (datas && datas.length) {
            let tree = JSON.stringify(me.createTree());

            datas.forEach(function(data, idx) {
                let obj              = JSON.parse(data),
                    cls              = obj.global.items[0],
                    memberTypeGroups = cls.items,              // this is an array of member types (an object for configs, methods, events, etc.)
                    name             = cls.name,               // the class name
                    types            = cls.$type,
                    priority         = {
                        configs: 0,
                        properties: 1,
                        "static-properties": 2,
                        methods: 3,
                        "static-methods": 4,
                        events: 5,
                        vars: 6,
                        "sass-mixins": 7
                    },
                    instanceMethods = {},
                    configs, properties, methods, staticProperties, staticMethods;

                let requiredConfigs = [];
                let optionalConfigs = [];

                // Loop through memberTypeGroups so we can markup our member text
                if (memberTypeGroups && memberTypeGroups.length) {
                    memberTypeGroups.forEach(function(member) {
                        // the member is the object of a particular type (configs, properties, methods, events, etc.)
                        // and members is an array of all of the members of that type
                        let members = member.items,
                            type    = member.$type;

                        // set the order priority for the sort later for the
                        // desired output order
                        member.outputPriority = priority[type];

                        // store these so we can concatenate the statics to the
                        // owner type
                        if (type === 'properties') {
                            properties = member;
                        }
                        if (type === 'methods') {
                            methods = member;
                        }
                        if (type === 'static-properties') {
                            staticProperties = member;
                        }
                        if (type === 'static-methods') {
                            staticMethods = member;
                        }

                        // store these so we can concatenate the required and optional
                        // configs
                        if (type === 'configs') {
                            configs = member;
                        }

                        if (members && members.length) {
                            members.forEach(function(member, i) {
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
                                            instanceMethods[member.name] = member;
                                        }
                                    }
                                }

                                // collect up the required and optional configs for
                                // sorting later
                                if (type === 'configs') {
                                    member.$type = 'cfg';
                                    if (member.required === true) {
                                        requiredConfigs.push(member);
                                    } else {
                                        optionalConfigs.push(member);
                                    }
                                }

                                // find the source class and note whether the member
                                // comes from an ancestor class
                                member.srcClass = member.from || name;
                                member.isInherited = !(member.srcClass === name);
                                member.fromObject = member.from === 'Object';
                            });
                        }
                    });

                    // if we have configs
                    if (configs) {
                        // put any required configs ahead of the optional configs
                        configs.items = requiredConfigs.concat(optionalConfigs);

                        // associate getter / setter methods with their root configs
                        configs.items.forEach(function (config) {
                            // connect the getter / setter to the config context if found
                            config.getter = instanceMethods['get' + me.capitalize(config.name)];
                            config.setter = instanceMethods['set' + me.capitalize(config.name)];

                            // if there is a getter / setter then also remove it from the methods
                            if (config.getter) {
                                me.removeAt(methods.items, methods.items.indexOf(config.getter));
                            }
                            if (config.setter) {
                                me.removeAt(methods.items, methods.items.indexOf(config.setter));
                            }

                            // finally, note on any accessor configs when a getter / setter
                            // should be added automatically for accessor configs that don't
                            // have explicitly described getter / setter methods
                            if (config.accessor) {
                                config.autoGetter = config.getter ? false : true;
                                config.autoSetter = config.setter ? false : true;
                            }
                        });
                    }

                    // if we have static properties
                    if (staticProperties) {
                        // and we also have properties
                        // then add the static properties to the end of the
                        // instance properties
                        if (properties) {
                            properties.items = properties.items.concat(staticProperties.items);
                        } else {
                            // else have the static properties effectively take the place
                            // of the instance properties and let the templater sort out the
                            // rest
                            staticProperties.outputPriority = 1;
                            staticProperties.$type = 'properties';
                        }
                        memberTypeGroups.splice(memberTypeGroups.indexOf(staticProperties), 1);
                    }

                    // ... then do the same for static methods like we did
                    // for static properties
                    if (staticMethods) {
                        if (methods) {
                            methods.items = methods.items.concat(staticMethods.items);
                        } else {
                            staticMethods.outputPriority = 3;
                            staticMethods.$type = 'methods';
                        }
                        memberTypeGroups.splice(memberTypeGroups.indexOf(staticMethods), 1);
                    }

                    // sort the member types into the desired output order
                    memberTypeGroups.sort(function(a, b) {
                      return a.outputPriority - b.outputPriority;
                    });
                }

                // Prepare the handlebars view object
                let view = {
                        name             : name,
                        altNames         : cls.alternateClassNames                    ? cls.alternateClassNames.split(',').join('<br>')         : '',
                        mixins           : cls.mixed                                  ? me.splitInline(cls.mixed, '<br>')                       : '',
                        requires         : cls.requires                               ? me.splitInline(cls.requires, '<br>')                    : '',
                        extends          : cls.extended                               ? me.splitInline(me.processExtends(cls.extended), '<br>') : '',
                        classAlias       : cls.alias && cls.alias.includes('widget.') ? cls.alias.replace(widgetRe, '')                         : cls.alias,
                        classText        : me.scrubText(cls.text),
                        classType        : types,
                        memberTypeGroups : memberTypeGroups,
                        tree             : tree,
                        footer           : me.footer,
                        header           : me.header,
                        title            : me.title,
                        headhtml         : me.headhtml,
                        date             : new Date()

                    },
                    newtemplate = handlebars.compile(me.template), // Compile the handlebars template with the view object
                    output      = newtemplate(view);

                if (idx === 0) {
                    let newhometemplate = handlebars.compile(me.hometemplate), // Compile the handlebars home template with the view object
                        homeoutput      = newhometemplate(view);

                    debug.info('Writing index.html');
                    fs.writeFileSync(me.destination + 'index.html', homeoutput, 'utf-8');
                }

                debug.info('Writing', name + '.html');

                fs.writeFileSync(me.destination + name + '.html', output, 'utf-8');
            });
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
