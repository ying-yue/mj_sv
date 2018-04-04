var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var logger = require('../utils/logger');
var Global = require('../utils/Global');
var app = express();


let creatingRooms = {};

let REN_SHU = [4,3,3,2];
let JU_SHU = [4,8,12];
let GANG_FEN = [1,2,4];

let ROOM_STATE_EMPTY = 0;
let ROOM_STATE_GAME_STARTING = 1;
let ROOM_STATE_SUCCESS_FINISHED = 2;
let ROOM_STATE_STRONG = 3;
let ROOM_STATE_UNSUCCESS_FINISHED = 4;
let ROOM_STATE_CREATED = 5;
let ROOM_STATE_FAILD = 6;
let SeatCount = 0;

function send(res,ret){
	var str = JSON.stringify(ret);
	try{
        res.send(str)
    }
    catch (e){
        console.log(e.stack);
    }

}

function fromIntToDateString(val) {
    if (val == null)
        return "";

    if (val == 0) {
        return "";
    }

    var date = new Date(val);

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
    var loginId = null;
    if(req.query.id != null){
        loginId = crypto.toBase64(req.query.id);
    }

    var loginPwd = req.query.password;
    var loginToken = req.query.token;
    // loginToken = null;

    if (loginToken == "")
        loginToken = null;

    db.read_user_account(loginId, loginPwd, loginToken, function(data){
        var ret = {
            code:1,
            msg:"请输入正确的登录账号和密码",
            time:Date.now(),
            level: 2,
            data:{}
        };

        if (data != null && data.length > 0) {
            var data = data[0];

            ret.code = 0;
            ret.msg = "login success";
            ret.level = data.level;
            ret.data.token = crypto.md5(data.id + data.password + data.name);


            if (loginToken == null)
                db.update_token_managers(data.id, ret.data.token);

            ret.data.userInfo = data;
            ret.data.userInfo.name = crypto.fromBase64(ret.data.userInfo.name);
        }

        send(res,ret);
    });
});

app.get('/dealer_detail',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var id = req.query.id;

    if (id == null)
        id = "";

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    // if (data == null || data.length == 0){
    //     send(res,ret);
    //     return;
    // }

    // if (id == "" ) {
    //     id = userData.id;
    // }

    db.read_dealer_info(id, function(data){
        ret.msg = "操作失败";
        if (data && data.length > 0){
            var data = data[0];

            ret.code = 0;
            ret.msg = "操作成功";

            // if (data.id != id && userData.lv == 1){//初级管理者
            //     if (data.lv != 0){
            //         data.id = "*****";
            //         data.pwd = "*****";
            //     }
            //     else {
            //         data.id = "";
            //         data.pwd = "";
            //     }
            //
            //     if (data.roomid != "")
            //         data.roomid = "*****";
            //
            //     data.account = "*****";
            // }
            //
            // data.name = data.lv==4 ? "管理者":data.name;
            ret.data = data;
            ret.data.name = crypto.fromBase64(ret.data.name);
            ret.data.weixin_id = crypto.fromBase64(ret.data.weixin_id);

        }

        send(res,ret);
    });



});

app.get('/add_dealer',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var region = req.query.region;
    var password = req.query.password;
    var dealer_type = req.query.dealer_type;
    var name = req.query.name;
    var phone_number = req.query.phone_number;
    var weixin_id = req.query.weixin_id;

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    var add_data = {
        password: password,
        region: region,
        dealer_type: dealer_type,
        name: name,
        phone_number: phone_number,
        weixin_id: weixin_id
    };

    db.get_dealer(name, phone_number, weixin_id, function(r_data){
        ret.msg = "操作失败";
        if (r_data && r_data.length > 0) {
            ret.msg = "Duplicate dealer";
            send(res,ret);
        }
        else{
            db.dealer_add(add_data, function(data){
                ret.msg = "操作失败";
                if (data){

                    ret.code = 0;
                    ret.msg = "操作成功";
                }
                send(res,ret);


            });
        }


    });






});

app.get('/dealer_list',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var id = req.query.id;

    if (id == null)
        id = "";

    var name = req.query.name;

    if (name == null)
        name = "";

    var level = req.query.level;

    if (level == null)
        level = 1;

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    db.read_dealer_account(null, null,loginToken, function(data){
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

        // ret.code = 1;
        // ret.msg = "操作失败";
        ret.data.page_no = page_no;
        ret.data.page_size = page_size;

        db.dealer_list(order_by, id, name,level, function(data){
            if (data){
                ret.data.total_count = data.length;
                ret.data.page_count = Math.ceil(data.length / page_size);
                ret.data.list = [];

                var startNo = (page_no-1) * page_size;

                for (var i = 0; i< page_size; i++){
                    if (data[startNo + i] != null){
                        var temp = {};

                        temp = data[startNo + i];
                        temp.date_created = fromIntToDateString(temp.date_created);
                        temp.date_modified = fromIntToDateString(temp.date_modified);
                        // temp.name = (temp.lv == 4) ? "管理者" : temp.name;

                        ret.data.list.push(temp);
                    }
                }

                ret.code = 0;
                ret.msg = '操作成功';
            }
            send(res,ret);
        });
    });
});


