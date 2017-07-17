/* jshint node: true */
'use strict';

const Parser    = require('./parser.js'),
      Utils     = require('../shared/Utils'),
      _         = require('lodash'),
      Pluralize = require('pluralize'),
      JsDiff    = require('diff'),
      Fs        = require('fs-extra'),
      Chalk     = require('chalk');

/**
 * Outputs the diff of a product and two differing versions 
 * (or even two different products)
 */
class Diff extends Parser {
    constructor (options) {
        options.product = options.diffTargetProduct || options.product;
        options.version = options.diffTargetVersion || options.version;
        super(options);
    }
    
    /**
     * Creates a diff for the current product / products (including all applicable 
     * toolkits) and outputs the diffs as a markdown file as well as a json file
     */
    run () {
        this.options.forceDiff = true;
        this.doRun('outputMarkdown');
        this.options.forceDiff = false;
        this.doRun('outputRaw');
        this.concludeBuild();
    }
    
    /**
     * Creates a diff for the current product / products (including all applicable 
     * toolkits) and outputs the diffs as a markdown file
     */
    runOutputMarkdown () {
        this.options.forceDiff = true;
        this.doRun('outputMarkdown');
        this.options.forceDiff = false;
        this.concludeBuild();
    }
    
    /**
     * @private
     * Private diff run method that actually creates the diffs adn then outputs them 
     * using the passed output method (`outputMethod`)
     * @param {String} outputMethod The method to output the diffs with (i.e. outputRaw 
     * or outputMarkdown)
     */
    doRun (outputMethod) {
        const { options } = this,
              meta        = this.options.prodVerMeta,
              { hasApi }  = meta,
              toolkitList = Utils.from(
                  meta.hasToolkits ?
                      (options.toolkit || meta.toolkits) :
                      false
              );

        // check to see if the product has an api to diff
        if (!hasApi) {
            this.error(`${options.product} does not have an API to diff`);
            return;
        }

        // create the diff for all eligible toolkits
        toolkitList.forEach(toolkit => {
            this.options.toolkit = toolkit;
            this[outputMethod](this.diff);
            delete this.options.toolkit;
        });
    }
    
    /**
     * Bulk operation to create the doxi files used in diffs for all eligible product /
     * versions.  Used when creating diffs for all versions when outputting docs so that
     * the `@since` information can be derived
     */
    createDoxiFiles () {
        const { apiProduct, diffableVersions } = this;
        
        diffableVersions.forEach(version => {
            const toolkits    = this.getToolkits(apiProduct, version),
                  toolkitList = toolkits || [ 'api' ];
            
            this.options.version = version;
            
            toolkitList.forEach(toolkit => {
                this.options.toolkit = toolkit;
                this.createTempDoxiFile();
                this.doRunDoxi('all-classes');
            });
        });
    }
    
    /**
     * Outputs the diff object as a json object
     * @param {Object} diff The diff object
     */
    outputRaw (diff) {
        const path = this.getDiffOutputPath('json');
        
        Fs.outputJsonSync(path, diff);
    }
    
    /**
     * Converts a json diff file to markdown.
     * Requires that the `--jsonDiffPath` flag be set to indicate which file to read in
     */
    outputDiffToMarkdown () {
        let diff = this.options.jsonDiffPath;
        
        if (!diff) {
            console.log(`
            ${Chalk.white.bgRed('ERROR :')} '${Chalk.gray('--jsonDiffPath')}' flag must be set when running '${Chalk.gray('outputDiffToMarkdown')}'
            `);
        } else {
            diff = Fs.readJsonSync(diff);
            this.outputMarkdown(diff);
        }
    }
    
    /**
     * Outputs the diff object to markdown
     * @param {Object} diff The diff object
     * @return {String} The markdown formatted string representing the diff
     */
    outputMarkdown (diff) {
        let output = '';
        
        // first add the title of what has been diffed
        // then append the diff of all the things
        // then append the SDK totals
        output += this.markdownTitle(diff);
        output += this.markdownItems(diff.items);
        output += this.markdownSdkTotals(diff.meta.sdkTotals);
        
        // finally, get the path and filename to output to and output the diff as a
        // markdown file
        const path = this.getDiffOutputPath('md');
        
        Fs.outputFileSync(path, output);
        
        return output;
    }
    
