#!/bin/sh

# Run this from the library directory where the app logic is.
cd ../lib

# docs config directory 
CONFIG_DIR="$(cd ../build_config_sencha; echo "$(pwd)")"

# create-diff (Creates both json and markdown)
node --max-old-space-size=4076 index create-diff \
--buildConfigsDir=$CONFIG_DIR \
--diffTarget=extjs \
--diffTargetVersion=6.6.0 \
--diffSource=extjs \
--diffSourceVersion=6.5.3


# create-diff-md - (Creates markdown)
# node --max-old-space-size=4076 index create-diff-md \
# --buildConfigsDir=$CONFIG_DIR \
# --product=extjs \
# --new=6.6.0 \
# --old=6.5.3 \
# --newFile="$CONFIG_DIR/build/input/extjs/6.5.3/all-classes/modern_all-classes.json" \
# --oldFile="$CONFIG_DIR/build/input/extjs/6.5.2/all-classes/modern_all-classes.json"
