// global.logger = require('tracer').colorConsole();

var db = require('../utils/db');
var configs = require(process.argv[2]);

//init db pool.
db.init(configs.mysql());

var config = configs.manager_server();
var as = require('./manager_server');
as.start(config);

process.on('uncaughtException', function (err) {
    console.log(' Caught exception: ' + err.stack);
});