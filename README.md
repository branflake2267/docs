# docs
Home for new Sencha Documentation

## Setup

### Install Cmd

Download and install [Sencha Cmd](https://www.sencha.com/products/sencha-cmd/) for your platform.

### Install the required SDKs

1. Install the ExtJS SDK

   ```sh
   $ git clone git@github.com:extjs/SDK.git
   $ cd SDK
   $ git checkout ext-6.1.x
   ```

2. Install SpaceSDK

   ```sh
   $ git clone git@github.com:sencha/SpaceSDK.git
   ```

3. Install sencha-documentation

   ```sh
   $ git clone git@github.com:sencha/sencha-documentation.git
   ```

   Make sure you install the sencha-documentation repo as a sibling of of this
   docs repo; they're currently hard coded to live at the same level.

### Set up your docs repo

#### Module dependencies installation

    $ npm install

#### Create a basePaths.json

Create a file `lib/configs/basePaths.json` with the following contents, customized
to your filesystem layout:

```js
{
  "localSDK"  : "/path/to/your/copy/of/extJS/SDK/",
  "extFolder" : "ext/",
  "pkgFolder" : "packages/",
  "localSpace": "/path/to/your/copy/of/SpaceSDK/src/",
  "localPrim" : "../../docs/"
}
```

## Run the Things

## Generate doxi output

For each config (see below) you wish to run, you have to run doxi on the code to
generate files for the parsers to work with. Some are just API docs, some are
just guides, and some are both.

The basic gist is this: For example, for the `classic` config:

    $ cd /path/to/your/extjs/SDK/docs/classic
    $ sencha doxi build combo-nosrc
    $ sencha doxi build all-classes

This generates the files. Then, copy them to `lib/input/classic-json/`, creating
the directory if it doesn't already exist:

    $ mkdir -p /path/to/docs-repo/lib/input/classic-json
    $ cp -a ../../build/docs/classic/* /path/to/docs-repo/lib/input/classic-json/

Or drag them around in Finder or whatever. Now you're ready to run the parsers.

## source-parser module

In order to run:

    $ node index source-parser --config=classic
    
## json-parser module
 - *requires you to first run source-parser*

In order to run:

    $ node index json-parser --config=classic
    
## guide-parser module

In order to run:

    $ node index guide-parser --config=classic
    
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
