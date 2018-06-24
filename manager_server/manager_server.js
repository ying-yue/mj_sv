var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/db');
var http = require("../utils/http");
var logger = require('../utils/logger');
var Global = require('../utils/Global');
var app = express();


var creatingRooms = {};

var REN_SHU = [4,3,3,2];
var JU_SHU = [4,8,12];
var GANG_FEN = [1,2,4];

var ROOM_STATE_EMPTY = 0;
var ROOM_STATE_GAME_STARTING = 1;
var ROOM_STATE_SUCCESS_FINISHED = 2;
var ROOM_STATE_STRONG = 3;
var ROOM_STATE_UNSUCCESS_FINISHED = 4;
var ROOM_STATE_CREATED = 5;
var ROOM_STATE_FAILD = 6;
var SeatCount = 0;


var SELLER_NAME_SEARCH = 1;
var ALL_SEARCH =0;
var BUYER_NAME_SEARCH = 2;
var DATE_SEARCH_TODAY = 3;
var DATE_SEARCH_LAST_7 = 4;
var DATE_SEARCH_THIS_MONTH = 5;
var DATE_SEARCH_THIS_YEAR = 6;

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

    if (val == null || val == "")
        return "";

    if (val == 0) {
        return "";
    }
    val = parseInt(val);

    var date = new Date(val * 1000);

    return date.Format("yyyy-MM-dd hh:mm:ss");
}

function checkConditionOfDate(search_id, purchase_date){
    search_id = parseInt(search_id);
    var current_date = new Date();
    var current_year = current_date.getFullYear();
    var current_month = current_date.getMonth();
    var current_day = current_date.getDate();

    var search_year = current_year;
    var search_month = current_month;
    var search_date = current_day;

    switch (search_id){
        case DATE_SEARCH_TODAY:
            search_date = current_day - 1;
            break;
        case DATE_SEARCH_LAST_7:
            search_date = current_day - 7;
            break;
        case DATE_SEARCH_THIS_MONTH:
            search_date = 1;
            break;
        case DATE_SEARCH_THIS_YEAR:
            search_month = 0;
            search_date = 1;
            break;
        default:
            return true;
    }

    var diff_millisec = current_date - new Date(search_year, search_month, search_date);

    if(diff_millisec >= Date.now() - purchase_date * 1000){
        return true;
    }
    return false;
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
    var other_id = req.query.other_id;
    var phone_number = req.query.phone_number;

    if (id == null)
        id = "";

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };


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

        db.read_dealer_info({dealer_id:dealer_id, other_id: other_id, phone_number: phone_number}, function(data){
            ret.msg = "操作失败";
            if (data){

                ret.code = 0;
                ret.msg = "操作成功";

                ret.data = data;
                if(dealer_id == 1){
                    ret.data.room_count_useable = '非';
                    ret.data.dealer_type = 'Admin';
                }
                else{
                    if(ret.data.dealer_type == 1)
                        ret.data.dealer_type = '普通代理';
                    else
                        ret.data.dealer_type = '高级代理';
                }


                // db.purchase_list_with_dealer_id(dealer_id, 0, function(rows){
                //     if (rows){
                //         ret.code = 0;
                //         ret.msg = "操作成功";
                //
                //         var room_count_saled = 0;
                //         for(var i = 0; i < rows.length; i++){
                //             var row = rows[i];
                //             room_count_saled += row.room_count_purchased;
                //         }
                //
                //         ret.data.room_count_used = room_count_saled;
                //     }
                //
                //     send(res,ret);
                // });

            }
            send(res,ret);
        });
    });
});

app.get('/player_detail',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var id = req.query.id;
    var user_id = req.query.user_id;

    if (id == null)
        id = "";

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

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

        db.get_user_data_by_userid(user_id, function(data){
            ret.msg = "操作失败";
            if (data){

                ret.code = 0;
                ret.msg = "操作成功";

                // data.name = crypto.fromBase64(data.name);

                ret.data = data;
            }

            send(res,ret);
        });
    });
});

