var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var logger = require('../utils/logger');
var app = express();

function send(res,ret){
	var str = JSON.stringify(ret);
	res.send(str)
}

function fromIntToDateString(val) {
    if (val == null)
        return "";

    if (val == 0) {
        return "";
    }

    var date = new Date(val * 1000);

    return date.Format("yyyy-MM-dd hh:mm:ss");
}

function fromInt13ToDateString(val) {
    if (val == null)
        return "";

    if (val == 0) {
        return "";
    }

    var date = new Date(val);

    return date.Format("yyyy-MM-dd hh:mm:ss");
}

var config = null;
var days = [31,28,31,30,31,30,31,31,30,31,30,31];

exports.start = function(cfg){
	config = cfg;
	app.listen(config.CLIENT_PORT);

    logger.log("manager server is listening on port " + config.CLIENT_PORT);
};

//设置跨域访问
app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

app.get('/login', function(req, res){
    var loginId = req.query.id;
    var loginPwd = req.query.password;
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    db.read_user_account(loginId, loginPwd, loginToken, function(data){
        var ret = {
            code:1,
            msg:"请输入正确的登录账号和密码",
            time:Date.now(),
            data:{}
        };

        if (data != null && data.length > 0) {
            var data = data[0];

            if (data.isvalid != 0 && data.lv == 4){//没封闭，也能登录到后台的账号？
                ret.code = 0;
                ret.msg = "login success";
                ret.data.token = crypto.md5(data.id + data.password + data.nick_name);

				if (loginToken == null)
                    db.update_token(data.account, ret.data.token);

                ret.data.userInfo = data;
                ret.data.userInfo.name = data.lv == 4 ? "管理者": data.name;
            }
        }

        send(res,ret);
    });
});

app.get('/user_list',function(req,res){
	var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

	var order_by = req.query.order_by;

	if (order_by == null)
		order_by = "";

	var userId = req.query.userId;

	if (userId == null)
		userId = "";

	var nickname = req.query.nickname;

    if (nickname == null)
        nickname = "";

    var level = req.query.level;

    if (level == null)
        level = "";

	var page_no = 1;

	if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
		page_no = parseInt(req.query.page_no);

	var page_size = req.query.page_size?parseInt(req.query.page_size):30;

	db.read_user_account(null, null,loginToken, function(data){
		var ret = {
			code:1,
			msg:"无法找到用户信息",
			time:new Date(),
			data:{}
		};

		if (data == null || data.length == 0){
			send(res,ret);
			return;
		}

		var userData = data[0];

		if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
			ret.code = 0;
			ret.msg = "操作成功";
			ret.data.page_no = page_no;
			ret.data.page_size = page_size;

			db.read_user_list(userData.account, order_by, userId, nickname,level, function(data){
				if (data){
					ret.data.total_count = data.length;
					ret.data.page_count = Math.ceil(data.length / page_size);
					ret.data.list = [];

					var startNo = (page_no-1) * page_size;

					for (var i = 0; i< page_size; i++){
						if (data[startNo + i] != null){
                            var temp = {};

                            temp = data[startNo + i];
                            temp.createdate = fromIntToDateString(temp.createdate);
                            temp.onlinedate = fromIntToDateString(temp.onlinedate);
                            temp.name = (temp.lv == 4) ? "管理者" : temp.name;

                            ret.data.list.push(temp);
						}
					}
				}
				send(res,ret);
			});
		}
		else
			send(res,ret);
	});
});

app.get('/user_detail',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if (userId == "" ) {
            userId = userData.userid;
        }

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            db.read_user_info(userId, function(data){
                ret.msg = "操作失败";
                if (data && data.length > 0){
                    var data = data[0];

                    ret.code = 0;
                    ret.msg = "操作成功";

                    if (data.userid != userData.userid && userData.lv == 1){//初级管理者
                        if (data.lv != 0){
                            data.id = "*****";
                            data.pwd = "*****";
                        }
                        else {
                            data.id = "";
                            data.pwd = "";
                        }

                        if (data.roomid != "")
                            data.roomid = "*****";

                        data.account = "*****";
                    }

                    data.name = data.lv==4 ? "管理者":data.name;
                    ret.data = data;
                }

                send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/get_system_settings',function(req,res){
    var token = req.query.token;

    db.read_user_account(null, null,token, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var data = data[0];

        db.read_system_info(function(data){
            if (data == null || data.length == 0)
                ret.msg = "无法获取系统信息";
            else
            {
                ret.code = 0;
                ret.data = data;
            }
            send(res,ret);
        });
    });
});

app.get('/set_system_settings',function(req,res){
    var token = req.query.token;
    var type = req.query.type;
    var value = req.query.value;

    db.read_user_account(null, null,token, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var data = data[0];

        db.update_system_info(type, value, function(data){
            if (data == null || data.length == 0)
                ret.msg = "无法修改系统信息";
            else
            {
                ret.code = 0;
                ret.data = data;
            }
            send(res,ret);
        });
    });
});

