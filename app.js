"use strict";

const log = require("./filelog");
const osc = require("osc");

// affectiva SDK Needs to create video and canvas nodes in the DOM in order to function :((
const divRoot = $("#affdex_elements")[0];
const oscParameters = { remoteAddress: "127.0.0.1", remotePort: 12000 } ;
const settings = { alldata: false, engagement: true, logFile: log.getPath(), logToFile: false, logToConsole: false, markers: false, sendOSC: false, valence: true, view: false };
const udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121
});

let detector;
let faceMode = affdex.FaceDetectorMode.LARGE_FACES;
let height = 480;
let sourceConstraints = { video: true }; // constraints for input camera
let sourceIDs = []; // select input camera
let width = 640;

$(document).ready(function() {
  udpPort.open();
  initUI();
});

udpPort.on("ready", function () {
  settings.sendOSC = true;
});

function drawFeaturePoints(img, featurePoints) {
  const contxt = $('#face_video_canvas')[0].getContext('2d');

  const hRatio = contxt.canvas.width / img.width;
  const vRatio = contxt.canvas.height / img.height;
  const ratio = Math.min(hRatio, vRatio);

  contxt.strokeStyle = "#FFFFFF";
  for (let id in featurePoints) {
    contxt.beginPath();
    contxt.arc(featurePoints[id].x,
      featurePoints[id].y, 2, 0, 2 * Math.PI);
      contxt.stroke();
  }
}

function initDetector() {
  const detector = new affdex.CameraDetector(divRoot, width, height, faceMode, sourceConstraints);
  //Enable detection of all Expressions, Emotions and Emojis classifiers.
  detector.detectAllEmotions();
  detector.detectAllExpressions();
  // detector.detectAllEmojis();
  detector.detectAllAppearance();
  detector.addEventListener("onWebcamConnectSuccess", function() {
    logf('#emo-detector', "Webcam access ok", settings.logToFile, settings.logToConsole);
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
    $("#face_video").css("display", "none");
  });

  detector.addEventListener("onInitializeSuccess", function() {
    logf('#emo-detector', "The detector reports initialized", settings.logToFile, settings.logToConsole);
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
    $("#face_video").css("display", "none");
    //Display canvas instead of video feed because we want to draw the feature points on it
  });

  detector.addEventListener("onWebcamConnectFailure", function() {
    logf('#emo-detector', "webcam denied", settings.logToFile, settings.logToConsole);
    console.log("Webcam access denied");
  });

  detector.addEventListener("onStopSuccess", function() {
    logf('#emo-detector', "The detector reports stopped", settings.logToFile, settings.logToConsole);
    $("#results").html("");
  });

  //Add a callback to receive the results from processing an image.
  //The faces object contains the list of the faces detected in an image.
  //Faces object contains probabilities for all the different expressions, emotions and appearance metrics
  detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
    let appearanceCmd, appearanceArgs, emotionsCmd, emotionsArgs, expressionsCmd, expressionsArgs, emojiCmd, emojiArgs;
    let engagementCmd, engagementArgs, valenceCmd, valenceArgs;
    const timestampCmd = "/timestamp";
    const timestampArgs = timestamp.toFixed(2); // float
    const numFacesCmd = "/numfaces";
    const numFacesArgs = faces.length; // int
    if (faces.length > 0) {
      appearanceCmd = "/appearance";
      appearanceArgs = JSON.stringify(faces[0].appearance); // string
      emotionsCmd = "/emotions";
      emotionsArgs =  JSON.stringify(faces[0].emotions, function(key, val) {
                              return val.toFixed ? Number(val.toFixed(0)) : val;});  // int
      expressionsCmd = "/expressions";
      expressionsArgs = JSON.stringify(faces[0].expressions, function(key, val) {
                              return val.toFixed ? Number(val.toFixed(0)) : val});
      emojiCmd = "/emoji";
      emojiArgs = faces[0].emojis.dominantEmoji;
      engagementCmd = "/engagement";
      engagementArgs = faces[0].emotions.engagement;
      valenceCmd = "/valence";
      valenceArgs = faces[0].emotions.valence;
    }

    // not nice TODO restructure

    if(settings.sendOSC) {
      if (settings.alldata) {
        sendOSC(timestampCmd, timestampArgs);
        sendOSC(numFacesCmd, numFacesArgs);
      }
      if (faces.length > 0) {
        if (settings.engagement) { sendOSC(engagementCmd, engagementArgs); }
        if (settings.valence) { sendOSC(valenceCmd, valenceArgs); }
        if (settings.alldata) {
          sendOSC(appearanceCmd, appearanceArgs);
          sendOSC(emotionsCmd, emotionsArgs);
          sendOSC(expressionsCmd, expressionsArgs);
          sendOSC(emojiCmd, emojiArgs);
        }
      }
    }

    if (settings.alldata) {
      logf('#emo-data', `${timestampCmd} ${timestampArgs}`, settings.logToFile, settings.logToConsole);
      logf('#emo-data', `${numFacesCmd} ${numFacesArgs}`, settings.logToFile, settings.logToConsole);
    }
    if (faces.length > 0) {
      if (settings.engagement) { logf('#emo-data', `${engagementCmd} ${engagementArgs}`, settings.logToFile, settings.logToConsole); }
      if (settings.valence) { logf('#emo-data', `${valenceCmd} ${valenceArgs}`, settings.logToFile, settings.logToConsole); }
      if (settings.alldata) {
        logf('#emo-data', `${appearanceCmd} ${appearanceArgs}`, settings.logToFile, settings.logToConsole);
        logf('#emo-data', `${emotionsCmd} ${emotionsArgs}`, settings.logToFile, settings.logToConsole);
        logf('#emo-data', `${expressionsCmd} ${expressionsArgs}`, settings.logToFile, settings.logToConsole);
        logf('#emo-data', `${emojiCmd} ${emojiArgs}`, settings.logToFile, settings.logToConsole);
      }
    }
    if (settings.view && settings.markers) {
      if (faces.length > 0) {
        drawFeaturePoints(image, faces[0].featurePoints);
      }
    }
  });
  return detector;
}

