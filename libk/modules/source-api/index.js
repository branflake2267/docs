'use strict';

/**
 * Run doxi
 *  - sync the source folder and Git
 * Read in all of the doxi files to get:
 *  - class list
 *  - map of all of the source file paths (later we will correlate the generated source HTML file to this file path)
 * Create the source HTML files (and put them in a common location to be used by both apps)
 *  - map the file name of the source HTML file created to the source file path
 *
 * Read over the doxi files again
 * Create a class resource file to be used by a create-app module
 * Add class-level info to the class resource file
 *  - some will be applied directly from the doxi file
 *  - some will be derived (for example: isComponent, isSingleton, isSdkRoot (meaning is Ext or ST themselves))
 * process all of the class member groups
 * doing so calls a member processor to:
 *  - decorate the member object as needed
 *  - adds the member to special objects on the class resource object for later use (i.e. indicating a list of instanceMethods that we can check against later when deriving accessors, etc.)
 * Loop over the configs and create any applicable getter / setter methods and add those to the methods group on the class resource obj
 * ? sort the items in each member group (? maybe just ones that get things moved around like properties and methods because of the accessors and static ones or maybe configs because of requried configs)
 * The class resource object should now be sorted out and ready to be saved somewhere, but first..
 * Add the class to the search
 * Add the class to the class tree
 *  - ? should this be two trees?  One for package name (which is what we do today) and one for inheritance (like JSDuck did)
 * Output the class resource object (? this might just be templated here and executed by the create-app modules)
 */

const Base       = require('../base'),
      Path       = require('path'),
      Utils      = require('../shared/Utils'),
      Handlebars = require('handlebars'),
      Fs         = require('fs'),
      Shell      = require('shelljs'),
      Mkdirp     = require('mkdirp');

class SourceApi extends Base {
    constructor (options) {
        super(options);

        /**
         * @property srcFileMap
         * An object map of source file path to output source .html file names
         */
        //this.srcFileMap = {};

        // a map of class names
        //this.classMap = {};

        /**
         * @property srcTemplate
         * The template used to output the source HTML files
         */
        // TODO consider making the source template hbs something that's stipulated in the project config file
        this.srcTemplate = Handlebars.compile(Fs.readFileSync(Path.join(this.options._myRoot, 'templates/html-src.hbs'), 'utf-8'));
        //this.srcTemplate = Handlebars.compile(Fs.readFileSync(__dirname + '/src-template.hbs', 'utf-8'));
    }

    run () {
        this.prepareApiSource();
    }

    get doxiCfgFileName () {
        let options = this.options,
        product = options.product,
        version = options.version,
        toolkit = options.toolkit || product;

        return version + '-' + toolkit + '.doxi.json';
    }

    getDoxiCfgPath (fromDir) {
        let rel = Path.relative(fromDir || __dirname, this.options._myRoot);

        return Path.join(rel, Utils.format(this.options.parserConfigPath, this.options));
    }

    get doxiCfgFile () {
        return Path.join(this.getDoxiCfgPath(), this.doxiCfgFileName);
    }

    get doxiCfg () {
        // TODO cache this and other getters
        return require(this.doxiCfgFile);
    }

    get doxiInputDir () {
        let cfgDir       = this.getDoxiCfgPath(),
            cfg          = this.doxiCfg,
            outputDir    = cfg.outputs['combo-nosrc'].dir,
            relToDoxiCfg = Path.resolve(__dirname, cfgDir),
            inputDir     = Path.resolve(relToDoxiCfg, outputDir);

        return inputDir;
    }

    get doxiInputFolderIsEmpty () {
        let dir = this.doxiInputDir;

        if (!Fs.existsSync(dir)) {
            return true;
        }

        let files = Fs.readdirSync(dir);
        files = this.getFilteredFiles(files);

        return files.length === 0;
    }

    prepareApiSource () {
        this.runDoxi();
        this.readDoxiFiles();
        console.log('DONE WITH PREPAREAPISOURCE');
    }

