/*var HLSServer = require('hls-server')
var http = require('http')
 
var server = http.createServer()
var hls = new HLSServer(server, {
  provider: {
    exists: function (req, callback) { // check if a file exists (always called before the below methods)
      callback(null, true)                 // File exists and is ready to start streaming
      callback(new Error("Server Error!")) // 500 error
      callback(null, false)                // 404 error
    },
    getManifestStream: function (req, callback) { // return the correct .m3u8 file
      // "req" is the http request
      // "callback" must be called with error-first arguments
      callback(null, myNodeStream)
      // or
      callback(new Error("Server error!"), null)
    },
    getSegmentStream: function (req, callback) { // return the correct .ts file
      callback(null, myNodeStream)
    }
  }
});
server.listen(8000)*/
const webcam = require('webcam-http-streaming');
 
const encoder = {
  /*
   * encoder command or location
   *   Default: avconv
   */
  command: 'ffmpeg',
  /*
   * Function that returns the required flags, the video is expected to be
   * written to stdout
   *   Default: shown below
   */
  flags(webcam) {
    return `-f video4linux2 -i ${webcam} -f webm -deadline realtime pipe:1`;
    //return `-y -framerate 24 -i ${webcam} -strict experimental -ac 2 -b:a 64k -ar 44100 -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 2.1 -maxrate 500K -bufsize 2M -crf 18 -r 10 -g 30  -f hls -hls_time 9 -hls_list_size 0 -s 480x270 ts/480x270.m3u8`
  },
  /*
   * MIME type of the output stream
   *   Default: 'video/webm'
   */
  mimeType: 'video/webm',
  /*
   * Function that detects the success of the encoder process,
   * does cb(true) in case of succes, any other value for failure
   *
   * Calling cb more than one time has no effect
   *
   * encoderProcess is of type ChildProcess
   *
   *  Default: shown below, it isn't perfect but covers most of the cases
   */
  isSuccessful(encoderProcess, cb) {
    console.log('yesss');
    let started = false;
    encoderProcess.stderr.setEncoding('utf8');
    encoderProcess.stderr.on('data', (data) => {
      /* I trust that the output is line-buffered */
      const startedText = /Press ctrl-c to stop encoding/;
      if(startedText.test(data)) {
        cb(true);
        started = true;
      }
    });
    /* If the process start was not detected and it exited it's surely a failure */
    encoderProcess.on('exit', () => {
      if(!started) cb(false);
    });
  }
};
 
/* Suppose i want to use the default REST API */
const server = webcam.createHTTPStreamingServer({
  /*
   * Optional: A list of the permitted webcams, if it's specified overrides
   * isValidWebcam
   */
  permittedWebcams: ['/dev/video0', '/dev/video1'],
  /*
   * Validates if a given path is a valid webcam for use, the default is shown
   * below
   */
  isValidWebcam(webcam) {
    const webcamRegex = /\/dev\/video[0-9]+/;
 
    return new Promise((accept, reject) => {
      /* If doesn't seem like a video device block we will fail */
      if(!webcamRegex.test(webcam)) {
        reject(false);
      } else {
        /* ... and if the file doesn't exists */
        fileExists(webcam).then(accept, reject);
      }
    });
  },
  /*
   * The endpoint for requesting streams of the REST api
   *   Defaults to '/webcam'
   */
  webcamEndpoint: '/webcam',
  /*
   * Custom endpoints to extend the REST API
   *   req: [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
   *   res: [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
   *   reqUrl: [URL Object](https://nodejs.org/api/url.html#url_url_strings_and_url_objects)
   *            with [QueryString](https://nodejs.org/api/querystring.html#querystring_querystring_parse_str_sep_eq_options)
   *
   * Note: the endpoint 'default' is used for any non-matching request
   */
  additionalEndpoints: {
    '/list_webcams': (req, res, reqUrl) => { res.end('<html>...</html>'); }
  },
  encoder: encoder
}).listen(process.env.PORT || 8000);
 
/* Returns a promise that resolves to the video stream (stream.Readable) */
const videoStream = webcam.streamWebcam('/dev/video0', encoder);