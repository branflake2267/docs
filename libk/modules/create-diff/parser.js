/* jshint node: true */
'use strict';

const DiffBase = require('./base.js'),
      Path     = require('path'),
      Fs       = require('fs-extra'),
      _        = require('lodash');
      
const ItemTests = [
    'access',
    'alias',
    'alternateClassNames',
    'deprecatedVersion',
    'hide',
    'inheritdoc',
    'localDoc',
    'optional',
    'preventable',
    'readonly',
    'requires',
    'static',
    'type',
    'uses',
    'value'
];

class Parser extends DiffBase {
    constructor (options) {
        super(options);

        /*this.summary                = {};
        this.includeDebugOutput     = options['include-debug-output'];
        this.includeVerboseSummary  = options['verbose-summary'];
        this.countMasterKey         = 'all';
        this.countTypes             = ['all', 'private', 'deprecated'];
        this.outputOptions = {
            private     : options['include-private'],
            deprecated  : options['include-deprecated'],
            class       : options['include-class-details']
        };*/
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
    
    /**
     * Returns a map of target and source classes with each having properties:
     * 
     *  - **names**      {Array}  : array of all class names in the API
     *  - **classes**    {Object} : hash of class names and its class object
     *  - **altNames**   {Array}  : array of all alternate class names
     *  - **altClasses** {Object} : hash of all alternate class names and their class 
     *                              object
     * 
     * @return {Object} The class map
     */
    get classMap () {
        if (!this._classMap) {
            this._classMap = {
                target : {
                    names      : [],
                    classes    : {},
                    altNames   : [],
                    altClasses : {}
                },
                source : {
                    names      : [],
                    classes    : {},
                    altNames   : [],
                    altClasses : {}
                }
            };
            
            let classMap         = this._classMap,
                {target, source} = classMap,
                targetFile       = this.targetFile,
                targetClasses    = targetFile.global.items,
                sourceFile       = this.sourceFile,
                sourceClasses    = sourceFile.global.items;
            
            this.addClassesToMap(targetClasses, target);
            this.addClassesToMap(sourceClasses, source);
        }
        
        return this._classMap;
    }
    
    /**
     * Creates the diff object between the target and source files
     * @return {Object} The diff object
     */
    get diff () {
        if (!this._diff) {
            //let {targetFile, sourceFile} = this;
            let diff = this._diff = {
                    summary : {
                        classes               : 0,
                        configs               : 0,
                        properties            : 0,
                        ['static-properties'] : 0,
                        methods               : 0,
                        ['static-methods']    : 0,
                        events                : 0,
                        vars                  : 0
                    }
                },
                map               = this.classMap,
                {target, source}  = map,
                targetNames       = target.names,
                sourceNames       = source.names,
                added             = _.differenceWith(
                    targetNames,
                    sourceNames,
                    _.isEqual
                ),
                addedLen          = added.length,
                removed           = _.differenceWith(
                    sourceNames,
                    targetNames,
                    _.isEqual
                ),
                removedLen        = removed.length;

            diff.summary.classes =+ addedLen;
            if (addedLen) {
                diff.added = added;
            }
            
            diff.summary.classes =+ removedLen;
            if (removedLen) {
                diff.removed = removed;
            }
            
            this.diffClasses(diff);
            
            //console.log(targetNames.length, sourceNames.length, commonNames.length);
            //console.log(targetNames.indexOf('Ext.Gadget'), sourceNames.indexOf('Ext.Gadget'));
        }
        console.log(JSON.stringify(this._diff, null, 4));
        
        return this._diff;
    }
    
    diffClasses (diff) {
        let map              = this.classMap,
            {target, source} = map,
            targetNames      = target.names,
            sourceNames      = source.names,
            sourceAltNames   = source.altNames,
            commonNames      = _.intersectionWith(
                targetNames,
                sourceNames.concat(sourceAltNames),
                _.isEqual
            ),
            len              = commonNames.length,
            i                = 0;

        for (; i < len; i++) {
            let className = commonNames[i];
            
            this.diffClass(className, diff);
        }
    }
    
    diffClass (className, diff) {
        let map              = this.classMap,
            {target, source} = map,
            targetNames      = target.names,
            targetClasses    = target.classes,
            sourceClasses    = source.classes,
            sourceAltClasses = source.altClasses,
            targetCls        = targetClasses[className],
            sourceCls        = sourceClasses[className] || sourceAltClasses[className];
            
        let props = this.classProps,
            targetClsAttribs    = _.pick(targetCls, props),
            targetClsKeys       = Object.keys(targetClsAttribs),
            sourceClsAttribs    = _.pick(sourceCls, props),
            sourceClsKeys       = Object.keys(sourceClsAttribs),
            commonClsKeys       = _.intersectionWith(
                targetClsKeys,
                sourceClsKeys,
                _.isEqual
            ),
            commonTargetAttribs = _.pick(targetClsAttribs, commonClsKeys),
            commonSourceAttribs = _.pick(sourceClsAttribs, commonClsKeys);
            
        let added    = _.differenceWith(targetClsKeys, sourceClsKeys),
            removed  = _.differenceWith(sourceClsKeys, targetClsKeys),
            modified = _.toArray(_.reduce(commonTargetAttribs, (result, value, key) => {
                let fromValue = commonSourceAttribs[key];
                
                return _.isEqual(value, fromValue) ?
                    result : result.concat({
                        [key] : {
                            from : fromValue,
                            to   : value
                        }
                    });
            }, [])),
            classDiff = {
                [className] : {}
            },
            classDiffProps = {
                props : {}
            };
        
        if (added.length || removed.length || modified.length) {
            diff.modified = Array.from(diff.modified || []);
            classDiff[className] = classDiffProps;
            diff.modified.push(classDiff);
            //classDiff = classDiff[className].props;
        }
        
        // TODO: do we need to increment summary.classes here?
        if (added.length) {
            classDiffProps.props.added = added;
            // TODO process the added class attributes onto the diff
        }
        
        // TODO: do we need to increment summary.classes here?
        if (removed.length) {
            classDiffProps.props.removed = removed;
            // TODO process the removed class attributes onto the diff
        }
        
        // TODO: do we need to increment summary.classes here?
        if (modified.length) {
            classDiffProps.props.modified = modified;
        }
        
        //this.diffItems(className, diff, targetCls.items, sourceCls.items);
        this.diffItemTypes(classDiff, targetCls.items, sourceCls.items);
    }
    
    /**
     * 
     */
    diffItemTypes (diffObj, targetItems = [], sourceItems = []) {
        let targetMap = _.keyBy(targetItems, '$type'),
            sourceMap = _.keyBy(sourceItems, '$type'),
            allTypes   = _.uniqWith(
                _.concat(
                    _.keys(targetMap),
                    _.keys(sourceMap)
                )
            ),
            len       = allTypes.length,
            i         = 0;
        
        for (; i < len; i++) {
            let type   = allTypes[i],
                target = targetMap[type] || {},
                source = sourceMap[type] || {};
            
            this.diffItems(diffObj, type, target.items, source.items);
        }
    }
    
    /**
     * 
     */
    diffItems (diffObj, type, targetItems = [], sourceItems = []) {
        let targetMap   = _.keyBy(targetItems, 'name'),
            targetNames = _.keys(targetMap),
            sourceMap   = _.keyBy(sourceItems, 'name'),
            sourceNames = _.keys(sourceMap),
            added    = _.differenceWith(targetNames, sourceNames),
            addedLen = added.length,
            removed  = _.differenceWith(sourceNames, targetNames),
            removedLen = removed.length,
            commonNames = _.intersectionWith(
                targetNames,
                sourceNames,
                _.isEqual
            ),
            commonTargetItems = _.pick(targetMap, commonNames),
            commonSourceItems = _.pick(sourceMap, commonNames),
            commonNamesLen = commonNames.length,
            i = 0,
            /*modified = _.toArray(_.reduce(commonTargetItems, (result, value, key) => {
                let fromValue = commonSourceItems[key];
                
                return _.isEqual(value, fromValue) ?
                    result : result.concat({
                        [key] : {
                            from : fromValue,
                            to   : value
                        }
                    });
            }, [])),*/
            
            modified = [];
            
        for (; i < commonNamesLen; i++) {
            let name   = commonNames[i],
                target = _.pick(commonTargetItems[name], ItemTests),
                source = _.pick(commonSourceItems[name], ItemTests);
            
            let modifiedItems = _.toArray(
                _.reduce(target, (result, value, key) => {
                    let fromValue = source[key];
                    
                    return _.isEqual(value, fromValue) ?
                        result : result.concat({
                            [key] : {
                                from : fromValue || 'undefined',
                                to   : value
                            }
                        });
                }, [])
            );
            
            if (modifiedItems.length) {
                modifiedItems = {
                    [name] : modifiedItems
                };
            }
            
            modified = modified.concat(modifiedItems);
            
            //console.log(modifiedItems.length);
        }
            
        let modifiedLen = modified.length;
        
        if (addedLen || removedLen || modifiedLen) {
            diffObj = diffObj.items = {};
        }
        
        if (addedLen) {
            diffObj.added = {
                [type] : added
            };
        }
        
        if (removedLen) {
            diffObj.removed = {
                [type] : removed
            };
        }
        
        if (modifiedLen) {
            //diffObj.modified = modified;
            diffObj.modified = {
                [type] : modified
            };
        }
        
        /*let example = {
            added : ['ClassName'],
            removed : ['ClassName'],
            modified : [{
                className : {
                    props : {
                        added : ['propName'],
                        removed : ['propName'],
                        modified : [{
                            propName : {
                                from : 'FromValue',
                                to : 'ToValue'
                            }
                        }],
                        items : {
                            added : ['itemName'],
                            removed : ['itemName'],
                            modified : [{
                                propName : {
                                    type : 'type',
                                    props : {
                                        added : ['propName'],
                                        removed : ['propName'],
                                        modified : [{
                                            propName : {
                                                from : 'FromValue',
                                                to : 'ToValue'
                                            }
                                        }],
                                    },
                                    items : {
                                        added : ['itemName'],
                                        removed : ['itemName'],
                                        modified : [{
                                            itemName : {
                                                type : 'type',
                                                props : {
                                                    added : ['itemName'],
                                                    removed : ['itemName'],
                                                    modified : [{
                                                        itemName : {
                                                            from : 'FromValue',
                                                            to : 'ToValue'
                                                        }
                                                    }]
                                                },
                                                items : {
                                                    added : ['itemName'],
                                                    removed : ['itemName'],
                                                    modified : [{
                                                        itemName : {
                                                            type : 'type',
                                                            props : {
                                                                added : ['itemName'],
                                                                removed : ['itemName'],
                                                                modified : [{
                                                                    itemName : {
                                                                        from : 'FromValue',
                                                                        to : 'ToValue'
                                                                    }
                                                                }]
                                                            }
                                                        }
                                                    }]
                                                }
                                            }
                                        }]
                                    }
                                }
                            }
                        }]
                    }
                }
            }],
            summary : {
                classes : 0,
                configs : 0,
                properties : 0,
                ['static-properties'] : 0,
                methods : 0,
                ['static-methods'] : 0,
                events : 0,
                vars : 0
            }
        };*/
        
    }
    
    /**
     * Used by {@link #classMap} to add all classes from the target API and source API to 
     * their respective properties in the `classMap`
     * @param {Object[]} classList Array of all classes in the API
     * @param {Object} map The object add the class map info to from each class object in 
     * the `classList`
     */
    addClassesToMap (classList, map) {
        let len = classList.length,
            i   = 0,
            {
                classes,
                names,
                altClasses,
                altNames
            }   = map;
        
        for (; i < len; i++) {
            let cls                 = classList[i],
                {$type, name, alternateClassNames} = cls,
                isClass             = ($type === 'class');
            
            // don't include ignored or hidden classes to the map
            if (cls && isClass && !cls.ignore && !cls.hide) {
                classes[name] = cls;
                names.push(name);
                
                if (alternateClassNames) {
                    alternateClassNames = alternateClassNames.split(',');
                    map.altNames = map.altNames.concat(alternateClassNames);
                    
                    alternateClassNames.forEach(altClassName => {
                        altClasses[altClassName] = cls;
                    });
                }
            }
        }
    }
}

module.exports = Parser;