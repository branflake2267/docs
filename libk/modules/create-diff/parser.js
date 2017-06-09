/* jshint node: true */
'use strict';

const DiffBase = require('./base.js'),
      Path     = require('path'),
      Fs       = require('fs-extra'),
      _        = require('lodash');

class Parser extends DiffBase {
    constructor (options) {
        super(options);
    }
    
    /**
     * The command to use when building the doxi files for diffing
     * @return {String} The doxi build command
     */
    get doxiBuildCommand () {
        return 'all-classes-flatten';
    }
    
    /**
     * The path to the doxi-processed file
     * @return {String} The path to the doxi processed file
     */
    get flatDoxiFilePath () {
        let command = this.doxiBuildCommand;
        
        return Path.join(
            this.getDoxiInputDir(command),
            `${this.apiDirName}_${command}.json`
        );
    }
    
    /**
     * Determines whether doxi should be run or can be skipped
     * @return {Boolean} Returns `true` if the doxi flat file is missing
     */
    get doxiRequired () {
        return !Fs.existsSync(this.flatDoxiFilePath);
    }
    
    /**
     * The contents of the doxi file used by the parser logic when comparing to the 
     * source product / version.  The `--diffTargetPath` will be used if supplied.  Else, 
     * a new doxi output file will be created using the {@link #diffTargetProduct} and 
     * {@link diffTargetVersion}
     * @return {Object} The doxi file containing all processed files from the API
     */
    get targetFile () {
        if (!this._targetFile) {
            let targetFile = this.options.diffTargetPath;
            
            if (!targetFile) {
                this.diffProcess = 'target';
                // create the file Doxi will use to parse the SDK
                this.createTempDoxiFile();
                
                // creates the doxi flat file if not already created
                this.doRunDoxi(this.doxiBuildCommand);
                
                targetFile = this.flatDoxiFilePath;
            }
            
            this._targetFile = Fs.readJsonSync(targetFile);
        }
        
        return this._targetFile;
    }
    
    /**
     * The contents of the doxi file used by the parser logic when comparing to the 
     * target product / version.  The `--diffSourcePath` will be used if supplied.  Else, 
     * a new doxi output file will be created using the {@link #diffSourceProduct} and 
     * {@link diffSourceVersion}
     * @return {Object} The doxi file containing all processed files from the API
     */
    get sourceFile () {
        if (!this._sourceFile) {
            let sourceFile = this.options.diffSourcePath;
            
            if (!sourceFile) {
                this.diffProcess = 'source';
                // create the file Doxi will use to parse the SDK
                this.createTempDoxiFile();
                
                // creates the doxi flat file if not already created
                this.doRunDoxi(this.doxiBuildCommand);
                
                sourceFile = this.flatDoxiFilePath;
            }
            
            this._sourceFile = Fs.readJsonSync(sourceFile);
        }
        
        return this._sourceFile;
    }
    
    get diff () {
        if (!this._diff) {
            let summary       = this.typeCategories,
                targetClasses = this.targetFile.global.items,
                sourceClasses = this.sourceFile.global.items,
                diff          = {
                    summary : _.zipObject(
                        summary, _.fill(
                            Array(summary.length),
                            0
                        )
                    )
                };
            
            this.diffItems(diff, 'class', targetClasses, sourceClasses);
            this._diff = diff;
        }
        
        this.cleanObject(this._diff);
        //console.log(JSON.stringify(this._diff, null, 4));
        return this._diff;
    }
    
    filterItems (items, type) {
        return _.filter(items, item => {
            if (type === 'class' && item.$type !== 'class') {
                return false;
            }
            return !item.ignore && !item.hide; 
        });
    }
    
    diffItems (diffObj, type = 'class', targetItems = [], sourceItems = []) {
        let diffItems = diffObj.items = {};
        
        targetItems = this.filterItems(targetItems, type);
        sourceItems = this.filterItems(sourceItems, type);
        
        // TODO: include alternate class names in the source map
        let targetMap   = _.keyBy(targetItems, 'name'),
            sourceMap   = _.keyBy(sourceItems, 'name'),
            targetNames = _.keys(targetMap),
            sourceNames = _.keys(sourceMap),
            added       = _.differenceWith(targetNames,   sourceNames, _.isEqual),
            removed     = _.differenceWith(sourceNames,   targetNames, _.isEqual),
            commonNames = _.intersectionWith(targetNames, sourceNames, _.isEqual),
            len         = commonNames.length;
        
        diffItems.added   = added.length   ? added   : undefined;
        diffItems.removed = removed.length ? removed : undefined;
        
        let modifiedObj = {};
        
        while (len--) {
            let name = commonNames[len];
            
            this.diffItem(name, modifiedObj, type, targetMap, sourceMap);
        }
        
        diffItems.modified = modifiedObj;
    }
    
    diffItem (name, diffObj, type, targetMap, sourceMap) {
        let target      = targetMap[name],
            targetItems = target.items,
            targetType  = target.$type,
            propType    = (type === 'class') ? type : 'member',
            targetObj   = _.pick(targetMap[name], this[`${propType}Props`]),
            source      = sourceMap[name],
            sourceItems = source.items,
            sourceObj   = _.pick(sourceMap[name], this[`${propType}Props`]),
            targetNames = _.keys(targetObj),
            sourceNames = _.keys(sourceObj),
            modified    = _.reduce(targetObj, (result, value, key) => {
                let fromValue = sourceObj[key];
                
                if (!_.isEqual(value, fromValue)) {
                    result[key] = {
                        from : fromValue || 'undefined',
                        to   : value || 'undefined'
                    };
                }
                
                return result;
            }, {});
        
        diffObj[type] = diffObj[type] || {};
        diffObj[type][name] = diffObj[type][name] || {};
        diffObj[type][name].changes = modified;
        
        if (targetItems) {
            if (_.includes(this.typeCategories, targetItems[0].$type)) {
                let targetTypeObj = _.keyBy(targetItems, '$type'),
                    targetTypes   = _.keys(targetTypeObj),
                    sourceTypeObj = _.keyBy(sourceItems, '$type'),
                    sourceTypes   = _.keys(sourceTypeObj),
                    allTypes      = _.union(targetTypes, sourceTypes),
                    len           = allTypes.length;
                
                while (len--) {
                    let itemType       = allTypes[len],
                        targetCategory = targetTypeObj[itemType] || {},
                        targetItems    = targetCategory.items,
                        sourceCategory = sourceTypeObj[itemType] || {},
                        sourceItems    = sourceCategory.items;
                    
                    this.diffItems(diffObj[type][name], itemType, targetItems, sourceItems);
                }
            } else {
                this.diffItems(diffObj[type][name], targetType, targetItems, sourceItems);
            }
        }
    }
    
    cleanObject (obj) {
        if (_.isObject(obj)) {
            _.each(obj, (val, key) => {
                this.cleanObject(val);
                if (_.isNil(val) || (_.isObject(val) && _.isEmpty(val))) {
                    delete obj[key];
                }
            });
        }
    }
}

module.exports = Parser;