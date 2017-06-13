/* jshint node: true */
'use strict';

const Parser    = require('./parser.js'),
      Utils     = require('../shared/Utils'),
      _         = require('lodash'),
      Pluralize = require('pluralize');
      
const IsCode    = /^(?:\[|{|Ext.|new)/i;

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
            this.outputMarkdown(diff)
        });
    }
    
    outputMarkdown (diff) {
        let output = '';
        
        output += this.titleMarkdown(diff);
        output += this.markdownItems(diff.items);
        
        return output;
    }
    
    titleMarkdown (diff) {
        const { diffed } = diff.meta,
              { source, target } = diffed,
              { title : sourceTitle, version : sourceVersion } = source,
              { title : targetTitle, version : targetVersion } = target,
              sourceStr = `${sourceTitle} ${sourceVersion}`,
              targetStr = `${targetTitle} ${targetVersion}`;
              
        return `# Diff between ${sourceStr} and ${targetStr}\n`;
    }
    
    markdownAddedRemoved (diffObj, label, level) {
        const types         = _.keys(diffObj),
              bullet        = _.repeat('  ', (level)) + '-',
              hash          = _.repeat('#', (level + 2)),
              headingPrefix = level ? bullet : hash;
        let   output = '';
        
        types.forEach(type => {
            const list = diffObj[type];
            
            type = _.capitalize(Pluralize.plural(type));
            output += `${headingPrefix} ${label} ${type}\n`;
            
            list.forEach(item => {
                const indent = _.repeat('  ', (level + 1));
                
                output += `${indent}- ${item}\n`;
            });
        });
        
        return output;
    }
    
    markdownModified (diffObj, level) {
        const types         = _.keys(diffObj),
              len           = types.length,
              bullet        = _.repeat('  ', (level)) + '-',
              hash          = _.repeat('#', (level + 2)),
              headingPrefix = level ? bullet : hash;
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
                      indent = level ? _.repeat('  ', (level + 1)) + '-' : '###';
                    
                output += `${indent} ${item}\n`;
                
                output += this.markdownItem(category[item], level);
            }
        }
        
        return output;
    }
    
    markdownItems (diffObj = {}, level = 0) {
        const { added, removed, modified } = diffObj;
        let output = '';
        
        if (added) {
            output += this.markdownAddedRemoved(added, 'Added', level);
        }
        if (removed) {
            output += this.markdownAddedRemoved(removed, 'Removed', level);
        }
        if (modified) {
            output += this.markdownModified(modified, level);
        }
        
        return output;
    }
    
    markdownItem (diffObj, level) {
        const { changes, items } = diffObj;
        let   output             = '';
        
        if (changes) {
            const changeNames = _.keys(changes),
                  len         = changeNames.length;
            let   i           = 0;
            
            for (; i < len; i++) {
                const name         = changeNames[i],
                      change       = changes[name],
                      { from, to } = change,
                      indentLabel  = _.repeat('  ', (level)),
                      indentValue  = _.repeat('  ', (level + 1));
                      
                output += `${indentLabel}- from\n`;
                //output += `${indentValue}- ${from}\n`;
                output += this.getValuePrefix(from, level);
                output += `${indentLabel}- to\n`;
                //output += `${indentValue}- ${to}\n`;
                output += this.getValuePrefix(to, level);
            }
        }
        
        if (items) {
            output += this.markdownItems(items, level + 1);
        }
        
        return output;
    }
    
    getValuePrefix (value, level) {
        console.log(value, IsCode.test(value));
        if (IsCode.test(value)) {
            value = `    \`\`\`${value}\`\`\`\n`;
        } else {
            let buffer = _.repeat('  ', (level + 1));
            
            value =  `${buffer}- ${value}\n`;
        }
        
        return value;
    }
}

module.exports = Diff;