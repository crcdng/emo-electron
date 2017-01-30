var detector;
// affectiva SDK Needs to create video and canvas nodes in the DOM in order to function :((
var divRoot = $("#affdex_elements")[0];
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;
var height = 480;
var log = require('electron-log');
var markers = false;
var sourceConstraints = { video: true }; // constraints for input camera
var sourceIDs = []; // select input camera
var view = false;
var width = 640;

log.transports.console = false; // broken, use console.log to log to console

// required by materialize
$(document).ready(function() {
  $('select').material_select();
  Materialize.updateTextFields();
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
    logf('#results', `Timestamp: ${timestamp.toFixed(2)}`);
    logf('#results', `Number of faces found: ${faces.length}`);
    if (faces.length > 0) {
      logf('#results', `Appearance: ${JSON.stringify(faces[0].appearance)}`);
      logf('#results', `Emotions: " + ${JSON.stringify(faces[0].emotions, function(key, val) {
        return val.toFixed ? Number(val.toFixed(0)) : val;})}`);
      logf('#results', `Expressions:  + ${JSON.stringify(faces[0].expressions, function(key, val) {
        return val.toFixed ? Number(val.toFixed(0)) : val})}`);
      logf('#results', "Emoji: " + faces[0].emojis.dominantEmoji);
      if (markers) {
        drawFeaturePoints(image, faces[0].featurePoints);
      }
    }
  });

  return detector;
}

function onGetSources(){
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
  onSourceChanged(); // set the initially displayed entry in the selection list
}

function onMarkers() {
  logf('#logs', "Clicked the markers button", true);
  // markers only make sense when view is enabled
  if (!view) { return; }
  markers = !markers;
}

function onReset() {
  logf('#logs', "Clicked the reset button", true);
  if (detector && detector.isRunning) {
    detector.reset();
  }
}

function onSourceChanged() {
  var selectList = document.getElementById("sources");
  var selected = sourceIDs[selectList.selectedIndex];
  logf("#logs", "Active camera deviceId: " + selected, true);

  setSourceConstraintId(selected);
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

function onToggle() {
  logf('#logs', "Clicked the toggle switch", true);
  if ($("#toggle").is(':checked')) {
    start();
  } else {
    stop();
  }
}

function onView() {
  logf('#logs', "Clicked the view button", true);
  if (!view) { // switch it on
    $("#face_video_canvas").css("display", "block");
    $("#face_video_canvas").css("visibility", "visible");
  } else {
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
  }
  view = !view;
}

function setSourceConstraintId(id) {
  sourceConstraints = { video: { deviceId: { exact: id } } };
}
