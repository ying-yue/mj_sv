var mysql=require("mysql");
var crypto = require('./crypto');
var logger = require('./logger');
var Global = require('./Global');
var pool = null;
let ROOM_STATE_EMPTY = 0;
let ROOM_STATE_GAME_STARTING = 1;
let ROOM_STATE_SUCCESS_FINISHED = 2;
let ROOM_STATE_STRONG = 3;
let ROOM_STATE_UNSUCCESS_FINISHED = 4;
let ROOM_STATE_CREATED = 5;
let ROOM_STATE_FAILD = 6;

function nop(a,b,c,d,e,f,g){

}

function query(sql,callback){
    // sql = 'select tt from t_rooms id=909099';
    try{
        pool.getConnection(function(err,conn){
            if(err){
                logger.error('-------------------- SQL ERROR START ----------------------');
                logger.error('SQL command: ' + sql);
                logger.error(err);
                logger.error('-------------------- SQL ERROR END ----------------------');
                callback(err,null,null);
            }else{
                // logger.log('------------------SQL CONTENT!---------------');
                // logger.log(sql);
                // logger.log('---------------------------------------------')
                try{
                    conn.query(sql,function(qerr,vals,fields){
                        //释放连接
                        conn.release();
                        //事件驱动回调
                        if(qerr){
                            logger.error('-------------------- SQL ERROR START ----------------------');
                            logger.error('SQL command: ' + sql);
                            logger.error(qerr);
                            logger.error('-------------------- SQL ERROR END ----------------------');
                        }

                        callback(qerr,vals,fields);
                    });
                }
                catch (e){
                    logger.error('-------------------- SQL ERROR START ----------------------');
                    logger.error('SQL command: ' + sql);
                    logger.error(e);
                    logger.error('-------------------- SQL ERROR END ----------------------');
                    callback([],null,null);
                }

            }
        });
    }
    catch (e){
        logger.error('-------------------- SQL ERROR START ----------------------');
        logger.error('SQL command: ' + sql);
        logger.error(e);
        logger.error('-------------------- SQL ERROR END ----------------------');
        callback([],null,null);
    }

};

exports.init = function(config){
    pool = mysql.createPool({
        host: config.HOST,
        user: config.USER,
        password: config.PSWD,
        database: config.DB,
        port: config.PORT,
});
};

exports.is_account_exist = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.error(err);
        }
        else{
            if(rows.length > 0){
                callback(true);
            }
            else{
                callback(false);
            }
        }
    });
};

exports.create_account = function(account,password,callback){
    callback = callback == null? nop:callback;
    if(account == null || password == null){
        callback(false);
        return;
    }

    var psw = crypto.md5(password);
    var sql = 'INSERT INTO t_accounts(account,password) VALUES("' + account + '","' + psw + '")';
    query(sql, function(err, rows, fields) {
        if (err) {
            if(err.code == 'ER_DUP_ENTRY'){
                callback(false);
                return;
            }
            callback(false);
            logger.error(err);
            // throw err;
        }
        else{
            callback(true);
        }
    });
};

exports.get_account_info = function(account,password,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_accounts WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
            // throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        if(password != null){
            var psw = crypto.md5(password);
            if(rows[0].password == psw){
                callback(null);
                return;
            }
        }

        callback(rows[0]);
    });
};

exports.is_user_exist = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(false);
        return;
    }

    var sql = 'SELECT userid FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            logger.error(err);
            callback(false);
            return;
            // throw err;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });
}


exports.get_user_data = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT userid,account,name,lv,exp,coins,gems,roomid FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
            // throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

exports.get_user_data_by_userid = function(userid,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT userid,account,name,lv,exp,coins,gems,roomid, room_count_useable, room_ids_useable FROM t_users WHERE userid = ' + userid;
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
            // throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

/**增加玩家房卡 */
exports.add_user_gems = function(userid,gems,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(false);
        return;
    }

    // var sql = 'UPDATE t_users SET gems = ' + gems + ' WHERE userid = ' + userid;
    var sql = 'UPDATE t_users SET gems = gems + (' + gems + ') WHERE userid = ' + userid;
    // console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            // console.log(err);
            // callback(null);
            logger.error(err);
            // return;
            callback(false);
            // return;
        }
        else{
            callback(rows.affectedRows > 0);
            // return;
        }
    });
};

exports.get_gems = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT gems FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {

            callback(null);
            logger.error(err);
            return;
            // throw err;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

exports.get_room_ids_of_user = function(account,callback){
    callback = callback == null? nop:callback;
    if(account == null){
        callback(null);
        return;
    }

    var sql = 'SELECT room_ids_useable FROM t_users WHERE account = "' + account + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows[0]);
    });
};

exports.get_user_history = function(userId,callback){
    callback = callback == null? nop:callback;
    if(userId == null){
        callback(null);
        return;
    }

    var sql = 'SELECT history FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        var history = rows[0].history;
        if(history == null || history == ""){
            callback(null);
        }
        else{
            console.log(history);
            history = JSON.parse(history);
            for(let i = 0; i < history.length; ++i){
                let history_item = history[i];

                for(let j = 0; j < history_item.seats.length; ++j){
                    let history_item_seat = history_item.seats[j];
                    history_item_seat.name = crypto.fromBase64(history_item_seat.name);
                }
            }
            callback(history);
        }
    });
};

exports.update_user_history = function(userId,history,callback){
    callback = callback == null? nop:callback;
    if(userId == null || history == null){
        callback(false);
        return;
    }

    if(history == null || history == ""){
        callback(false);
    }
    else {
        console.log(history);
        for (let i = 0; i < history.length; ++i) {
            let history_item = history[i];

            for (let j = 0; j < history_item.seats.length; ++j) {
                let history_item_seat = history_item.seats[j];
                history_item_seat.name = crypto.toBase64(history_item_seat.name);
            }
        }
    }

    history = JSON.stringify(history);
    var sql = 'UPDATE t_users SET roomid = null, history = \'' + history + '\' WHERE userid = "' + userId + '"';
    console.log(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.error(err);
            return;
        }

        if(rows.length == 0){
            callback(false);
            return;
        }

        callback(true);
    });
};

exports.get_games_of_room = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT game_index,create_time,result FROM t_games_archive WHERE room_uuid = "' + room_uuid + '"';
    //console.log(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }

        callback(rows);
    });
};

exports.get_detail_of_game = function(room_uuid,index,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null || index == null){
        callback(null);
        return;
    }
    var sql = 'SELECT base_info,action_records FROM t_games_archive WHERE room_uuid = "' + room_uuid + '" AND game_index = ' + index ;
    //console.log(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
        }

        if(rows.length == 0){
            callback(null);
            return;
        }
        callback(rows[0]);
    });
};

exports.create_user = function(account,name,coins,gems,sex,headimg,callback){
    callback = callback == null? nop:callback;
    if(account == null || name == null || coins==null || gems==null){
        callback(false);
        return;
    }
    if(headimg){
        headimg = '"' + headimg + '"';
    }
    else{
        headimg = 'null';
    }
    // name = "충구기\xF0\x9F\x8E\xB4";
    name = crypto.toBase64(name);
    var sql = 'INSERT INTO t_users(account,name,coins,gems,sex,headimg,history) VALUES("{0}","{1}",{2},{3},{4},{5},"")';
    sql = sql.format(account,name,coins,gems,sex,headimg);
    // console.log(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.error(err);
            return;
        }
        callback(true);
    });
};

exports.update_user_gem_and_charge_amount = function (user_id, gems, charge_amount, callback) {
    if(user_id == null || gems== null){
        callback(null);
        return;
    }
    var sql = '';
    if(charge_amount){
        sql = "UPDATE t_users SET gems=gems+{0}, charge_amount='{1}' WHERE userid={2}";
        sql = sql.format(gems, charge_amount, user_id);
    }
    else{
        sql = "UPDATE t_users SET gems=gems+{0} WHERE userid={1}";
        sql = sql.format(gems, user_id);
    }

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(false);
            logger.log(err);
            // throw err;
            return;
        }
        callback(true);
    });
};

