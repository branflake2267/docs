# Sencha Docs Site Config
Generates Sencha product documentation site. 


## Project Resources

### Guides
The Sencha Guides. 

* [Sencha guides](https://github.com/sencha/guides) git repo.

### Source
The source configuration. 

* [docs_project_config.json](./configs/docs_project_config.json) source configuration here.

### Dependencies
Builds are dependent on these packages. 

* @sencha/cmd - Sencha CMD
* @sencha/custom-gramophone - Repackaged module
* @sencha/custom-marked - Repackaged module


## Build
Build the docs by running the node command in the bash script.  

### NPM Login
Login into the internal repository. 

* Run `npm login --registry=https://sencha.myget.org/F/internal/npm/ --scope=@sencha`

### Install
Start by building the node library.

* Run `npm install` then use `npx sencha-docs-generator [args]`
* Or run `npm install -g @sencha/docs-generator` to install for global cli use. Then use `sencha-docs-generator [args]`

### Debug CLI
Instead of running `npm install -g @sencha/docs-generator`, run `npm link ../docs-generator`.

* Run `npm link ../docs-generator/`
* Then run `sh ./build*.sh`
* Or run VSCode launcher. 

### Debug VSCode
Using VSCode will allow you to set breakpoints, inspect stacks, variables and console output with ease. 

* Run `npm link ../docs-generator/` - This will link the binary. (Run from the ./build-config-sencha directory.)
* Run the VSCode launcher, to debug one of the sencha doc configs. 

### Build Output
The build output will go into the generated `./build` directory. 

* Open [build output](./build/output)

### Build Directory Manifest
Everything in the build directory is generated. 
It can be deleted.

* `./build/_temp` - doxi manifest
* `./build/input` - doxi output
* `./build/output` - html output
* `./build/repos` - cloned git repos

