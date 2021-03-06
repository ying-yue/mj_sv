﻿let db = require('../utils/db');
let Logger = require('../utils/logger');

let rooms = {};
let creatingRooms = {};

let userLocation = {};
let totalRooms = 0;

let REN_SHU = [4,3,3,2];
let JU_SHU = [4,8,16];
let GANG_FEN = [1,2,4];

let ROOM_STATE_EMPTY = 0;
let ROOM_STATE_GAME_STARTING = 1;
let ROOM_STATE_SUCCESS_FINISHED = 2;
let ROOM_STATE_STRONG = 3;
let ROOM_STATE_UNSUCCESS_FINISHED = 4;
let ROOM_STATE_CREATED = 5;
let ROOM_STATE_FAILD = 6;

let SeatCount = 0;

function generateRoomId(){
	let roomId = "";
	for(let i = 0; i < 6; ++i){
		if(i == 0){
            while (true){
            	//여기서 방번호를 생성하는것은 일반사용자들이므로 첫번호를 0, 1 로 고정한다.
                roomId = '';
                roomId += Math.floor(Math.random()*10);
                if(parseInt(roomId) < 2)
                	break;
            }
            continue;
		}

        roomId += Math.floor(Math.random()*10);
	}
	return roomId;
}

function constructRoomFromDb(dbdata){
    let conf = JSON.parse(dbdata.base_info);
	let roomInfo = {
		uuid:dbdata.uuid,
		id:dbdata.id,
		numOfGames:dbdata.num_of_turns,
		createTime:dbdata.create_time,
		nextButton:dbdata.next_button,
		seats:new Array(conf.playerCount),
		conf:conf
	};


	if(roomInfo.conf.type == "xlch"){
		roomInfo.gameMgr = require("./gamemgr_xlch");
	}
	else{
		roomInfo.gameMgr = require("./gamemgr_xzdd");
	}
	let roomId = roomInfo.id;

	for(let i = 0; i < roomInfo.seats.length; ++i){
		let s = roomInfo.seats[i] = {};
		s.userId = dbdata["user_id" + i];
		s.score = dbdata["user_score" + i];
		s.name = dbdata["user_name" + i];
		s.ready = false;
		s.seatIndex = i;
		s.numZiMo = 0;
		s.numJiePao = 0;
		s.numDianPao = 0;
		s.numAnGang = 0;
		s.numMingGang = 0;
		s.numChaJiao = 0;

		if(s.userId > 0){
			userLocation[s.userId] = {
				roomId:roomId,
				seatIndex:i
			};
		}
	}
	rooms[roomId] = roomInfo;
	totalRooms++;
	return roomInfo;
}

exports.get_rooms_ids = function (roomid, callback) {
    return rooms[roomid];
};

exports.add_roominfo_in_rooms = function (req, callback) {
    rooms[req.roomId] = JSON.parse(req.roomInfo);
    rooms[req.roomId].gameMgr = require("./gamemgr_xzdd");
    totalRooms++;

    return true;
};

