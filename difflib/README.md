Class Diff Module
===

The purpose of this module is to generate markdown of class and class member changes between two versions.

## Running

    node index diff [options] [targets]

### Options

 - **--destination** or **-d** The location where the compiled JSON file should be written to.
    - `node index diff --destination=/path/to/output`
    - `node index diff -d /path/to/output`
 - **--new** or **-n** The new version being compared (required)
    - `node index diff --new=6.0.2`
    - `node index diff -n 6.0.2`
 - **--old** or **-o** The old version being compared (required)
    - `node index diff --old=6.0.1`
    - `node index diff -o 6.0.1`

### Targets

The diff module requires two targets be passed. Normally, the targets should be the all classes JSON
file that Doxi generates although single individual class JSON files could be used as well. The new
version target should be passed before the old version target.

    node index diff -n 5.1.3 -o 5.1.2 ./input/extjs/513-all-classes.json ./input/extjs/512-all-classes.json