exports.update_order_results_by_order_id = function (order_id, status) {
    if(order_id == null || status == null){
        return;
    }

    var sql = "UPDATE t_orders SET status='{0}' WHERE id='{1}'";
    sql = sql.format(status, order_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            // throw err;
        }
    });
};

exports.update_order_results = function (order_id, status, buyer_id, trade_no) {
    if(order_id == null || status == null){
        return;
    }

    var sql = "UPDATE t_orders SET status='{0}', buyer_id='{1}', trade_no='{2}' WHERE id='{3}'";
    sql = sql.format(status, buyer_id, trade_no,order_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {

            logger.log(err);
            // throw err;
        }
    });
};


exports.update_goods_sales = function (goods_id, sales) {
    if(goods_id == null || sales== null){
        return;
    }

    var sql = "UPDATE t_goods SET sales='{0}' WHERE id='{1}'";
    sql = sql.format(sales,goods_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            // throw err;
        }
    });
};

exports.update_user_info = function(userid,name,headimg,sex,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }

    if(headimg){
        headimg = '"' + headimg + '"';
    }
    else{
        headimg = 'null';
    }
    name = crypto.toBase64(name);
    var sql = 'UPDATE t_users SET name="{0}",headimg={1},sex={2} WHERE account="{3}"';
    sql = sql.format(name,headimg,sex,userid);
    // console.log(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
            // throw err;
        }
        callback(rows);
    });
};

// exports.update_user_room_count_ids = function(userid,room_id_list,callback){
//     callback = callback == null? nop:callback;
//     if(userid == null){
//         callback(null);
//         return;
//     }
//
//
//
//     var sql1 = "select room_ids_useable FROM t_users WHERE userid={0}".format(userid);
//     query(sql1, function(err, rows, fields) {
//         if (err) {
//             throw err;
//         }
//         if(rows == null || rows.length == 0){
//             callback(false);
//             return;
//         }
//
//         var new_room_ids = [];
//
//         var room_ids_useable_string = rows[0].room_ids_useable;
//         var origin_room_count = rows[0].room_count_useable;
//         if(room_ids_useable_string){
//             var json_data = JSON.parse(room_ids_useable_string);
//             var room_ids = json_data.room_ids;
//
//             for(var i = 0; i < room_ids.length; i++){
//                 new_room_ids.push(room_ids[i]);
//             }
//
//         }
//
//         for(var j = 0; j < room_id_list.length; j++){
//             new_room_ids.push(room_id_list[j]);
//         }
//
//         var room_id_list_string = '{"room_ids":[';
//
//         for(var i = 0; i < new_room_ids.length; i++){
//             if(i == new_room_ids.length - 1){
//                 room_id_list_string += new_room_ids[i];
//             }
//             else{
//                 room_id_list_string += new_room_ids[i] + ',';
//             }
//         }
//
//         room_id_list_string += ']}';
//
//         var sql = "UPDATE t_users SET room_count_useable =room_count_useable+{0},room_ids_useable='{1}' WHERE userid={2}";
//         sql = sql.format(room_id_list.length,room_id_list_string,userid);
//         // console.log(sql);
//         query(sql, function(err, rows, fields) {
//             if (err) {
//                 throw err;
//             }
//             callback(rows);
//         });
//     });
//
//
// };

exports.get_user_base_info = function(userid,callback){
    callback = callback == null? nop:callback;
    if(userid == null){
        callback(null);
        return;
    }
    var sql = 'SELECT name,sex,headimg FROM t_users WHERE userid={0}';
    sql = sql.format(userid);
    // console.log(sql);
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.error(err);
            return;
        }
        rows[0].name = crypto.fromBase64(rows[0].name);
        callback(rows[0]);
    });
};

exports.is_room_exist = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.error(err);
            // return;
        }
        else{
            var result = false;
            if(rows.length > 0){
                // for(var i = 0; i < rows.length; ++i){
                //     // 빈방이거나 방에서 게임을 시작했으면 방을 새로 창조할수 없으므로 방의 존재가 true로 되여야 한다.
                //     if(parseInt(rows[i].room_state) == 0 || parseInt(rows[i].room_state) == 1){
                //         result = true;
                //     }
                // }

                result = true;
            }
            callback(result);
        }
    });
};

exports.cost_gems = function(userid,cost,callback){
    callback = callback == null? nop:callback;
    // var sql = 'UPDATE t_users SET gems = ' + cost + ' WHERE userid = ' + userid;
    var sql = 'UPDATE t_users SET gems = gems -' + cost + ' WHERE userid = ' + userid;
    // console.log(sql);
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.error(err);
            // return;
        }
        else{
            callback(rows.length > 0);
        }
    });
};

exports.delete_user_info_in_room_table = function (userId, roomId, callback) {
    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_rooms WHERE id="{0}"'.format(roomId)
    query(sql, function(err, rows, fields) {
        if(err){
            // console.log(err);
            callback(false);
            logger.error(err);
            // return;
        }
        else{

            if(rows && rows.length > 0){
                var row = rows[0];
                var sql1 = '';
                if(row.user_id0 == userId){
                    sql1 = 'UPDATE t_rooms SET user_id0 = 0, user_name0 = null, user_score0 = 0, user_icon0 = null WHERE id = "' + roomId + '"';
                }
                else if(row.user_id1 == userId){
                    sql1 = 'UPDATE t_rooms SET user_id1 = 0, user_name1 = null, user_score1 = 0, user_icon1 = null WHERE id = "' + roomId + '"';
                }
                else if(row.user_id2 == userId){
                    sql1 = 'UPDATE t_rooms SET user_id2 = 0, user_name2 = null, user_score2 = 0, user_icon2 = null WHERE id = "' + roomId + '"';
                }
                else if(row.user_id3 == userId){
                    sql1 = 'UPDATE t_rooms SET user_id3 = 0, user_name3 = null, user_score3 = 0, user_icon3 = null WHERE id = "' + roomId + '"';
                }
                if(sql1 == ''){
                    logger.error(`There is no row(userId: ${userId}) in t_rooms.`, roomId);
                    callback(false);
                    return;
                }
                query(sql1, function(err1, rows1, fields1) {
                    if (err1) {
                        // console.log(err);
                        callback(false);
                        logger.error(err1);
                        // return;
                    }
                    else {
                        callback(true);
                    }
                });
            }
            else{
                logger.error(`There is no row(roomId: ${roomId}) in t_rooms.`, roomId);
                callback(false);
            }

        }
    });
};

