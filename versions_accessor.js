//====================================================================
//
//	  Description:
//		  versions.json accessor
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const versionsPath = '/root/conf/versions.json';

const fs = require('fs');


function getCurrentVersion() {
  let version = '';
  
  try {
    const obj = JSON.parse(fs.readFileSync(versionsPath));
    version = obj.firmware.version;
  } catch(err) {
    console.error(`${err.name}: ${err.message}`);
  }

  return version;
}


exports.getCurrentVersion = getCurrentVersion;
