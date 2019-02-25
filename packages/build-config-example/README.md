# Docs Generator Example App Config
This is a basic example of how to generate a docs site.


## Project Resources
This project includes one product called `myproduct` and guides for it on github. 

### Project Guides
The example guides for this project. 

* [docs-example-guides](https://github.com/sencha/docs-example-guides) git repo.

### Project Source
The example source configuration for this project.

* [docs-example-project](https://github.com/sencha/docs-example-project) git repo.


## Getting Started
Build the docs by running the node command in the bash script.  

### Login
Login into the community repository. 

* Run `npm login --registry=https://sencha.myget.org/F/community/npm/ --scope=@sencha`

### Install
Start by installing the docs site generator system process. 

* Run: `npm install -g @sencha/docs-generator`

### Build
The build output will go into the generated `./build` directory. 

* Run: `sh ./build-example-myproduct-15.sh`
* Then open: `./build/output`, it contains the generated site. 

### Build Directory Manifest
Everything in the build directory is generated. 
And it can be deleted.

* `./build/_temp` - doxi manifest
* `./build/input` - doxi output
* `./build/output` - html output
* `./build/repos` - cloned git repos

## Build Configuration
The build configuration is controlled by the docs site generator config. 

* Config location: [configs/docs_project_config.json](./configs/docs_project_config.json)

## Config Reference

* [Config Reference](https://github.com/sencha/docs/wiki/Config-Reference) - Generator Config Reference
