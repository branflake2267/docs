Member Info Module
===

The purpose of this module is more for debugging purposes and generates diff counts for
the members of classes based on the Doxi JSON files passed.

## Running

    node index member-info [options] [targets]

### Options

 - **--destination** or **-d** The location where the compiled markdown file should be written to.
    - `node index member-info --destination=/path/to/output`
    - `node index member-info -d /path/to/output`

### Targets

This module requires two targets be passed. Normally, the targets should be the all classes JSON
file that Doxi generates although single individual class JSON files could be used as well. The new
version target should be passed before the old version target.

    node index member-info /path/to/6.0.2/classic-all-classes.json /path/to/6.0.1/classic-all-classes.json