app.get('/room_list',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var status = req.query.status ? req.query.status : "";
    var roomType = req.query.roomType ? req.query.roomType : "";
    var roomId = req.query.roomId ? req.query.roomId : "";

    var page_no = 1;

    if (req.query.page_no != null && req.query.page_no != "" && req.query.page_no != "NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size ? parseInt(req.query.page_size): 30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，终级管理者？
           logger.log( 'user is valid');

            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            var total = {};
            total.list = [];
            ret.data.list = [];

            db.read_game_list( roomType, roomId, function(data){
                if (data) {
                    if(status == "all" || status == "finished") {
                        for (var i = 0; i < data.length; i++) {
                            var roomData = data[i];

                            if (roomData != null) {
                                var temp = {};

                                temp.uuid = roomData.room_uuid + "";

                                try {
                                    var baseInfo = JSON.parse(roomData.base_info);
                                } catch (e) {
                                   logger.log( e);
                                }

                                if (baseInfo.jushuType == 1) {
                                    temp.jushu = "1人1庄";
                                }
                                else {
                                    temp.jushu = "1人2庄";
                                }

                                temp.type = baseInfo.difenType == 1 ? '积分制' : '比例制';
                                temp.state = 1;
                                temp.create_time = "";

                                if (roomData.create_time > 0) {
                                   temp.create_time = fromIntToDateString(roomData.create_time);
                                }

                                temp.end_time = "";

                                if (roomData.end_time > 0) {
                                    temp.end_time = fromIntToDateString(roomData.end_time);
                                }

                                temp.turn = roomData.num_of_turns;
                                temp.roomid = roomData.room_id;
                                total.list.push(temp);
                            }
                        }
                    }
                }

                db.read_room_list(roomType, roomId, function(data){
                   logger.log( 'read_room_list');
                   logger.log( JSON.stringify(data));

                    if (data) {
                        if(status == "active"){
                            for (var i = 0; i < data.length; i++) {
                                var roomData = data[i];

                                if (roomData != null) {
                                    var temp = {};

                                    temp.uuid = roomData.uuid + "";

                                    try {
                                        var baseInfo = JSON.parse(roomData.base_info);
                                    } catch (e) {
                                       logger.log( e);
                                    }

                                    if(baseInfo.jushuType==1){
                                        temp.jushu="1人1庄";
                                    }
                                    else{
                                        temp.jushu="1人2庄";
                                    }

                                    temp.type = baseInfo.difenType==1 ? '积分制' : '比例制';

                                    temp.create_time = "";

                                    if (roomData.create_time > 0) {
                                        temp.create_time = fromIntToDateString(roomData.create_time);
                                    }

                                    temp.end_time = "";
                                    temp.turn=roomData.num_of_turns;
                                    temp.roomid=roomData.id;

                                    if(temp.turn > 0){
                                        temp.state = 0;
                                        total.list.push(temp);
                                    }
                                }
                            }
                        }
                         if(status == "waiting"){
                            for (var i = 0; i < data.length; i++) {
                                var roomData = data[i];

                                if (roomData != null) {
                                    var temp = {};

                                    temp.uuid = roomData.uuid + "";

                                    try {
                                        var baseInfo = JSON.parse(roomData.base_info);
                                    } catch (e) {
                                       logger.log( e);
                                    }

                                    if(baseInfo.jushuType==1){
                                        temp.jushu="1人1庄";
                                    }
                                    else{
                                        temp.jushu="1人2庄";
                                    }

                                    temp.type = baseInfo.difenType==1 ? '积分制' : '比例制';

                                    temp.create_time = "";

                                    if (roomData.create_time > 0) {
                                        temp.create_time = fromIntToDateString(roomData.create_time);
                                    }

                                    temp.end_time = "";
                                    temp.turn=roomData.num_of_turns;
                                    temp.roomid=roomData.id;

                                    if(temp.turn == 0){
                                        temp.state = 2;
                                        total.list.push(temp);
                                    }
                                }
                            }
                        }

                        if(status == "all"){
                            for (var i = 0; i < data.length; i++) {
                                var roomData = data[i];

                                if (roomData != null) {
                                    var temp = {};

                                    temp.uuid = roomData.uuid + "";

                                    try {
                                        var baseInfo = JSON.parse(roomData.base_info);
                                    } catch (e) {
                                       logger.log( e);
                                    }

                                    if(baseInfo.jushuType==1){
                                        temp.jushu="1人1庄";
                                    }
                                    else{
                                        temp.jushu="1人2庄";
                                    }

                                    temp.type = baseInfo.difenType==1 ? '积分制' : '比例制';
                                    temp.state = 2;
                                    temp.create_time = "";

                                    if (roomData.create_time > 0) {
                                        temp.create_time = fromIntToDateString(roomData.create_time);
                                    }

                                    temp.end_time = "";
                                    temp.turn=roomData.num_of_turns;

                                    if(temp.turn>0)
                                        temp.state = 0;
                                    else
                                        temp.state=2;

                                    temp.roomid=roomData.id;

                                    total.list.push(temp);
                                }
                            }
                        }

                        ret.data.total_count = total.list.length;
                        ret.data.page_count = Math.ceil(total.list.length / page_size);

                        var startNo = (page_no-1) * page_size;

                        if(startNo > ret.data.total_count ){
                            startNo=0;
                            page_no=1;
                        }

                        var temp = {};

                        for(var i = 0; i < page_size; i++){
                            if(total.list[startNo+i]){
                                temp=total.list[startNo+i];
                                temp.rowno=startNo+i+1;
                                ret.data.list.push(temp);
                            }
                        }
                    }
                    send(res, ret);
                });
            });
        }
        else{
           logger.log( 'user is not valid');

            ret.msg = "您没有权限查看此页面";
            send(res,ret);
        }
    });
});

