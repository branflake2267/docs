Class Diff Module
===

The purpose of this module is to generate markdown of class and class member 
changes between two versions.

## Running

        node --max-old-space-size=4076 index create-diff-md --product=extjs --new=6.2.1 --old=6.2.0 --newFile=../difflib/input/621modern_all-classes.json --oldFile=../difflib/input/620modern_all-classes.json

### Options

 - **--destination** - The location where the compiled JSON file should be written to.

 - **--new (required)** - The new version being compared (required)

 - **--old (required)** - The old version being compared (required)
 
 - **--newFile (required)** - The new file being compared (required)
 
 - **--oldFile (required)** - The old file being compared (required)

 - **--verbose-summary** - True to include verbose summary details, false to keep it simple. Defaults to false

 - **--include-class-details** - True to include class detail changes in the output, false to exclude it. Defaults to true'

 - **--include-debug-output** - True to include debug output, false to exclude it. Defaults to false'

 - **--include-deprecated** - True to include deprecated changes, false to exclude theme. Defaults to true'

 - **--include-private** - True to include private changes, false to exclude theme. Defaults to true

### Targets

The diff module requires four targets be passed. Normally, the targets should be the all classes JSON
file that Doxi generates although single individual class JSON files could be used as well. 

    node --max-old-space-size=4076 index create-diff-md --product=extjs --new=6.2.1 --old=6.2.0 --newFile=../difflib/input/621modern_all-classes.json --oldFile=../difflib/input/620modern_all-classes.json
    
    