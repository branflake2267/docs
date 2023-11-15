# docs config directory 
CONFIG_DIR="$(pwd)"

# docs build command
sencha-docs-generator create-app-html \
--buildConfigsDir=$CONFIG_DIR \
--product=rapidextjs \
--log \
--production