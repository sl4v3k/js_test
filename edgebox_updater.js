//====================================================================
//
//	  Description:
//		  EdgeBox Updater
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const stateAccessor = require('./update_state_accessor.js');
const versionsAccessor = require('./versions_accessor.js');
const imageOperator = require('./docker_image_operator.js');
const cloudServiceClient = require('./cloud_service_client.js');

const { Mutex, tryAcquire, E_ALREADY_LOCKED } = require('async-mutex');
const mutex = new Mutex();


async function pullRequireImages(requireVersion) {
  console.log('pull require images');

  let requireImages = [];
  let dockerRegistry = '';
    
  if (requireVersion !== undefined) {
    const { images, registry, domain } = await cloudServiceClient.getRequireImagesAndServiceDomain(requireVersion);
    requireImages = images;
    dockerRegistry = registry;
    
    if (Array.isArray(requireImages) && 0 < requireImages.length && dockerRegistry && domain) {
      stateAccessor.setState(
        stateAccessor.State.downloading,
        {
          requireVersion,
          requireImages,
          dockerRegistry,
          serviceDomain: domain,
        }
      );
    }
  } else {
    requireImages = stateAccessor.listRequireImages();
    dockerRegistry = stateAccessor.getDockerRegistry();
  }

  if (Array.isArray(requireImages) && 0 < requireImages.length && dockerRegistry) {
    try {
      for (const image of requireImages) {
        const pullImage = dockerRegistry + '/' + image;
        
        await imageOperator.pull(dockerRegistry, image);
        await imageOperator.tag(pullImage, image);
        await imageOperator.remove(pullImage);
      }
    
      stateAccessor.setState(stateAccessor.State.downloaded);
    } catch (err) {
      // suppress all exceptions.
      console.error(err.toString());
    }
  }
}

async function removeUnnecessaryImages() {
  console.log('remove unnecessary images');

  try {
    await imageOperator.prune();
    
    const currentImages = stateAccessor.listRequireImages();
    
    if (Array.isArray(currentImages) && 0 < currentImages.length) {
      const localImages = await imageOperator.list();
      const removeImages = localImages.filter((image) => {
        return !currentImages.includes(image);
      });

      for (const image of removeImages) {
        await imageOperator.remove(image);
      }
    }
  } catch (err) {
    // suppress all exceptions.
    console.error(err.toString());
  }
}

async function onUpdated() {
  console.log('exec on updated');

  const requireVersion = await cloudServiceClient.getRequireVersion();
  const currentVersion = versionsAccessor.getCurrentVersion();

  if (!requireVersion) {
    console.log('get require version failed');
    // do nothing
  } else if (!currentVersion) {
    console.log('get current version failed');
    // do nothing
  } else if (requireVersion === currentVersion) {
    await removeUnnecessaryImages();
  } else {
    await pullRequireImages(requireVersion);
  }
}

async function onDownloading() {
  console.log('exec on downloading');

  await pullRequireImages();
}

async function onManifestUpdated() {
  console.log('exec on manifestUpdated');

  const requireVersion = stateAccessor.getRequireVersion();
  const requireImages = stateAccessor.listRequireImages();
  let runningImages = [];

  do {
    await new Promise((resolve) => { setTimeout(resolve, 60000); });

    try {
      const containerImages = await imageOperator.listContainerBasedImages();
      runningImages = requireImages.filter((image) => {
        return containerImages.includes(image);
      });

      console.log(`running container images are ${containerImages.toString()}`);
    } catch (err) {
      // suppress all exceptions.
      console.error(err.toString());
    }
  } while (requireImages.length != runningImages.length);
  
  stateAccessor.setState(stateAccessor.State.updated);

  await removeUnnecessaryImages();
}

async function onDownloaded() {
  console.log('exec on downloaded');
  // do nothing
}

async function updateMain() {
  let state;
  try {
    state = stateAccessor.getState();
  } catch(err) {
    console.error(`${err.name}: ${err.message}`);
    state = stateAccessor.State.updated;
  }

  switch (state) {
  case stateAccessor.State.updated:
    await onUpdated();
    break;
  case stateAccessor.State.downloading:
    await onDownloading();
    break;
  case stateAccessor.State.manifestUpdated:
    await onManifestUpdated();
    break;
  case stateAccessor.State.downloaded:
    await onDownloaded();
  default:
    break;
  }
}

async function update() {
  console.log('start update check sequence');

  try {
    const release = await tryAcquire(mutex).acquire();

    try {
      await updateMain();
    } finally {
      console.log('end update check sequence');
      release();
    }
  } catch (e) {
    if (e === E_ALREADY_LOCKED) {
      console.log('omit the update check request');
    } else {
      throw e;
    }
  }
}


exports.update = update;