app.get('/enable_account',function(req,res){
	var userId = req.query.userId;
	var token = req.query.token;
	var enable = req.query.enable;

	db.read_user_account(null, null,token, function(data){
		var ret = {
			code:1,
			msg:"无法找到用户信息",
			time:new Date(),
			data:{}
		};

		if (data != null && data.length > 0) {
			var data = data[0];

			if (data.isvalid != 0 && data.lv == 4){//没封闭，也是终级管理者
				db.update_valid_state(userId, enable, function(data){
					if (data){
						ret.code = 0;
						ret.msg = "操作成功";
					} 
					else
						ret.msg = "操作失败";
					send(res,ret);
				});
			}
		} 
		else 
			send(res,ret);
	});
});

app.get('/edit_items',function(req,res){
	var loginToken = req.query.token;

	if (loginToken == "")
		loginToken = null;

	var userId = req.query.userId;

	if (userId == null)
		userId = "";

	var type = req.query.type;

	var typeCaption = "";

	switch (type){
		case "gems_coins":
			typeCaption = "金币";
			break;
		case "gems":
			typeCaption = "房卡";
			break;
	}

	var newCnt = parseInt(req.query.newCnt);

	db.read_user_account(null, null,loginToken, function(data){
		var ret = {
			code:1,
			msg:"无法找到用户信息",
			time:new Date(),
			data:{}
		};

		if (data == null || data.length == 0){
			send(res,ret);
			return;
		}

		var myAccount = data[0];

		if (myAccount.isvalid == 0 || myAccount.lv == 0){//封闭或者没权利录到后台的账号？
			ret.msg="您没有权利修改" + typeCaption;
			send(res,ret);
			return;
		}

		db.read_user_info(userId, function(data){
			if (data==null || data.length == 0){
				send(res,ret);
				return;
			}

			var otherAccount = data[0];
			var curCnt = 0;
			var myCnt = 0;

			switch (type){
				case "coins":
					curCnt = otherAccount.coins;
					myCnt = myAccount.coins;
					break;
				case "gems":
					curCnt = otherAccount.gems;
					myCnt = myAccount.gems;
					break;
			}

			var incCnt = newCnt - curCnt;

			if (myAccount.lv != 4 && incCnt < 0){//如果初级管理者要扣除其他用户的金币？
				ret.msg = "不能扣除其他用户的" + typeCaption;
				send(res,ret);
				return;
			}

			if (myAccount.lv != 4){//如果是初级管理者，则扣除相应的金币
				//先看看初级管理者拥有相应的金币？
				if (myCnt < incCnt){//金币不够？
					ret.msg = "您的" + typeCaption + "数量不够！";
					send(res,ret);
					return;
				}
				else {
					db.update_coins(myAccount.userId, myCnt - incCnt, type, function(data){
						if (data == null || data.length == 0){
							ret.msg = "修改" + typeCaption + "操作失败";
							send(res,ret);
							return;
						}
						db.update_coins(otherAccount.userId, newCnt, type, function(data){
							if (data == null || data.length == 0)
								ret.msg = "修改" + typeCaption + "操作失败";
							else {
								ret.code = 0;
								ret.msg = "操作成功";
							}
							send(res,ret);
							return;
						});
					});
				}
			}
			else {
				db.update_coins(otherAccount.userid, newCnt, type, function(data){
					if (data == null || data.length == 0)
						ret.msg = "修改" + typeCaption + "操作失败";
					else {
						ret.code = 0;
						ret.msg = "操作成功";
						ret.data.newCnt = newCnt;

                        logger.log("userId: " + otherAccount.userid + " increased gem from " + otherAccount.gems + " to " + newCnt, "gem_history");

                        db.write_manual_charge_history(otherAccount.userid, otherAccount.gems, newCnt);
					}

					send(res,ret);
				});
			}
		});
	});
});

app.get('/edit_account',function(req,res){
	var token = req.query.token;
	var oldPwd = req.query.old_password;
	var newPwd = req.query.new_password;

	db.read_user_account(null, null,token, function(data){
		var ret = {
			code:1,
			msg:"无法找到用户信息",
			time:new Date(),
			data:{}
		};

		if (data == null || data.length == 0){
			send(res,ret);
			return;
		}

		var data = data[0];

		if (data.isvalid == 0 || data.lv == 0){//封闭，或者没权利进入后台
			ret.msg = "无法修改密码！";
			send(res,ret);
			return;
		}

		if (data.pwd != oldPwd){
			ret.msg = "请输入正确的密码！";
			send(res,ret);
			return;
		}

		db.update_password(data.userid, newPwd, function(data){
			if (data) {
				ret.code = 0;
				ret.msg = "密码修改成功";
			} 
			else
				ret.msg = "操作失败";
			send(res,ret);
		});
	});
});

app.get('/enable_chuji_account',function(req,res){
	var token = req.query.token;
	var enable = req.query.enable;
	var userId = req.query.userId;
	var id = req.query.id?req.query.id:"";
	var pwd = req.query.pwd?req.query.pwd:"";
	
	db.read_user_account(null, null,token, function(data){
		var ret = {
			code:1,
			msg:"无法找到用户信息",
			time:new Date(),
			data:{}
		};

		if (data == null || data.length == 0){
			send(res,ret);
			return;
		}

		var data = data[0];

		if (data.isvalid == 0 || data.lv != 4){//封闭，或者不是终级管理者
			ret.msg = "无法更改权限！";
			send(res,ret);
			return;
		}

		db.update_chuji_account(userId, id, pwd, enable, function(data){
			if (data) {
				ret.code = 0;
				ret.msg = "修改成功";
			}
			else
				ret.msg = "操作失败";

			send(res,ret)
		});
	});
});

