let roomMgr = require('./roommgr');
let Logger = require('../utils/logger');
let userList = {};
let userOnline = 0;
exports.bind = function(userId,socket){
    userList[userId] = socket;
    userOnline++;
};

exports.del = function(userId){
    delete userList[userId];
    userOnline--;
};

exports.get = function(userId){
    return userList[userId];
};

exports.isOnline = function(userId){
    let data = userList[userId];
    return data != null;
    // if(data != null){
    //     return true;
    // }
    // return false;
};

exports.getOnlineCount = function(){
    return userOnline;
};

exports.sendMsg = function(userId,event,msgdata){
    let roomId = roomMgr.getUserRoom(userId);

    let userInfo = userList[userId];

    if(userInfo == null){
        Logger.log(`Did not send message(${event}) to user(userID-${userId}) because roomID is NULL.`, roomId);

        return;
    }

    let socket = userInfo;
    if(socket == null){
        return;
    }

    Logger.log(`Sent message(${event}) to user(userID-${userId}).`, roomId);

    socket.emit(event,msgdata);
};

exports.kickAllInRoom = function(roomId){
    if(roomId == null){
        return;
    }
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    for(let i = 0; i < roomInfo.seats.length; ++i){
        let rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId > 0){
            let socket = userList[rs.userId];
            if(socket != null){
                exports.del(rs.userId);
                socket.disconnect();
            }
        }
    }
};

exports.broacastInRoom = function(event,data,sender,includingSender){
    let roomId = roomMgr.getUserRoom(sender);
    if(roomId == null){
        Logger.log(`Did not send message(${event}) to all users except to the user(userID-${sender}) because roomID is NULL.`, roomId);
        return;
    }
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        Logger.log(`Did not send message(${event}) to all users except to the user(userID-${sender}) because roomInfo is NULL.`, roomId);
        return;
    }

    Logger.log(`Sent message(${event}) to all users except to the user(userID-${sender}).`, roomId);

    for(let i = 0; i < roomInfo.seats.length; ++i){
        let rs = roomInfo.seats[i];

        //如果不需要发给发送方，则跳过
        if(rs.userId == sender && includingSender != true){
            continue;
        }
        let socket = userList[rs.userId];
        if(socket != null){
            socket.emit(event,data);
        }
    }
};