//====================================================================
//
//	  Description:
//		  Cloud Service Manager Client
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const { getSerialId } = require('./system_service_client');
const { getOtaServiceDomainName } = require('./edgebox_agent_client');

const axios = require('axios').create();
const url = require('url');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const uuid = require('uuid');

const expirationPeriod = 1 * 60 * 60; // 1h
const deviceKeyFile = '/certs/privatekey.pem';

axios.interceptors.request.use(
  (config) => {
    console.log(`${config.method} ${config.baseURL}/${config.url}`);
    return config;
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log(`${response.request.method} ${response.request.protocol}//${response.request.host}${response.request.path}`);
    console.log(`${response.status} ${response.statusText}`);
    console.log(`x-request-id: ${response.headers['x-request-id']}`);
    return response;
  },
  (err) => {
    if (err.request) {
      console.log(`${err.request.method} ${err.request.host}${err.request.path}`);
    }
    if (err.response) {
      console.log(`${err.response.status} ${err.response.statusText}`);
      console.log(`x-request-id: ${err.response.headers['x-request-id']}`);
    }
    return Promise.reject(err);
  }
);


function getTokenAuth(deviceId, endpoint) {
  let token = '';
  
  try {
    const key = fs.readFileSync(deviceKeyFile);
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: deviceId,
      sub: deviceId,
      aud: endpoint,
      jti: uuid.v4(),
      exp: now + expirationPeriod,
      iat: now,
    };
    
    token = jwt.sign(claim, key, { algorithm: 'RS256' });
  } catch(err) {
    console.error(`${err.name}: ${err.message}`);
  }

  return token;
}

async function setBaseUrl(host) {
  if (!host) {
    host = await getOtaServiceDomainName();
  }

  if (host) {
    const endpoint = url.format({
      protocol: 'https',
      host: host,
    });

    axios.defaults.baseURL = endpoint;
    
    return endpoint;
  }

  return '';
}

async function getDeviceToken(endpoint, deviceId) {
  if (!deviceId) {
    deviceId = await getSerialId();
    console.log(`deviceId is '${deviceId}'`);
  }

  const jwt = getTokenAuth(deviceId, endpoint);
  
  const body = new URLSearchParams();
  body.append('clientAssertionType', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
  body.append('clientAssertion', jwt);
  body.append('deviceId', deviceId);
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  const response = await axios.post(`auth/deviceToken`, body, { headers });
  return response.data.accessToken;
}

async function getRequireVersion() {
  const deviceId = await getSerialId();
  console.log(`deviceId is '${deviceId}'`);

  const endpoint = await setBaseUrl();

  if (deviceId && endpoint) {
    try {
      const deviceToken = await getDeviceToken(endpoint, deviceId);

      const headers = {
        Authorization: `Bearer ${deviceToken}`,
      };
      
      const params = {
        deviceId: deviceId,
        released: true,
      };

      const response = await axios.get('registry/application/versions', { headers, params });
      if (0 < response.data.versions.length) {
        return response.data.versions[0].name;
      }
    } catch (err) {
      console.error(`${err.name}: ${err.message}`);
    }
  }
  
  return '';
}

async function getRequireImagesAndServiceDomain(version) {
  let images = [];
  let registry = '';

  const domain = await getOtaServiceDomainName();
  const endpoint = await setBaseUrl(domain);
  
  if (domain && endpoint) {
    try {
      const deviceToken = await getDeviceToken(endpoint);

      const headers = {
        Authorization: `Bearer ${deviceToken}`,
      };

      const response = await axios.get(`registry/application/versions/${version}`, { headers });
      const responseImages = response.data.images
            .map((v) => {
              return v.name;
            })
            .filter((v) => {
              return 0 < v.length;
            });
      if (0 < responseImages.length && response.data.registryPrefix) {
        images = responseImages;
        registry = response.data.registryPrefix;
      }
    } catch (err) {
      console.error(`${err.name}: ${err.message}`);
    }
  }
  
  return { images, registry, domain };
}

async function getDockerRegistryToken() {
  let token = {
    username: '',
    password: '',
  };

  const endpoint = await setBaseUrl();
  
  if (endpoint) {
    try {
      const deviceToken = await getDeviceToken(endpoint);

      const headers = {
        Authorization: `Bearer ${deviceToken}`,
      };

      const response = await axios.get('registry/application/token', { headers });
      if (response.data.accessToken.username) {
        token.username = response.data.accessToken.username;
      }
      if (response.data.accessToken.password) {
        token.password = response.data.accessToken.password;
      }
    } catch (err) {
      console.error(`${err.name}: ${err.message}`);
    }
  }

  return token;
}


exports.getRequireVersion = getRequireVersion;
exports.getRequireImagesAndServiceDomain = getRequireImagesAndServiceDomain;
exports.getDockerRegistryToken = getDockerRegistryToken;