function initUI() {
  $("#face_video_canvas").css("display", "none");
  $("#face_video_canvas").css("visibility", "hidden");
  $('select').material_select(); // required by materialize
  $("#host")[0].value = oscParameters.remoteAddress; // dom elements are in attribute [0] in materialize objects
  $("#port")[0].value = oscParameters.remotePort;
  $("#logfile")[0].value = settings.logFile;
  $("#togglevalence")[0].checked = settings.valence;
  $("#toggleengagement")[0].checked = settings.engagement;
  $("#togglealldata")[0].checked = settings.alldata;
  Materialize.updateTextFields(); // recommended by materialize
}

function logf(category, msg, logToFile, logToConsole) {
  const logMsg = `${category} ${msg}`;
  if (logToFile) { log.write(logMsg); }
  if (logToConsole) { console.log(logMsg); }
}

function onGotSources(sourceInfos) {
  const selectList = document.getElementById("sources");
  selectList.options.length = 0;
  let storageIndex = 0;
  for (let i=0; i < sourceInfos.length; i++) {
    // logf("#emo-detector", sourceInfos[i], settings.logToFile, settings.logToConsole);
    if (sourceInfos[i].kind === 'videoinput') {
      selectList.options.add(new Option(sourceInfos[i].label), i);
      sourceIDs[storageIndex] = sourceInfos[i].deviceId;
      storageIndex++;
    }
  }
  $('select').material_select(); // required by materialize
  onUISourceChanged(); // set the initially displayed entry in the selection list
}

function onUIGetSources(){
  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    devices.forEach(function(device) {
    //  logf("#emo-detector", device.kind + ": " + device.label + " id = " + device.deviceId, settings.logToFile, settings.logToConsole);
    });
    return devices;
  }).catch(function(err) {
    logf("#error", err.name + ": " + err.message, true);
  }).then(onGotSources);
}

function onUIOSCParamsChanged() {
  const button = $("#updateosc");
  if (button.hasClass("disabled")) {
    button.removeClass("disabled");
  }
}

function onUISourceChanged() {
  const selectList = $("#sources");
  const selected = sourceIDs[selectList.selectedIndex];
  logf("#emo-detector", `Active camera deviceId: ${selected}`, settings.logToFile, settings.logToConsole);
  setSourceConstraintId(selected);
}

function onUIToggleAllData() {
  settings.alldata = $("#togglealldata").is(':checked');
}

function onUIToggleDetector() {
  $("#toggledetector").is(':checked') ? start() : stop();
}

function onUIToggleEngagement() {
  settings.engagement = $("#toggleengagement").is(':checked');
}

function onUIToggleLogToConsole() {
  settings.logToConsole = $("#togglelogconsole").is(':checked');
}

function onUIToggleLogToFile() {
  settings.logToFile = $("#togglelogfile").is(':checked');
}

function onUIToggleMarkers() {
  // markers only make sense when view is enabled
  if (!settings.view) { return; }
  settings.markers = $("#togglemarkers").is(':checked');
}

function onUIToggleOSC() {
  settings.sendOSC = $("#toggleosc").is(':checked');
}

function onUIToggleValence() {
  settings.valence = $("#togglevalence").is(':checked');
}

function onUIToggleView() {
  settings.view = $("#toggleview").is(':checked');
  if (settings.view) { // switch it on
    $("#face_video_canvas").css("display", "block");
    $("#face_video_canvas").css("visibility", "visible");
  } else {
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
  }
}

function onUIUpdateOSCParameters() {
  const button = $("#updateosc");
  const host = $("#host")[0].value;
  const port = $("#port")[0].value;
  oscParameters.remoteAddress = host;
  oscParameters.remotePort = port;
  logf('#emo-detector', `oscParameters changed to: ${oscParameters.remoteAddress} ${oscParameters.remotePort}`, settings.logToFile, settings.logToConsole);
  button.addClass("disabled");
}

function sendOSC(msg, args) {
  udpPort.send({
      address: msg,   // /message
      args: args      // [arrrrrrghhh1, arg2, ...]
  }, oscParameters.remoteAddress, oscParameters.remotePort);
}

function setSourceConstraintId(id) {
  sourceConstraints = { video: { deviceId: { exact: id } } };
}

function start() {
  logf('#emo-detector', "Start", settings.logToFile, settings.logToConsole);
  detector = initDetector();
  if (detector && !detector.isRunning) {
    detector.start();
  }
}

function stop() {
  logf('#emo-detector', "Stop", settings.logToFile, settings.logToConsole);
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();
  }
}