    runDoxi () {
        let me      = this,
            options = me.options;

        if (me.options.forceDoxi || me.doxiInputFolderIsEmpty) {
            // TODO this should be preventable with some flag from the CLI
            me.syncRemote(me.options.product);

            let path = Shell.pwd(),
                cmd  = 'sencha';

            Shell.cd(path + me.getDoxiCfgPath(path.stdout));
            // TODO enable an option for users to specify where the SDK source folder is (within the app.js file and probably CLI params)
            Shell.exec(cmd + ' doxi build -p ' + me.doxiCfgFileName + ' combo-nosrc');
            Shell.cd(path);
        }
    }

    /**
     * Catalog each of the source file paths used in building the classes of the
     * framework.  Data relating to those source files like the source HTML file name can
     * then be associated to the source file path.
     * @param {Array/String} files A file or array of files to be added to the map
     */
    mapSrcFiles (files) {
        files = Utils.from(files);

        let i   = 0,
            len = files.length,
            map = this.srcFileMap;

        for (; i < len; i++) {
            let path = files[i];

            // if the file path is not already in the hash then add it
            if (!map[path]) {
                map[path] = {};
            }
        }
    }

    readDoxiFiles () {
        let me       = this,
            inputDir = this.doxiInputDir,
            map      = me.srcFileMap = {},
            classMap = me.classMap = {};

        if (this.doxiInputFolderIsEmpty) {
            this.runDoxi();
        }

        let files = Fs.readdirSync(inputDir);
        // filter out unwanted os files
        files = me.getFilteredFiles(files);

        let i   = 0,
            len = files.length;

        me.log('Processing the parsed SDK source files');

        // loop over all Doxi files
        for (; i < len; i++) {
            let cls     = require(Path.join(inputDir, files[i])),
                clsObj  = cls.global.items[0], // the class obj
                // the index in the files list where the class is primarily sourced
                srcIdx  = (clsObj.src.text || clsObj.src.name).substring(0, 1),
                // the path of the class source from the SDK
                // TODO this is a crutch for now - need doxi to give us the source class (classes)
                srcPath = cls.files[srcIdx];

            // add all source files for this class to the master source file map
            me.mapSrcFiles(cls.files || []);

            // if the current file is a "class" file then cache the contents in the
            // source file hash
            // Supports #addAnchors
            if (clsObj.$type === 'class') {
                map[srcPath].input = cls;
            }

            if (clsObj.$type === 'class') {
                let prepared = Object.assign({}, clsObj);
                delete prepared.items;

                classMap[clsObj.name] = {
                    raw: cls,
                    prepared: prepared
                };
            }
        }

        let classNames = Object.keys(classMap);
        i = 0;
        len = classNames.length;

        Mkdirp.sync(Path.resolve(__dirname, Path.join(me.resourcesDir, me.apiDirName)));

        let dt = new Date();
        for (; i < len; i++) {
            let className = classNames[i];

            // TODO MAKE SEARCH HAPPEN HERE SOMEHOW -> then later output the search file itself
            // TODO MAKE THE CLASS TREE

            //PROCESS API FILE INTO CURRATED API CLASS FILE
            me.decorateClass(className);
            delete classMap[className].raw;
            me.outputApiFile(className, classMap[className].prepared);
            delete classMap[className].prepared;
            //delete classMap[className].prepared;
        }
        console.log(new Date() - dt);

        me.createSrcFiles();
    }

    /**
     *
     */
    outputApiFile (className, prepared) {
        let resourcePath = Path.join(this.resourcesDir, this.apiDirName, className + '.json'),
            fileName = Path.resolve(__dirname, resourcePath);

        Fs.writeFileSync(fileName, JSON.stringify(prepared, null, 4), 'utf8', (err) => {
            if (err) throw err;
        });
    }

