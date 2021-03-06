//====================================================================
//
//	  Description:
//		  System Service Client
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const protoFilePath = __dirname + '/../system-service-stub/kpj-system-utility/EBSystemService/v1/eb_system_service.proto';
const targetServer = 'host.docker.internal:50052';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync(
  protoFilePath,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

const services = grpc.loadPackageDefinition(packageDefinition).eb_system;

function getSerialId() {
  const client = new services.EdgeBoxSystem(targetServer, grpc.credentials.createInsecure());

  return new Promise((resolve) => {
    client.GetSerialID(null, (err, response) => {
      if (err || response.result.code != 'NO_ERR') {
        resolve('');
      } else {
        resolve(response.serial_id);
      }
    });
  });
}

exports.getSerialId = getSerialId;