exports.set_room_id_of_user = function(userId,roomId,roomIdToRemove,callback){
    callback = callback == null? nop:callback;
    if(roomId != null){
        roomId = '"' + roomId + '"';
    }

    var sql = 'UPDATE t_users SET roomid = '+ roomId + ' WHERE userid = "' + userId + '"';
    // console.log(sql);
    query(sql, function(err, rows, fields) {
        if(err){
            // console.log(err);
            callback(false);
            logger.error(err);
            // return;
        }
        else{
            if(rows && roomIdToRemove){
                exports.update_room_as_origin(roomIdToRemove);
            }
            callback(rows != null);
        }
    });
    // if(!roomIdToRemove){
    //     var sql = 'UPDATE t_users SET roomid = '+ roomId + ' WHERE userid = "' + userId + '"';
    //     // console.log(sql);
    //     query(sql, function(err, rows, fields) {
    //         if(err){
    //             // console.log(err);
    //             callback(false);
    //             throw err;
    //         }
    //         else{
    //             callback(rows.length > 0);
    //         }
    //     });
    // }
    // else{
    //     exports.get_user_data_by_userid(userId, function (user_data) {
    //        if(user_data){
    //            var room_count_useable = user_data.room_count_useable;
    //            var room_ids_useable = user_data.room_ids_useable;
    //            if(!room_ids_useable){
    //                var sql = 'UPDATE t_users SET roomid = '+ roomId + ' WHERE userid = "' + userId + '"';
    //                // console.log(sql);
    //                query(sql, function(err, rows, fields) {
    //                    if(err){
    //                        // console.log(err);
    //                        callback(false);
    //                        throw err;
    //                    }
    //                    else{
    //                        callback(rows.length > 0);
    //                    }
    //                });
    //            }
    //            else{
    //                var ids_data = JSON.parse(room_ids_useable).room_ids;
    //
    //                var room_id_list_string = '{"room_ids":[';
    //                var new_room_ids = [];
    //
    //                if(ids_data.length == 1 && parseInt(ids_data[0]) == parseInt(roomIdToRemove)){
    //                    room_id_list_string = null;
    //                }
    //                else{
    //                    for(var i = 0; i < ids_data.length; i++){
    //                        if(parseInt(ids_data[i]) == parseInt(roomIdToRemove))
    //                            continue;
    //
    //                        room_id_list_string += ids_data[i] + ',';
    //                    }
    //
    //                    room_id_list_string = room_id_list_string.substring(0, room_id_list_string.length - 1);
    //
    //                    room_id_list_string += ']}';
    //                }
    //
    //
    //                if(room_id_list_string){
    //                    var sql = "UPDATE t_users SET roomid = "+ roomId + ", room_count_useable =room_count_useable-1,room_ids_useable='{0}' WHERE userid={1}";
    //                    sql = sql.format(room_id_list_string,userId);
    //                }
    //                else{
    //                    var sql = "UPDATE t_users SET roomid = "+ roomId + ", room_count_useable =room_count_useable-1,room_ids_useable=null WHERE userid={0}";
    //                    sql = sql.format(userId);
    //                }
    //
    //
    //                // console.log(sql);
    //                query(sql, function(err, rows1, fields) {
    //                    if (err) {
    //                        throw err;
    //                    }
    //                    callback(rows1);
    //                });
    //
    //            }
    //        }
    //        else{
    //            callback(false);
    //        }
    //     });
    // }

};

exports.get_room_id_of_user = function(userId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT roomid FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            logger.error(err);
            // return;
        }
        else{
            if(rows.length > 0){
                callback(rows[0].roomid);
            }
            else{
                callback(null);
            }
        }
    });
};


exports.create_room = function(roomId,conf,ip,port,create_time,callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_rooms(uuid,id,dealer_id,base_info,ip,port,create_time,num_of_turns,next_button,user_id0,user_icon0,user_name0,user_score0, \
                                   user_id1, user_icon1,user_name1,user_score1,user_id2, user_icon2,user_name2,user_score2,user_id3, user_icon3,user_name3,user_score3)\
                VALUES('{0}','{1}', {2},'{3}','{4}',0,{6},0,0,0,'','',0,0,'','',0,0,'','',0,0,'','',0)";
    var uuid = Date.now() + roomId;
    var baseInfo = JSON.stringify(conf);
    if(conf.dealer_id == null || conf.dealer_id == 'NaN' || conf.dealer_id == ''){
        conf.dealer_id = 0;
    }
    sql = sql.format(uuid,roomId, conf.dealer_id ,baseInfo,ip,port,create_time);
    // console.log(sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(null, err);
            logger.error(err);
            // throw err;
        }
        else{
            callback(uuid, null, roomId);
        }
    });
};

exports.get_room_uuid = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT uuid FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.error(err);
            // return;
        }
        else{
            callback(rows[0].uuid);
        }
    });
};

exports.update_seat_info = function(roomId,seatIndex,userId,icon,name,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET user_id{0} = {1},user_icon{0} = "{2}",user_name{0} = "{3}" WHERE id = "{4}"';
    name = crypto.toBase64(name);
    sql = sql.format(seatIndex,userId,icon,name,roomId);
    //console.log(sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.error(err);
            // return;
        }
        else{
            callback(true);
        }
    });
};

exports.update_room_as_origin = function (room_id, callback) {
    callback = callback == null? nop:callback;

    var sql = 'update t_rooms set room_state=0, current_jushu=0, game_start_time=null, game_end_time=null, ' +
        'num_of_turns=0, next_button=0, user_id0=0, user_icon0=null, user_name0=null, user_score0=0,' +
        'user_id1=0, user_icon1=null, user_name1=null, user_score0=1,' +
        'user_id2=0, user_icon2=null, user_name2=null, user_score2=0,' +
        'user_id3=0, user_icon3=null, user_name3=null, user_score3=0,' +
        'ip=null, port=null, is_full=0 where id={0}'.format(room_id);

    query(sql,function(err,row,fields) {
        if (err) {
            callback(false);
            logger.error(err);
            // throw err;
        }
        else {
            callback(true);
        }
    });
};

exports.update_room_data = function(room_data,callback){
    callback = callback == null? nop:callback;

    var sql = 'UPDATE t_rooms SET is_full = {0}'.format(room_data.is_full);
    if(room_data.current_jushu != null)
        sql += ', current_jushu = {0}'.format(room_data.current_jushu);
    if(room_data.room_state != null)
        sql += ', room_state = {0}'.format(room_data.room_state);
    if(room_data.game_start_time != null)
        sql += ', game_start_time = {0}'.format(room_data.game_start_time);
    if(room_data.game_end_time != null)
        sql += ', game_end_time = {0}'.format(room_data.game_end_time);

    sql += ' WHERE id = "{0}"'.format(room_data.roomId);


    // else{
    //     sql = 'UPDATE t_rooms SET is_full = {0}, room_state = {1}, game_start_time = {3}, game_end_time = {4} WHERE id = "{2}"';
    //     // name = crypto.toBase64(name);
    //     sql = sql.format(room_data.is_full, room_data.room_state, room_data.roomId, room_data.game_start_time, room_data.game_end_time);
    // }
    //console.log(sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            if(room_data.room_state != ROOM_STATE_EMPTY && room_data.room_state != ROOM_STATE_GAME_STARTING){
                var sql1 = 'select dealer_id from t_rooms where id={0}'.format(room_data.roomId);
                query(sql1,function(err1,row1,fields1){
                    if(err1){
                        callback(false);
                        logger.error(err);
                        // throw err1;
                        // return;
                    }
                    else{
                        if(row1 != null && row1.length > 0 && row1[0].dealer_id > 0){
                            var dealer_id = row1[0].dealer_id;
                            var update_data = {id:dealer_id,
                                room_count_opend:-1,
                                room_count_used:1
                            };
                            exports.update_managers_info(update_data);
                        }
                    }
                });
            }
            callback(true);
        }
    });
};

exports.update_num_of_turns = function(roomId,numOfTurns,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET num_of_turns = {0} WHERE id = "{1}"';
    sql = sql.format(numOfTurns,roomId);
    //console.log(sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.error(err);
            // throw err;
        }
        else{
            callback(true);
        }
    });
};


exports.update_next_button = function(roomId,nextButton,callback){
    callback = callback == null? nop:callback;
    var sql = 'UPDATE t_rooms SET next_button = {0} WHERE id = "{1}"'
    sql = sql.format(nextButton,roomId);
    //console.log(sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            callback(true);
        }
    });
};

exports.get_order_by_id = function(order_id, callback){
    callback = callback == null? nop:callback;

    var sql = "SELECT *, o.id as id FROM t_orders AS o INNER JOIN t_goods AS g ON o.goods_id=g.id WHERE o.id='{0}';".format(order_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            callback(null, err);
            return;
        }
        if(rows && rows.length > 0){
            callback(rows[0]);
        }
        else {
            callback(null);
        }
    });
};

exports.get_room_addr = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false,null,null);
        return;
    }

    var sql = 'SELECT ip,port FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(false,null,null);
            logger.error(err);
            return;
        }
        if(rows.length > 0){
            callback(true,rows[0].ip,rows[0].port);
        }
        else{
            callback(false,null,null);
        }
    });
};

