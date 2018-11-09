#!/bin/sh
# build extjs docs

# clean the build directory
rm -rf ./build

# docs config directory 
CONFIG_DIR="$(pwd)"

# docs build command
npx sencha-docs-generator create-app-html \
--buildConfigsDir=$CONFIG_DIR \
--product=sencha_test \
--version=2.2.0 \
--syncRemote=true \
--forceDoxi=true \
--log \
--production 
