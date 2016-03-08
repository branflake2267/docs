# docs
Home for new Sencha Documentation

## source-parser module

In order to run:

    node index source-parser --config=classic
    
## json-parser module
 - *requires you to first run source-parser*

In order to run:

    node index json-parser --config=classic
    
## guide-parser module

In order to run:

    node index guide-parser --config=classic
    
## CLI options
There are 4 possible CLI args (config is REQUIRED):

 - --**config**/con Config file for the default values of the page title, input directory, 
 output directory, etc.  The possible config options are:
    - classic
    - modern
    - orion
    - architect
    - space
 - --**input**/-i Location of the json files to consume
 - --**stylesheet**/-s The CSS stylesheet
 - --**template**/-t The handlebars template file
 - --**destination**/-d The destination location of the generated html

Can use them like so:

    node index json-parser --input=/path/to/input --template=/path/to/template.hbs
    node index json-parser -i /path/to/input -t /path/to/template.hbs

## differ module

In order to run:

    node index diff

Has 3 cli args:

 - --new/-n The new version
 - --old/-o The old version
 - --destination/-d The destination location of the generated html. Defaults to `lib/output`

Can use them like so:

    node index diff --new=6.0.1 --old=6.0.0 /path/to/new-all-classes.json /path/to/old-all-classes.json
    node index diff -n 6.0.1 -o 6.0.0 /path/to/new-all-classes.json /path/to/old-all-classes.json

The targets to the json files, order is new then old.
