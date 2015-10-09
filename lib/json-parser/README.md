#JSON Parser

This tool aims to read, manipulate, parse, and write our JSON into a markdown file, which will then be turned
into markup.

##Current Functionality

This script iterates through the JSON files produced by Doxi and pulls said JSON
into memory.  It then iterates through memory and writes the data object's nodes
into a Mustache template, which then writes to HTML in an output folder.

##Required Node Packages

1. handlebars
2. minimist
3. junk
4. mkdirp
5. fs

##JSON

You'll need a development version of Cmd, in addition to the DOXI repo to build your own JSON output.  For now, just ask
me for the files and I'll get them for you.  Hopefully, we'll have all of this setup for anyone to run soon.

##Running the tool

To run this tool, issue the following command:
 
`node reader.js (optional: folder containing JSON | defaults to 'json' ) (optional: template file | defaults to 'template.js')`




