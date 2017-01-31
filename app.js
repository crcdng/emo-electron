var detector;
// affectiva SDK Needs to create video and canvas nodes in the DOM in order to function :((
var divRoot = $("#affdex_elements")[0];
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;
var height = 480;
var log = require('electron-log');
var osc = require('osc');
var remoteAddress = "127.0.0.1";
var remotePort = 12000;
var settings = { logToFile: false, logToConsole: false, markers: false, sendOSC: true, view: false };
var sourceConstraints = { video: true }; // constraints for input camera
var sourceIDs = []; // select input camera
var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121
});
var width = 640;

// Open the socket.
udpPort.open();
log.transports.console = false; // broken, use console.log to log to console

// required by materialize
$(document).ready(function() {
  $('select').material_select();
  Materialize.updateTextFields();
});

// When the port is ready, send ping
udpPort.on("ready", function () {
    udpPort.send({
        address: "/ping",
        args: ["default", 100]
    }, remoteAddress, remotePort);
});

function drawFeaturePoints(img, featurePoints) {
  var contxt = $('#face_video_canvas')[0].getContext('2d');

  var hRatio = contxt.canvas.width / img.width;
  var vRatio = contxt.canvas.height / img.height;
  var ratio = Math.min(hRatio, vRatio);

  contxt.strokeStyle = "#FFFFFF";
  for (var id in featurePoints) {
    contxt.beginPath();
    contxt.arc(featurePoints[id].x,
      featurePoints[id].y, 2, 0, 2 * Math.PI);
      contxt.stroke();

  }
}

function logf(category, msg, logToConsole, logToUi) {
  var logMsg = `${category} ${msg}`;
  if (logToConsole) { console.log(logMsg); }
  log.info(logMsg);
  if (logToUi) { $(category).append("<span>" + logMsg + "</span><br />"); }
}

function initDetector() {
  var detector = new affdex.CameraDetector(divRoot, width, height, faceMode, sourceConstraints);
  //Enable detection of all Expressions, Emotions and Emojis classifiers.
  detector.detectAllEmotions();
  detector.detectAllExpressions();
  // detector.detectAllEmojis();
  detector.detectAllAppearance();
  detector.addEventListener("onWebcamConnectSuccess", function() {
    logf('#logs', "Webcam access ok");
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
    $("#face_video").css("display", "none");
  });

  detector.addEventListener("onInitializeSuccess", function() {
    logf('#logs', "The detector reports initialized");
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
    $("#face_video").css("display", "none");
    //Display canvas instead of video feed because we want to draw the feature points on it
  });

  detector.addEventListener("onWebcamConnectFailure", function() {
    logf('#logs', "webcam denied");
    console.log("Webcam access denied");
  });

  detector.addEventListener("onStopSuccess", function() {
    logf('#logs', "The detector reports stopped");
    $("#results").html("");
  });

  //Add a callback to receive the results from processing an image.
  //The faces object contains the list of the faces detected in an image.
  //Faces object contains probabilities for all the different expressions, emotions and appearance metrics
  detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
    // $('#results').html("");
    const timestamp = `Timestamp: ${timestamp.toFixed(2)}`;
    const numFaces = `Number of faces found: ${faces.length}`;
    const appearance = `Appearance: ${JSON.stringify(faces[0].appearance)}`;
    const emotions = `Emotions: ${JSON.stringify(faces[0].emotions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;})}`;
    const expressions = `Expressions: ${JSON.stringify(faces[0].expressions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val})}`;
    const emoji = `Emoji: ${faces[0].emojis.dominantEmoji}`;

    logf('#results', timestamp);
    logf('#results', numFaces);
    if (faces.length > 0) {
      logf('#results', appearance);
      logf('#results', emotions);
      logf('#results', expressions);
      logf('#results', emoji);
      if (settings.markers) {
        drawFeaturePoints(image, faces[0].featurePoints);
      }
    }
  });

  return detector;
}

function initUI() {

}

function onGotSources(sourceInfos) {
  var i, selectList, storageIndex;

  selectList = document.getElementById("sources");
  selectList.options.length = 0;
  storageIndex = 0;
  for (i=0; i < sourceInfos.length; i++) {
    // logf("#logs", sourceInfos[i], true);
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
  logf('#logs', "Clicked the get sources button", true);

  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    devices.forEach(function(device) {
    //  logf("#logs", device.kind + ": " + device.label + " id = " + device.deviceId, true);
    });
    return devices;
  }).catch(function(err) {
    logf("#error", err.name + ": " + err.message, true);
  }).then(onGotSources);
}

function onUIToggleMarkers() {
  // markers only make sense when view is enabled
  if (!settings.view) { return; }
  settings.markers = $("#togglemarkers").is(':checked');
}

function onUIReset() {
  logf('#logs', "Clicked the reset button", true);
  if (detector && detector.isRunning) {
    detector.reset();
  }
}

function onUISourceChanged() {
  var selectList = document.getElementById("sources");
  var selected = sourceIDs[selectList.selectedIndex];
  logf("#logs", "Active camera deviceId: " + selected, true);

  setSourceConstraintId(selected);
}

function onUIToggleDetector() {
  $("#toggledetector").is(':checked') ? start() : stop();
}

function onUIToggleLogToConsole() {
  settings.logToConsole = $("#togglelogconsole").is(':checked');
}

function onUIToggleLogToFile() {
  settings.logToFile = $("#togglelogfile").is(':checked');
}

function onUIToggleOSC() {
  settings.sendOSC = $("#toggleosc").is(':checked');
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

function onUIUpdateOSCParameters() {}

function sendOSC(msg, args) {
  udpPort.send({
      address: msg,   // /message
      args: args      // [arrrrrrghhh1, arg2, ...]
  }, remoteAddress, remotePort);
}

function setSourceConstraintId(id) {
  sourceConstraints = { video: { deviceId: { exact: id } } };
}

function start() {
  logf('#logs', "Start", true);
  detector = initDetector();
  if (detector && !detector.isRunning) {
    detector.start();
  }
}

function stop() {
  logf('#logs', "Stop", true);
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();
  }
}
