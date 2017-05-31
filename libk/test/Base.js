const assertly = require('assertly'),
      Path     = require('path'),
      expect   = assertly.expect,
      file     = require('phylo'),
      root     = String(file.cwd().up('../')),
      Base     = require("../modules/base/"),
      product  = "extjs", version  = "6.5.0", toolkit  = "modern";

describe("Base", function() {
    const moduleToolkit  = new Base({
        _myRoot: root,
        product: product,
        version: version,
        toolkit: toolkit
    });

    const moduleNoToolkit  = new Base({
        _myRoot: root,
        product: product,
        version: version
    });

    it("should exist", function() {
        expect(moduleNoToolkit).to.not.be.empty;
    });

    describe("apiDir", function() {
        it("should return api dir with toolkit", function() {
            expect(moduleToolkit.apiDir).to.be(Path.join(root,"output",product,version,toolkit));
        });

        it("should return api dir without toolkit", function() {
            expect(moduleNoToolkit.apiDir).to.be(Path.join(root,"output",product,version,"api"));
        });
    });

    describe("apiDirName", function() {
        it("should return api dir name with toolkit", function() {
            expect(moduleToolkit.apiDirName).to.be(toolkit);
        });

        it("should return api dir name without toolkit", function() {
            expect(moduleNoToolkit.apiDirName).to.be("api");
        });
    });

    it("should return assets dir", function() {
        expect(moduleNoToolkit.assetsDir).to.be(Path.join(root,"output","assets"));
    });

    describe("cssDir", function() {
        it("should return css dir with toolkit", function() {
            expect(moduleToolkit.cssDir).to.be(Path.join(root,"{outputDir}/assets/css"));
        });

        it("should return css dir without toolkit", function() {
            expect(moduleNoToolkit.cssDir).to.be(Path.join(root,"output/assets/css"));
        });
    });

    describe("parentChain", function() {
        let parentChain = moduleNoToolkit.parentChain;

        it("should return an array", function() {
            expect(parentChain).to.be.a('array');
        });

        it("should return current module name", function() {
            expect(parentChain[0]).to.be('base');
        });
    });

    it("should return resources dir", function() {
        expect(moduleNoToolkit.resourcesDir).to.be(Path.join(root,"output",product,version,"resources"));
    });
});
