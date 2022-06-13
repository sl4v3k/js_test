//====================================================================
//
//	  Description:
//		  EdgeBoxAgent Cloud Service gRPC Client.
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const protoFilePath = __dirname + '/../edgebox-agent-stub/kpj-edgebox-agent/v1/cloud_service.proto';
const targetServer = 'EdgeBoxAgent:50051';
const retryMax = 5;
const delayTimeMs = 2000;

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

const services = grpc.loadPackageDefinition(packageDefinition).edgeboxagent.v1;

async function waitFunc(wait_time) {
  await new Promise((resolve) => setTimeout(resolve, wait_time));
}

function getOtaServiceDomainName(retryCount = 0) {

  const client = new services.CloudServiceService(targetServer,
                                                  grpc.credentials.createInsecure());
  
  return new Promise((resolve) => {
    client.GetOtaServiceDomainName(null, async (err, response) => {
      if (err != null) {
        console.error(`An error occurred in the gRPC. 'Method GetOtaServiceDomainName': ${err}`);

        if (retryCount < retryMax) {
          await waitFunc(delayTimeMs);
          resolve(getOtaServiceDomainName(retryCount + 1));
        } else {
          resolve("");
        }
      } else {
        console.log(`gRPC response from EdgeBoxAgent is '${JSON.stringify(response)}'.`);

        if (response.result === 'SUCCEEDED') {
          resolve(response.domain_name);
        } else {

          if (retryCount < retryMax) {
            await waitFunc(delayTimeMs);
            resolve(getOtaServiceDomainName(retryCount + 1));
          } else {
            resolve("");
          }
        }
      }
    });
  });
}

exports.getOtaServiceDomainName = getOtaServiceDomainName;
