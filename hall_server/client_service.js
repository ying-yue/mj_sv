var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var Logger = require('../utils/logger');
var http = require('../utils/http');
var room_service = require("./room_service");
var WxPay = require("../utils/WxPay.js");
var order_model = require("../hall_server/order_model.js");

var app = express();
var config = null;

function check_account(req,res){
	var account = req.query.account;
	var sign = req.query.sign;
	if(account == null || sign == null){
		http.send(res,1,"unknown error");
		return false;
	}
	/*
	var serverSign = crypto.md5(account + req.ip + config.ACCOUNT_PRI_KEY);
	if(serverSign != sign){
		http.send(res,2,"login failed.");
		return false;
	}
	*/
	return true;
}

//设置跨域访问
app.all('*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By",' 3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");
	next();
});

app.get('/login',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	
	var ip = req.ip;
	if(ip.indexOf("::ffff:") != -1){
		ip = ip.substr(7);
	}
	
	var account = req.query.account;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,0,"ok");
			return;
		}

		var ret = {
			account:data.account,
			userid:data.userid,
			name:data.name,
			lv:data.lv,
			exp:data.exp,
			coins:data.coins,
			gems:data.gems,
			ip:ip,
			sex:data.sex,
		};

		db.get_room_id_of_user(data.userid,function(roomId){
			//如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
			if(roomId != null){
				//检查房间是否存在于数据库中
				db.is_room_exist(roomId,function (retval){
					if(retval){
						ret.roomid = roomId;
					}
					else{
						//如果房间不在了，表示信息不同步，清除掉用户记录
						db.set_room_id_of_user(data.userid,null);
					}
					http.send(res,0,"ok",ret);
				});
			}
			else {
				http.send(res,0,"ok",ret);
			}
		});
	});
});

app.get('/create_user',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	var name = req.query.name;
	var coins = 1000;
	var gems = 20;
	// console.log(name);

	db.is_user_exist(account,function(ret){
		if(!ret){
			db.create_user(account,name,coins,gems,0,null,function(ret){
				if (ret == null) {
					http.send(res,2,"system error.");
				}
				else{
					http.send(res,0,"ok");					
				}
			});
		}
		else{
			http.send(res,1,"account have already exist.");
		}
	});
});

app.get('/create_gems_buy_history',function(req,res) {
    //验证参数合法性
    var data = req.query;
    //验证玩家身份
    if (!check_account(req, res)) {
        return;
    }

    var account = data.account;

    data.account = null;

    db.get_user_data(account,function(resultData) {
        if (resultData == null) {
            http.send(res, 1, "system error");
            return;
        }
        var userId = resultData.userid;
        var name = resultData.name;

        let info = {account: account, userId: userId, name: name, gems_count: data.gems_count, money: data.money};

        db.create_gems_buy_history(info, function(gemsHistoryResultData) {
            if (gemsHistoryResultData == null) {
                http.send(res, 1, "system error");
                return;
            }

            // http.send(res,0,"ok");

            db.add_user_gems(userId, data.gems_count, function(ret) {
                if (ret == false) {
                    http.send(res, 1, "system error");
                    return;
                }

                http.send(res, 0, "ok");
            });


        });
    });

});

app.get('/create_private_room',function(req,res){
	//验证参数合法性
	var data = req.query;
	//验证玩家身份
	if(!check_account(req,res)){
		return;
	}

	var account = data.account;

	data.account = null;
	data.sign = null;
	var conf = data.conf;






	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,1,"system error");
			return;
		}
		var userId = data.userid;
		var name = data.name;

        // 방을 창조하기 위한 보석의 개수를 사용자가 가지고 있는가를 검사.
        var neededGemsGorCreatingRoom = 1;
        var confJsonData = JSON.parse(conf);
        if(confJsonData.jushu == 2){
            neededGemsGorCreatingRoom = 2;
        }

        if(neededGemsGorCreatingRoom > data.gems){
            http.send(res,105,"The number of gems is insufficient.");
            return;
        }


		//验证玩家状态
		db.get_room_id_of_user(userId,function(roomId){
			if(roomId != null){
				http.send(res,-1,"user is playing in room now.");
				return;
			}
			//创建房间
			room_service.createRoom(account,userId,conf,function(err,roomId){
				if(err == 0 && roomId != null){
					room_service.enterRoom(userId,name,roomId,function(errcode,enterInfo){
						if(enterInfo){
							var ret = {
								roomid:roomId,
								ip:enterInfo.ip,
								port:enterInfo.port,
								token:enterInfo.token,
								time:Date.now()
							};
							ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);

							Logger.info(`Room ${roomId} is created by user-${name}(userID-${userId})`, roomId);
							//방이 성과적으로 창조되였으므로 방을 창조한 사용자의 gems에서 방을 창조하는데 필요한 gem의 개수를 던다.
                            // db.cost_gems(userId, neededGemsGorCreatingRoom);
							//////////////////////////////////////////////////////////

							http.send(res,0,"ok",ret);
						}
						else{
							http.send(res,errcode,"room doesn't exist.");
						}
					});
				}
				else{
					http.send(res,err,"create failed.");					
				}
			});
		});
	});
});

