JSON Parser Module
===

The purpose of this module is to parse the individual JSON files Doxi generates and create static
HTML files from them.

The name of this module could probably be renamed or merged with the `class-tree` module. The `guide-parser`
module has separate `tree` and `html` targets that does the same thing as the `class-tree` and this module does
but within a single module. This module extends the `class-tree` module so the code could be cleaned up by
merging the two modules.

## Running

    node index json-parser [options]

### Options
 - **--input** or **-i** The location where the individual Doxi JSON files are located.
    - `node index json-parser --input=/path/to/input`
    - `node index json-parser -i /path/to/input`
 - **--destination** or **-d** The location where the compiled HTML files should be written to.
    - `node index json-parser --destination=/path/to/output`
    - `node index json-parser -d /path/to/output`
 - **--stylesheet** or *-s* An optional stylesheet to use instead of the default CSS file.
    - `node index json-parser --stylesheet=/path/to/styles.css`
    - `node index json-parser -s /path/to/styles.css`
 - **--template** or **-t** An optional Handlebars template to use instead of the default template.
    - `node index json-parser --template=/path/to/template.hbs`
    - `node index json-parser - t /path/to/template.hbs`
 - **--compress** or **-c** Optional, whether to minify the CSS and JS assets.
    - `node index json-parser --compress`
    - `node index json-parser -c`
