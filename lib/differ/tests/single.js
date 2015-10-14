var fs     = require('fs'),
    Parser = require('../lib/Parser'),
    Output = require('../lib/Output'),
    Utils  = require('../lib/Utils');

module.exports = function(inputDir, outputDir, newVersion, oldVersion) {
    var classes = [
        //'Ext.JSON'
        'Ext.dom.Element'
    ];

    /**
     * This will loop through the classes array and parse each and create a separate file
     * in the output directory for each class.
     */

    classes.forEach(function(cls) {
        var newObj   = JSON.parse(fs.readFileSync(inputDir + 'current/' + cls + '.json', 'utf8')),
            oldObj   = JSON.parse(fs.readFileSync(inputDir + 'old/'     + cls + '.json', 'utf8')),
            parser   = new Parser(newObj.global.items[0], oldObj.global.items[0]),
            diff     = parser.exec(),
            output   = new Output(diff),
            markdown = output.markdown();

        if (markdown) {
            console.log('changes found for', cls);

            fs.stat(outputDir, function(error) {
                if (error) {
                    fs.mkdirSync(outputDir);
                }

                fs.writeFile(outputDir + cls + '.md', markdown, 'utf8');
            });
        } else {
            console.log('no changes for', cls);
        }
    });
};