app.get('/statistics',function(req,res){
	var token = req.query.token;
	var date_type = req.query.date_type;
	var date = req.query.date;
	
	db.read_user_account(null, null,token, function(data){
		var ret = {
			code:1,
			msg:"无法找到用户信息",
			time:new Date(),
			data:{}
		};

		if (data == null || data.length == 0){
			send(res,ret);
			return;
		}

		var data = data[0];

		ret.code = 0;
		ret.data.statistics = [];
		
		var startDate = "";
		var endDate = "";
		var year = parseInt(date.substring(0, 4));
		var isLeap = false;

		if (year % 4 == 0){
			if (year % 100 == 0)
				isLeap = ((year % 400) == 0);
			else
				isLeap = true;
		}

		if (date_type == "month"){
			startDate = year + "-01-01 00:00:00";
			endDate = year + "-12-31 23:59:59";

			var sdt = Math.ceil(new Date(startDate).getTime()/1000);
			var edt = Math.ceil(new Date(endDate).getTime()/1000);

			for (var i = 1; i <= 12; i++)
				ret.data.statistics.push({time:year+"-"+(i<10?("0"+i):i), userCnt:0, roomCnt:0, inAmount:0, outAmount:0});

			db.count_of_users(sdt, edt, function(data){
				if (data == null)
					data = [];

				for (var i = 0; i < data.length; i++){
					var dt = new Date(data[i].createdate * 1000);
					ret.data.statistics[dt.getMonth()].userCnt++
				}

                db.count_of_rooms(sdt,edt,function(data){
                    if (data == null)
                        data = [];

                    for (var i = 0; i < data.length; i++){
                        var dt = new Date(data[i].create_time*1000);

                        ret.data.statistics[dt.getMonth()].roomCnt++
                    }

                    var sdt1 = sdt * 1000;
                    var edt1 = edt * 1000;

                    db.in_of_amount(sdt1, edt1, function(data){
                        if (data == null)
                            data = [];

                        for (var i = 0; i < data.length; i++){
                            var dt = new Date(parseInt(data[i].created_at));

                            ret.data.statistics[dt.getMonth()].inAmount += data[i].total_amount;
                        }

                        db.out_of_amount(sdt,edt,function(data){
                            if (data == null)
                                data = [];

                            for (var i = 0; i < data.length; i++){
                                if(data[i].permit_date > sdt && data[i].permit_date < edt){
                                    var dt = new Date(data[i].permit_date * 1000);

                                    ret.data.statistics[dt.getMonth()].outAmount += data[i].amount;
                                }
                            }

                            ret.code = 0;
                            send(res,ret);
                        });
                    });
                });
			});				
		} else if (date_type == "date"){
			var month = parseInt(date.substring(5));
			var endday = days[month-1];

			if (isLeap && month == 2)
				endday = 29;
			
			for (var i = 1; i <= endday; i++)
				ret.data.statistics.push({time:date+"-"+(i<10?("0"+i):i), userCnt:0, roomCnt:0, inAmount:0, outAmount:0});
			
			startDate = date + "-01 00:00:00";
			endDate = date + "-"+endday+" 23:59:59";

			var sdt = Math.ceil(new Date(startDate).getTime()/1000);
			var edt = Math.ceil(new Date(endDate).getTime()/1000);

			db.count_of_users(sdt, edt, function(data){
				if (data == null)
					data = [];

				for (var i = 0; i < data.length; i++){
					var dt = new Date(data[i].createdate * 1000);

					ret.data.statistics[dt.getDate()-1].userCnt++
				}

				db.count_of_rooms(sdt,edt,function(data){
                    if (data == null)
                        data = [];

                    for (var i= 0; i < data.length; i++){
                        var dt = new Date(data[i].create_time * 1000);
                        ret.data.statistics[dt.getDate()-1].roomCnt++
                    }

                    var sdt1 = sdt * 1000;
                    var edt1 = edt * 1000;

                    db.in_of_amount(sdt1, edt1, function(data){
                        if (data == null)
                            data = [];

                        for (var i = 0; i< data.length; i++){
                            var dt = new Date(parseInt(data[i].created_at));

                            ret.data.statistics[dt.getDate()-1].inAmount += data[i].total_amount;
                        }

                        db.out_of_amount(sdt,edt,function(data){
                            if (data == null)
                                data = [];

                            for (var i = 0; i < data.length; i++){
                                if(data[i].permit_date > sdt && data[i].permit_date < edt){
                                    var dt = new Date(data[i].permit_date * 1000);

                                    ret.data.statistics[dt.getDate()-1].outAmount += data[i].amount;
                                }
                            }

                            ret.code = 0;

                            send(res,ret);
                        });
                    });
                });

            });
		}
	});
});

