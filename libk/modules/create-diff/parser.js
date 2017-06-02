/* jshint node: true */
'use strict';

const DiffBase = require('./base.js'),
      Path     = require('path'),
      Fs       = require('fs-extra');

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
     * Creates the diff object between the target and source files
     * @return {Object} The diff object
     */
    get diff () {
        if (!this._diff) {
            let {targetFile, sourceFile} = this;
            
            console.log(targetFile.global.items.length);
            console.log(sourceFile.global.items.length);
        }
        
        return this._diff;
    }
}

module.exports = Parser;