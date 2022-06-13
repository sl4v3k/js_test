//====================================================================
//
//	  Description:
//		  Docker Image Operator.
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const { getDockerRegistryToken } = require('./cloud_service_client.js');

const axios = require('axios').create();

axios.defaults.socketPath = '/var/run/docker.sock';
axios.defaults.baseURL = 'http:/v1.41';

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
    return response;
  },
  (err) => {
    if (err.request) {
      console.log(`${err.request.method} ${err.request.host}${err.request.path}`);
    }
    if (err.response) {
      console.log(`${err.response.status} ${err.response.statusText}`);
    }
    return Promise.reject(err);
  }
);

let registryAuth = null;


async function pullImageBody(registry, imageName, auth) {
  const headers = {
    /* use toString('base64') and replace '+/' with '-_' because toString('base64url') will omit padding. */
    'X-Registry-Auth': Buffer.from(JSON.stringify(auth)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
  };

  const params = {
    fromImage: registry + '/' + imageName,
  };

  await axios.post('images/create', null, { params, headers });
}

async function pullImage(registry, imageName) {
  console.log(`pull image '${registry}/${imageName}'`);

  if (registryAuth) {
    try {
      await pullImageBody(registry, imageName, registryAuth);
      return;
    } catch (err) {
      /* maybe the token has been expired. */
    }
  }

  registryAuth = null;

  const token = await getDockerRegistryToken();
  const auth = {
    username: token.username,
    password: token.password,
    serveraddress: registry,
  };
  /* need to wait 60 seconds until the token is enabled. */
  await new Promise((resolve) => { setTimeout(resolve, 60000); });

  await pullImageBody(registry, imageName, auth);

  /* store docker registry token if it can be used. */
  registryAuth = auth;
}

async function listImages() {
  console.log('list images');

  const params = { all: true };

  const response = await axios.get('images/json', { params });
  const images = response.data.reduce((acc, value) => {
    return acc.concat(value.RepoTags);
  }, []);

  console.log(images.toString());

  return images;
}

async function tagImage(srcImageName, tgtImageName) {
  console.log(`tag image '${srcImageName}' '${tgtImageName}'`);

  const params = {
    repo: tgtImageName,
  };

  await axios.post(`images/${srcImageName}/tag`, null, { params });
}

async function removeImage(imageName) {
  console.log(`remove image '${imageName}'`);

  await axios.delete(`images/${imageName}`);
}

async function pruneImages() {
  console.log('prune images');

  const params = {
    filters: {
      dangling: ['true']
    },
  };

  await axios.post('images/prune', null, { params });
}

async function listContainerBasedImages() {
  console.log('list container images');

  const params = { all: true };

  const response = await axios.get('containers/json', { params });
  const images = response.data.map((container) => {
    return container.Image;
  });

  console.log(images.toString());

  return images;
}


exports.pull = pullImage;
exports.list = listImages;
exports.tag = tagImage;
exports.remove = removeImage;
exports.prune = pruneImages;
exports.listContainerBasedImages = listContainerBasedImages;