app.get('/manual_charge_history',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_manual_charge_history(order_by, userId, function(data){
                if (data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);
                    ret.data.list = [];

                    var startNo = (page_no-1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        var temp = data[startNo + i];

                        if (data[startNo + i] != null){
                            ret.data.list.push(temp);
                        }
                    }
                }
                send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/transaction',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_transaction(order_by, userId, function(data){
                if (data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);
                    ret.data.list = [];

                    var startNo = (page_no-1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        var temp = data[startNo + i];

                        if (data[startNo + i] != null){
                 			ret.data.list.push(temp);
                        }
                    }
                }
                send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/agent_bind',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    var nickname = req.query.nickname;

    if (nickname == null)
        nickname = "";

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_agent_bind(order_by, userId, function(data){
                if (data){
                    ret.data.total_count = 0;
                    ret.data.list = [];

                    var startNo = (page_no - 1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        var temp = {};

                        if (data[startNo + i] != null){
                            temp.id = data[startNo + i].id;
                            temp.userid = data[startNo + i].userid;
                            temp.userid_bind = data[startNo + i].userid_bind;
                            temp.status = data[startNo + i].status;
                            temp.request_date = data[startNo + i].request_date;

                            if (temp.userid_bind == userData.userid){
                                ret.data.list.push(temp);
                                ret.data.total_count ++;
                            }
                        }
                    }
                }

                ret.data.page_count = Math.ceil(ret.data.total_count / page_size);

                send(res,ret);
            })
        }
        else{
            send(res,ret);
        }
    })
});
app.get('/update_agent_bind',function(req,res){
    var id = req.query.id;

    db.read_agent_bind_table(id, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data != null && data.length > 0) {
            var userData = data[0];
            var parent_dealer_id=userData.userid;
            var userId=userData.userid_bind;

            // if (data.isvalid != 0 && data.lv == 3){//没封闭，也是终级管理者
            db.update_bind(userId, parent_dealer_id, function(data0){
                if (data0 != null){
                    ret.code = 0;
                    ret.msg = "操作成功";
                    db.update_bind_status(id, function (data1) {
                        if(data1 != null){
                            ret.code = 0;
                            ret.msg = "操作成功";
                        }
                        else
                            ret.msg = "操作失败";
                        send(res,ret);
                    });
                }
                else
                    send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/exist_unallowed_agent_promote_request', function (req, res) {
    var ret = {
        code:1,
        msg:"无法找到用户信息",
        data:{}
    };

    ret.data.exist = false;

    var loginToken = req.query.token;

    if (loginToken == "") {
        send(res, ret);
    }

    db.read_user_account(null, null, loginToken, function(data) {
        if (data == null || data.length == 0){
            send(res, ret);
            return;
        }

        var userData = data[0];

        db.read_agent_promote_unallowed_request_list(userData.userid, function(rows) {
            ret.code = 0;
            ret.msg = "操作成功";

            if (rows =! null && rows.length > 0) {
                ret.data.exist = true;
            }

            send(res, ret);
        });
    });
});

app.get('/agent_promote',function (req, res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no != null && req.query.page_no != "" && req.query.page_no != "NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size ? parseInt(req.query.page_size): 30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res, ret);
            return;
        }

        var userData = data[0];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_agent_promote(order_by, userId, function(data){
                if (data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);
                    ret.data.list = [];

                    var startNo = (page_no-1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        var temp = {};

                        if (data[startNo + i] != null){
                            temp.current_level = data[startNo + i].current_level;
                            temp.rowno = data[startNo + i].rowno;
                            temp.userid = data[startNo + i].userid;
                            temp.request_level = data[startNo + i].request_level;
                            temp.status = data[startNo + i].status;
                            temp.request_date = fromIntToDateString(temp.request_date);
                            temp.headimg = data[startNo+i].headimg;
                            temp.name = data[startNo+i].name;
                            ret.data.list.push(temp);
                        }
                    }
                }
                send(res,ret);
            })
        }
        else{
            send(res,ret);
		}
    })
});

app.get('/update_promote_account',function(req,res){
    var id = req.query.id;
    db.read_agent_account(id, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data != null && data.length > 0) {
            var data = data[0];
            var userId=data.userid;
            var level=data.request_level;

            db.update_promote_account(userId, level, function(data0){
                if (data0){
                    ret.code = 0;
                    ret.msg = "操作成功";

                    db.update_promote_status(id,function (data1) {
                        if(data1){
                            ret.code = 0;
                            ret.msg = "操作成功";
                        }
                        else
                        	ret.msg = "操作失败";

                        send(res,ret);
                    });
                }
                else
                    send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/payment',function (req,res) {
    var loginToken = req.query.token;

    var order_by = req.query.order_by;
    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;
    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    if (loginToken == "")
        loginToken = null;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];
        var level=userData.lv;

        if (userData.isvalid != 0 && userData.lv !=0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_payment(order_by,userId,function(data){
                if (data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);
                    ret.data.list = [];
                    var temp={};

                    var startNo = (page_no-1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        if (data[startNo + i] != null){
                            temp = data[startNo + i];
                            ret.data.list.push(temp);
                        }
                    }
                }

                send(res,ret);
            })
        }
        else{
        	send(res,ret);
		}
    })

});

// allow withdrawal

var paymentTableUpdate = false;
app.get('/update_payment', function (req, res) {
    var id = req.query.id;

    db.read_payment_request(id, function (rows) {
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if(rows == null){
            send(res, ret);
            return;
        }

        if(rows.length == 0){
            send(res, ret);
            return;
        }

        var request = rows[0];

        var userId = request.userid;
        var amount = request.amount;

        db.update_payment_status_to_complete(id, function(rows) {
            if(rows == null)
            {
                send(res, ret);
                return;
            }

            ret.code = 0;
            ret.msg = "操作成功";
            paymentTableUpdate = true;

            console.log("paymentTableUpdate = true");

            send(res,ret);
        });
    })
});

app.get('/is_update_payment', function (req, res) {
    var ret = {
        code:0,
        msg:"无法找到用户信息",
        data:{}
    };

    if( paymentTableUpdate == true ) {
        ret.data.updated = true;

        paymentTableUpdate = false;

        console.log("paymentTableUpdate = false");
    }

    send(res,ret);
});

var paymentRequestTableUpdate = false;

