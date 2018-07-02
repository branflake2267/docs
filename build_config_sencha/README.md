# Docs Site Generator Sencha
This is the Sencha docs site generator project configuration.

## Project Resources
This project includes one product called `myproduct` and guides for it on github. 

### Guides

* [guides](https://github.com/sencha/guides) git repo.

### Source

* [docs_project_config.json](./configs/docs_project_config.json) source configuration here.


## Build
Build the docs by running the node command in the bash script.  

### Install
Start by building the node library.

* Go into the lib diretory. `cd ../lib`
* run `npm install` and this will build the library. 

### Docs

* Run `sh ./build_extjs_660.sh`
* View output in `./build/output/index.html` to start from the main page.
* View output in `./build/output/myproduct/index.html` to start from the myproduct page. 

### Build Directory
Everything in the build directory is generated. 
The build directory can be cleaned at any time and generated again. 

* `./build/_temp` - doxi manifest
* `./build/input` - doxi output
* `./build/output` - html output
* `./build/repos` - cloned git repos