app.get('/charge_room_cards',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var room_count_to_charge = req.query.room_count_to_charge;
    var other_id = req.query.other_id;
    var sale_type = req.query.sale_type;

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

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

        var useable_room_count = parseInt(data[0].room_count_useable);
        if(useable_room_count < parseInt(room_count_to_charge) && dealer_id != 1){
            ret.code = 1;
            ret.msg = 'too many room_count_to_charge!';
            send(res,ret);
            return;
        }

        if(parseInt(sale_type) == 0){
            db.update_managers_info({phone_number:other_id, room_count_added:room_count_to_charge}, function (d) {
                if(d){
                    db.update_managers_info({id:dealer_id, room_count_added:room_count_to_charge * (-1)}, function (d1) {
                        if(d1){
                            db.insert_data_in_purchase({from_id:dealer_id, to_id: other_id, room_count_added:room_count_to_charge, sale_type: parseInt(sale_type)}, function (d3) {
                                if(d3) {
                                    ret.code = 0;
                                    ret.msg = '操作成功';
                                }
                                send(res,ret);
                            });
                            // db.change_dealer_in_room_table({from_id:dealer_id, to_id: other_id, room_count_added:room_count_to_charge}, function (d2) {
                            //     if(d2) {
                            //
                            //     }
                            //     else{
                            //         send(res,ret);
                            //     }
                            //
                            // });
                        }
                        else{
                            send(res,ret);
                        }

                    });

                }
                else{
                    send(res,ret);
                }

            });
        }
        else{
            db.update_managers_info({id:dealer_id, room_count_added:room_count_to_charge * (-1)}, function (d1) {
                if(d1){
                    db.update_user_gem_and_charge_amount(other_id, room_count_to_charge, null, function (d3) {
                        if(d3) {
                            db.insert_data_in_purchase({from_id:dealer_id, to_id: other_id, room_count_added:room_count_to_charge, sale_type: parseInt(sale_type)}, function (d1) {
                                if (d1) {
                                    ret.code = 0;
                                    ret.msg = '操作成功';
                                }
                                send(res,ret);
                            });

                        }
                        else{
                            send(res,ret);
                        }

                    });
                    // db.change_dealer_in_room_table({from_id:dealer_id, to_id: 0, room_count_added:room_count_to_charge}, function (d2) {
                    //     if(d2) {
                    //         var room_id_list = d2;
                    //
                    //     }
                    //     else{
                    //         send(res,ret);
                    //     }
                    //
                    // });
                }
                else{
                    send(res,ret);
                }

            });
        }


    });
});