app.get('/user_payment', function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var userId = req.query.userid;

    if (userId == null)
        userId = "";

    db.read_user_account(null, null,loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }
        var userData = data[0];

        if(userData.length !=0 && userData!=null){
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.userid=userData.userid;
            ret.data.valance=userData.valance;

            var dt = new Date(Date.now());
            ret.data.requestDate = dt.Format("yyyy-MM-dd hh:mm:ss");
        }

        send(res,ret);
    });
});


/**
 *  when agent requests the withdrawal.
 */

app.get("/update_table_payment",function (req, res) {
    var userId = req.query.userId;
    var amount = parseFloat(req.query.amount);
    var requestAmount = parseFloat(req.query.requestAmount);
    var requestDate = parseInt(parseInt(Date.now()) / 1000);

    var ret = {
        code:1,
        msg:"操作失败"
    };

    db.get_valance(userId, function (valance) {
        if (valance == null) {
            send(res, ret);
            return;
        }

        if(valance < requestAmount) {
            ret.msg = "你的余额量低于要请量!";
            send(res, ret);
            return;
        }

        valance = valance - requestAmount;

        db.update_users_valance(userId, valance, function (rows) {
            if(rows == null){
                send(res, ret);
                return;
            }

            db.update_user_payment_request(userId, amount, requestAmount, requestDate, function (data) {
                if(data != null){
                    ret.msg = "操作成功";
                    ret.code = 0;
                   // ret.data.valance = valance;

                    paymentRequestTableUpdate = true;

                    console.log("paymentRequestTableUpdate = true");
                }

                send(res, ret);
            });
        });
    });
});

app.get('/is_update_payment_request', function (req, res) {
    var ret = {
        code:0,
        msg:"无法找到用户信息",
        data:{}
    };

    if( paymentRequestTableUpdate == true ) {
        ret.data.updated = true;

        paymentRequestTableUpdate = false;

        console.log("paymentRequestTableUpdate = false");
    }

    send(res,ret);
});

app.get('/user_agent_promote',function(req, res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var userId = req.query.userid;

    if (userId == null)
        userId = "";

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if(userData.length !=0 && userData!=null){
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.userid = userData.userid;
            ret.data.lv = userData.lv;
            var dt = new Date(Date.now());
            ret.data.requestDate=dt.Format("yyyy-MM-dd hh:mm:ss");
        }

        if(userData.lv > 2){
            ret.msg="你已经是终级代理商";
        }

        send(res,ret);
    });
});

app.get('/read_agent_promote_unallowed_request_list',function(req, res){
    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    db.read_agent_promote_unallowed_request_list(userId, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息"
        };

        ret.code = 0;
        ret.msg = "操作成功";
        ret.data = data;

        send(res, ret);
    });
});

app.get("/update_table_promote",function (req,res) {
    var userId = req.query.userId;
    var level = parseInt(req.query.level);
    var requestLevel = parseInt(req.query.requestLevel);
    var requestDate = parseInt(parseInt(Date.now())/1000);

    var ret = {
        code:1,
        msg:"操作失败"
    };

    db.update_user_promote_request(userId, level, requestLevel, requestDate, function (data) {
        if(data != null){
            ret.msg = "操作成功";
            ret.code = 0;
        }

        send(res,ret);
    });
});

// from agent page 's 下级代理商绑定 menu

app.get('/user_agent_bind',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    var nickname = req.query.nickname;

    if (nickname == null)
        nickname = "";

    db.read_user_account(null, null,loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        var total = {};

        total.list = [];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_user_list(userData.account, order_by, userId, nickname, 1, function(data){
                if (data){
                    for (var i = 0; i < data.length; i++){
                        if (data[i] != null && data[i].lv < userData.lv){
                            if(data[i].parent_dealer_id == null){
                                total.list.push(data[i]);
                            }
                        }
                    }

                    ret.data.total_count = total.list.length;
                    ret.data.page_count = Math.ceil(total.list.length / page_size);
                    ret.data.list = [];

                    var startNo = (page_no-1) * page_size;

                    for(var j = 0; j < page_size; j++){
                        if(total.list[startNo + j] != null){
                            var temp = {};

                            temp = total.list[startNo + j];
                            temp.createdate = fromIntToDateString(temp.createdate);
                            temp.onlinedate = fromIntToDateString(temp.onlinedate);
                            temp.dealer_become_time = "";

                            if(temp.lv > 0){
                                temp.dealer_become_time = fromIntToDateString(temp.dealer_become_time);
                            }

                            ret.data.list.push(temp);
                        }
                    }
                    send(res,ret);
                }
                else
                    send(res,ret);
            })
        }
        else
            send(res,ret);
    })

});

app.get('/exist_agent_bind_request', function(req, res){
    var try_userId = req.query.try_userId;
    var userid = req.query.userId;

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    db.exist_agent_bind_request(try_userId, userid, function (exist) {
        if(exist) {
            ret.data.exist = false;
        }
        else   {
            ret.data.exist = true;
        }

        ret.code = 0;

        send(res, ret);
    });
});

