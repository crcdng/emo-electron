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

function initDetector() {
  var detector = new affdex.CameraDetector(divRoot, width, height, faceMode);
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

function logf(node_name, msg) {
  log.info(`${node_name} ${msg}`);
  // $(node_name).append("<span>" + msg + "</span><br />")
}

function onStart() {
  if (detector && !detector.isRunning) {
    detector.start();
  }
  logf('#logs', "Clicked the start button");
}

function onStop() {
  logf('#logs', "Clicked the stop button");
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();
  }
}

function onReset() {
  logf('#logs', "Clicked the reset button");
  if (detector && detector.isRunning) {
    detector.reset();
  }
}

function onView() {
  logf('#logs', "Clicked the view button");
  if (!view) { // switch it on
    $("#face_video_canvas").css("display", "block");
    $("#face_video_canvas").css("visibility", "visible");
  } else {
    $("#face_video_canvas").css("display", "none");
    $("#face_video_canvas").css("visibility", "hidden");
  }
  view = !view;
}

function onMarkers() {
  logf('#logs', "Clicked the markers button");
  // markers only make sense when view is enabled
  if (!view) { return; }
  markers = !markers;
}

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

detector = initDetector();