    decorateClass (className) {
        let me       = this,
            classMap = me.classMap,
            raw      = classMap[className].raw,
            prepared = classMap[className].prepared;

        let rawRoot  = raw.global.items[0];

        //prepared.files = raw.files;
        //Object.assign(prepared, rawRoot);
        // TODO note whether this is a singleton or not
        // TODO note whether this is a "component" or not

        prepared.text = me.markup(prepared.text);
        // TODO need to decorate the following.  Not sure if this would be done differently for HTML and Ext app output
        /*mixins            : cls.mixed               ? me.splitInline(cls.mixed, '<br>')                                  : '',
        localMixins       : cls.mixins              ? me.splitInline(cls.mixins, '<br>')                                 : '',
        requires          : cls.requires            ? me.splitInline(cls.requires, '<br>')                               : '',
        uses              : cls.uses                ? me.splitInline(cls.uses, '<br>')                                   : '',
        extends           : cls.extended            ? me.processHierarchy(cls)                                           : '',
        extenders         : cls.extenders           ? me.splitInline(JsonParser.processCommaLists(cls.extenders, false), '<br>') : '',
        mixers            : cls.mixers              ? me.splitInline(JsonParser.processCommaLists(cls.mixers, false), '<br>')    : '',*/

        prepared.requiredConfigs = [];
        prepared.optionalConfigs = [];
        prepared.instanceMethods = {};

        let i   = 0,
            memberTypeGroups = rawRoot.items || [],
            len = memberTypeGroups.length;

        for (; i < len; i++) {
            let group = memberTypeGroups[i],
                type = group.$type,
                members = group.items;

            if (members && members.length) {
                prepared[type] = me.processMembers(className, type, members);
            }
        }
    }

    /**
     *
     */
    processMembers (className, type, items) {
        let me  = this,
            i   = 0,
            len = items.length;

        for (; i < len; i++) {
            me.processMember(className, type, items[i]);
        }

        return items;
    }

    /**
     *
     */
    processMember (className, type, member) {
        let me      = this,
            classMap = me.classMap,
            raw      = classMap[className].raw,
            prepared = classMap[className].prepared,
            rawRoot = raw.global.items[0],
            clsName = rawRoot.name;

        if (type === 'vars') {
            member.$type = 'css_var-S'
        }
        if (type === 'sass-mixins') {
            member.$type = 'css_mixin'
        }

        if (member.type != null) {
            member.type = this.splitInline(member.type,  ' / ');
        }
        member.text = me.markup(member.text);

        member.params = [];
        member.returns = [];
        member.properties = [];

        if (member.items) {
            let i   = 0,
                len = member.items.length;

            for (; i < len; i++) {
                var item = member.items[i];

                // prepare the param and return text
                if (item.text && (item.$type === 'param' || item.$type === 'return' || item.$type === 'property')) {
                    item.text = me.markup(item.text);
                }
                // linkify the return types
                if (item.$type === 'return' || item.$type === 'param') {
                    item.type = me.splitInline(item.type,  ' / ');
                }
                if (item.$type === 'return') {
                    member.returns.push(item);
                    member.hasReturn = true;
                }
                if (item.$type === 'param') {
                    member.params.push(item);
                }
                if (item.$type === 'property') {
                    member.properties.push(item);
                    member.hasProperties = true;
                }

                // process any sub-items that this param / property may have
                if (item.items) {
                    me.processMembers(className, type, item.items);
                }
            }

            // cache the private params in their own array for collection for removal
            // from the public params
            member.privateParams = [];
            // loop the params to see if there are any public params and if so say that
            // the member has params
            // also, collect up private params to be removed from the params list

            for (i = 0; i < member.params.length; i++) {
                var param = member.params[i];

                if (param.access === undefined) {
                    member.hasParams = true;
                }
                if (param.access === 'private') {
                    member.privateParams.push(param);
                }
            }
            // filter out the private params
            member.params = Utils.difference(member.params, member.privateParams);
        }

        if (type === 'methods') {
            prepared.instanceMethods[member.name] = member;
        }

        // TODO see if this is necessary - prolly is.  :|
        /*if (type === 'events' || type === 'methods' || type === 'static-methods' || type === 'sass-mixins') {
            member.listParams = member.hasParams;
            member.listReturn = member.hasReturn;
        }*/

        // collect up the required and optional configs for sorting later
        if (type === 'configs') {
            // TODO should we manipulate all of the configs in one pass or leave them ad hoc like in the configs conditional here?
            member.$type = 'cfg';
            prepared[member.required ? 'requiredConfigs' : 'optionalConfigs'].push(member);
        }

        // find the source class and note whether the member comes from an ancestor class
        member.srcClass = member.from || clsName;
        member.isInherited = member.srcClass !== clsName;
        member.hide = member.fromObject = member.from === 'Object';
        // TODO is this necessary if all of the $types are correct by the time we get here?
        member.linkType = member.$type;

        // TODO is this necessary if all of the $types are correct by this time?
        if (member.static) {
            member.linkType = 'static-' + member.linkType;
        }

        // TODO seems we shouldn't HAVE to do this here.  I'd think this could be set as data on the member and the template stipulate the markup
        /*member.srcLink = '<div class="viewSource">' +
                         '<a target="_blank" href="src/' +
                            fileLink + '#' + member.srcClass + '-' + member.linkType + '-' + member.name + '">' +
                         'view source</a></div>';*/

        member.access = member.access || 'public';
        member.accessMini = member.access.substr(0, 3);

        // TODO - is this needed?  In the original I'm not sure where this is being used.  Thought it was for search, but now I'm not sure
        /*if (!member.from) {
            let extras;

            if (member.removedVersion) {
                extras = 'r';
            } else if (member.deprecatedVersion) {
                extras = 'd';
            } else if (member.static) {
                extras = 's';
            } else if (member.readonly) {
                extras = 'ro';
            }

            // cache the shortcut name for the member access level
            acc = member.access === 'private' ? 'i' : (member.access === 'protected' ? 'o' : 'p');
        }*/

        if (member.static === true) {
            member.$type = 'static-' + member.$type;
        }
    }