app.get('/update_table_agent_bind',function(req,res){
    var userId = req.query.userId;
    var token = req.query.token;

    db.read_user_account(null, null,token, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data != null && data.length > 0) {
            var data = data[0];
            var requestDate = parseInt(parseInt(Date.now())/1000);

            db.update_user_bind_request(userId, data.userid, requestDate, function(data){
                if (data){
                    ret.code = 0;
                    ret.msg = "操作成功";
                }
                else
                    ret.msg = "操作失败";

                send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/user_below_agent',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var nickname = req.query.nickname;

    if (nickname == null)
        nickname = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    db.read_user_account(null, null,loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        var total = {};
        total.list = [];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_user_list(userData.account, order_by, userId, nickname, 1, function(data){
                if (data){
                    for (var i = 0; i < data.length; i++){
                        if (data[i] != null && data[i].parent_dealer_id == userData.userid){
                            total.list.push(data[i]);
                        }
                    }

                    ret.data.total_count = total.list.length;
                    ret.data.page_count = Math.ceil(total.list.length / page_size);

                    var startNo = (page_no-1) * page_size;
                    ret.data.list = [];

                    for (var j = 0; j < page_size; j++){
                        if (total.list[startNo+j] != null){
                            var temp = {};

                            temp = total.list[startNo+i];
                            temp.createdate = fromIntToDateString(temp.createdate);
                            temp.onlinedate = fromIntToDateString(temp.onlinedate);
                            temp.dealer_become_time = "";

                            if(temp.lv > 0){
                                temp.dealer_become_time = fromIntToDateString(temp.dealer_become_time);
                            }

                            ret.data.list.push(temp);
                        }
                    }

                    if(ret.data.list.length == 0){
                        ret.msg = "你没有下级代理商.";
                    }

                    send(res,ret);
                }
                else
                    send(res,ret);
            })
        }
        else
            send(res,ret);
    })
});

app.get('/user_transaction',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    //noinspection JSUnresolvedVariable
    var order_by = req.query.order_by;

    if (order_by == null){
        //noinspection JSUnusedAssignment
        order_by = "";
    }

    var userId = req.query.userId;

    if (userId == null) {
        //noinspection JSUnusedAssignment
       userId = "";
    }

    var page_no = 1;

    if (req.query.page_no != null && req.query.page_no != "" && req.query.page_no != "NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size ? parseInt(req.query.page_size): 30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res, ret);
            return;
        }

        var userData = data[0];

        ret.data.list = [];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_dealer_profit(function(data){
                if(data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);

                    var startNo = (page_no - 1) * page_size;

                    for(var i = startNo; i < startNo + page_size; i++){

                        if(i >= data.length) {
                            break;
                        }

                        var temp = {};

                        try{
                            temp.time = fromIntToDateString(data[i].time);
                            temp.provider_id = data[i].provider_id;
                            temp.id = data[i].id;
                            temp.dealer_id = data[i].dealer_id;
                            temp.amount = data[i].amount;
                            temp.charge_amount = data[i].charge_amount;
                            temp.lv = data[i].lv;
                            temp.headimg = data[i].headimg;
                            temp.name = data[i].name;
                        }
                        catch(e){}

                        ret.data.list.push(temp);
                    }

                    send(res,ret);
                }
            })
        }
        else
            send(res, ret);
    });
});

app.get('/agent_detail',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var userId = req.query.userid;

    if (userId == null)
        userId = "";

    db.read_agent(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        if (data != null && data.length > 0) {
            var temp = {};

            temp.headimg = data[0].headimg;
            temp.userid = data[0].userid;
            temp.name = data[0].name;
            temp.dealer_become_time = fromIntToDateString(temp.dealer_become_time);

            temp.lv = data[0].lv;
            temp.valance = data[0].valance;
            temp.parent_dealer_id = data[0].parent_dealer_id;

            if (data[0].isvalid != 0 && data[0].lv != 0){//没封闭，也能登录到后台的账号？
                ret.code = 0;
                ret.msg = "login success";
                ret.data.token = crypto.md5(data[0].id + data[0].pwd + data[0].userid + config.ACCOUNT_PRI_KEY);

                if (loginToken == null)
                    db.update_token(data[0].account, ret.data.token);

                db.read_link_users(data[0].userid,function(data1){
                    if(data1){
                        temp.num_link_user = data1.length;
                    }
                    else {
                        temp.num_link_user = 0;
                    }

                    db.read_below_agent(data[0].userid,function(data2){
                        if(data2){
                            temp.num_below_agent = data2.length;
                        }
                        else {
                            temp.num_below_agent = 0;
                        }

                        db.get_parent_agent(data[0].parent_dealer_id,function(data0){
                            if(data0 && data0.length > 0){
                                temp.up_headimg = data0[0].headimg;
                                temp.name_up_agent = data0[0].name;
                                temp.id_up_agent = data0[0].userid;
                            }
                            else{
                                temp.up_headimg = "";
                                temp.name_up_agent = "";
                                temp.id_up_agent = null;
                            }

                            data.name = data.lv==4?"管理者":data.name;
                            ret.data = temp;
                            send(res,ret);
                        });
                    });

                });
            }
        }
    });
});

