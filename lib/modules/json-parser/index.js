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
            template    : __dirname + '/template.hbs'
        };
    }

    static register (argv) {
        argv.mod({
            mod         : 'json-parser',
            description : 'Parse JSON',
            options     : [
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

    beforeExecute (input, output) {
        let options  = this.options,
            compress = options.compress; //true to compress js/css files, false to only concatenate

        this.template = fs.readFileSync(options.template, 'utf-8');

        //create the output directories
        mkdirp.sync(output + 'css/');
        mkdirp.sync(output + 'js/');

        new compressor.minify({
            type    : compress ? 'yui-js' : 'no-compress',
            fileIn  : [__dirname + '/js/ExtL.js', __dirname + '/js/treeview.js', __dirname + '/js/main.js'],
            fileOut : output + '/js/app.js'
        });

        new compressor.minify({
            type    : compress ? 'yui-css' : 'no-compress',
            fileIn  : [options.stylesheet, __dirname + '/css/treeview.css'],
            fileOut : output + '/css/app.css'
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

            datas.forEach(function(data) {
                let obj       = JSON.parse(data),
                    cls       = obj.global.items[0],
                    members   = cls.items,              // this is an array of member types (an object for configs, methods, events, etc.)
                    name      = cls.name,               // the class name
                    types     = cls.$type,
                    priority  = {
                        configs: 0,
                        properties: 1,
                        "static-properties": 2,
                        methods: 3,
                        "static-methods": 4,
                        events: 5,
                        vars: 6,
                        "sass-mixins": 7
                    },
                    configs, properties, methods, staticProperties, staticMethods;

                let requiredConfigs = [];
                let optionalConfigs = [];

                // Loop through members so we can markup our member text
                if (members && members.length) {
                    members.forEach(function(member) {
                        // the member is the object of a particular type (configs, properties, methods, events, etc.)
                        // and containers is an array of all of the members of that type
                        let containers = member.items,
                            type       = member.$type;

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

                        if (containers && containers.length) {
                            containers.forEach(function(container) {
                                if (container.type != null) {
                                    container.type = me.splitInline(container.type,  ' / ');
                                }
                                container.text = me.scrubText(container.text);
                                if (container.$type === 'param') {
                                    member.hasParams = true;
                                }

                                // indicate whether the member has any params
                                container.hasParams = false;
                                if (type === 'events' || type === 'methods' || type === 'static-methods') {
                                    if (container.items) {

                                        container.items.forEach(function(membertype) {
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
                                        // the container (class member)
                                        container.items.some(function (item) {
                                            if (item.$type === 'param') {
                                                container.hasParams = true;
                                            }

                                            // if the item type is a param break the loop
                                            return item.$type === 'param';
                                        });
                                    }
                                }

                                // collect up the required and optional configs for
                                // sorting later
                                if (type === 'configs') {
                                    if (container.required === true) {
                                        requiredConfigs.push(container);
                                    } else {
                                        optionalConfigs.push(container);
                                    }
                                }

                                // find the source class and note whether the member
                                // comes from an ancestor class
                                container.srcClass = container.from || name;
                                container.isInherited = !(container.srcClass === name);
                                container.fromObject = container.from === 'Object';
                                /*if (container.from) {
                                    container.srcClass = files[parseInt(container.src.name.split(',')[0])];
                                    container.isInherited = !(container.srcClass === name);
                                } else {
                                    container.srcClass = files[0];
                                    container.isInherited = false;
                                }*/
                            });
                        }
                    });

                    // if we have configs
                    if (configs) {
                        // put any required configs ahead of the optional configs
                        configs.items = requiredConfigs.concat(optionalConfigs);
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
                        members.splice(members.indexOf(staticProperties), 1);
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
                        members.splice(members.indexOf(staticMethods), 1);
                    }

                    // sort the member types into the desired output order
                    members.sort(function(a, b) {
                      return a.outputPriority - b.outputPriority;
                    });
                }

                // Prepare the handlebars view object
                let view = {
                        name       : name,
                        altNames   : cls.alternateClassNames                    ? cls.alternateClassNames.split(',').join('<br>')         : '',
                        mixins     : cls.mixed                                  ? me.splitInline(cls.mixed, '<br>')                       : '',
                        requires   : cls.requires                               ? me.splitInline(cls.requires, '<br>')                    : '',
                        extends    : cls.extended                               ? me.splitInline(me.processExtends(cls.extended), '<br>') : '',
                        classAlias : cls.alias && cls.alias.includes('widget.') ? cls.alias.replace(widgetRe, '')                         : cls.alias,
                        classText  : me.scrubText(cls.text),
                        classType  : types,
                        members    : members,
                        tree       : tree
                    },
                    newtemplate = handlebars.compile(me.template), // Compile the handlebars template with the view object
                    output      = newtemplate(view);

                debug.info('Writing', name + '.html');

                fs.writeFileSync(outputDir + name + '.html', output, 'utf-8');
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