exports.get_room_data = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            logger.error(err);
            return;
        }
        if(rows.length > 0){
            if(rows[0].user_name0){
                rows[0].user_name0 = crypto.fromBase64(rows[0].user_name0);
            }
            if(rows[0].user_name1){
                rows[0].user_name1 = crypto.fromBase64(rows[0].user_name1);
            }
            if(rows[0].user_name2){
                rows[0].user_name2 = crypto.fromBase64(rows[0].user_name2);
            }
            if(rows[0].user_name3){
                rows[0].user_name3 = crypto.fromBase64(rows[0].user_name3);
            }
            // rows[0].user_name0 = crypto.fromBase64(rows[0].user_name0);
            // rows[0].user_name1 = crypto.fromBase64(rows[0].user_name1);
            // rows[0].user_name2 = crypto.fromBase64(rows[0].user_name2);
            // rows[0].user_name3 = crypto.fromBase64(rows[0].user_name3);
            callback(rows[0]);
        }
        else{
            callback(null);
        }
    });
};

exports.delete_room = function(roomId,callback){
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false);
    }
    var sql = "DELETE FROM t_rooms WHERE id = '{0}'";
    sql = sql.format(roomId);
    // console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            callback(true);
        }
    });
};

exports.create_gems_buy_history = function(info,callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_gems_buy_history(account, userid,name,gems_count,money,status, created_date) VALUES('{0}',{1},'{2}',{3},{4},'{5}',{6})";

    let infoJSON = {};
    if(typeof info === 'string'){
        infoJSON = JSON.parse(info);
    }
    else{
        infoJSON = info;
    }

    sql = sql.format(infoJSON.account, infoJSON.userId,infoJSON.name, parseInt(infoJSON.gems_count), parseInt(infoJSON.money),'waiting', Date.now().toString());
    //console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.error(err);
        }
        else{
            callback(rows.insertId);
        }
    });
};

exports.create_order = function(order_info, callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_orders(id, goods_name, goods_id, user_id, status, channel, created_at, total_amount) VALUES('{0}','{1}','{2}','{3}','{4}','{5}','{6}', '{7}')";
    sql = sql.format(Date.now(), order_info.goods_name, order_info.goods_id, order_info.user_id, order_info.status, order_info.channel, order_info.created_at, order_info.total_amount);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);

        }
        else{
            callback(rows.insertId);
        }
    });
};

exports.create_game = function(room_uuid,index,base_info,callback){
    callback = callback == null? nop:callback;
    var sql = "INSERT INTO t_games(room_uuid,game_index,base_info,create_time) VALUES('{0}',{1},'{2}',unix_timestamp(now()))";
    sql = sql.format(room_uuid,index,base_info);
    console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.error(err);
        }
        else{
            callback(rows.insertId);
        }
    });
};

exports.delete_games = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }
    var sql = "DELETE FROM t_games WHERE room_uuid = '{0}'";
    sql = sql.format(room_uuid);
    // console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            callback(true);
        }
    });
};

exports.saveScoreInRoomTable = function (room_uuid, scoreDataToSave, callback) {
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }
    var sql = "SELECT * FROM t_rooms WHERE uuid='{0}';".format(room_uuid);

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            var row = rows[0];
            var update_query = "UPDATE t_rooms SET ";
            for(var i = 0; i < scoreDataToSave.length; ++i){
                if(row.user_id0 == scoreDataToSave[i][0]){
                    update_query += "user_score0={0}".format(scoreDataToSave[i][1]);
                }
                else if(row.user_id1 == scoreDataToSave[i][0]){
                    update_query += "user_score1={0}".format(scoreDataToSave[i][1]);
                }
                else if(row.user_id2 == scoreDataToSave[i][0]){
                    update_query += "user_score2={0}".format(scoreDataToSave[i][1]);
                }
                else if(row.user_id3 == scoreDataToSave[i][0]){
                    update_query += "user_score3={0}".format(scoreDataToSave[i][1]);
                }

                if(i != scoreDataToSave.length - 1){
                    update_query += ',';
                }
            }

            update_query += " WHERE uuid = '{0}'".format(room_uuid);

            query(update_query,function(err,rows,fields) {
                if (err) {
                    callback(false);
                    throw err;
                }
                else{
                    callback(rows);
                }
            });
        }
    });

}

exports.archive_games = function(room_uuid,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }
    var sql = "INSERT INTO t_games_archive(SELECT * FROM t_games WHERE room_uuid = '{0}')";
    sql = sql.format(room_uuid);
    // console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            exports.delete_games(room_uuid,function(ret){
                callback(ret);
            });
        }
    });
}

exports.update_game_action_records = function(room_uuid,index,actions,callback){
    callback = callback == null? nop:callback;
    var sql = "UPDATE t_games SET action_records = '"+ actions +"' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index ;
    //console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            callback(true);
        }
    });
};

exports.update_game_result = function(room_uuid,index,result,callback){
    callback = callback == null? nop:callback;
    if(room_uuid == null || result){
        callback(false);
    }

    result = JSON.stringify(result);
    var sql = "UPDATE t_games SET result = '"+ result +"' WHERE room_uuid = '" + room_uuid + "' AND game_index = " + index ;
    //console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            callback(true);
        }
    });
};

exports.get_goods = function(gems, callback){
    callback = callback == null? nop:callback;

    if(gems == null){
        callback(null);
        return;
    }

    var sql = "SELECT * FROM t_goods WHERE gems='{0}';".format(gems);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            logger.error(err);
            return;
        }
        callback(rows[0]);
    });
};


exports.get_message = function(type,version,callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_message WHERE type = "'+ type + '"';

    if(version == "null" || version == 'undefined'){
        version = null;
    }

    if(version){
        version = '"' + version + '"';
        sql += ' AND version = ' + version;
    }

    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            if(rows.length > 0){
                callback(rows[0]);
            }
            else{
                callback(null);
            }
        }
    });
};

exports.get_unfull_room = function(callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_rooms WHERE is_full IS NULL OR is_full <> 1';

    query(sql, function(err, rows, fields) {
        if(err){
            callback(false);
            logger.error(err);
        }
        else{
            if(rows.length > 0){
                for(var i = 0; i < rows.length; i++){
                    var row = rows[i];
                    if(row.user_id0 > 0 && row.user_id1 > 0 && row.user_id2 > 0 && row.user_id3 > 0){
                        continue;
                    }
                    else{
                        callback(row);
                        return;
                    }
                }
                callback(null);


            }
            else{
                callback(null);
            }
        }
    });
};

// pai control part   ////////////////////////////////////////

exports.get_start_pais_pai_control = function(user_id, callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_pai_control WHERE userid = {0};'.format(user_id);

    query(sql, function(err, rows, fields) {
        if(err){
            callback({error_code:Global.ERROR_DATABASE_CONNECTION, error_msg: 'database connection error.', data: null});
            logger.error(err);
        }
        else{
            if(rows.length > 0){
                var row = rows[0];
                var start_pais_data = null;
                try{
                    start_pais_data = row.start_pai_list;
                    start_pais_data = JSON.parse(start_pais_data);
                }
                catch (e){
                    callback({error_code:Global.ERROR_JSON_PARSE, error_msg: 'Json Parse error.', data: null});
                    return;
                }

                if(start_pais_data && start_pais_data.pais.length == 13){
                    callback({error_code:0, error_msg: 'ok.', data: start_pais_data});
                }
                else{
                    callback({error_code:Global.ERROR_NO_DATA, error_msg: 'no data in start_pai_list.', data: null});

                }
            }
            else{
                callback({error_code:Global.ERROR_NO_SATISFACTION_QUERY, error_msg: 'no user id: ' + user_id, data: null});
            }
        }
    });
};

exports.get_need_pai_control = function(user_id, callback){
    callback = callback == null? nop:callback;

    var sql = 'SELECT * FROM t_pai_control WHERE userid = {0};'.format(user_id);

    query(sql, function(err, rows, fields) {
        if(err){
            callback({error_code:Global.ERROR_DATABASE_CONNECTION, error_msg: 'database connection error.', data: null});
            logger.error(err);
        }
        else{
            if(rows.length > 0){
                var row = rows[0];
                var need_pai = row.need_pai;

                if(need_pai != null){
                    callback({error_code:0, error_msg: 'ok.', data: need_pai});
                }
                else{
                    callback({error_code:Global.ERROR_NO_DATA, error_msg: 'no data in start_pai_list.', data: null});

                }
            }
            else{
                callback({error_code:Global.ERROR_NO_SATISFACTION_QUERY, error_msg: 'no user id: ' + user_id, data: null});
            }
        }
    });
};

