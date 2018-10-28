# Docs Generator Example Config
This is a basic example of how to generate a docs site.

## Project Resources
This project includes one product called `myproduct` and guides for it on github. 

### Guides
The example guides. 

* [docs-example-guides](https://github.com/sencha/docs-example-guides) git repo.

### Source
The example source configuration.

* [docs-example-project](https://github.com/sencha/docs-example-project) git repo.


## Build
Build the docs by running the node command in the bash script.  

### Install
Start by building the node library.

* Run `npm install -g @sencha/docs-generator`

### Debug
Instead of running `npm install -g`, run `npm link`.

* Run `npm link ../docs-generator/`

### Build Output

* Run `sh ./build_example_mhproduct_15.sh`
* Open [build output](./build/output)

### Build Directory Manifest
Everything in the build directory is generated. 
It can be deleted.

* `./build/_temp` - doxi manifest
* `./build/input` - doxi output
* `./build/output` - html output
* `./build/repos` - cloned git repos