app.get('/room_detail',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var uuid = req.query.uuid;



    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    if (uuid == null || uuid == ''){
        send(res,ret);
        return;
    }

    db.room_detail_info(uuid, function(data){
        ret.msg = "操作失败";
        if (data){
            ret.code = 0;
            ret.msg = "操作成功";

            ret.data = data;
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
    var is_edit = req.query.is_edit;
    var id = req.query.id;

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


    db.read_dealer_account(null, null,loginToken, function(data) {
        var ret = {
            code: 1,
            msg: "无法找到用户信息",
            time: new Date(),
            data: {}
        };

        if (data == null || data.length == 0) {
            send(res, ret);
            return;
        }

        var register_dealer_id = data[0].id;
        db.get_dealer(name, phone_number, weixin_id, function(r_data){
            ret.msg = "操作失败";
            if (!is_edit && r_data && r_data.length > 0) {
                ret.msg = "Duplicate dealer";
                send(res,ret);
            }
            else{
                if(is_edit){
                    db.dealer_update(add_data, id, function(ret_data){
                        ret.msg = "操作失败";
                        if (ret_data){

                            ret.code = 0;
                            ret.msg = "操作成功";
                        }
                        send(res,ret);


                    });
                }
                else{
                    db.dealer_add(add_data, register_dealer_id, function(ret_data){
                        ret.msg = "操作失败";
                        if (ret_data){

                            ret.code = 0;
                            ret.msg = "操作成功";
                        }
                        send(res,ret);


                    });
                }

            }


        });
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
        var register_dealer_id = data[0].id;

        db.dealer_list(order_by, id, name,level, register_dealer_id, function(data){
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
                        if(temp.dealer_type == 1)
                            temp.dealer_type = '普通代理';
                        else
                            temp.dealer_type = '高级代理';
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

                var total_used_room_count = 0;
                var total_remain_room_count = 0;

                for (var i = 0; i< data.length; i++){
                    var temp = {};
                    temp = data[i];


                    if(temp.room_state != 0)
                        total_used_room_count++;
                    else{
                        total_remain_room_count++;
                    }
                }

                ret.data.total_room_count = data.length;
                ret.data.total_used_room_count = total_used_room_count;
                ret.data.total_remain_room_count = total_remain_room_count;


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
                            'current_jushu': temp.current_jushu,
                            'room_create_time': fromIntToDateString(temp.create_time),
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

app.get('/purchase_list',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var id = req.query.id;

    if (id == null)
        id = "";

    var search_id = req.query.search_id;

    var seller_name = req.query.seller_name;
    if (seller_name == null || search_id != SELLER_NAME_SEARCH)
        seller_name = "";
    var buyer_name = req.query.buyer_name;

    if (buyer_name == null || search_id != BUYER_NAME_SEARCH)
        buyer_name = "";

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

        var query_data = {
            order_by: order_by,
            id: id,
            seller_name: seller_name,
            buyer_name: buyer_name,
            dealer_id: dealer_id,
            dealer_level: dealer_level
        };

        db.purchase_list(query_data, function(data){
            if (data){
                ret.data.total_count = data.length;
                ret.data.page_count = Math.ceil(data.length / page_size);
                ret.data.list = [];

                var startNo = (page_no-1) * page_size;

                for (var i = 0; i< page_size; i++){
                    if (data[startNo + i] != null){
                        var temp = {};

                        temp = data[startNo + i];

                        if(temp.payment_status == 1){
                            temp.payment_status = "支付";
                        }
                        else{
                            temp.payment_status = "没有付款";
                        }

                        var result_data = {
                            'id': temp.id,
                            'seller_id': temp.seller_id,
                            'seller_name': temp.seller_name,
                            'buyer_id': temp.buyer_id,
                            'buyer_name': temp.buyer_name,
                            'room_count_purchased':temp.room_count_purchased,
                            'payment_status': temp.payment_status,
                            'purchase_date': fromIntToDateString(temp.purchase_date)
                        };

                        if(checkConditionOfDate(search_id, temp.purchase_date)){
                            ret.data.list.push(result_data);
                        }



                    }
                }
                if(ret.data.list.length > 0){
                    ret.code = 0;
                    ret.msg = '操作成功';
                }
                else{
                    ret.code = 1;
                    ret.msg = 'no data';
                }

            }
            send(res,ret);
        });
    });
});

app.get('/purchase_detail',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var id = req.query.id;



    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    if (id == null || id == 0 || id == ''){
        send(res,ret);
        return;
    }

    db.purchase_detail_info(id, function(data){
        ret.msg = "操作失败";
        if (data){
            ret.code = 0;
            ret.msg = "操作成功";

            data.purchase_date = fromIntToDateString(data.purchase_date);

            ret.data = data;
        }

        send(res,ret);
    });
});

app.get('/sale_list',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var order_by = req.query.order_by;

    if (order_by == null)
        order_by = "";

    var id = req.query.id;

    if (id == null)
        id = "";

    var search_id = req.query.search_id;

    var seller_name = req.query.seller_name;
    if (seller_name == null || search_id != SELLER_NAME_SEARCH)
        seller_name = "";
    var buyer_name = req.query.buyer_name;

    if (buyer_name == null || search_id != BUYER_NAME_SEARCH)
        buyer_name = "";

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

        var query_data = {
            order_by: order_by,
            id: id,
            seller_name: seller_name,
            buyer_name: buyer_name,
            dealer_id: dealer_id,
            dealer_level: dealer_level
        };

        db.sale_list(query_data, function(data){
            if (data){
                ret.data.total_count = data.length;
                ret.data.page_count = Math.ceil(data.length / page_size);
                ret.data.list = [];

                ret.data.total_saled_room_count = 0;
                for(var i = 0; i < data.length; i++){
                    ret.data.total_saled_room_count += parseInt(data[i].room_count_saled);
                }

                var startNo = (page_no-1) * page_size;

                for (var i = 0; i< page_size; i++){
                    if (data[startNo + i] != null){
                        var temp = {};

                        temp = data[startNo + i];

                        if(parseInt(temp.payment_status) == 1){
                            temp.payment_status = "支付";
                        }
                        else{
                            temp.payment_status = "没有付款";
                        }

                        if(parseInt(temp.sale_type) == 0){
                            temp.sale_type = "代理到代理";
                        }
                        else{
                            temp.sale_type = "代理到玩家";
                        }

                        var result_data = {
                            'id': temp.id,
                            'seller_id': temp.seller_id,
                            'seller_phone_number': temp.seller_phone_number,
                            'seller_name': temp.seller_name,
                            'buyer_id': temp.buyer_id,
                            'buyer_phone_number': temp.buyer_phone_number,
                            'buyer_name': temp.buyer_name,
                            'room_count_saled':temp.room_count_saled,
                            'sale_type':temp.sale_type,
                            'payment_status': temp.payment_status,
                            'sale_date': fromIntToDateString(temp.sale_date),
                            'before_room_count_of_seller': temp.before_room_count_of_seller,
                            'after_room_count_of_seller': temp.after_room_count_of_seller,
                            'before_room_count_of_buyer': temp.before_room_count_of_buyer,
                            'after_room_count_of_buyer': temp.after_room_count_of_buyer,
                        };

                        if(checkConditionOfDate(search_id, temp.sale_date)){
                            ret.data.list.push(result_data);
                        }



                    }
                }
                if(ret.data.list.length > 0){
                    ret.code = 0;
                    ret.msg = '操作成功';
                }
                else{
                    ret.code = 1;
                    ret.msg = 'no data';
                }

            }
            send(res,ret);
        });
    });
});

app.get('/edit_account',function(req,res){
    var token = req.query.token;
    var oldPwd = req.query.old_password;
    var newPwd = req.query.new_password;

    db.read_dealer_account(null, null,token, function(data){
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

        // if (data.isvalid == 0 || data.lv == 0){//封闭，或者没权利进入后台
        //     ret.msg = "无法修改密码！";
        //     send(res,ret);
        //     return;
        // }

        if (data.password != oldPwd){
            ret.msg = "请输入正确的密码！";
            send(res,ret);
            return;
        }

        db.update_password(data.id, newPwd, function(data){
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

app.get('/edit_items', function (req, res) {
   var edit_type =  req.query.type;
   var id = req.query.id;
   var newCnt = req.query.newCnt;

    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    switch (edit_type){
        case "sale_payment_status":
            if(newCnt == '没有付款')
                newCnt = 0;
            else
                newCnt = 1;
            var update_data = {
                id: id,
                payment_status: newCnt
            };

            db.update_purchase(update_data, function (data) {
                if(data){
                    ret.code = 0;
                    ret.msg = '操作成功';
                }
                else{
                    ret.code = 1;
                    ret.msg = 'database error';
                }
                send(res,ret);
            });
            return;
    }

    send(res,ret);


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
    else
        room_count = parseInt(room_count);

    var purchase_id = req.query.purchase_id;

    if (req.query.mahjongtype == '北京麻将')
        req.query.mahjongtype = 0;
    else
        req.query.mahjongtype = 1;

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

        var buyer_id = 0;
        var buyer_name = '';

        if(dealer_id != Global.ADMINISTRATOR_ID && parseInt(data[0].room_count_useable) < parseInt(room_count)){
            ret.msg = 'too many room count.';
            send(res,ret);
            return;
        }
        if (purchase_id != null && purchase_id != '' && purchase_id != 0 && purchase_id != '0'){
            //방을 창조하면서 구매자에게 직접 충진할때이디.
            req.query.dealer_id = purchase_id;
        }
        else{
            req.query.dealer_id = dealer_id;
        }


        var onCreate = function(res1, ret){
            var ret1 = {
                code:1,
                msg:"no data",
                time:new Date(),
                data:{}
            };

            if(ret){
                ret1.code = 0;
                ret1.msg = "操作成功";

                if (purchase_id != null && purchase_id != '' && purchase_id != 0 && purchase_id != 'NaN'){
                    // 방을 창조하면서 구매자에게 직접 충진할때 t_purchase표에 보관시킨다.
                    var data_to_save = {
                        'seller_id': dealer_id,
                        'seller_name': dealer_name,
                        'buyer_id': buyer_id,
                        'buyer_name': buyer_name,
                        'room_count_purchased': room_count
                    };

                    db.purchase_add(data_to_save, function(added_data){
                        if (added_data == null || added_data.length == 0){
                            ret1.msg = 'Failed adding in purchase table.';
                        }
                        send(res,ret1);
                    });
                    db.update_managers_info({id:buyer_id, room_count_added:room_count});

                }
                else{
                    db.update_managers_info({id:dealer_id, room_count_created:room_count, room_count_useable:-room_count});
                    send(res,ret1);
                }
            }
            else{
                send(res,ret1);
            }

        };

        if (purchase_id != null && purchase_id != '' && purchase_id != 0 && purchase_id != 'NaN'){
            //방을 창조하면서 구매자에게 직접 충진할때이디.
            db.read_dealer_account_by_dealer_id(purchase_id, function(buyer_data){
                if (buyer_data == null || buyer_data.length == 0){
                    ret.msg = 'no exist purchase_id.';
                    send(res,ret);
                    return;
                }

                buyer_id = buyer_data[0].id;
                buyer_name = buyer_data[0].name;

                createRoom(dealer_name, req.query, 0, '', '', room_count, onCreate);
            });
        }
        else{
            createRoom(dealer_name, req.query, 0, '', '', room_count, onCreate);
        }



    });
});

app.get('/close_room',function(req,res){
    var loginToken = req.query.token;

    if (loginToken == "")
        loginToken = null;

    var roomId = req.query.roomId;



    var ret = {
        code:1,
        msg:"无法找到用户信息",
        time:new Date(),
        data:{}
    };

    if (roomId == null || roomId == ''){
        send(res,ret);
        return;
    }

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
        var create_dealer_id = data[0].id;

        db.close_room(create_dealer_id, roomId, function(data){
            if (data){
                ret.code = 0;
                ret.msg = '操作成功';
                db.update_managers_info({id:create_dealer_id, room_count_created:-1, room_count_useable:1});
            }
            send(res,ret);
        });
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

    var name = req.query.name;

    if (name == null)
        name = "";

    // var level = req.query.level;

    // if (level == null)
    //     level = "";

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

        ret.code = 0;
        ret.msg = "操作成功";
        ret.data.page_no = page_no;
        ret.data.page_size = page_size;

        db.read_user_list(order_by, userId, name, function(data){
            if (data){
                ret.data.total_count = data.length;
                ret.data.page_count = Math.ceil(data.length / page_size);
                ret.data.list = [];

                var startNo = (page_no-1) * page_size;

                for (var i = 0; i< page_size; i++){
                    if (data[startNo + i] != null){
                        var temp = {};

                        temp = data[startNo + i];
                        temp.account_create_datetime = fromIntToDateString(temp.account_create_datetime);
                        temp.last_login_datetime = fromIntToDateString(temp.last_login_datetime);

                        ret.data.list.push(temp);
                    }
                }
            }
            send(res,ret);
        });

        // if (userData.isvalid != 0 && userData.lv != 0){//没封闭，也能登录到后台的账号？
        //
        // }
        // else
        //     send(res,ret);
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

        // var userData = data[0];
        //
        // if (userId == "" ) {
        //     userId = userData.userid;
        // }

        db.read_user_info(userId, function(data){
            ret.msg = "操作失败";
            if (data && data.length > 0){
                var data = data[0];

                ret.code = 0;
                ret.msg = "操作成功";

                // if (data.userid != userData.userid && userData.lv == 1){//初级管理者
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
            }

            send(res,ret);
        });
    });
});

function generateRoomId(){
    var roomId = "";
    for(var i = 0; i < 6; ++i){
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
    var really_created_room_count = 0;




    for(var n = 0; n < room_count; n++) {
        var fnCreate = function(){
            var roomId = generateRoomId();
            var ret = {
                code: 1,
                msg: "无法找到用户信息",
                time: new Date(),
                data: {}
            };

            http.get('127.0.0.1', config.GAME_HTTP_PORT, "/get_rooms_ids", {roomid: roomId}, function (ret1, data) {
                //console.log(data);
                if (ret1) {
                    // data = data.ret;
                    if (data.roomInfo != null || creatingRooms[data.roomId] != null) {
                        fnCreate();
                    }
                    else {
                        creatingRooms[data.roomId] = true;
                        db.is_room_exist(data.roomId, function (ret) {

                            if (ret) {
                                delete creatingRooms[data.roomId];
                                fnCreate();
                            }
                            else {
                                var createTime = Math.ceil(Date.now() / 1000);
                                var baseScore = 2;

                                var roomInfo = {
                                    uuid: "",
                                    id: data.roomId,
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

                                // if (roomConf.type == "xlch") {
                                //     roomInfo.gameMgr = require("./gamemgr_xlch");
                                // }
                                // else {
                                //     roomInfo.gameMgr = require("../majiang_server/gamemgr_xzdd");
                                // }


                                for (var i = 0; i < SeatCount; ++i) {
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
                                var conf = roomInfo.conf;


                                db.create_room(roomInfo.id, roomInfo.conf, ip, port, createTime, function (uuid, error, row) {
                                    console.log(roomInfo);
                                    console.log("row.id: " + row.id);
                                    delete creatingRooms[row.id];
                                    if (uuid != null) {


                                        roomInfo.uuid = uuid;
                                        http.get('127.0.0.1',
                                            config.GAME_HTTP_PORT,
                                            "/add_roominfo_in_rooms",
                                            {roomId: roomInfo.id, roomInfo: JSON.stringify(roomInfo)}, function (ret1, data) {
                                                logger.info(`Room(${data.roomId}) is created. This room's conf is ${roomInfo.conf}.`, data.roomId);
                                                really_created_room_count++;
                                                if (really_created_room_count == room_count) {
                                                    callback(0, true);
                                                }

                                            });


                                    }
                                    else {
                                        var errStr = '';
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
        };
        fnCreate();
    }


};