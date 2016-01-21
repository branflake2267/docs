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

    splitCommas (splitstring) {
        let me         = this,
            linkstring = '';

        if (splitstring && splitstring.includes(',')) {
            splitstring = splitstring.split(',');

            splitstring.forEach(function(str) {
                linkstring += me.createLink(str) + '<br>';
            });
        } else {
            linkstring = me.createLink(splitstring);
        }

        return linkstring;
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
                    properties, methods, staticProperties, staticMethods;

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

                        if (containers && containers.length) {
                            containers.forEach(function(container) {
                                if (container.type != null) {
                                    let typelinks = container.type;

                                    // Check for types and make them links
                                    if (typelinks.includes('/')) {
                                        typelinks = typelinks.split('/');

                                        container.type = '';

                                        if (typelinks && typelinks.length) {
                                            typelinks.forEach(function(typelink, idx, arr) {
                                                let safelinks = typelink.replace(safeLinkRe, '');

                                                container.type += me.createLink(safelinks, typelink);

                                                if (idx != typelinks.length-1) {
                                                    container.type += '/';
                                                }
                                            });
                                        }
                                    } else {
                                        container.type = me.createLink(typelinks);

                                    }
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
                                            if (membertype.$type === 'param' || membertype.$type === 'return') {
                                                membertype.text = me.scrubText(membertype.text);
                                            }
                                        });

                                        container.items.some(function (item) {
                                            if (item.$type === 'param') {
                                                container.hasParams = true;
                                            }

                                            return item.$type === 'param';
                                        });
                                    }
                                }
                            });
                        }
                    });

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
                        altNames   : cls.alternateClassNames                    ? cls.alternateClassNames.split(',').join('<br>') : '',
                        mixins     : cls.mixins                                 ? me.splitCommas(cls.mixins)                      : '',
                        requires   : cls.requires                               ? me.splitCommas(cls.requires)                    : '',
                        classAlias : cls.alias && cls.alias.includes('widget.') ? cls.alias.replace(widgetRe, '')                 : cls.alias,
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
            if (!text) {
                text = link;
            }

            if (link.charAt(0) != '#') {
                if (link.includes('#')) {
                    link = link.replace('!','-');
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
