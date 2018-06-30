#!/bin/sh
# build extjs docs

# Run this from the library directory where the app logic is.
cd ../lib

node --max-old-space-size=4076 index create-app-html \
--buildConfigsDir=~/git/docs/build_config_sencha \
--product=extjs \
--version=6.6.0 \
--syncRemote=true \
--forceDoxi=true \
--log \
--production