    /**
     * Create an HTML version of the each source JS file in the framework
     */
    createSrcFiles () {
        console.log('CREATE SOURCE FILES !!!');
        let me        = this,
            i         = 0,
            map       = this.srcFileMap,
            keys      = Object.keys(map),
            len       = keys.length,
            names     = {};

        for (; i < len; i++) {
            let path = keys[i],
                // returns 'file.ext' from the full path
                name = Path.parse(path).base;

            // rename the file name to be used in the source file output if it's been
            // used already.  i.e. the first Button.js class will be Button.js and any
            // additional Button classes will have a number appended.  The next would be
            // Button.js-1 as the file name
            if (names[name]) {
                let rename = name + '-' + names[name].length;
                names[name].push(rename);
                name = rename;
            } else {
                names[name] = [name];
            }

            // once the file names are sorted for duplicates add the final file name to
            // the source file map
            map[keys[i]].filename = name;
        }

        // time stamp and log status
        //me.openStatus('Create source HTML files');


        // loop over the source file paths and HTML-ify them
        me.processQueue(keys, __dirname + '/htmlify.js', function (items) {

            // once all files have been HTML-ified add anchor tags with the name of each
            // class-member so that you can link to that place in the docs
            let anchored = me.addAnchorsAll(items);

            // conclude 'Create source HTML files' status
            //me.closeStatus();

            // output all of the source HTML files
            me.outputSrcFiles(anchored);

            this.emitter.emit('apiProcessed');
        });
    }

    /**
     * Output all source SDK class files as HTML pages
     * @param {Object[]} contents The contents and file names to output.  Each item in
     * the `contents` should be an object with two keys:
     *
     *  - **html**: the HTML to output
     *  - **path**: the path of the original source file.  Used to look in the srcFileMap
     * to get the filename to output
     */
    outputSrcFiles (contents) {
        console.log('OUTPUT SOURCE FILES');
        let me      = this,
            i       = 0,
            len     = contents.length,
            map     = this.srcFileMap,
            options = me.options,
            // TODO = this should be set globally probably in the base constructor
            outDir  = Path.join('output', options.product, options.version, options.toolkit || 'api', 'src'),
            total   = len;

        // create the output directory
        Mkdirp.sync(outDir);

        // time stamp and lot status
        //me.openStatus('Write out source HTML files')

        // loop through all items to be output
        for (; i < len; i++) {
            let content  = contents[i],
                filename = map[content.path].filename, // the filename to write out
                // the data object to apply to the source HTML handlebars template
                data     = {
                    content: content.html,
                    name   : filename,
                    title  : options.product,
                    version: options.version,
                    // TODO figure out what numVer is in production today
                    numVer : '...',
                    // TODO this should be output more thoughtfully than just using options.toolkit
                    meta   : options.toolkit
                };

            // write out the current source file
            Fs.writeFile(outDir + '/' + filename + '.html', me.srcTemplate(data), 'utf8', (err) => {
                if (err) throw err;

                // keep track of the total so we know when all async write operations are
                // complete
                total--;
                if (total === 0) {
                    // conclude 'Write out source HTML files' status
                    //me.closeStatus();
                }
            });

            delete map[content.path];
        }
        console.log('OUTPUT SOURCE FILES IS DONE !!!');
    }

