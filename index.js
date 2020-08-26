/*
Copyright 2020 apHarmony

This file is part of jsHarmony.

jsHarmony is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

jsHarmony is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this package.  If not, see <http://www.gnu.org/licenses/>.
*/

var _ = require('lodash');
var fs = require('fs');

var imagick = require('gm').subClass({ imageMagick: true });

exports = module.exports = {};

function copyFile(source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
  rd.on("error", done);
  var wr = fs.createWriteStream(target);
  wr.on("error", done);
  wr.on("close", function (ex) { done(); });
  rd.pipe(wr);
  
  function done(err) {
    if (!cbCalled) { if (typeof err == 'undefined') err = null; cb(err); cbCalled = true; }
  }
};

exports.init = function(callback){
  imagick(100,100,'white').setFormat('PNG').toBuffer(function(err,b){
    return callback(err);
  });
}

exports.driver = function(){
  return imagick;
}

exports.resample = function(src, dest, format, callback){
  var img = imagick(src);
  img.size(function (err, size) {
    if (err) return opcallback(err);
    if (format) {
      img.setFormat(format);
      if (_.includes(['jpeg', 'jpg'], format)) img.flatten();
    }
    img.quality(90);
    img.autoOrient();
    img.repage(0, 0, 0, 0);
    img.noProfile().write(dest, function (err) {
      if (err) return callback(err);
      return callback(null);
    });
  });
};

exports.size = function(src, callback){
  var img = imagick(src);
  img.size(callback); //err, size
}

exports.crop = function(src, dest, destsize, format, callback){
  //Calculate w/h + x/y
  //Optionally override output format
  var img = imagick(src);
  img.identify(function (err, info) {
    if (err) return callback(err);
    var size = info.size;
    if(!size) return callback(new Error('Could not find image dimensions'));

    var srcformat = (info.format || '').toString().toLowerCase();
    if(srcformat=='svg') img.density(Math.max(destsize[0], destsize[1]));

    var cropw = destsize[0];
    var croph = destsize[1];
    var outerw = cropw;
    var outerh = croph;
    if ((size.width / cropw) > (size.height / croph)) {
      outerw = Math.round(size.width * (croph / size.height));
    }
    else {
      outerh = Math.round(size.height * (cropw / size.width));
    }
    var cropx = (outerw - cropw) / 2;
    var cropy = (outerh - croph) / 2;
    
    if (format) {
      img.setFormat(format);
      if (_.includes(['jpeg', 'jpg'], format)) img.flatten();
    }
    img.quality(90);
    img.autoOrient();
    img.resize(outerw, outerh);
    img.crop(cropw, croph, cropx, cropy);
    img.repage(0, 0, 0, 0);
    img.noProfile().write(dest, function (err) {
      if (err) return callback(err);
      return callback(null);
    });
  });
}

exports.resize = function(src, dest, destsize, format, callback){
  var img = imagick(src);
  var imgoptions = {};
  if ((destsize.length >= 3) && destsize[2]) imgoptions = destsize[2];

  img.identify(function (err, info){
    if(err) return callback(err);
    var srcformat = (info && info.format || '').toString().toLowerCase();

    if(srcformat=='svg'){
      if((srcformat=='svg') && (!format || (format == 'svg'))){
        if(!imgoptions || !imgoptions.extend){
          //Return input file
          if(src==dest) callback(null);
          else copyFile(src, dest, callback);
          return;
        }
      }

      img.density(Math.max(destsize[0], destsize[1]));
    }

    if (format) {
      img.setFormat(format);
      if (_.includes(['jpeg', 'jpg'], format)) { img.flatten(); }
    }
    img.quality(90);
    img.autoOrient();
    if (imgoptions.upsize) {
      img.resize(destsize[0], destsize[1]);
    }
    else img.resize(destsize[0], destsize[1], '>');
    if (imgoptions.extend) {
      img.gravity('Center').extent(destsize[0], destsize[1]);
    }
    img.noProfile().write(dest, function (err) {
      if (err) return callback(err);
      return callback(null);
    });
  });
}