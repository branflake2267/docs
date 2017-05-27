const assertly  = require('assertly'),
      expect    = assertly.expect,
      fs        = require('fs'),
      file      = require('phylo');

let root   = file.cwd().up('output'),
    assets = root + "/output/assets";

describe("Assets", function() {
    it("checks for the existence of the assets folder and children", function() {
        expect(fs.existsSync(assets)).to.be(true);
        expect(fs.existsSync(assets + '/css')).to.be(true);
        expect(fs.existsSync(assets + '/fonts')).to.be(true);
        expect(fs.existsSync(assets + '/images')).to.be(true);
        expect(fs.existsSync(assets + '/js')).to.be(true);
    });

    it("checks for the existence of product menu", function() {
        expect(fs.existsSync(assets + '/js/productMenu.js')).to.be(true);
    });
});
