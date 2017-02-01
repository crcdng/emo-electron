"use strict";

const EOL = require('os').EOL;
const fs = require('fs');
const path = require('path');

const logfile = { path: `${__dirname}/log.txt` }; // o.O only works in current directory

function init() {
  logfile.stream = fs.createWriteStream(
    logfile.path,
    { flags: 'a' }
  );
}

function getPath() {
  return logfile.path;
}

function write(msg) {
  if (!logfile.stream) {
    console.log("error in filelog: no stream available")
    return;
  }
  logfile.stream.write(msg + EOL);
}

init();

module.exports.write = write;
module.exports.getPath = getPath;
