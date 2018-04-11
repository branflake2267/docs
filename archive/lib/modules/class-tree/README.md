Class Tree Module
===

The purpose of this module is to generate JSON of the class tree for use in a tree panel.

## Running

    node index class-tree [options]

### Options

 - **--input** or **-i** The location where the individual Doxi JSON files are located.
    - `node index class-tree --input=/path/to/input`
    - `node index class-tree -i /path/to/input`
 - **--destination** or **-d** The location where the compiled JSON file should be written to.
    - `node index class-tree --destination=/path/to/output`
    - `node index class-tree -d /path/to/output`
 - **--compress** or **-c** Optional, whether or not to compress the JSON. Compressing the JSON will remove extra whitespaces in the `JSON.stringify` call.
    - `node index class-tree --compress`
    - `node index class-tree -c`