app.get('/room_list',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var id = req.query.id;

    if (id == null)
        id = "";

    var name = req.query.name;

    if (name == null)
        name = "";

    var level = req.query.level;

    if (level == null)
        level = 1;

    var page_no = 1;

    if (req.query.page_no!=null && req.query.page_no!="" && req.query.page_no!="NaN")
        page_no = parseInt(req.query.page_no);

    var page_size = req.query.page_size?parseInt(req.query.page_size):30;

    db.read_dealer_account(null, null,loginToken, function(data){
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

        var dealer_level = data[0].level;
        var dealer_id = data[0].id;


        // ret.code = 1;
        // ret.msg = "操作失败";
        ret.data.page_no = page_no;
        ret.data.page_size = page_size;

        db.room_list(order_by, id, name,level, dealer_id, dealer_level, function(data){
            if (data){
                ret.data.total_count = data.length;
                ret.data.page_count = Math.ceil(data.length / page_size);
                ret.data.list = [];

                var startNo = (page_no-1) * page_size;

                for (var i = 0; i< page_size; i++){
                    if (data[startNo + i] != null){
                        var temp = {};

                        temp = data[startNo + i];
                        // temp.date_created = fromIntToDateString(temp.date_created);
                        // temp.date_modified = fromIntToDateString(temp.date_modified);
                        // temp.name = (temp.lv == 4) ? "管理者" : temp.name;
                        var base_info_data = JSON.parse(temp.base_info);
                        var result_data = {
                            'uuid': temp.uuid,
                            'dealer_id': temp.dealer_id,
                            'room_id': temp.id,
                            'game_method': '',
                            'jushu': base_info_data.maxGames,
                            'mj_type': base_info_data.mahjongtype,
                            'renshu': base_info_data.renshu,
                            'room_key_count': 0,
                            'max_pan': '',
                            'hongdian':base_info_data.hongdian,
                            'piaohu': base_info_data.piaohu,
                            'qidui': base_info_data.qidui4 || base_info_data.qidui8,
                            'yise': base_info_data.yise,
                            'total_jushu': base_info_data.maxGames,
                            'current_jushu': 0,
                            'room_create_time': fromIntToDateString(temp.create_time * 1000),
                            'game_start_time': fromIntToDateString(temp.game_start_time),
                            'game_end_time': fromIntToDateString(temp.game_start_time),
                            'room_status': temp.room_state,
                            'room_key_status': ''


                        };

                        ret.data.list.push(result_data);

                    }
                }

                ret.code = 0;
                ret.msg = '操作成功';
            }
            send(res,ret);
        });
    });
});


app.get('/create_empty_rooms',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == ""){
        send(res,{
            code:1,
            msg:"no token",
            time:new Date(),
            data:{}
        });
        return;
        // loginToken = null;
    }


    var room_count = req.query.room_count;

    if (room_count == null || room_count == '')
        room_count = 1;

    if (req.query.mj_type == '北京麻将')
        req.query.mj_type = 0;
    else
        req.query.mj_type = 1;

    if (req.query.jushu == '4局')
        req.query.jushu = 0;
    else if((req.query.jushu == '8局'))
        req.query.jushu = 1;
    else
        req.query.jushu = 2;

    if (req.query.renshu == '4人')
        req.query.renshu = 0;
    else if((req.query.renshu == '3人'))
        req.query.renshu = 1;
    else if((req.query.renshu == '3人(去条)'))
        req.query.renshu = 2;
    else
        req.query.renshu = 3;

    db.read_dealer_account(null, null,loginToken, function(data){
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

        var dealer_id = data[0].id;
        var dealer_name = data[0].name;

        req.query.dealer_id = dealer_id;

        let onCreate = function(res1, ret){
            var ret1 = {
                code:1,
                msg:"no data",
                time:new Date(),
                data:{}
            };

            if(ret){
                ret1.code = 0;
                ret1.msg = "操作成功";
            }
            send(res,ret1);
        };


        createRoom(dealer_name, req.query, 0, '', '', room_count, onCreate);
    });
});


function generateRoomId(){
    let roomId = "";
    for(let i = 0; i < 6; ++i){
        if(i == 0){
            while (true){
                roomId = '';
                //여기서 방번호를 생성하는것은 dealer 들이므로 첫번호가 2보다 크게 고정한다.
                roomId += Math.floor(Math.random()*10);
                if(parseInt(roomId) < 2 || parseInt(roomId) > 9){
                    continue;
                }
                else
                    break;
            }
            continue;
        }

        roomId += Math.floor(Math.random()*10);
    }
    return roomId;
};

