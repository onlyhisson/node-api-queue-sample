const fs = require('fs'); // for callback function

function noOp() {
    console.log("noOp");
};

exports.catchProccessExit = function catchProccessExit(callback) {

  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  callback = callback || noOp;
  process.on('[Process On] : cleanup', callback);

  // do app specific cleaning before exiting
  process.on('exit', function () {
    console.log('[Process On] : exit');
    process.emit('cleanup');
  });

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function () {
    console.log('[Process On] : On SIGINT');
    process.exit(2);
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function(e) {
    console.log('[Process On] : Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
};