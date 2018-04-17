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
    pool.getConnection(function(err,conn){
        if(err){
            callback(err,null,null);
        }else{
            console.log('------------------SQL CONTENT!---------------');
            console.log(sql);
            console.log('---------------------------------------------')
            conn.query(sql,function(qerr,vals,fields){
                //释放连接
                conn.release();
                //事件驱动回调
                callback(qerr,vals,fields);
            });
        }
    });
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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

    var sql = 'SELECT userid,account,name,lv,exp,coins,gems,roomid FROM t_users WHERE userid = ' + userid;
    query(sql, function(err, rows, fields) {
        if (err) {
            callback(null);
            throw err;
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
    var sql = 'UPDATE t_users SET gems = gems +' + gems + ' WHERE userid = ' + userid;
    // console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            // console.log(err);
            callback(false);
            return;
        }
        else{
            callback(rows.affectedRows > 0);
            return;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
        }
        callback(true);
    });
};

exports.update_user_gem_and_charge_amount = function (user_id, gems, charge_amount) {
    if(user_id == null || gems== null){
        return;
    }

    var sql = "UPDATE t_users SET gems='{0}', charge_amount='{1}' WHERE userid='{2}'";
    sql = sql.format(gems, charge_amount, user_id);
    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
        }
        callback(rows);
    });
};

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
            throw err;
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
            throw err;
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
            throw err;
        }
        else{
            callback(rows.length > 0);
        }
    });
};

exports.set_room_id_of_user = function(userId,roomId,callback){
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
            throw err;
        }
        else{
            callback(rows.length > 0);
        }
    });
};

exports.get_room_id_of_user = function(userId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT roomid FROM t_users WHERE userid = "' + userId + '"';
    query(sql, function(err, rows, fields) {
        if(err){
            callback(null);
            throw err;
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
    if(conf.dealer_id == null){
        conf.dealer_id = 0;
    }
    sql = sql.format(uuid,roomId, conf.dealer_id ,baseInfo,ip,port,create_time);
    // console.log(sql);
    query(sql,function(err,row,fields){
        if(err){
            callback(null, err);
            throw err;
        }
        else{
            callback(uuid, null);
        }
    });
};

exports.get_room_uuid = function(roomId,callback){
    callback = callback == null? nop:callback;
    var sql = 'SELECT uuid FROM t_rooms WHERE id = "' + roomId + '"';
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            throw err;
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
            throw err;
        }
        else{
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
            throw err;
        }
        else{
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
    //console.log(sql);
    query(sql,function(err,rows,fields){
        if(err){
            callback(null);
            throw err;
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
            throw err;
        }
        else{
            callback(true);
        }
    });
}

exports.saveScoreInRoomTable = function (room_uuid, scoreDataToSave, callback) {
    callback = callback == null? nop:callback;
    if(room_uuid == null){
        callback(false);
    }
    var sql = "SELECT * FROM t_rooms WHERE uuid='{0}';".format(room_uuid);

    query(sql,function(err,rows,fields){
        if(err){
            callback(false);
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            throw err;
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
            //console.log(ret.err);
            return false;
        }
        else{
            return true;
        }
        // if (err) {
        //     callback(null);
        //     logger.log(err);
        //     throw err;
        // }
        //
        // logger.log( rows);
        // callback(rows);
    });
};

exports.read_dealer_info = function(userid, callback){
    callback = callback == null? nop:callback;

    if(userid == null){
        callback(null);
        return;
    }

    var sql = 'SELECT * from t_managers ' + 'WHERE id="{0}"';
    sql = sql.format(userid);

    logger.log( sql);

    query(sql, function(err, rows, fields) {
        if (err) {
            logger.log(err);
            throw err;
        }

        callback(rows);
    });
};

exports.dealer_add = function(add_data, callback){
    callback = callback == null? nop:callback;

    if(add_data.name == null || add_data.password == null){
        callback(null);
        return;
    }

    add_data.name = crypto.toBase64(add_data.name);
    add_data.weixin_id = crypto.toBase64(add_data.weixin_id);

    var sql = "INSERT INTO t_managers(name, password, level, region_of_dealer, phone_number, weixin_id, date_created, date_modified) VALUES('{0}','{1}',{2},'{3}','{4}','{5}',{6}, {7})";
    sql = sql.format(add_data.name, add_data.password, 1, add_data.region, add_data.phone_number, add_data.weixin_id, Date.now() / 1000, Date.now() / 1000);

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

exports.dealer_list = function(order_by, id, name,level, callback){
    callback = callback == null? nop:callback;

    if(id == null){
        callback(null);
        return;
    }
    name = crypto.toBase64(name);

    var sql = '';

    if(id == ''){
        sql = 'SELECT * from t_managers '
            + 'WHERE level = {3} and name like "%{1}%" order by {2} ';
        sql = sql.format(id, name, order_by, level);
    }
    else{
        sql = 'SELECT * from t_managers '
            + 'WHERE level = {3} and id = {0} and name like "%{1}%" order by {2} ';
        sql = sql.format(id, name, order_by, level);
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
                + 'WHERE dealer_id = "{1}" order by {0} ';
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



exports.query = query;