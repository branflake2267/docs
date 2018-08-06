# docs
Home for new Sencha docs generator. 

## V2 Source
This is being prepped for public access here...

* [Locate the V2 build here](https://github.com/sencha/docs/pull/980)

## Setup

### Clone Docs Repository
Clone this repository to your machine

    $ git clone git@github.com:sencha/docs.git
    $ cd docs

### Install Cmd
Download and install [Sencha Cmd](https://www.sencha.com/products/sencha-cmd/) for your platform.

## Run the Things

This process is broken down into three sub-processes

+ Source Parser - Creates git repo if needed, checks out and pulls the most recent branch of your project, generates and 
parses the Doxi output, creates a filemap for later use, and creates the source code output

+ JSON Parser - Parses the JSON output from Doxi.  Generates homepage content and API Doc output (including the tree)

+ Guide Parser - Parses the guide markdown and generates the guides section.  This process can be run independently
for guide-only products like Architect and IDE Tools.
    
### source-parser module

The source parser can be run two ways.  

The first will parse previously created JSON found in the input folder.  This
is ideal if you already have content and don't need updated Doxi output

    $ node index source-parser --config=classic --pversion=6.0.1-classic
    
The second will ensure your git repo is present, checkout the appropriate branch, pull if necessary, generate Doxi output
along with the other things.  The `pname` and `pversion` values can be found the the `configs/projectConfigs.json` file.

+ pname - The product-level `name`

+ pversion - the versions level `version`

    {
      "products": [
        {
          "title": "Ext JS",
          "name" : "extjs",
          "repo" : "SDK",
          "versions": [
            {
              "version" : "6.1.0-modern",
              "config"  : "6.1.0-modern.doxi.json",
              "branch"  : "ext-6.1.x",
              "tag"     : "",
              "input"   : "modern-json",
              "build"   : "../../build/docs/modern",
              "rurl"    : "git@github.com:extjs/SDK.git"
            },
    
    $ node index source-parser --config=classic --pname=extjs --pversion=6.1.0-classic            
    
## json-parser module
 - *requires you to first run source-parser*

In order to run:

    $ node index json-parser --config=classic --pversion=6.0.1-classic
    
## guide-parser module

In order to run:

    $ node index guide-parser --config=classic --pversion=6.0.1-classic
    
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
 - --**version**/-v The version of the project, which will create a sub-folder with a matching name in the output

Can use them like so:

    $ node index json-parser --input=/path/to/input --template=/path/to/template.hbs
    $ node index json-parser -i /path/to/input -t /path/to/template.hbs

## differ module

In order to run:

    $ node index diff

Has 3 cli args:

 - --new/-n The new version
 - --old/-o The old version
 - --destination/-d The destination location of the generated html. Defaults to `lib/output`

Can use them like so:

    $ node index diff --new=6.0.1 --old=6.0.0 /path/to/new-all-classes.json /path/to/old-all-classes.json
    $ node index diff -n 6.0.1 -o 6.0.0 /path/to/new-all-classes.json /path/to/old-all-classes.json

The targets to the json files, order is new then old.