///////////////////////////////////////////////////////////////


///////终端管理相关函数
exports.read_dealer_account = function(adminId, adminPwd, token, callback){
    callback = callback == null? nop:callback;

    if((adminId == null || adminPwd== null) && token == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_managers WHERE ';

    if (token != null){
        sql = sql + 'token="{0}"';
        sql = sql.format(token);
    } else {
        sql = sql +'name="{0}" and password="{1}"';
        sql = sql.format(adminId, adminPwd);
    }

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            return;
        }

        logger.log( rows);
        for(var i = 0; i < rows.length; ++i){
            rows[i].name = crypto.fromBase64(rows[i].name);
            rows[i].weixin_id = crypto.fromBase64(rows[i].weixin_id);
        }

        callback(rows);
    });
};

exports.read_dealer_account_by_dealer_id = function(dealer_id, callback){
    callback = callback == null? nop:callback;

    if(dealer_id == null || dealer_id == '' || dealer_id == 0 || dealer_id == '0'){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_managers WHERE id={0}'.format(dealer_id);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            return;
        }

        logger.log( rows);
        for(var i = 0; i < rows.length; ++i){
            rows[i].name = crypto.fromBase64(rows[i].name);
            rows[i].weixin_id = crypto.fromBase64(rows[i].weixin_id);
        }

        callback(rows);
    });
};

exports.update_token_managers = function(id,token){
    if(id == null || token == null){
        return false;
    }

    var sql = 'UPDATE t_managers SET token = "' + token +'" WHERE id = ' + id;
    ////console.log(sql);
    query(sql, function(err, rows, fields) {

        if(err){
            logger.error(err);
            //console.log(ret.err);
            return false;
        }
        else{
            return true;
        }
    });
};

exports.update_password = function(id,newPwd, callback){
    if(id == null || newPwd == null){
        return false;
    }

    var sql = 'UPDATE t_managers SET password = "' + newPwd +'" WHERE id = ' + id;
    ////console.log(sql);
    query(sql, function(err, rows, fields) {

        if(err){
            logger.error(err);
            //console.log(ret.err);
            callback(false);
        }
        else{
            callback(true);
        }
    });
};

exports.update_managers_info = function(update_data, callback){
    callback = callback == null? nop:callback;
    // if(update_data.id == null){
    //     callback(null);
    //     return false;
    // }

    var sql = 'UPDATE t_managers SET ';

    if(update_data.name != null){
        update_data.name = crypto.toBase64(update_data.name);
        sql += 'name = "{0}", '.format(update_data.name);
    }

    if(update_data.password != null){
        sql += 'password = "{0}", '.format(update_data.password);
    }

    if(update_data.level != null){
        sql += 'level = {0}, '.format(update_data.level);
    }

    if(update_data.token != null){
        sql += 'token = "{0}", '.format(update_data.token);
    }

    if(update_data.dealer_type != null){
        sql += 'dealer_type = {0}, '.format(update_data.dealer_type);
    }

    if(update_data.region_of_dealer != null){
        sql += 'region_of_dealer = "{0}", '.format(update_data.region_of_dealer);
    }

    if(update_data.phone_number != null){
        sql += 'phone_number = "{0}", '.format(update_data.phone_number);
    }

    if(update_data.weixin_id != null){
        sql += 'weixin_id = "{0}", '.format(update_data.weixin_id);
    }

    if(update_data.room_count_total != null){
        sql += 'room_count_total = room_count_total + ({0}), '.format(update_data.room_count_total);
    }

    if(update_data.room_count_useable != null){
        sql += 'room_count_useable = room_count_useable +({0}), '.format(update_data.room_count_useable);
    }

    if(update_data.room_count_saled != null){
        sql += 'room_count_saled = room_count_saled +({0}), '.format(update_data.room_count_saled);
    }

    if(update_data.room_count_opened != null){
        sql += 'room_count_opened = room_count_opened + ({0}), '.format(update_data.room_count_opened);
    }

    if(update_data.room_count_created != null){
        sql += 'room_count_created = room_count_created + ({0}), '.format(update_data.room_count_created);
    }

    if(update_data.room_count_used != null){
        sql += 'room_count_used = room_count_used + ({0}), '.format(update_data.room_count_used);
    }
    if(update_data.room_count_bonus != null){
        sql += 'room_count_bonus = room_count_bonus + ({0}), '.format(update_data.room_count_bonus);
    }

    if(update_data.status != null){
        sql += 'status = "{0}", '.format(update_data.status);
    }

    if(update_data.room_count_added != null){
        if(update_data.room_count_added > 0){
            sql += 'room_count_total = room_count_total + ({0}), '.format(update_data.room_count_added);
            sql += 'room_count_useable = room_count_useable + ({0}), '.format(update_data.room_count_added);
        }
        else{
            sql += 'room_count_useable = room_count_useable + ({0}), '.format(update_data.room_count_added);
            //부호는 미누스이지만 실지로는 room_count_saled를 증가시키고 있다.그것은 room_count_added가 미누스라는것은 판매하고있다는 의미이기때문이다.
            sql += 'room_count_saled = room_count_saled - ({0}), '.format(update_data.room_count_added);
        }

    }

    sql += 'date_modified = {0} '.format(Math.ceil(Date.now() / 1000));

    if(update_data.id){
        sql += 'WHERE id = ' + update_data.id;
    }
    else{
        sql += 'WHERE phone_number = "{0}"'.format(update_data.phone_number);
    }

    ////console.log(sql);
    query(sql, function(err, rows, fields) {

        if(err){
            //console.log(ret.err);
            callback(null);
            logger.error(err);
            return false;
        }
        else{
            callback(true);
            return true;
        }
    });
};

