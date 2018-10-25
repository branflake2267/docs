#!/bin/sh
# build extjs docs

# clean the build directory
rm -rf ./build

# Run this from the library directory where the app logic is.
cd ../lib

# docs config directory 
CONFIG_DIR="$(cd ../build_config_sencha; echo "$(pwd)")"

# docs build command
node --max-old-space-size=4076 index create-app-html \
--buildConfigsDir=$CONFIG_DIR \
--product=cmd \
--version=6.6.0 \
--syncRemote=true \
--forceDoxi=true \
--log \
--production 

