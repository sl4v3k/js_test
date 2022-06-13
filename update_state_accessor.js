//====================================================================
//
//	  Description:
//		  Update State Accessor.
//
//	  Notes: Copyright 2022 Sony Semiconductor Solutions Corporation.
//
//====================================================================
"use strict";

const stateFile = process.env.STATE_FILE || '/root/update/update.json'

const fs = require('fs');


const State = {
  updated:         'updated',
  downloading:     'downloading',
  downloaded:      'downloaded',
  manifestUpdated: 'manifestUpdated',
};

function readStateFile() {
  const str = fs.readFileSync(stateFile, {encoding: 'utf-8'});
  return JSON.parse(str);
}

function writeStateFile(json) {
  const tmpFile = stateFile + '.tmp';
  
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(json));
    fs.renameSync(tmpFile, stateFile);
  } catch (e) {
    console.error(e);
  }
}

function setState(state, extra) {
  console.log(`set state '${state}'`);
  
  let json = {};
  
  try {
    json = readStateFile();
  } catch (err) {
    console.log(err.toString());
  }
  
  json.state = state;

  if (!('require' in json)) {
    json.require = {};
  }

  if (extra) {
    if (extra.requireVersion) {
      json.require.version = extra.requireVersion;
    }
    if (extra.requireImages) {
      json.require.images = extra.requireImages;
    }
    if (extra.dockerRegistry) {
      json.require.dockerRegistry = extra.dockerRegistry;
    }
    if (extra.serviceDomain) {
      json.serviceDomain = extra.serviceDomain;
    }
  }
  
  writeStateFile(json);
}

function getState() {
  let state = State.updated;
  const json = readStateFile();

  if (Object.keys(State).includes(json.state)) {
    state = State[json.state];
  } else {
    throw new Error('parse error');
  }

  return state;
}

function getRequireVersion() {
  const json = readStateFile();
  return json.require.version;
}

function listRequireImages() {
  const json = readStateFile();
  return json.require.images;
}

function getDockerRegistry() {
  const json = readStateFile();
  return json.require.dockerRegistry;
};


exports.State = State;
exports.setState = setState;
exports.getState = getState;

exports.getRequireVersion = getRequireVersion;
exports.listRequireImages = listRequireImages;
exports.getDockerRegistry = getDockerRegistry;