    /**
     * Returns the title for the markdown output saying what the diff is diffing from
     * and to
     * @param {Object} diff The diff object
     * @return {String} The markdown diff title heading
     */
    markdownTitle (diff) {
        const { diffTitle } = this.options;
        
        if (diffTitle) {
            return `# ${diffTitle}\n\n`;
        }
        
        const { diffed }         = diff.meta,
              { source, target } = diffed,
              { title : sourceTitle, version : sourceVersion } = source,
              { title : targetTitle, version : targetVersion } = target,
              sourceStr   = `${sourceTitle} ${sourceVersion}`,
              targetStr   = `${targetTitle} ${targetVersion}`,
              toolkits    = this.getToolkits(this.diffTargetProduct),
              { toolkit } = this.options,
              toolkitStr  = toolkits && toolkits.length ? `(${toolkit})` : '';
              
        return `# Diff between ${sourceStr} and ${targetStr} ${toolkitStr}\n`;
    }
    
    /**
     * Using the diff object (may be the root diff object or diff objects from each
     * diffed class / member) add any added, removed, or modified items to the markdown
     * output string
     * @param {Object} [diffObj={}] The diff object
     * @param {Number} [indent=0] The amount to indent this item by in the markdown
     * output
     * @param {*} [prefix="##"] The line prefix for these items
     * @return {String} The markdown string
     */
    markdownItems (diffObj = {}, indent = 0, prefix = '##') {
        const { added, removed, modified } = diffObj;
        let output = '';
        
        if (added) {
            output += this.markdownAddedRemoved(added, 'Added', indent, prefix);
        }
        if (removed) {
            output += this.markdownAddedRemoved(removed, 'Removed', indent, prefix);
        }
        if (modified) {
            output += this.markdownModified(modified, indent, prefix);
        }
        
        return output;
    }
    
    /**
     * Add removed and added items to the markdown output string
     * @param {Object} diffObj The diff object
     * @param {String} label The label for the diff output.  Either: "Added" or "Removed"
     * @param {Number} indent The amount to indent each line by
     * @param {String} prefix The prefix to use for the add / remove
     * @return {String} The markdown string with the added / removed items added
     */
    markdownAddedRemoved (diffObj, label, indent, prefix) {
        const types         = _.keys(diffObj),
              // created the heading prefix from the indent and prefix params
              headingPrefix = _.repeat('  ', indent) + prefix;
        let   output        = '';
        
        // loop over all types
        types.forEach(type => {
            const list = diffObj[type];
            
            // the capitalized type will be added to the diff markdown heading
            type    = _.capitalize(Pluralize.plural(type));
            output += `\n${headingPrefix} ${label} ${type}\n\n`;
            
            // then for each item that is added / removed add it as a bulleted item to
            // the markdown output
            list.forEach(item => {
                const childIndent = prefix.includes('-') ? 1 : 0,
                      childPrefix = _.repeat('  ', indent + childIndent) + '-';

                output += `${childPrefix} ${item}\n`;
            });
        });
        
        return output;
    }
    
    /**
     * Add the modified items to the markdown output
     * @param {Object} diffObj The diff object
     * @param {Number} indent The amount to indent each line by
     * @param {String} prefix The prefix to use for the add / remove
     * @return {String} The markdown string with the modified content added
     */
    markdownModified (diffObj, indent, prefix) {
        const types         = _.keys(diffObj),
              len           = types.length,
              headingPrefix = _.repeat('  ', indent) + prefix;
        let   i             = 0,
              output        = '';
        
        // loop over all of the possible types of modified items
        for (; i < len; i++) {
            let   type      = types[i];
            const category  = diffObj[type],
                  items     = _.keys(category),
                  itemsLen  = items.length;
            let   j         = 0,
                  typeLabel = _.capitalize(Pluralize.plural(type));
            
            // create the modified items' label using the heading prefix and type
            output += `\n${headingPrefix} Modified ${typeLabel}\n\n`;
            
            // loop over all modified items and output a label for them and then pass
            // each item to the `markdownItem` method
            for (; j < itemsLen; j++) {
                const item = items[j],
                      childIndent = prefix.includes('-') ? 1 : 0,
                      childPrefix = childIndent ? _.repeat('  ', indent + 1) + '-' : '###',
                      itemIndent  = childIndent + (childIndent ? 1 : 0);
                    
                // create the modified item label
                output += `${childPrefix} ${item}\n`;
                output += this.markdownItem(category[item], indent + itemIndent);
            }
        }
        
        return output;
    }
    
