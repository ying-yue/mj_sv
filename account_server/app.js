var db = require('../utils/db');
var crypto = require('../utils/crypto');
var configs = require(process.argv[2]);

//init db pool.
db.init(configs.mysql());

//

var config = configs.account_server();
var as = require('./account_server');
as.start(config);


// var s = "6rmA7JuQ7ISd8J+PiA==";
//
// var m = crypto.fromBase64(s).toString();
var dapi = require('./dealer_api');
dapi.start(config);