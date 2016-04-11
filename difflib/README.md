Class Diff Module
===

The purpose of this module is to generate markdown of class and class member changes between two versions.

## Running

    node index diff [options] [targets]

### Options

 - **--destination** or **-d** The location where the compiled JSON file should be written to.
    - `node index diff --destination=/path/to/output`
    - `node index diff -d /path/to/output`
 - **--new** or **-n** The new version being compared.
    - `node index diff --new=6.0.2`
    - `node index diff -n 6.0.2`
 - **--old** or **-o** The old version being compared.
    - `node index diff --old=6.0.1`
    - `node index diff -o 6.0.1`

### Targets

The diff module requires two targets be passed. Normally, the targets should be the all classes JSON
file that Doxi generates although single individual class JSON files could be used as well. The new
version target should be passed before the old version target.

    node index diff /path/to/6.0.2/classic-all-classes.json /path/to/6.0.1/classic-all-classes.json