    /**
     * Diff the actual class / member item itself.  Each item is diffed for changes to
     * the items itself + any items (class members, params, or sub-params) are then
     * passed to the `markdownItems` method to continue the recursive adding of diff into
     * from the diff object to the markdown string.
     * @param {Object} diffObj The diff object
     * @param {Number} indent The amount to indent each line by
     * @return {String} The markdown string with the item diff appended
     */
    markdownItem (diffObj, indent) {
        const { changes, items } = diffObj;
        let   output             = '';
        
        // if the item has changes between target and source
        if (changes) {
            const changeNames = _.keys(changes),
                  len         = changeNames.length;
            let   i           = 0;
            
            // collect up the names of the things that changed and add all of the changes
            // to the markdown output
            for (; i < len; i++) {
                const name            = changeNames[i],
                      change          = changes[name],
                      { from, to }    = change,
                      indentName      = _.repeat('  ', indent),
                      indentValueDiff = _.repeat('  ', indent + 1),
                      isCode          = /^(?:\[(?:.*\n|\r+)|{(?:.*\n|\r+)|Ext.(?:.*\n|\r+)|new(?:.*\n|\r+))/i;
                   
                // output a label and pre/code tags for displaying the changes 
                output += `${indentName}- ${name}\n`;
                output += `${indentValueDiff}<pre><code>`;
                
                // create a diff between old and new values
                const valueDiff = JsDiff.diffLines(_.escape(from), _.escape(to)),
                      decorated = [];
                
                // using the values diff we just created, loop over each item and process
                // it to show it was either added, removed, or didn't change
                valueDiff.forEach((part, idx) => {
                    const { added, removed } = part,
                          lineIndent = idx ? indentValueDiff : '',
                          close      = added ? '</ins>' : (removed ? '</del>' : ''),
                          open       = added ? `${lineIndent}<ins>` : (
                              removed ? `${lineIndent}<del>` : ''
                          );
                    let   { value }  = part;
                    
                    value = value.replace(/\n|\r/gm, '\n' + indentValueDiff);
                    
                    decorated.push(`${open}${value}${close}`);
                });
                
                // join up the value diff into a string we can add to the markdown
                output += decorated.join(isCode.test(to) ? '' : '\n');
                
                // add the value diff and close the code/pre tags
                output += `${indentValueDiff}</code></pre>\n`;
            }
        }
        
        // if this item has items of its own pass them to the markdownItems method
        if (items) {
            output += this.markdownItems(items, indent ? indent + 1 : 0, '-');
        }
        
        return output;
    }
    
    /**
     * Output a list of total classes and member types from the diff processor
     * @param {Object} totalsObj The diff's totals object with all of the totals info
     * @return {String} The markdown string with the SDK totals appended
     */
    markdownSdkTotals (totalsObj) {
        const categories = _.keys(totalsObj);
        let   len        = categories.length,
              i          = 0,
              output     = '';
        
        // label the totals section
        output += '\n## SDK Totals\n\n';
        // loop over all items and add them to the totals output as bullets
        for (; i < len; i++) {
            const name     = categories[i],
                  dispName = Pluralize.plural(_.startCase(name)),
                  count    = Utils.formatNumberWithCommas(totalsObj[name]);
            
            output += `- ${count} ${dispName}\n`;
        }
        
        return output;
    }
}

module.exports = Diff;