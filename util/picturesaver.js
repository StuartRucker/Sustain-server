
var Jimp = require("jimp");
var fs = require('fs');
var request = require('request');

var green = "#2ECC71";
var brown = "#331a00";





function homeColor(inName, outName, color) {
    var i = new Jimp(inName, function() {
        ((this.bitmap.width > this.bitmap.height) ? this.resize(Jimp.AUTO, 300) : this.resize(300, Jimp.AUTO).crop(0, 0, 300, 300))
        .color([{
            apply: 'mix',
            params: [color, 75]
        }])
        .write(outName); // save
    });
}


var download = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};



var savePicture = function(url, id, callback) {

    download(url, "public/dynamic/normal/" + id + ".png", function() {
        var filePath = "public/dynamic/normal/" + id + ".png";

        //these will not be used immediately so can be async
        homeColor(filePath, "public/dynamic/brown/" + id + ".png", brown);
        homeColor(filePath, "public/dynamic/green/" + id + ".png", green);//these will not be used immedi

        callback(id);
    });

}


var saveAuthor = function(ogpath, name, callback){
  fs.rename(ogpath, "public/dynamic/author/" + name + ".png", function(){
      callback();
  });
};

module.exports.savePicture = savePicture;
module.exports.saveAuthor = saveAuthor;