function createRoom(creator,roomConf,gems,ip,port, room_count, callback){
    if(
        roomConf.type == null
        || roomConf.jushu == null
        || roomConf.renshu == null
        || roomConf.hongdian == null
        || roomConf.piaohu == null
        || roomConf.qidui4 == null
        || roomConf.qidui8 == null
        || roomConf.yise == null
        || roomConf.tinghoufeigang == null
        || roomConf.mahjongtype == null
        || roomConf.bubaibalzhung == null){

        console.log('roomConf.type: xzdd');// + roomConf.type);
        console.log('roomConf.jushu: ' + roomConf.jushu);
        console.log('roomConf.renshu: ' + roomConf.renshu);
        console.log('roomConf.hongdian: ' + roomConf.hongdian);
        console.log('roomConf.piaohu: ' + roomConf.piaohu);
        console.log('roomConf.qidui4: ' + roomConf.qidui4);
        console.log('roomConf.qidui8: ' + roomConf.qidui8);
        console.log('roomConf.yise: ' + roomConf.yise);
        console.log('roomConf.tinghoufeigang: ' + roomConf.tinghoufeigang);
        console.log('roomConf.mahjongtype: ' + roomConf.mahjongtype);
        console.log('roomConf.jewel_count: ' + roomConf.jewel_count);
        console.log('roomConf.bubaibalzhung: ' + roomConf.bubaibalzhung);

        callback(null);
    }

    let fnCreate = function(){

        var really_created_room_count = 0;

        for(var n = 0; n < room_count; n++) {
            let roomId = generateRoomId();
            var ret = {
                code: 1,
                msg: "无法找到用户信息",
                time: new Date(),
                data: {}
            };

            http.get('127.0.0.1', config.GAME_HTTP_PORT, "/get_rooms_ids", {creator: creator}, function (ret1, data) {
                //console.log(data);
                if (ret1) {
                    if (data[roomId] != null || creatingRooms[roomId] != null) {
                        fnCreate();
                    }
                    else {
                        creatingRooms[roomId] = true;
                        db.is_room_exist(roomId, function (ret) {

                            if (ret) {
                                delete creatingRooms[roomId];
                                fnCreate();
                            }
                            else {
                                let createTime = Math.ceil(Date.now() / 1000);
                                let baseScore = 2;

                                let roomInfo = {
                                    uuid: "",
                                    id: roomId,
                                    numOfGames: 0,
                                    createTime: createTime,
                                    nextButton: 0,
                                    seats: [],
                                    conf: {
                                        type: roomConf.type,
                                        dealer_id: roomConf.dealer_id,
                                        baseScore: baseScore,
                                        maxGames: JU_SHU[roomConf.jushu],
                                        renshu: roomConf.renshu,
                                        playerCount: REN_SHU[roomConf.renshu],
                                        hongdian: roomConf.hongdian,
                                        piaohu: roomConf.piaohu,
                                        qidui4: roomConf.qidui4,
                                        qidui8: roomConf.qidui8,
                                        yise: roomConf.yise,
                                        tinghoufeigang: roomConf.tinghoufeigang,
                                        bubaibalzhung: roomConf.bubaibalzhung,
                                        mahjongtype: roomConf.mahjongtype,
                                        jewel_count: roomConf.jewel_count,
                                        creator: creator,
                                    }
                                };

                                SeatCount = REN_SHU[roomConf.renshu];

                                if (roomConf.type == "xlch") {
                                    roomInfo.gameMgr = require("./gamemgr_xlch");
                                }
                                else {
                                    roomInfo.gameMgr = require("../majiang_server/gamemgr_xzdd");
                                }


                                for (let i = 0; i < SeatCount; ++i) {
                                    roomInfo.seats.push({
                                        userId: 0,
                                        score: 0,
                                        name: "",
                                        ready: false,
                                        seatIndex: i,
                                        numZiMo: 0,
                                        numJiePao: 0,
                                        numDianPao: 0,
                                        numAnGang: 0,
                                        numMingGang: 0,
                                        numChaJiao: 0,
                                    });
                                }


                                //写入数据库
                                let conf = roomInfo.conf;


                                db.create_room(roomInfo.id, roomInfo.conf, ip, port, createTime, function (uuid, error) {
                                    delete creatingRooms[roomId];
                                    if (uuid != null) {
                                        really_created_room_count++;

                                        roomInfo.uuid = uuid;
                                        http.get(config.GAME_SERVER_IP,
                                            config.GAME_HTTP_PORT,
                                            "/add_roominfo_in_rooms",
                                            {roomId: roomId, roomInfo: roomInfo}, function (ret1, data) {
                                                logger.info(`Room(${roomId}) is created. This room's conf is ${roomInfo.conf}.`, roomId);
                                                if (really_created_room_count == room_count) {
                                                    callback(0, roomId);
                                                }

                                            });


                                    }
                                    else {
                                        let errStr = '';
                                        if (typeof error == 'string') {
                                            errStr = error;
                                        }
                                        else if (typeof error == 'object') {
                                            errStr = JSON.stringify(error);
                                        }
                                        logger.error(`Room(${roomId}) is not created. Error is ${errStr}.`, roomId);
                                        callback(3, null);
                                        throw errStr;
                                    }
                                });


                            }
                        });
                    }
                    return;
                }
                else {
                    ret.code = 1;
                    ret.msg = data.stack;

                    callback(ret)
                }


            });
        }
    };

    fnCreate();
};