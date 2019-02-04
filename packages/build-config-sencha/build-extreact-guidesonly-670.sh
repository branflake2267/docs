#!/bin/sh
# build extjs docs

# clean the build directory
rm -rf ./build

# docs config directory 
CONFIG_DIR="$(pwd)"

# docs build command - (Notice: create-rext-app-html - it's build is different than normal)
npx sencha-docs-generator create-app-html runGuides \
--buildConfigsDir=$CONFIG_DIR \
--product=extreact \
--productVersion=6.7.0 \
--syncRemote=true \
--forceDoxi=true \
--log \
--production 
