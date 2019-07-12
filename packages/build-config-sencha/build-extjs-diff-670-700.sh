#!/bin/sh
# build extjs docs

# clean the build directory
rm -rf ./build

# docs config directory 
CONFIG_DIR="$(pwd)"

# Create json and markdown diffs, modern and classic
npx sencha-docs-generator create-diff \
--buildConfigsDir=$CONFIG_DIR \
--product=extjs \
--diffTargetVersion=7.0.0 \
--diffSource=extjs \
--diffSourceVersion=6.7.0