app.get('/enter_private_room',function(req,res){
	var data = req.query;
	var roomId = data.roomid;
	if(roomId == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}

	var account = data.account;

	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,-1,"system error");
			return;
		}
		var userId = data.userid;
		var name = data.name;

		//验证玩家状态
		//todo
		//进入房间
		room_service.enterRoom(userId,name,roomId,function(errcode,enterInfo){
			if(enterInfo){
				var ret = {
					roomid:roomId,
					ip:enterInfo.ip,
					port:enterInfo.port,
					token:enterInfo.token,
					time:Date.now()
				};
				ret.sign = crypto.md5(roomId + ret.token + ret.time + config.ROOM_PRI_KEY);
				http.send(res,0,"ok",ret);
			}
			else{
				http.send(res,errcode,"enter room failed.");
			}
		});
	});
});

app.get('/get_history_list',function(req,res){
	var data = req.query;
	if(!check_account(req,res)){
		return;
	}
	var account = data.account;
	db.get_user_data(account,function(data){
		if(data == null){
			http.send(res,-1,"system error");
			return;
		}
		var userId = data.userid;
		db.get_user_history(userId,function(history){
			http.send(res,0,"ok",{history:history});
		});
	});
});

app.get('/get_games_of_room',function(req,res){
	var data = req.query;
	var uuid = data.uuid;
	if(uuid == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	db.get_games_of_room(uuid,function(data){
		// console.log(data);
		http.send(res,0,"ok",{data:data});
	});
});

app.get('/get_detail_of_game',function(req,res){
	var data = req.query;
	var uuid = data.uuid;
	var index = data.index;
	if(uuid == null || index == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	if(!check_account(req,res)){
		return;
	}
	db.get_detail_of_game(uuid,index,function(data){
		http.send(res,0,"ok",{data:data});
	});
});

app.get('/get_user_status',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var account = req.query.account;
	db.get_gems(account,function(data){
		if(data != null){
			http.send(res,0,"ok",{gems:data.gems});	
		}
		else{
			http.send(res,1,"get gems failed.");
		}
	});
});

app.get('/get_message',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var type = req.query.type;
	
	if(type == null){
		http.send(res,-1,"parameters don't match api requirements.");
		return;
	}
	
	var version = req.query.version;
	db.get_message(type,version,function(data){
		if(data != null){
			http.send(res,0,"ok",{msg:data.msg,version:data.version});	
		}
		else{
			http.send(res,1,"get message failed.");
		}
	});
});

app.get('/is_server_online',function(req,res){
	if(!check_account(req,res)){
		return;
	}
	var ip = req.query.ip;
	var port = req.query.port;
	room_service.isServerOnline(ip,port,function(isonline){
		var ret = {
			isonline:isonline
		};
		http.send(res,0,"ok",ret);
	}); 
});






var apiBuyGoods = function (req, res) {
    db.get_user_data(req.query.account, function (user) {
        if (!user) {
            http.send(res, 1, "failed to get user data!");
            return ;
        }

        db.get_goods(parseInt(req.query.targetItem), function(goods){
            if(!goods){
                http.send(res, 2, "failed to get good!");
                return;
            }

            var channel = "weixin";

            order_model.createOrder(goods, user, channel, function (err, order_info) {
                if (err) {
                    //this case err argument represent order_id
                    db.update_order_results_by_order_id(err, order_model.OS_REQUEST_FAIL);
                    http.send(res, 3, "error", err);
                }
                else {
                    http.send(res, 0, "ok", order_info);
                }
            }, req.ip.replace("::ffff:", ""));
            // });
        });
    });
};

app.get('/get_unfull_room',function(req, res){
    db.get_unfull_room(function(record){
        if (record == null) {
            http.send(res, 1, "no exist unfull room!");
            return;
        }

        var ret = {
            roomId: record.id
        };

        http.send(res, 0, "ok", ret);
    });
});


app.get('/api/buy_goods', apiBuyGoods);
app.post('/weixin/WxPay_notify', WxPay.notify);

exports.start = function($config){
	config = $config;
	app.listen(config.CLEINT_PORT);
	// console.log("client service is listening on port " + config.CLEINT_PORT);
};