exports.createRoom = function(creator,roomConf,gems,ip,port,callback){
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
        || roomConf.jewel_count == null
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

		callback(1,null);
		return;
	}

	let fnCreate = function(){
		let roomId = generateRoomId();
		if(rooms[roomId] != null || creatingRooms[roomId] != null){
			fnCreate();
		}
		else{
			creatingRooms[roomId] = true;
			db.is_room_exist(roomId, function(ret) {

				if(ret){
					delete creatingRooms[roomId];
					fnCreate();
				}
				else{
					let createTime = Math.ceil(Date.now()/1000);
					let baseScore = 2;
					if(roomConf.mahjongtype == 0){
						baseScore = 5;
					}

					let roomInfo = {
						uuid:"",
						id:roomId,
						numOfGames:0,
						createTime:createTime,
						nextButton:0,
						seats:[],
						conf:{
							type:roomConf.type,
							baseScore:baseScore,
                            maxGames:JU_SHU[roomConf.jushu],
                            renshu: roomConf.renshu,
							playerCount:REN_SHU[roomConf.renshu],
                            hongdian:roomConf.hongdian,
                            piaohu:roomConf.piaohu,
                            qidui4:roomConf.qidui4,
                            qidui8:roomConf.qidui8,
                            yise:roomConf.yise,
                            tinghoufeigang:roomConf.tinghoufeigang,
                            bubaibalzhung:roomConf.bubaibalzhung,
                            mahjongtype: roomConf.mahjongtype,
							jewel_count: roomConf.jewel_count,
						    creator:creator,
						}
					};

                    SeatCount = REN_SHU[roomConf.renshu];
					
					if(roomConf.type == "xlch"){
						roomInfo.gameMgr = require("./gamemgr_xlch");
					}
					else{
						roomInfo.gameMgr = require("./gamemgr_xzdd");
					}



					for(let i = 0; i < SeatCount; ++i){
						roomInfo.seats.push({
							userId:0,
							score:0,
							name:"",
							ready:false,
							seatIndex:i,
							numZiMo:0,
							numJiePao:0,
							numDianPao:0,
							numAnGang:0,
							numMingGang:0,
							numChaJiao:0,
						});
					}
					

					//写入数据库
					let conf = roomInfo.conf;
					db.create_room(roomInfo.id,roomInfo.conf,ip,port,createTime,function(uuid, error){
						delete creatingRooms[roomId];
						if(uuid != null){
							roomInfo.uuid = uuid;
							rooms[roomId] = roomInfo;
							totalRooms++;

                            Logger.info(`Room(${roomId}) is created. This room's conf is ${roomInfo.conf}.`, roomId);
							callback(0,roomId);
						}
						else{
							let errStr = '';
							if(typeof error == 'string'){
								errStr = error;
							}
							else if(typeof error == 'object'){
                                errStr = JSON.stringify(error);
							}
                            Logger.error(`Room(${roomId}) is not created. Error is ${errStr}.`, roomId);
							callback(3,null);
						}
					});
				}
			});
		}
	};

	fnCreate();
};

exports.destroy = function(roomId, is_success, is_no_game){
	let roomInfo = rooms[roomId];
	if(roomInfo == null){
		return;
	}

	for(let i = 0; i < roomInfo.seats.length; ++i){
		let userId = roomInfo.seats[i].userId;
		if(userId > 0){
			delete userLocation[userId];
			db.set_room_id_of_user(userId,null, null);
		}
	}
	
	delete rooms[roomId];
	totalRooms--;
	// db.delete_room(roomId);
	var room_state = ROOM_STATE_SUCCESS_FINISHED;
	if(!is_success){
		room_state = ROOM_STATE_UNSUCCESS_FINISHED;
	}
	if(!is_no_game)
    	db.update_room_data({roomId: roomId, is_full: 1, room_state: room_state, game_end_time: parseInt(Date.now() / 1000)});
};

exports.getTotalRooms = function(){
	return totalRooms;
};

exports.getSeatCount = function(roomId){
    return rooms[roomId].seats.length;
};

exports.getRoom = function(roomId){
	return rooms[roomId];
};

exports.isCreator = function(roomId,userId){
	let roomInfo = rooms[roomId];
	if(roomInfo == null){
		return false;
	}
	return roomInfo.conf.creator == userId;
};