exports.insert_data_in_purchase = function(update_data, callback){
    if(update_data.from_id == null || update_data.to_id == null){
        callback(null);
        return false;
    }

    var from_id = update_data.from_id;
    var to_id = update_data.to_id;
    var room_count = parseInt(update_data.room_count_added);
    var sale_type = update_data.sale_type;

    if(sale_type == 0){
        var sql = '(select * from t_managers where id={0}) union (select * from t_managers where phone_number="{1}")'.format(from_id, to_id);
        query(sql, function(err, rows, fields) {

            if(err){
                //console.log(ret.err);
                callback(null);
                logger.error(err);
                return false;
            }
            else{
                if(rows == null || rows.length == 0 || rows.length < 2){
                    callback(null);
                    return false;
                }

                var seller_row = rows[0];
                var buyer_row = rows[1];

                var getted_data = {
                    seller_id: seller_row.id,
                    seller_name: seller_row.name,
                    buyer_id: buyer_row.id,
                    buyer_name: buyer_row.name,
                    room_count_purchased: room_count,
                    purchase_date: Math.ceil(Date.now() / 1000),
                    before_room_count_of_seller: parseInt(seller_row.room_count_useable) + room_count,
                    after_room_count_of_seller: seller_row.room_count_useable,
                    before_room_count_of_buyer: parseInt(buyer_row.room_count_useable) - room_count,
                    after_room_count_of_buyer: buyer_row.room_count_useable
                };

                var sql1 = "INSERT INTO t_purchase(seller_id, seller_name, buyer_id, buyer_name, room_count_purchased, purchase_date, before_room_count_of_seller," +
                    " after_room_count_of_seller, before_room_count_of_buyer, after_room_count_of_buyer,sale_type) VALUES({0},'{1}',{2},'{3}',{4},'{5}',{6}, {7}, {8}, {9}, {10})";
                sql1 = sql1.format(getted_data.seller_id, getted_data.seller_name, getted_data.buyer_id, getted_data.buyer_name, getted_data.room_count_purchased,
                    getted_data.purchase_date, getted_data.before_room_count_of_seller, getted_data.after_room_count_of_seller,
                    getted_data.before_room_count_of_buyer, getted_data.after_room_count_of_buyer, sale_type);

                query(sql1, function(err1, rows1, fields1) {

                    if (err1) {
                        //console.log(ret.err);
                        callback(null);
                        logger.error(err1);
                        return false;
                    }
                    else {
                        callback(true);
                        return true;
                    }
                });


            }
        });
    }
    else{
        var sql = 'select * from t_managers where id={0}'.format(from_id);
        query(sql, function(err, rows, fields) {

            if(err){
                //console.log(ret.err);
                callback(null);
                logger.error(err);
                return false;
            }
            else{
                if(rows == null || rows.length == 0){
                    callback(null);
                    return false;
                }

                var seller_row = rows[0];

                var sql1 = 'select * from t_users where userid={0}'.format(to_id);
                query(sql1, function(err1, rows1, fields) {

                    if (err1) {
                        //console.log(ret.err);
                        callback(null);
                        return false;
                    }
                    else {
                        if (rows1 == null || rows1.length == 0) {
                            callback(null);
                            return false;
                        }

                        var buyer_row = rows1[0];

                        var getted_data = {
                            seller_id: seller_row.id,
                            seller_name: seller_row.name,
                            buyer_id: buyer_row.userid,
                            buyer_name: buyer_row.name,
                            room_count_purchased: room_count,
                            purchase_date: Math.ceil(Date.now() / 1000),
                            before_room_count_of_seller: parseInt(seller_row.room_count_useable) + room_count,
                            after_room_count_of_seller: seller_row.room_count_useable,
                            before_room_count_of_buyer: parseInt(buyer_row.room_count_useable) - room_count,
                            after_room_count_of_buyer: buyer_row.room_count_useable
                        };

                        var sql1 = "INSERT INTO t_purchase(seller_id, seller_name, buyer_id, buyer_name, room_count_purchased, purchase_date, before_room_count_of_seller," +
                            " after_room_count_of_seller, before_room_count_of_buyer, after_room_count_of_buyer, sale_type) VALUES({0},'{1}',{2},'{3}',{4},'{5}',{6}, {7}, {8}, {9}, {10})";
                        sql1 = sql1.format(getted_data.seller_id, getted_data.seller_name, getted_data.buyer_id, getted_data.buyer_name, getted_data.room_count_purchased,
                            getted_data.purchase_date, getted_data.before_room_count_of_seller, getted_data.after_room_count_of_seller,
                            getted_data.before_room_count_of_buyer, getted_data.after_room_count_of_buyer, sale_type);

                        query(sql1, function(err2, rows2, fields1) {

                            if (err2) {
                                //console.log(ret.err);
                                callback(null);
                                return false;
                            }
                            else {
                                callback(true);
                                return true;
                            }
                        });
                    }
                });




            }
        });
    }

};

exports.change_dealer_in_room_table = function(update_data, callback){
    if(update_data.from_id == null || update_data.to_id == null){
        callback(null);
        return false;
    }

    var from_id = update_data.from_id;
    var to_id = update_data.to_id;
    var room_count = update_data.room_count_added;

    var sql = 'SELECT * from t_rooms WHERE dealer_id={0} AND room_state=0'.format(from_id);
    query(sql, function(err, rows, fields) {

        if(err){
            //console.log(ret.err);
            callback(null);
            return false;
        }
        else{
            if(rows == null || rows.length == 0 || parseInt(room_count) > rows.length){
                callback(null);
                return false;
            }

            var need_room_ids = [];

            var sql1 = 'UPDATE t_rooms SET dealer_id = CASE uuid ';
            var where_command = 'WHERE ';
            for(var i = 0; i < parseInt(room_count); i++){
                sql1 += 'WHEN "{0}" THEN {1} '.format(rows[i].uuid, to_id);
                if(i == 0)
                    where_command += 'uuid="{0}" '.format(rows[i].uuid)
                else
                    where_command += 'OR uuid="{0}" '.format(rows[i].uuid)

                need_room_ids.push(rows[i].id);

            }
            sql1 += 'END ' + where_command;

            query(sql1, function(err1, rows1, fields1) {

                if (err1) {
                    //console.log(ret.err);
                    callback(null);
                    return false;
                }
                else {
                    callback(need_room_ids);
                    return true;
                }
            });


        }
    });
};

exports.read_dealer_info = function(search_data, callback){
    callback = callback == null? nop:callback;

    if(search_data.dealer_id == null && search_data.phone_number){
        callback(null);
        return;
    }
    var userid = search_data.dealer_id;
    var other_id = search_data.other_id;
    var phone_number = search_data.phone_number;

    var sql = '';

    if(phone_number){
        sql = 'SELECT * from t_managers ' + 'WHERE phone_number="{0}"'.format(phone_number);
    }
    else{
        sql = 'SELECT * from t_managers ' + 'WHERE id={0}';
        sql = sql.format(userid);

        if(other_id != null){
            sql = 'SELECT * from t_managers WHERE id={0} AND register_dealer_id={1}'.format(other_id, userid);
        }
    }



    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        if(rows != null && rows.length > 0){
            var row = rows[0];
            if(row.name != null && row.name != '')
                row.name = crypto.fromBase64(row.name);
            if(row.weixin_id != null && row.weixin_id != '')
                row.weixin_id = crypto.fromBase64(row.weixin_id);

            callback(row);
        }
        else{
            callback(null);
        }


    });
};

exports.dealer_add = function(add_data, register_dealer_id, callback){
    callback = callback == null? nop:callback;

    if(add_data.name == null || add_data.password == null){
        callback(null);
        return;
    }

    add_data.name = crypto.toBase64(add_data.name);
    add_data.weixin_id = crypto.toBase64(add_data.weixin_id);

    var sql = "INSERT INTO t_managers(name, password, level, region_of_dealer, phone_number, weixin_id, date_created, date_modified, register_dealer_id,dealer_type) VALUES('{0}','{1}',{2},'{3}','{4}','{5}',{6}, {7}, {8}, {9})";
    sql = sql.format(add_data.name, add_data.password, 1, add_data.region, add_data.phone_number, add_data.weixin_id, Date.now() / 1000, Date.now() / 1000, register_dealer_id, add_data.dealer_type);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows);
        }
    });
};

exports.dealer_update = function(add_data, id, callback){
    callback = callback == null? nop:callback;

    if(id == null || add_data.name == null || add_data.password == null){
        callback(null);
        return;
    }

    add_data.name = crypto.toBase64(add_data.name);
    add_data.weixin_id = crypto.toBase64(add_data.weixin_id);

    var sql = "UPDATE t_managers SET name = '{0}',password='{1}',region_of_dealer='{2}',phone_number='{3}', weixin_id='{4}', dealer_type={5} WHERE id = {6}";

    // var sql = "INSERT INTO t_managers(name, password, level, region_of_dealer, phone_number, weixin_id, date_created, date_modified, register_dealer_id,dealer_type) VALUES('{0}','{1}',{2},'{3}','{4}','{5}',{6}, {7}, {8}, {9})";
    sql = sql.format(add_data.name, add_data.password, add_data.region, add_data.phone_number, add_data.weixin_id, add_data.dealer_type, id);

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows);
        }
    });
};

exports.purchase_add = function(add_data, callback){
    callback = callback == null? nop:callback;

    if(add_data.seller_id == null || add_data.seller_id == 'NaN' || add_data.buyer_id == null || add_data.buyer_id == 'NaN'){
        callback(null);
        return;
    }

    add_data.seller_name = crypto.toBase64(add_data.seller_name);
    add_data.buyer_name = crypto.toBase64(add_data.buyer_name);

    var sql = "INSERT INTO t_purchase(seller_id, seller_name, buyer_id, buyer_name, room_count_purchased, purchase_date) VALUES({0},'{1}',{2},'{3}',{4},'{5}')";
    sql = sql.format(add_data.seller_id, add_data.seller_name, add_data.buyer_id, add_data.buyer_name, add_data.room_count_purchased, Math.ceil(Date.now() / 1000));

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows);
        }
    });
};

