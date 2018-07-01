# Docs Site Generator Example
This is an exmaple of a simple docs generator configuration.

## Project Resources
This project includes one product called `myproduct` and guides for it on github. 

### Guides

* [docs-example-guides](https://github.com/sencha/docs-example-guides) git repo.

### Source

* [docs-example-project](https://github.com/sencha/docs-example-project) git repo.


## Build
Build the docs by running the node command in the bash script.  

### Install
Start by building the node library.

* Go into the lib diretory. `cd ../lib`
* run `npm install` and this will build the library. 

### Docs

* Run `sh ./build_example_mhproduct_15.sh`
* View output in `./build/output/index.html` to start from the main page.
* View output in `./build/output/myproduct/index.html` to start from the myproduct page. 

### Build Directory
Everything in the build directory is generated. 
The build directory can be cleaned at any time and generated again. 

* `./build/_temp` - doxi output
* `./build/input` - doxi input
* `./build/output` - html output
* `./build/repos` - cloned git repos

