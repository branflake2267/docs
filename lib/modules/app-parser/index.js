'use strict';

const fs         = require('fs');
const util       = require('util');
const junk       = require('junk');
const mkdirp     = require('mkdirp');
const compressor = require('node-minify');
const ClassTree  = require('../class-tree');
const Renderer   = require('../shared/Renderer');
const Utils      = require('../shared/Utils');
const debug      = require('../../Debug');

const exampleRe   = /@example/g;
const hashStartRe = /^#/;
const linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g;
const safeLinkRe  = /(\[\]|\.\.\.)/g;

class AppParser extends ClassTree {
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
            mod         : 'app-parser',
            description : 'Parse JSON for the Docs App',
            options     : [
                {
                    name        : 'input',
                    short       : 'i',
                    type        : 'string',
                    description : 'The location where the JSON files are contained. Defaults to "./json".',
                    example     : '`index app-parser --input=./json` or `index app-parser -i ./json`'
                },
                {
                    name        : 'destination',
                    short       : 'd',
                    type        : 'string',
                    description : 'The destination location of the generated html. Defaults to "./output".',
                    example     : '`index app-parser --destination=./output` or `index app-parser -d ./output`'
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

    parser (datas, outputDir) {
        let me = this;

        if (datas && datas.length) {

            datas.forEach(function(data) {
                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }

                let cls      = data.global.items[0],
                    members  = cls.items,
                    name     = cls.name,
                    types    = cls.$type,
                    compress = me.options.compress;

                fs.writeFileSync(outputDir + name + '.json', JSON.stringify(data, null, compress ? 0 : 4), 'utf-8');
            });
        }
    }
}

module.exports = AppParser;
