# Sencha Docs Site 
Generates Sencha product documentation site. 


## Project Resources

### Guides
The Sencha Guides. 

* [Sencha guides](https://github.com/sencha/guides) git repo.

### Source
The source configuration. 

* [docs_project_config.json](./configs/docs_project_config.json) source configuration here.


## Build
Build the docs by running the node command in the bash script.  

### Install
Start by building the node library.

* Run `npm install -g @sencha/docs-generator`

### Debug
Instead of running `npm install -g`, run `npm link`.

* Run `npm link ../docs-generator/`

### Build Output

* Run `sh ./build_extjs_660.sh`
* Open [build output](./build/output)

### Build Directory Manifest
Everything in the build directory is generated. 
It can be deleted.

* `./build/_temp` - doxi manifest
* `./build/input` - doxi output
* `./build/output` - html output
* `./build/repos` - cloned git repos

