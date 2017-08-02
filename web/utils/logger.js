/**
 * Created by root on 12/2/15.
 */
var logger=require("node-syslog");
logger.init("[local6]", logger.LOG_PID | logger.LOG_ODELAY, logger.LOG_INFO);
module.exports.info    =function(message) { logger.log(logger.LOG_INFO, message); }
module.exports.debug   = function(message) { logger.log(logger.LOG_DEBUG, message); }
module.exports.warning =function(message) { logger.log(logger.LOG_WARN, message); }
module.exports.error   =function(message) { logger.log(logger.LOG_ERROR, message); }
