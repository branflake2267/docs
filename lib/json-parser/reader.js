/**
 * This script iterates through the JSON files produced by Doxi and pulls said JSON
 * into memory.  It then iterates through memory, marks down the text nodes using the
 * "marked" library, and ultimately, writes the data object's nodes
 * into a Handlebars template.  The templace then writes to HTML in the designated
 * output folder.
 *
 * To run this tool, issue the following command:
 *
 * node reader.js (optional: folder containing JSON | defaults to `json` ) (optional: template file | defaults to `template.js`)
 *
 */

var fs = require('fs'), // Require Node File System Module for file read/write
    handlebars = require('handlebars'), // Require Handlebars Module for templating
    argv = require('minimist'),  // Require Minimist for command line parsing
    junk = require('junk'),  // Test for Mac Junk files
    dir  = process.argv.slice(2)[0] || 'json', // Set directory containing JSON.  Defaults to 'json'
    templateLoc  = process.argv.slice(3)[0] || 'template.hbs', // Set the template location.  Defaults to 'template.js'
    template = fs.readFileSync(templateLoc, {encoding: 'utf-8'}),
    mkdirp = require("mkdirp"),
    marked = require('marked');

    marked.setOptions({
        renderer: new marked.Renderer()
    });

// Run text through the marked library
function scrubText (text) {
    if (!text) {
        return '';
    }

    // Remove the example tag
    text = text.replace(/@example/g, "");

    return marked(text);
}

function splitCommas (splitstring) {
    var linkstring = "";

    if (splitstring && splitstring.indexOf(",") > -1) {
        splitstring = splitstring.split(',');

        for ( var i=0; i<splitstring.length; i++ ) {
            linkstring += "<a href='"+splitstring[i]+".html'>"+splitstring[i]+"</a><br>";
        }
        return linkstring;
    }else {
        return "<a href='"+splitstring+".html'>"+splitstring+"</a>";
    }
}

function createTree () {
    return "[{ name: 'Item 1', children: [] },{ name: 'Item 2', children: [ " +
           "{ name: 'Sub Item 1', children: [] },{ name: 'Sub Item 2', children: [] }]}]";
}

function parser(data) {
    for ( var i=0; i<data.length; i++ ) {

        var obj       = JSON.parse(data[i]),
            cls       = obj.global.items[0],
            members   = cls.items,
            name      = cls.name,
            types     = cls.$type,
            tree      = createTree();

        // Loop through members so we can markup our member text
        if (members && members.length) {
            for (var j=0; j < members.length; j++) {
                var container = members[j].items;

                if (container && container.length) {
                    for (var k=0; k < container.length; k++) {
                        if (container[k].type != undefined) {
                            var typelinks = container[k].type;

                            // Check for types and make them links
                            if (typelinks.indexOf("/") > -1) {
                                typelinks = typelinks.split("/");
                                container[k].type = "";

                                for (var l=0; l < typelinks.length; l++) {
                                    safelinks = typelinks[l].replace("[]","").replace("...","");

                                    container[k].type += "<a href='"+safelinks+".html'>"+typelinks[l]+"</a>";

                                    if (l != typelinks.length - 1) {
                                        container[k].type += "/";
                                    }
                                }
                            }else {
                                container[k].type = "<a href='"+typelinks+".html'>"+typelinks+"</a>";
                            }
                        }
                        container[k].text = scrubText(container[k].text);
                    }
                }
            }
        }

        // Prepare the handlebars view object
        var view = {
            name: name,
            altNames: cls.alternateClassNames ? cls.alternateClassNames.split(',').join('<br>') : '',
            mixins: cls.mixins ? splitCommas(cls.mixins) : '',
            requires: cls.requires ? splitCommas(cls.requires) : '',
            classText: scrubText(cls.text),
            classAlias: cls.alias,
            classType: types,
            members: members,
            tree: tree
        }

        var newtemplate = handlebars.compile(template), // Compile the handlebars template with the view object
            output      = newtemplate(view);

        console.log("Writing " + name + ".html");

        // Write the output folder.  writeFile pukes if the folder doesn't exist first
        mkdirp('output');

        fs.writeFile("output/" + name + ".html", output, {encoding: 'utf-8'}, function(err) {
            if (err) throw err;
        });
    }
}

function execute (dir) {
    //Read all of our DOXI JSON output files into data object
    fs.readdir(dir,function(err,files) {

        var tempData = [];

        var readFiles = function(index) {

            if (index == files.length) {
                console.log('Finished reading files into memory...');

                parser(tempData);
            }else{

                if (junk.not(files[index])) {
                    fs.readFile(dir + "/" + files[index], {encoding: 'utf-8'}, function(err,json) {
                        console.log("Reading " + files[index]);

                        if (err) throw err;

                        json = json.replace(/['`]*\{\s*@link(?:\s+|\\n)(\S*?)(?:(?:\s+|\\n)(.+?))?\}['`]*/g, function(match,link,text) {
                            if (!text) {
                                text = link;
                            }

                            if (link.charAt(0) != "#") {
                                if (link.indexOf("#") > -1) {
                                    link = link.replace("#",".html#");
                                } else {
                                    link = link + ".html";
                                }
                            } else {
                                link = files[index].replace(".json","") + ".html" + link;
                            }

                            return "<a href='"+link+"'>"+text+"</a>";
                        });

                        readFiles(index + 1);
                        tempData.push(json);
                    });
                } else{
                    readFiles(index + 1);
                }
            }
        }
        // Start Reading
        readFiles(0);
    });
}

execute(dir);