app.get('/agent_login',function(req,res){
    var loginId = req.query.id;
    var loginPwd = req.query.password;
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    db.read_agent(loginId, loginPwd, loginToken, function(data){
        var ret = {
            code:1,
            msg:"请输入正确的登录账号和密码",
            time:Date.now(),
            data:{}
        };

        if (data != null && data.length > 0) {
            var temp = {};

            temp.headimg = data[0].headimg;
            temp.userid = data[0].userid;
            temp.name = data[0].name;
            temp.dealer_become_time = fromIntToDateString(temp.dealer_become_time);
            temp.lv = data[0].lv;
            temp.valance = data[0].valance;
            temp.parent_dealer_id = data[0].parent_dealer_id;

            if (data[0].isvalid != 0 && data[0].lv > 0 && data[0].lv < 4 ){//没封闭，也能登录到后台的账号？
                ret.code = 0;
                ret.msg = "login success";
                ret.data.token = crypto.md5(data[0].id + data[0].pwd + data[0].userid + config.ACCOUNT_PRI_KEY);

                if (loginToken == null)
                    db.update_token(data[0].account, ret.data.token);

                db.read_link_users(data[0].userid, function(data1){
                    if(data1){
                        temp.num_link_user = data1.length;
                    }
                    else {
                        temp.num_link_user = 0;
                    }

                    db.read_below_agent(data[0].userid, function(data2){
                        if(data2){
                            temp.num_below_agent = data2.length;
                        }
                        else {
                            temp.num_below_agent = 0;
                        }

                        db.get_parent_agent(data[0].parent_dealer_id, function(data0){
                            if(data0 && data0.length > 0){
                                temp.up_headimg = data0[0].headimg;
                                temp.name_up_agent = data0[0].name;
                                temp.id_up_agent = data0[0].userid;
                            }
                            else{
                                temp.up_headimg = "";
                                temp.name_up_agent = "";
                                temp.id_up_agent = null;
                            }

                            ret.data.userInfo = temp;
                            ret.data.userInfo.name = temp.lv == 4 ? "管理者": temp.name;

                            send(res,ret);
                        });
                    });
                });
            }
            else {
                send(res,ret);
            }
        }
        else {
            send(res, ret);
        }
    });
});

app.get('/agent_user_list',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var nickname = req.query.nickname;

    if (nickname == null)
        nickname = "";

    var level = req.query.level;

    if (level == null)
        level = "";

    var page_no = 1;

    if (req.query.page_no != null && req.query.page_no != "" && req.query.page_no != "NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size ? parseInt(req.query.page_size): 30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_agent_user_list(userData.userid, order_by, userId, nickname, level, function(data){
                if (data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);
                    ret.data.list = [];

                    var startNo = (page_no-1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        if (data[startNo + i] != null){
                            var temp = {};
                            temp = data[startNo + i];

                            if(level == 0){
                                temp.createdate = fromIntToDateString(temp.createdate);
                                temp.onlinedate = fromIntToDateString(temp.onlinedate);

                                if(temp.lv > 0){
                                    temp.dealer_become_time = fromIntToDateString(temp.dealer_become_time);
                                }
                                else{
                                    temp.dealer_become_time = "";
                                }

                                if(temp.dealer_id > 0){
                                    temp.dealer_id_input_time = fromIntToDateString(temp.dealer_id_input_time);
                                }
                                else{
                                    temp.dealer_id_input_time = "";
                                }
                            }

                            if(level == 1){
                                if(temp.permit_date != null){
                                    temp.permit_date = fromIntToDateString(temp.permit_date);
                                }
                                else{
                                    temp.permit_date="";
                                }
                            }

                            temp.name = (temp.lv == 4) ? "管理者":temp.name;

                            ret.data.list.push(temp);
                        }
                    }
                }
                send(res,ret);
            });
        }
        else
            send(res,ret);
    });
});

app.get('/agent_transaction',function (req,res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no != null && req.query.page_no != "" && req.query.page_no != "NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size ? parseInt(req.query.page_size): 30;

    db.read_user_account(null, null, loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];
        ret.data.list = [];

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_agent_profit(userData.userid, order_by, function(data){
                if(data){
                    for(var i = 0; i < data.length; i++){
                        var temp = {};

                        temp = data[i];
                        temp.time = fromIntToDateString(temp.time);
                        ret.data.list.push(temp);
                    }
                    send(res,ret);
                }
                else
                    send(res,ret);
            });
        }
        else
            send(res,ret);
    });

});

/**
 * from agent 's 提现记录
 */

app.get('/agent_payment',function (req, res) {
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var userId = req.query.userId;

    if (userId == null)
        userId = "";

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    db.read_user_account(null, null,loginToken, function(data){
        var ret = {
            code:1,
            msg:"无法找到用户信息",
            time:new Date(),
            data:{}
        };

        if (data == null || data.length == 0){
            send(res,ret);
            return;
        }

        var userData = data[0];
        var level = userData.lv;

        if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
            ret.code = 0;
            ret.msg = "操作成功";
            ret.data.page_no = page_no;
            ret.data.page_size = page_size;

            db.read_agent_payment(userData.userid, order_by, function(data){
                if (data){
                    ret.data.total_count = data.length;
                    ret.data.page_count = Math.ceil(data.length / page_size);
                    ret.data.list = [];

                    var temp = {};
                    var startNo = (page_no-1) * page_size;

                    for (var i = 0; i < page_size; i++){
                        if (data[startNo + i] != null){
                            temp = data[startNo + i];
                            temp.request_date = fromIntToDateString(temp.request_date);

                            if(temp.status == 1){
                                temp.permit_date = fromIntToDateString(temp.permit_date);
                            }
                            else{
                                temp.permit_date = "";
                            }

                            ret.data.list.push(temp);
                        }
                    }
                }
                send(res,ret);
            })
        }
        else{
            send(res,ret);
        }
    })
});

app.get('/destroy_empty_rooms',function (req, res) {
    http.get(config.GAME_SERVER_IP, config.GAME_HTTP_PORT, "/destroy_empty_rooms", null, function(success, data){
        var ret = {
            code:1,
            msg:"操作失败",
            data:{}
        };

        if (success) {
            ret.code = 0;
            ret.data.count = data.count;
            send(res, ret);
        }
        else {
            send(res, ret);
        }
    });
});