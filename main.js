//====================================================================
//
//	  Description:
//		  EdgeBox Updater main
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const otaUpdateService = require('./ota_update_service.js');
const edgeboxUpdater = require('./edgebox_updater.js');

// default period is 5 min.
const updateCheckPeriod = (process.env.UPDATE_CHECK_PERIOD === undefined ? 5 : process.env.UPDATE_CHECK_PERIOD) * 60;

let intervalObj = null;


function stop() {
  console.log('term start.');
  
  otaUpdateService.stop();
  if (intervalObj) {
    clearInterval(intervalObj);
  }

  console.log('term complete.');
}
process.on('SIGTERM', stop);

async function main() {
  await otaUpdateService.start();

  await edgeboxUpdater.update();
  if (0 < updateCheckPeriod) {
    intervalObj = setInterval(edgeboxUpdater.update,
                              1000 * updateCheckPeriod);
  } else {
    stop();
  }
}

main();

exports.stop = stop;