    /**
     * Get the location array showing where the item (class or class member) was
     * discovered in the source files.
     * Supports {@link #addAnchors}
     * @param {Object} item The class or class member object containing the src location
     * coordinates
     * @return {Array} The location coordinates of the src
     */
    getLocArray (item) {
        let src = item.src.text || item.src.name;

        return src ? (src).split(',').map(function (item) {
            return parseInt(item, 10);
        }) : false;
    }

    /**
     * Adds anchors to all source HTML files
     * Supports {@link #createSrcFiles}
     * @param {Object} items An object of source file path and source HTML to be
     * processed
     * @return {Object} The source path and processed HTML
     */
    addAnchorsAll (items) {
        let me       = this,
            i        = 0,
            len      = items.length,
            anchored = [];

        for (; i < len; i++) {
            let item = items[i],
                path = item.path;

            anchored.push({
                html: me.addAnchors(item.html, path),
                path: path
            });
        }

        return anchored;
    }

    /**
     * Adds anchor tags to the HTML source denoting where each class and class member
     * documentation is located.  Additionally adds line number anchors to each line.
     * Supports {@link #addAnchorsAll} + {@link #createSrcFiles}
     * @param {String} html The un-anchored HTML representing the framework class source
     * js file
     * @param {String} srcPath The path of the source class file
     * @return {String} The source HTML with anchors added
     */
    addAnchors (html, srcPath) {
        let me = this,
            src = me.srcFileMap[srcPath],
            clsSrc = src.input;

        if (clsSrc) {
            let cls         = clsSrc.global.items[0], // the class object
                clsName     = cls.name,               // class name
                memberTypes = cls.items,              // array of member type groups
                // split out all each line in the HTML
                lines       = html.split('<div class="line">'),
                loc;

            // if the class itself has documentation add the anchor for it
            if (cls.src) {
                // find the location within the file where the class is described
                loc = me.getLocArray(cls);
                // and prepend an anchor tag with the name of the class
                lines[loc[1]] = '<a name="' + clsName + '">' + lines[loc[1]];
            }

            // if there are any class members (an array of class member types)
            if (memberTypes) {
                let i   = 0,
                    len = memberTypes.length;

                // loop over each type group
                for (; i < len; i++) {
                    let group      = memberTypes[i],
                        // the collection of members of this type
                        members    = group.items,
                        membersLen = members.length;

                    // if there are members in this group
                    if (members && membersLen) {
                        let group = memberTypes[i],
                            // get the class + member type info to prefix to the
                            // following members as they're processed
                            name  = clsName + "-" + me.memberTypesMap[group.$type] + "-",
                            j     = 0;

                        // loop over all members in this type group
                        for (; j < membersLen; ++j) {
                            let member = members[j],
                                memloc;

                            // if the member has description in this class
                            if (member.src) {
                                // get the location where it's described
                                memloc = me.getLocArray(member);
                            }

                            // back the pointer up one so it's pointing to the top of
                            // the description
                            if (memloc && memloc[1]) {
                                memloc[1] = memloc[1]-1;
                            }

                            // inject the class and member type and member name
                            if (memloc && memloc[0] === loc[0]) {
                                lines[memloc[1]] = '<a name="' + name + member.name + '">' + lines[memloc[1]];
                            }
                        }
                    }
                }
            }

            let i = 0,
                len = lines.length;

            // loop over all of the lines and add an anchor for line number linking
            for (; i < len; i++) {
                if (i !== 0) {
                    lines[i] = '<a name="line' + i + '">' + lines[i];
                }
            }

            // re-assemble all of the split lines into an HTML string
            html = lines.join('<div class="line">');
        }

        return html;
    }
}

module.exports = SourceApi;
