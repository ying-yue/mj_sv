var crypto = require('../utils/crypto');
var db = require('../utils/db');
let Logger = require('../utils/logger');

var tokenMgr = require('./tokenmgr');
var roomMgr = require('./roommgr');
var userMgr = require('./usermgr');
var io = null;
exports.start = function(config,mgr){
	io = require('socket.io')(config.CLIENT_PORT);

	io.sockets.on('connection',function(socket){

		socket.on('login',function(data){
			if(typeof(data) !== "object"){
                data = JSON.parse(data);
			}

			if(socket.userId != null){
				//已经登陆过的就忽略
				return;
			}
			var token = data.token;
			var roomId = data.roomid;
			var time = data.time;
			var sign = data.sign;

			// console.log(roomId);
			// console.log(token);
			// console.log(time);
			// console.log(sign);


			//检查参数合法性
			if(token == null || roomId == null || sign == null || time == null){
				Logger.error(`Login failed. Token or roomid or sign or time is NULL. Token: ${token}, roomid: ${roomId}, sign: ${sign}, time: ${time}`, roomId);

				socket.emit('login_result',{errcode:1,errmsg:"invalid parameters"});
				return;
			}

			//检查参数是否被篡改
			var md5 = crypto.md5(roomId + token + time + config.ROOM_PRI_KEY);
			if(md5 != sign){
                Logger.error(`Login failed. Invalid sign. When sign is compared with md5, those are not same. So, md5: ${md5}, sign: ${sign}`, roomId);

                socket.emit('login_result',{errcode:2,errmsg:"login failed. invalid sign!"});
				return;
			}

			//检查token是否有效
			if(tokenMgr.isTokenValid(token)==false){
                Logger.error(`Login failed. Invalid token. So, token: ${token}`, roomId);

                socket.emit('login_result',{errcode:3,errmsg:"token out of time."});
				return;
			}

			//检查房间合法性
			var userId = tokenMgr.getUserID(token);
			roomId = roomMgr.getUserRoom(userId);

			userMgr.bind(userId,socket);
			socket.userId = userId;

            socket.is_connected = false;

			//返回房间信息
			var roomInfo = roomMgr.getRoom(roomId);

			var seatIndex = roomMgr.getUserSeat(userId);
			roomInfo.seats[seatIndex].ip = socket.handshake.address;

			var userData = null;
			var seats = [];
			for(var i = 0; i < roomInfo.seats.length; ++i){
				var rs = roomInfo.seats[i];
				var online = false;
				if(rs.userId > 0){
					online = userMgr.isOnline(rs.userId);
				}

				seats.push({
					userid:rs.userId,
					ip:rs.ip,
					score:rs.score,
					name:rs.name,
					online:online,
					ready:rs.ready,
					seatindex:i
				});

				if(userId == rs.userId){
					userData = seats[i];
				}
			}

			//通知前端
			var ret = {
				errcode:0,
				errmsg:"ok",
				data:{
					roomid:roomInfo.id,
					conf:roomInfo.conf,
					numofgames:roomInfo.numOfGames,
					seats:seats
				}
			};
			// socket.emit('login_result',ret);

            socket.gameMgr = roomInfo.gameMgr;

            socket.gameMgr.login_result(userId, ret);

			//通知其它客户端
			userMgr.broacastInRoom('new_user_comes_push',userData,userId);



			//玩家上线，强制设置为TRUE
			// socket.gameMgr.setReady(userId);



			socket.emit('login_finished');


            for(let i = 0; i < roomInfo.seats.length; ++i){
                let rs = roomInfo.seats[i];

                if(rs && rs.ready){
                    userMgr.sendMsg(userId,'user_ready_push',{userid:rs.userId,ready:true});
				}
            }

			if(roomInfo.dr != null){
				var dr = roomInfo.dr;
				var ramaingTime = (dr.endTime - Date.now()) / 1000;
				var data = {
					time:ramaingTime,
					states:dr.states
				};
				userMgr.sendMsg(userId,'dissolve_notice_push',data);
			}
		});

		socket.on('ready',function(data){
			var userId = socket.userId;
			if(userId == null){
				return;
			}
			socket.gameMgr.setReady(userId);
			// userMgr.broacastInRoom('user_ready_push',{userid:userId,ready:true},userId,true);
		});

		//换牌
		socket.on('huanpai',function(data){
			if(socket.userId == null){
				return;
			}
			if(data == null){
				return;
			}

			if(typeof(data) == "string"){
				data = JSON.parse(data);
			}

			var p1 = data.p1;
			var p2 = data.p2;
			var p3 = data.p3;
			if(p1 == null || p2 == null || p3 == null){
				// console.log("invalid data");
				return;
			}
			socket.gameMgr.huanSanZhang(socket.userId,p1,p2,p3);
		});

		//定缺
		socket.on('dingque',function(data){
			if(socket.userId == null){
				return;
			}
			var que = data;
			socket.gameMgr.dingQue(socket.userId,que);
		});

        socket.on('dice_play_result',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.dice_play_result(socket.userId,data);
        });

        socket.on('dice_start',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.dice_start(socket.userId);
        });

		//出牌
		socket.on('chupai',function(data){
			if(socket.userId == null){
				return;
			}
			var pai = data;
			socket.gameMgr.chuPai(socket.userId,pai);
		});

		//碰
		socket.on('peng',function(data){
			if(socket.userId == null){
				return;
			}
			socket.gameMgr.peng(socket.userId);
		});

		// client 로부터 선택된 슌찌요청을 받았을때
        socket.on('shunzi',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.shunzi(socket.userId, data);
        });

        socket.on('ting_client',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.ting_client(socket.userId, data);
        });

        socket.on('ting_client_piao',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.ting_client_piao(socket.userId, data);
        });

        socket.on('ting_client_yise',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.ting_client_yise(socket.userId, data);
        });

        socket.on('ting_pai_client',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.ting_pai_client(socket.userId, data);
        });

        socket.on('gang_tongnansebei',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.gang_tongnansebei(socket.userId, data);
        });

        socket.on('get_renshu',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.get_renshu(socket.userId);
        });

        socket.on('gang_baibalzung',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.gang_baibalzung(socket.userId, data);
        });

        socket.on('gang_ting',function(data){
            if(socket.userId == null){
                return;
            }
            socket.gameMgr.gang_ting(socket.userId, data);
        });


        // //
        // socket.on('checkTongSeNanBei',function(data){
        //     if(socket.userId == null){
        //         return;
        //     }
        //     socket.gameMgr.checkTongSeNanBei(socket.userId, data);
        // });

		//杠
		socket.on('gang',function(data){
			if(socket.userId == null || data == null){
				return;
			}
			var pai = -1;
			if(typeof(data) == "number"){
				pai = data;
			}
			else if(typeof(data) == "string"){
				pai = parseInt(data);
			}
			else{
				console.log("gang:invalid param");
				return;
			}
			socket.gameMgr.gang(socket.userId,pai);
		});

		//胡
		socket.on('hu',function(data){
			if(socket.userId == null){
				return;
			}
			socket.gameMgr.hu(socket.userId);
		});

		//过  遇上胡，碰，杠的时候，可以选择过
		socket.on('guo',function(data){
			if(socket.userId == null){
				return;
			}
			socket.gameMgr.guo(socket.userId);
		});

		//聊天
		socket.on('chat',function(data){
			if(socket.userId == null){
				return;
			}
			var chatContent = data;
			userMgr.broacastInRoom('chat_push',{sender:socket.userId,content:chatContent},socket.userId,true);
		});

		//快速聊天
		socket.on('quick_chat',function(data){
			if(socket.userId == null){
				return;
			}
			var chatId = data;
			userMgr.broacastInRoom('quick_chat_push',{sender:socket.userId,content:chatId},socket.userId,true);
		});

		//语音聊天
		socket.on('voice_msg',function(data){
			if(socket.userId == null){
				return;
			}
			console.log(data.length);
			userMgr.broacastInRoom('voice_msg_push',{sender:socket.userId,content:data},socket.userId,true);
		});

		//表情
		socket.on('emoji',function(data){
			if(socket.userId == null){
				return;
			}
			var phizId = data;
			userMgr.broacastInRoom('emoji_push',{sender:socket.userId,content:phizId},socket.userId,true);
		});

		//语音使用SDK不出现在这里

		//退出房间
		socket.on('exit',function(data){
			var userId = socket.userId;
			if(userId == null){
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);
			if(roomId == null){
				return;
			}

			//如果游戏已经开始，则不可以
			if(socket.gameMgr.hasBegan(roomId)){
				return;
			}

			//如果是房主，则只能走解散房间
			if(roomMgr.isCreator(roomId, userId)){

                userMgr.broacastInRoom('room_close_before_game_notify_push',userId,userId,false);
                userMgr.broacastInRoom('disconnect',userId,userId,false);
                var userIdList = roomMgr.exitRoomWhenBeforeGame(userId);
                db.set_room_id_of_user(userId,null, null);
                if(userIdList){
                	for(var i = 0; i < userIdList.length; i++){
                        userMgr.del(userIdList[i]);
                        db.set_room_id_of_user(userIdList[i],null, null);
					}
				}


			}
			else{

                userMgr.broacastInRoom('exit_notify_push',userId,userId,false);
                socket.gameMgr.remove_dice_signal(userId, roomId);
                roomMgr.delete_user_data(userId);
                userMgr.del(userId);
                // socket.emit('exit_result');
                // socket.emit('exit_result');
			}

			//通知其它玩家，有人退出了房间


			// userMgr.del(userId);

            socket.emit('exit_result');
			socket.disconnect();
		});

		//解散房间
		socket.on('dispress',function(data){
			var userId = socket.userId;
			if(userId == null){
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);
			if(roomId == null){
				return;
			}

			//如果游戏已经开始，则不可以
			if(socket.gameMgr.hasBegan(roomId)){
				return;
			}

			//如果不是房主，则不能解散房间
			if(roomMgr.isCreator(roomId,userId) == false){
				return;
			}

			userMgr.broacastInRoom('dispress_push',{},userId,true);
			userMgr.kickAllInRoom(roomId);
			roomMgr.destroy(roomId, false);
			socket.disconnect();
		});

		//解散房间
		socket.on('dissolve_request',function(data){
			var userId = socket.userId;
			// console.log(1);
            var roomId = roomMgr.getUserRoom(userId);
			if(userId == null){
				Logger.warning(`userId is NULL. (dissolve_request in socket_service)`, roomId);
				return;
			}


			if(roomId == null){
                Logger.warning(`roomId is NULL. (dissolve_request in socket_service)`, roomId);
				return;
			}

			//如果游戏未开始，则不可以
			if(socket.gameMgr.hasBegan(roomId) == false){
                Logger.warning(`Game was already begun in room(roomId-${roomId}). (dissolve_request in socket_service)`, roomId);
				return;
			}

			var ret = socket.gameMgr.dissolveRequest(roomId,userId, data);
			if(ret != null && ret.error_code != 1){
				var dr = ret.dr;
				var ramaingTime = (dr.endTime - Date.now()) / 1000;
				var data = {
					time:ramaingTime,
					states:dr.states
				};
                Logger.log(`Sent message(dissolve_notice_push). (dissolve_request in socket_service)`, roomId);

				userMgr.broacastInRoom('dissolve_notice_push',data,userId,true);
			}
			else{
                if(ret.error_code == 1){
                    userMgr.sendMsg(userId, 'dissolve_notice_push', {error_code: 1})
                }
			}

		});

		socket.on('dissolve_agree',function(data){
			var userId = socket.userId;



			if(userId == null){
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);
			if(roomId == null){
				return;
			}

			var ret = socket.gameMgr.dissolveAgree(roomId,userId,true);
			if(ret != null){
				var dr = ret.dr;
				var ramaingTime = (dr.endTime - Date.now()) / 1000;
				var data = {
					time:ramaingTime,
					states:dr.states
				};
				userMgr.broacastInRoom('dissolve_notice_push',data,userId,true);

				var doAllAgree = true;
				for(var i = 0; i < dr.states.length; ++i){
					if(dr.states[i] == false){
						doAllAgree = false;
						break;
					}
				}

				if(doAllAgree){
					socket.gameMgr.doDissolve(roomId);
				}
			}
		});

		socket.on('dissolve_reject',function(data){
			var userId = socket.userId;

			if(userId == null){
				return;
			}

			var roomId = roomMgr.getUserRoom(userId);
			if(roomId == null){
				return;
			}

			var ret = socket.gameMgr.dissolveAgree(roomId,userId,false);
			if(ret != null){
				userMgr.broacastInRoom('dissolve_cancel_push',{},userId,true);
			}
		});

		//断开链接
		socket.on('disconnect',function(data){
			var userId = socket.userId;
			if(!userId){
				return;
			}

            var data = {
                userid:userId,
                online:false
            };

            //通知房间内其它玩家
            userMgr.broacastInRoom('user_state_push',data,userId);

            //清除玩家的在线信息
            userMgr.sendMsg(userId, 'socket_is_connected_notify');
            userMgr.del(userId);
            socket.userId = null;

            console.log('send "socket_is_connected_notify": ' + userId);

		});

		socket.on('game_ping',function(data){
			var userId = socket.userId;
			if(!userId){
				return;
			}
			//console.log('game_ping');
			socket.emit('game_pong');
		});
	});

	console.log("game server is listening on " + config.CLIENT_PORT);	
};