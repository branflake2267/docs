var fs         = require('fs'),
    util       = require('util'),
    junk       = require('junk'),
    mkdirp     = require('mkdirp'),
    compressor = require('node-minify'),
    ClassTree  = require('../class-tree'),
    Renderer   = require('../shared/Renderer'),
    Utils      = require('../shared/Utils'),
    debug      = require('../../Debug');

var exampleRe   = /@example/g,
    hashStartRe = /^#/,
    linkRe      = /['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g,
    safeLinkRe  = /(\[\]|\.\.\.)/g;

function AppParser(targets, options) {
    ClassTree.call(this, targets, options);
}

util.inherits(AppParser, ClassTree);

AppParser.prototype.defaultOptions = {
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

AppParser.register = function(argv) {
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
            }
        ]
    });
};

AppParser.prototype.parser = function(datas, outputDir) {
    var me = this;

    if (datas && datas.length) {

        datas.forEach(function(data) {
            var obj       = JSON.parse(data),
                cls       = obj.global.items[0],
                members   = cls.items,
                name      = cls.name,
                types     = cls.$type;

            fs.writeFileSync(outputDir + name + '.json', data, 'utf-8');
        });
    }
};

module.exports = AppParser;