exports.enterRoom = function(roomId,userId,userName,callback){
	let fnTakeSeat = function(room){
		if(exports.getUserRoom(userId) == roomId){
			//已存在
			return 0;
		}

		for(let i = 0; i < room.seats.length; ++i){
			let seat = room.seats[i];
			if(seat.userId <= 0){
				seat.userId = userId;
				seat.name = userName;
				userLocation[userId] = {
					roomId:roomId,
					seatIndex:i
				};
				//console.log(userLocation[userId]);
				db.update_seat_info(roomId,i,seat.userId,"",seat.name);
				//正常
				return 0;
			}
		}	
		//房间已满
		return 1;	
	};
	let room = rooms[roomId];
	if(room){
		let ret = fnTakeSeat(room);
		callback(ret);
	}
	else{
		db.get_room_data(roomId,function(dbdata){
			if(dbdata == null){
				//找不到房间
				callback(2);
			}
			else{
				//construct room.
				var baseInfoJson = JSON.parse(dbdata.base_info);
				var player_count_base_info = baseInfoJson.playerCount;
				var player_count = 0;
				if(baseInfoJson.user_id0 > 0)
                    player_count++;
				else if(baseInfoJson.user_id1 > 0)
                    player_count++;
                else if(baseInfoJson.user_id2 > 0)
                    player_count++;
                else if(baseInfoJson.user_id3 > 0)
                    player_count++;
                if(dbdata.is_full == 1 || dbdata.room_state != ROOM_STATE_EMPTY || player_count >= player_count_base_info){
                    callback(2);
				}
				else{
                    room = constructRoomFromDb(dbdata);
                    //
                    let ret = fnTakeSeat(room);
                    callback(ret);
				}

			}
		});
	}
};

exports.setReady = function(userId,value){
	let roomId = exports.getUserRoom(userId);
	if(roomId == null){
		return;
	}

	let room = exports.getRoom(roomId);
	if(room == null){
		return;
	}

	let seatIndex = exports.getUserSeat(userId);
	if(seatIndex == null){
		return;
	}

	let s = room.seats[seatIndex];
	s.ready = value;
};

exports.isReady = function(userId){
	let roomId = exports.getUserRoom(userId);
	if(roomId == null){
		return;
	}

	let room = exports.getRoom(roomId);
	if(room == null){
		return;
	}

	let seatIndex = exports.getUserSeat(userId);
	if(seatIndex == null){
		return;
	}

	let s = room.seats[seatIndex];
	return s.ready;	
};


exports.getUserRoom = function(userId){
	let location = userLocation[userId];
	if(location != null){
		return location.roomId;
	}
	return null;
};

exports.getUserSeat = function(userId){
	let location = userLocation[userId];
	//console.log(userLocation[userId]);
	if(location != null){
		return location.seatIndex;
	}
	return null;
};

exports.getUserLocations = function(){
	return userLocation;
};

exports.delete_user_data = function (userId) {
    let location = userLocation[userId];
    if(location == null)
        return;
    let roomId = location.roomId;
    let seatIndex = location.seatIndex;
    let room = rooms[roomId];
    // delete userLocation[userId];
    if(room == null || seatIndex == null) {
        return;
    }

    let seat = room.seats[seatIndex];
    seat.userId = 0;
    seat.name = "";
    delete userLocation[userId];
    db.set_room_id_of_user(userId,null, null);
    db.delete_user_info_in_room_table(userId,roomId);
};
exports.exitRoomWhenBeforeGame = function(userId){
    let location = userLocation[userId];
    if(location == null)
        return;

    let roomId = location.roomId;
    let seatIndex = location.seatIndex;
    let room = rooms[roomId];
    // delete userLocation[userId];
    if(room == null || seatIndex == null) {
        return;
    }

    let seat = room.seats[seatIndex];
    seat.userId = 0;
    seat.name = "";

    var userIdList = [];
    for(let i = 0; i < room.seats.length; ++i){
        if(room.seats[i].userId > 0){
            userIdList.push(room.seats[i].userId);
        }
    }

    exports.destroy(roomId, false, true);
    db.delete_room(roomId);
	return userIdList;
};

exports.exitRoom = function(userId){
	let location = userLocation[userId];
	if(location == null)
		return;

	let roomId = location.roomId;
	let seatIndex = location.seatIndex;
	let room = rooms[roomId];
	delete userLocation[userId];
	if(room == null || seatIndex == null) {
		return;
	}

	let seat = room.seats[seatIndex];
	seat.userId = 0;
	seat.name = "";

	let numOfPlayers = 0;
	for(let i = 0; i < room.seats.length; ++i){
		if(room.seats[i].userId > 0){
			numOfPlayers++;
		}
	}
	
	db.set_room_id_of_user(userId,null, roomId);

	if(numOfPlayers == 0){
		exports.destroy(roomId, false, true);
	}
};