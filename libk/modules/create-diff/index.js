/* jshint node: true */
'use strict';

const Parser    = require('./parser.js'),
      Utils     = require('../shared/Utils'),
      _         = require('lodash'),
      Pluralize = require('pluralize'),
      JsDiff    = require('diff');
      //Fs        = require('fs-extra');

class Diff extends Parser {
    constructor (options) {
        super(options);
    }
    
    run () {
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
            const { diff } = this;
            
            //console.log(this.outputMarkdown(diff));
            //this.outputMarkdown(diff)
            //console.log(this.markup(this.outputMarkdown(diff)));
        });
    }
    
    outputMarkdown (diff) {
        let output = '';
        
        output += this.markdownTitle(diff);
        output += this.markdownItems(diff.items);
        
        return output;
    }
    
    markdownTitle (diff) {
        const { diffed } = diff.meta,
              { source, target } = diffed,
              { title : sourceTitle, version : sourceVersion } = source,
              { title : targetTitle, version : targetVersion } = target,
              sourceStr = `${sourceTitle} ${sourceVersion}`,
              targetStr = `${targetTitle} ${targetVersion}`;
              
        return `# Diff between ${sourceStr} and ${targetStr}\n`;
    }
    
    markdownItems (diffObj = {}, indent = 0, prefix = '## ') {
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
    
    markdownAddedRemoved (diffObj, label, indent, prefix) {
        const types         = _.keys(diffObj),
              headingPrefix = _.repeat('  ', indent) + prefix;
              //bullet        = _.repeat('  ', headingLevel) + '-',
              //hash          = _.repeat('#', level + 1),
              //headingPrefix = level ? bullet : hash;
        let   output = '';
        
        types.forEach(type => {
            const list = diffObj[type];
            
            type = _.capitalize(Pluralize.plural(type));
            //output += headingLevel + '\n';
            output += `${headingPrefix} ${label} ${type}\n`;
            
            list.forEach(item => {
                //const indent = _.repeat('  ', (level + 1));
                const childIndent = prefix.includes('-') ? 1 : 0,
                      childPrefix = _.repeat('  ', indent + childIndent) + '-';
                //output += (headingLevel + 1) + '\n';
                output += `${childPrefix} ${item}\n`;
            });
        });
        
        return output;
    }
    
    markdownModified (diffObj, indent, prefix) {
        const types         = _.keys(diffObj),
              len           = types.length,
            //   headingLevel  = level > 3 ? level : 0,
            //   bullet        = _.repeat('  ', headingLevel) + '-',
            //   hash          = _.repeat('#', level + 1),
            //   headingPrefix = level ? bullet : hash;
              headingPrefix = _.repeat('  ', indent) + prefix;
        let   i             = 0,
              output        = '';
        
        for (; i < len; i++) {
            let   type      = types[i];
            const category  = diffObj[type],
                  items     = _.keys(category),
                  itemsLen  = items.length;
            let   j         = 0,
                  typeLabel = _.capitalize(Pluralize.plural(type));
                  
            output += `${headingPrefix} Modified ${typeLabel}\n`;
            
            for (; j < itemsLen; j++) {
                const item = items[j],
                      childIndent = prefix.includes('-') ? 1 : 0,
                      childPrefix = childIndent ? _.repeat('  ', indent + 1) + '-' : '###',
                      itemIndent  = childIndent + (childIndent ? 1 : 0);
                    
                output += `${childPrefix} ${item}\n`;
                output += this.markdownItem(category[item], indent + itemIndent);
            }
        }
        
        return output;
    }
    
    markdownItem (diffObj, indent) {
        const { changes, items } = diffObj;
        let   output             = '';
        
        if (changes) {
            const changeNames = _.keys(changes),
                  len         = changeNames.length;
            let   i           = 0;
            
            for (; i < len; i++) {
                const name            = changeNames[i],
                      change          = changes[name],
                      { from, to }    = change,
                      indentName      = _.repeat('  ', indent),
                      indentValueDiff = _.repeat('  ', indent + 1),
                      // indentLabel     = _.repeat('  ', (level + 1)),
                      // indentValue     = _.repeat('  ', (level + 2)),
                      isCode          = /^(?:\[(?:.*\n|\r+)|{(?:.*\n|\r+)|Ext.(?:.*\n|\r+)|new(?:.*\n|\r+))/i;
                    
                output += `${indentName}- ${name}\n`;
                output += `${indentValueDiff}<pre><code>`;
                // output += `${indentLabel}- from\n`;
                // output += this.getValuePrefix(from, level + 1);
                // output += `${indentLabel}- to\n`;
                // output += this.getValuePrefix(to, level + 1);
                
                const valueDiff = JsDiff.diffLines(_.escape(from), _.escape(to)),
                      decorated = [];

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
                
                output += decorated.join(isCode.test(to) ? '' : '\n');
                
                output += `${indentValueDiff}</code></pre>\n`;
            }
        }
        
        if (items) {
            output += this.markdownItems(items, indent ? indent + 1 : 0, '-');
        }
        
        return output;
    }
    
    // getValuePrefix (value, level) {
    //     const isCode = /^(?:\[|{|Ext.|new)/i;
        
    //     if (isCode.test(value)) {
    //         value = `\`\`\`${value}\`\`\`\n`;
    //     } else {
    //         let buffer = _.repeat('  ', (level + 1));
            
    //         value =  `${buffer}- ${value}\n`;
    //     }
        
    //     return value;
    // }
}

module.exports = Diff;