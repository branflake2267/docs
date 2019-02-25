#!/bin/sh
# build extjs docs

# docs config directory 
CONFIG_DIR="$(pwd)"

# docs build command
sencha-docs-generator create-app-html \
--buildConfigsDir=$CONFIG_DIR \
--product=myproduct \
--version=1.5 \
--syncRemote=true \
--forceDoxi=true \
--log \
--production