exports.dealer_list = function(order_by, id, name,level,register_dealer_id, callback){
    callback = callback == null? nop:callback;

    if(id == null){
        callback(null);
        return;
    }
    name = crypto.toBase64(name);

    var sql = '';

    if(id == ''){
        if(parseInt(register_dealer_id) == 1){
            sql = 'SELECT * from t_managers '
                + 'WHERE level = {3} and name like "%{1}%" order by {2} ';
            sql = sql.format(id, name, order_by, level);
        }
        else{
            sql = 'SELECT * from t_managers '
                + 'WHERE register_dealer_id={4} and level = {3} and name like "%{1}%" order by {2} ';
            sql = sql.format(id, name, order_by, level, register_dealer_id);
        }

    }
    else{
        if(parseInt(register_dealer_id) == 1){
            sql = 'SELECT * from t_managers '
                + 'WHERE level = {3} and id = {0} and name like "%{1}%" order by {2} ';
            sql = sql.format(id, name, order_by, level);
        }
        else{
            sql = 'SELECT * from t_managers '
                + 'WHERE register_dealer_id={4} and level = {3} and id = {0} and name like "%{1}%" order by {2} ';
            sql = sql.format(id, name, order_by, level, register_dealer_id);
        }

    }


    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        for(var i = 0; i < rows.length; ++i){
            rows[i].name = crypto.fromBase64(rows[i].name);
            rows[i].weixin_id = crypto.fromBase64(rows[i].weixin_id);
        }

        callback(rows);
    });
};

exports.room_list = function(order_by, id, name,level, dealer_id, dealer_level, callback){
    callback = callback == null? nop:callback;

    if(id == null){
        callback(null);
        return;
    }
    name = crypto.toBase64(name);

    var sql = '';

    if(dealer_level == Global.ADMINISTRATOR_LEVEL){
        if(id == ''){
            sql = 'SELECT * from t_rooms '
                + 'order by {0} ';
            sql = sql.format(order_by);
        }
        else{
            sql = 'SELECT * from t_rooms '
                + 'WHERE id = "{0}" order by {1} ';
            sql = sql.format(id, order_by);
        }
    }
    else{
        if(id == ''){
            sql = 'SELECT * from t_rooms '
                + 'WHERE dealer_id = {1} order by {0} ';
            sql = sql.format(order_by, dealer_id);
        }
        else{
            sql = 'SELECT * from t_rooms '
                + 'WHERE dealer_id = {2} and id = "{0}" order by {1} ';
            sql = sql.format(id, order_by, dealer_id);
        }
    }




    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        for(var i = 0; i < rows.length; ++i){
            var row = rows[i];
            if(row.user_name0 != null && row.user_name0 != '')
                rows[i].user_name0 = crypto.fromBase64(rows[i].user_name0);
            if(row.user_name1 != null && row.user_name1 != '')
                rows[i].user_name1 = crypto.fromBase64(rows[i].user_name1);
            if(row.user_name2 != null && row.user_name2 != '')
                rows[i].user_name2 = crypto.fromBase64(rows[i].user_name2);
            if(row.user_name3 != null && row.user_name3 != '')
                rows[i].user_name3 = crypto.fromBase64(rows[i].user_name3);
        }

        callback(rows);
    });
};

exports.purchase_list = function(query_data, callback){
    callback = callback == null? nop:callback;

    var id = query_data.id;
    var seller_name = query_data.seller_name;
    var order_by = query_data.order_by;
    var buyer_name = query_data.buyer_name;
    var buyer_id = query_data.dealer_id;


    if(id == null){
        callback(null);
        return;
    }
    seller_name = crypto.toBase64(seller_name);
    buyer_name = crypto.toBase64(buyer_name);

    var sql = 'SELECT * from t_purchase WHERE ';

    var first = true;

    if(id != ''){
        sql = 'id = {0} ';
        sql = sql.format(id);
        first = false;
    }

    if(buyer_id != ''){
        if(first){
            sql += 'buyer_id = {0} '.format(buyer_id);
            first = false;
        }
        else{
            sql += 'and buyer_id = {0} '.format(buyer_id);
            first = false;
        }

    }

    if(seller_name != ''){
        if(first){
            sql += 'seller_name = "{0}" '.format(seller_name);
            first = false;
        }
        else{
            sql += 'and seller_name = "{0}" '.format(seller_name);
        }

    }

    if(buyer_name != ''){
        if(first){
            sql += 'buyer_name = "{0}" '.format(buyer_name);
            first = false;
        }
        else{
            sql += 'and buyer_name = "{0}" '.format(buyer_name);
        }

    }

    if(order_by != ''){
        sql += 'order by {0}'.format(order_by);
    }

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        for(var i = 0; i < rows.length; ++i){
            var row = rows[i];
            if(row.seller_name != null && row.seller_name != '')
                rows[i].seller_name = crypto.fromBase64(rows[i].seller_name);
            if(row.buyer_name != null && row.buyer_name != '')
                rows[i].buyer_name = crypto.fromBase64(rows[i].buyer_name);
        }

        callback(rows);
    });
};

exports.sale_list = function(query_data, callback){
    callback = callback == null? nop:callback;

    var id = query_data.id;
    var seller_name = query_data.seller_name;
    var order_by = query_data.order_by;
    var buyer_name = query_data.buyer_name;
    var seller_id = query_data.dealer_id;


    if(id == null){
        callback(null);
        return;
    }
    seller_name = crypto.toBase64(seller_name);
    buyer_name = crypto.toBase64(buyer_name);

    var sql_sale_type_0 = 'select * from (select t1.id, t1.seller_id, c.phone_number as seller_phone_number, t1.seller_name, t1.buyer_id, t1.buyer_phone_number, t1.buyer_name, t1.room_count_saled, t1.sale_type, t1.payment_status, t1.sale_date, t1.before_room_count_of_seller, t1.after_room_count_of_seller, t1.before_room_count_of_buyer, t1.after_room_count_of_buyer from (select b.id, b.seller_id, a.phone_number as buyer_phone_number, b.seller_name, b.buyer_id, b.buyer_name, b.room_count_purchased as room_count_saled, b.sale_type, b.payment_status, b.purchase_date as sale_date, b.before_room_count_of_seller, b.after_room_count_of_seller, b.before_room_count_of_buyer, b.after_room_count_of_buyer from t_managers a inner join t_purchase b on a.id=b.buyer_id and sale_type=0) t1 inner join t_managers c on t1.seller_id=c.id) t2 ';
    var sql_sale_type_1 = 'select * from (select t1.id, t1.seller_id, bb.phone_number as seller_phone_number, t1.seller_name, t1.buyer_id, cc.phone_number as buyer_phone_number, t1.buyer_name, t1.room_count_purchased as room_count_saled, t1.sale_type, t1.payment_status, t1.purchase_date as sale_date, t1.before_room_count_of_seller, t1.after_room_count_of_seller, t1.before_room_count_of_buyer, t1.after_room_count_of_buyer from (select * from t_purchase aa where seller_id={0} and sale_type=1) t1 inner join t_users cc on t1.buyer_id=cc.userid inner join t_managers bb on t1.seller_id=bb.id) t2 '.format(seller_id);
    var where_sql = 'WHERE ';

    var first = true;

    if(id != ''){
        where_sql = 't2.id = {0} ';
        where_sql = where_sql.format(id);
        first = false;
    }

    if(seller_id != ''){
        if(first){
            where_sql += 't2.seller_id = {0} '.format(seller_id);
            first = false;
        }
        else{
            where_sql += 'and t2.seller_id = {0} '.format(seller_id);
            first = false;
        }

    }

    if(seller_name != ''){
        if(first){
            where_sql += 't2.seller_name = "{0}" '.format(seller_name);
            first = false;
        }
        else{
            where_sql += 't2.and seller_name = "{0}" '.format(seller_name);
        }

    }

    if(buyer_name != ''){
        if(first){
            where_sql += 't2.buyer_name = "{0}" '.format(buyer_name);
            first = false;
        }
        else{
            where_sql += 'and t2.buyer_name = "{0}" '.format(buyer_name);
        }

    }

    if(order_by != ''){
        where_sql += 'order by t2.{0}'.format(order_by);
    }

    sql_sale_type_0 += where_sql;
    sql_sale_type_1 += where_sql;

    logger.log( sql_sale_type_0);

    query(sql_sale_type_0, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        var sale_type_0_data = rows;

        query(sql_sale_type_1, function(err, rows1, fields) {
            if (err) {
                callback(null);
                logger.log(err);
                throw err;
            }

            var sale_type_1_data = rows1;

            var ret_data = [];

            for(var i = 0; i < sale_type_0_data.length; ++i){
                var row = sale_type_0_data[i];
                if(row.seller_name != null && row.seller_name != '')
                    row.seller_name = crypto.fromBase64(row.seller_name);
                if(row.buyer_name != null && row.buyer_name != '')
                    row.buyer_name = crypto.fromBase64(row.buyer_name);
                ret_data.push(row);
            }

            for(var j = 0; j < sale_type_1_data.length; ++j){
                var row1 = sale_type_1_data[j];
                if(row1.seller_name != null && row1.seller_name != '')
                    row1.seller_name = crypto.fromBase64(row1.seller_name);
                if(row1.buyer_name != null && row1.buyer_name != '')
                    row1.buyer_name = crypto.fromBase64(row1.buyer_name);
                ret_data.push(row1);
            }



            callback(ret_data);
        });

        // callback(rows);
    });
};

