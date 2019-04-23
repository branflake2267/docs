#!/bin/sh
# build extjs docs

# clean the build directory
rm -rf ./build

# docs config directory 
CONFIG_DIR="$(pwd)"

# docs build command
npx sencha-docs-generator create-app-html \
--buildConfigsDir=$CONFIG_DIR \
--productVersion=extjs \
--version=6.6.0-CE \
--syncRemote=true \
--forceDoxi=true \
--log \
--production

