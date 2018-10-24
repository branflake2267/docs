#!/bin/sh
# build extjs docs

# docs config directory 
CONFIG_DIR="$(cd ../build_config_example; echo "$(pwd)")"

# Run this from the library directory where the app logic is.
cd ../lib

# docs build command
node --max-old-space-size=4076 index create-app-html \
--buildConfigsDir=$CONFIG_DIR \
--product=myproduct \
--version=1.5 \
--syncRemote=true \
--forceDoxi=true \
--log \
--production

