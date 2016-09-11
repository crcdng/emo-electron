var detector;
// affectiva SDK Needs to create video and canvas nodes in the DOM in order to function :((
var divRoot = $("#affdex_elements")[0];
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;
var log = require('electron-log');
var view = false;
var markers = false;
// Here we are adding those nodes a predefined div.
var width = 640;
var height = 480;

log.transports.console = false;

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
  log.info(logMsg);
  if (logToConsole) { console.log(logMsg); }
  if (logToUi) { $(category).append("<span>" + logMsg + "</span><br />"); }
}

function initDetector() {
  var detector = new affdex.CameraDetector(divRoot, width, height, faceMode, {
    video: { deviceId: { exact: "6368d12bfefad3a6bdc98ff349f308f9a3983122c0c1242e3747f888d32efa03" } },
    audio: false
  });
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
      console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
    });
    return devices;
  }).catch(function(err) {
    console.log(err.name + ": " + err.message);
  });
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

}

function onStart() {
  logf('#logs', "Clicked the start button", true);
  if (detector && !detector.isRunning) {
    detector.start();
  }
}

function onStop() {
  logf('#logs', "Clicked the stop button", true);
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();
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

detector = initDetector();
