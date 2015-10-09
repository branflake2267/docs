/**
 * This script iterates through the JSON files produced by Doxi and pulls said JSON
 * into memory.  It then iterates through memory and writes the data object's nodes
 * into a Mustache template, which then writes to HTML in an output folder.
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
    templateLoc  = process.argv.slice(3)[0] || 'template.js', // Set the template location.  Defaults to 'template.js'
    template = fs.readFileSync(templateLoc, {encoding: 'utf-8'}),
    mkdirp = require("mkdirp");

function parser(data){
    for ( var i=0; i<data.length; i++ ) {

        var obj       = JSON.parse(data[i]),
            item      = obj.global.items[0],
            name      = item.name,
            classText = item.text,
            types     = item.$type;

        var view = {
            name: name,
            altNames: item.alternateClassNames,
            mixins: item.mixins,
            requires: item.requires,
            classText: classText,
            classAlias: item.alias,
            classType: types,
            members: item.items
        }

        var newtemplate = handlebars.compile(template),
            output      = newtemplate(view);

        console.log("Writing " + name + ".html");

        mkdirp('output');

        fs.writeFile("output/" + name + ".html", output, {encoding: 'utf-8'}, function(err) {
            if (err) throw err;
        });
    }
}

//Read all of our DOXI JSON output files into data object
fs.readdir(dir,function(err,files){

    var tempData = [];

    var readFiles = function(index){

        if(index == files.length){
            console.log('Finished reading files into memory...');

            parser(tempData);
        }else{

            if(junk.not(files[index])) {
                fs.readFile(dir + "/" + files[index], {encoding: 'utf-8'}, function(err,json) {
                    console.log("Reading " + files[index]);

                    if (err) throw err;

                    json = json.replace(/\{\s*\@link\s+([\w*\.?]{0,}\#?\w*)([\s+\w*]{0,})?\}/g, function(match,link,text){
                        if(!text){
                            text = link;
                        }

                        if(link.charAt(0) != "#"){
                            if(link.indexOf("#") > -1){
                                link = link.replace("#",".html#");
                            }else{
                                link = link + ".html";
                            }
                        }else{
                            link = files[index].replace(".json","") + ".html" + link;
                        }

                        return "<a href='"+link+"'>"+text+"</a>";
                    });

                    readFiles(index + 1);
                    tempData.push(json);
                });
            }else{
                readFiles(index + 1);
            }
        }
    }
    // Start Reading
    readFiles(0);
});