exports.update_purchase = function (update_data, callback) {
    callback = callback == null? nop:callback;

    if(update_data.id == null){
        callback(null);
        return;
    }

    var sql = 'UPDATE t_purchase SET ';

    if(update_data.seller_name != null){
        update_data.seller_name = crypto.toBase64(update_data.seller_name);
        sql += 'seller_name = "{0}", '.format(update_data.seller_name);
    }

    if(update_data.buyer_name != null){
        update_data.buyer_name = crypto.toBase64(update_data.buyer_name);
        sql += 'buyer_name = "{0}", '.format(update_data.buyer_name);
    }

    if(update_data.room_count_purchased != null){
        sql += 'room_count_purchased = {0}, '.format(update_data.room_count_purchased);
    }

    if(update_data.payment_status != null){
        sql += 'payment_status = {0}, '.format(update_data.payment_status);
    }

    if(update_data.before_room_count_of_seller != null){
        sql += 'before_room_count_of_seller = {0}, '.format(update_data.before_room_count_of_seller);
    }

    if(update_data.after_room_count_of_seller != null){
        sql += 'after_room_count_of_seller = {0}, '.format(update_data.after_room_count_of_seller);
    }

    if(update_data.before_room_count_of_buyer != null){
        sql += 'before_room_count_of_buyer = {0}, '.format(update_data.before_room_count_of_buyer);
    }

    if(update_data.after_room_count_of_buyer != null){
        sql += 'after_room_count_of_buyer = {0}, '.format(update_data.after_room_count_of_buyer);
    }

    if(update_data.sale_type != null){
        sql += 'sale_type = {0}, '.format(update_data.sale_type);
    }

    sql = sql.substring(0, sql.length - 2);

    sql += ' WHERE id = ' + update_data.id;
    ////console.log(sql);
    query(sql, function(err, rows, fields) {

        if(err){
            callback(null);
        }
        else{
            callback(true);
        }
    });
};

exports.purchase_detail_info = function(id, callback){
    callback = callback == null? nop:callback;

    if(id == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_purchase ' + 'WHERE id={0}';
    sql = sql.format(id);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        var row = rows[0];
        if(row.seller_name != null && row.seller_name != '')
            row.seller_name = crypto.fromBase64(row.seller_name);
        if(row.buyer_name != null && row.buyer_name != '')
            row.buyer_name = crypto.fromBase64(row.buyer_name);

        callback(row);
    });
};

exports.purchase_list_with_dealer_id = function(dealer_id, id_type, callback){
    callback = callback == null? nop:callback;

    if(dealer_id == null){
        callback(null);
        return;
    }
    var sql = '';

    if(id_type == 0){
        // in case seller_id;
        sql = 'SELECT * from t_purchase ' + 'WHERE seller_id={0}';
    }
    else{
        // in case buyer_id;
        sql = 'SELECT * from t_purchase ' + 'WHERE buyer_id={0}';
    }
    sql = sql.format(dealer_id);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        if(!rows || rows.length == 0){
            callback(null);
            return;
        }

        for(var i = 0; i < rows.length; i++){
            var row = rows[i];
            if(row.seller_name != null && row.seller_name != '')
                row.seller_name = crypto.fromBase64(row.seller_name);
            if(row.buyer_name != null && row.buyer_name != '')
                row.buyer_name = crypto.fromBase64(row.buyer_name);
        }


        callback(rows);
    });
};

exports.get_dealer = function(name, phone_number, weixin_id, callback){
    callback = callback == null? nop:callback;

    if(name == null || phone_number == null || weixin_id == null){
        logger.error('name , phone_number or weixin_id is null.');
        callback(null);
        return;
    }

    name = crypto.toBase64(name);
    weixin_id = crypto.toBase64(weixin_id);

    var sql = 'SELECT * from t_managers '
        + 'WHERE name = "{0}" and phone_number = "{1}" and weixin_id = "{2}"';
    sql = sql.format(name, phone_number, weixin_id);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        for(var i = 0; i < rows.length; ++i){
            rows[i].name = crypto.fromBase64(rows[i].name);
            rows[i].weixin_id = crypto.fromBase64(rows[i].weixin_id);
        }

        callback(rows);
    });
};

exports.create_empty_rooms = function(add_data, room_count, dealer_id, callback){
    callback = callback == null? nop:callback;

    if(room_count == null || dealer_id == null || dealer_id == ''){
        callback(null);
        return;
    }

    add_data.name = crypto.toBase64(add_data.name);
    add_data.weixin_id = crypto.toBase64(add_data.weixin_id);

    var sql = "INSERT INTO t_managers(name, password, level, region_of_dealer, phone_number, weixin_id, date_created, date_modified) VALUES('{0}','{1}',{2},'{3}','{4}','{5}',{6}, {7})";
    sql = sql.format(add_data.name, add_data.password, 1, add_data.region, add_data.phone_number, add_data.weixin_id, Date.now(), Date.now());

    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            logger.log( err);
            throw err;
        }
        else{
            callback(rows);
        }
    });
};

///////终端管理相关函数
exports.read_user_account = function(adminId, adminPwd, token, callback){
    callback = callback == null? nop:callback;

    if((adminId == null || adminPwd== null) && token == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_managers WHERE ';

    if (token != null){
        sql = sql + 'token="{0}"';
        sql = sql.format(token);
    } else {
        sql = sql +'name="{0}" and password="{1}"';
        sql = sql.format(adminId, adminPwd);
    }

    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            logger.log(err);
            throw err;
        }

        logger.log( rows);
        callback(rows);
    });
};

exports.room_detail_info = function(uuid, callback){
    callback = callback == null? nop:callback;

    if(uuid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_rooms ' + 'WHERE uuid="{0}"';
    sql = sql.format(uuid);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        var row = rows[0];
        if(row.user_name0 != null && row.user_name0 != '')
            row.user_name0 = crypto.fromBase64(row.user_name0);
        if(row.user_name1 != null && row.user_name1 != '')
            row.user_name1 = crypto.fromBase64(row.user_name1);
        if(row.user_name2 != null && row.user_name2 != '')
            row.user_name2 = crypto.fromBase64(row.user_name2);
        if(row.user_name3 != null && row.user_name3 != '')
            row.user_name3 = crypto.fromBase64(row.user_name3);

        callback(row);
    });
};

exports.close_room = function (create_dealer_id, roomId, callback) {
    callback = callback == null? nop:callback;
    if(roomId == null){
        callback(false);
    }

    var sql = '';
    if(create_dealer_id){
        sql = "DELETE FROM t_rooms WHERE id = '{0}' AND dealer_id={1}";
        sql = sql.format(roomId, create_dealer_id);
    }
    else{
        sql = "DELETE FROM t_rooms WHERE id = '{0}'";
        sql = sql.format(roomId);
    }

    // console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
        }
        else{
            callback(true);
        }
    });

};



exports.query = query;