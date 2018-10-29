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

* Run `npm link ../docs-generator/` - This will link the binary. (Run from the ./build-config-example directory.)
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

