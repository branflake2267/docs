var fs     = require('fs'),
    Parser = require('../lib/Parser'),
    Output = require('../lib/Output'),
    Utils  = require('../lib/Utils');

module.exports = function(args) {
    var newAllClasses  = JSON.parse(fs.readFileSync(args.targets[0], 'utf8')).global.items,
        oldAllClasses  = JSON.parse(fs.readFileSync(args.targets[1], 'utf8')).global.items,
        newVersion     = args.options.new,
        oldVersion     = args.options.old,
        outputDir      = args.options.output,
        i              = 0,
        length         = newAllClasses.length,
        addedOutput    = [],
        modifiedOutput = [],
        removedOutput  = [],
        totalOutput    = [
            '# Diff between ' + newVersion + ' and ' + oldVersion
        ],
        newCls, oldCls,
        parser, diff,
        output, markdown;

    if (outputDir.substr(-1) !== '/') {
        outputDir += '/';
    }

    for (; i < length; i++) {
        newCls = newAllClasses[i];
        oldCls = Utils.getMatch('name', newCls.name, oldAllClasses);

        if (oldCls) {
            parser   = new Parser(newCls, oldCls);
            diff     = parser.exec();
            output   = new Output(diff);
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
