var fs     = require('fs'),
    Parser = require('../lib/Parser'),
    Output = require('../lib/Output'),
    Utils  = require('../lib/Utils');

module.exports = function(inputDir, outputDir, newVersion, oldVersion) {
    var newAllClasses  = JSON.parse(fs.readFileSync(inputDir + 'current/classic-all-classes.json', 'utf8')).global.items,
        oldAllClasses  = JSON.parse(fs.readFileSync(inputDir + 'old/classic-all-classes.json',     'utf8')).global.items,
        i              = 0,
        length         = newAllClasses.length,
        addedOutput    = [],
        modifiedOutput = [],
        removedOutput  = [],
        totalOutput    = [],
        newCls, oldCls,
        parser, diff,
        output, markdown;

    for (; i < length; i++) {
        newCls = newAllClasses[i];
        oldCls = Utils.getMatch('name', newCls.name, oldAllClasses);

        if (oldCls) {
            parser   = new Parser(newCls, oldCls);
            diff     = parser.exec();
            output   = new Output(diff, newVersion, oldVersion);
            markdown = output.markdown();

            if (markdown) {
                if (modifiedOutput.length) {
                    modifiedOutput.push('');
                }

                modifiedOutput.push(markdown);
            }
        } else {
            addedOutput.push(' - ' + newCls.name);
        }
    }

    i      = 0;
    length = oldAllClasses.length;

    for (; i < length; i++) {
        oldCls = oldAllClasses[i];
        newCls = Utils.getMatch('name', oldCls.name, newAllClasses);

        if (!newCls) {
            removedOutput.push(' - ' + oldCls.name);
        }
    }

    if (addedOutput.length) {
        if (totalOutput.length) {
            totalOutput.push('');
        }

        totalOutput.push('## Added');

        totalOutput = totalOutput.concat(addedOutput);
    }

    if (removedOutput.length) {
        if (totalOutput.length) {
            totalOutput.push('');
        }

        totalOutput.push('## Removed');

        totalOutput = totalOutput.concat(removedOutput);
    }

    if (modifiedOutput.length) {
        if (totalOutput.length) {
            totalOutput.push('');
        }

        totalOutput.push('## Modified');

        totalOutput = totalOutput.concat(modifiedOutput);
    }

    fs.stat(outputDir, function(error) {
        if (error) {
            fs.mkdirSync(outputDir);
        }

        fs.writeFile(outputDir + oldVersion + '_to_' + newVersion + '_changes.md', totalOutput.join('\n'), 'utf8');
    });

};
