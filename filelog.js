"use strict";

const EOL = require('os').EOL;
const fs   = require('fs');
const path = require('path');

const logfile = { path: `${__dirname}/log.txt` };

function init() {
  logfile.stream = fs.createWriteStream(
    logfile.path,
    { flags: 'a' }
  );
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
