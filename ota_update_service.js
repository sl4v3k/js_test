//====================================================================
//
//	  Description:
//		  EdgeBox Updater OTA Update Service
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const edgeboxUpdater = require('./edgebox_updater.js');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const protoPath = __dirname + '/../v1/ota_update.proto';
const grpcServer = new grpc.Server();


function requestUpdateCheck(call, callback) {
  console.log('requestUpdateCheck called');

  callback(null, { result: 'SUCCEEDED' });
  edgeboxUpdater.update();
}

async function start() {
  const packageDefinition = protoLoader.loadSync(
    protoPath,
    {
      keepCase: true,
      longs: Number,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  const services = grpc.loadPackageDefinition(packageDefinition).edgeboxupdater.v1;
  
  grpcServer.addService(services.OtaUpdateService.service,
                        { RequestUpdateCheck: requestUpdateCheck });
  await new Promise((resolve) => {
    grpcServer.bindAsync('0.0.0.0:5001',
                         grpc.ServerCredentials.createInsecure(),
                         () => {
                           grpcServer.start();
                           resolve();
                         });
  });
}

function stop() {
  grpcServer.tryShutdown(() => {});
}

exports.start = start;
exports.stop = stop;
