# docs
Home for new Sencha Documentation

## json-parser module

In order to run:

    node index json-parser

Has 4 cli args:

 - --input/-i Location of the json files to consume. Defaults to `lib/json`
 - --stylesheet/-s The CSS stylesheet. Defaults to `lib/css/styles.css`
 - --template/-t The handlebars template file. Defaults to `lib/modules/json-parser/template.hbs`
 - --destination/-d The destination location of the generated html. Defaults to `lib/output`

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
