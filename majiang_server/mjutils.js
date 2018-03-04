let roomMgr = require("./roommgr");
let Logger = require('../utils/logger');

function checkTingPai(seatData,begin,end, DongStartID){
	for(let i = begin; i < end; ++i){
        seatData.arrayOfPengWhenCheckTingOrHu = [];
		//如果这牌已经在和了，就不用检查了
		if(seatData.tingMap[i] != null){
			continue;
		}
		//将牌加入到计数中
		let old = seatData.countMap[i];
		if(old == null){
			old = 0;
			seatData.countMap[i] = 1;
		}
		else{
			seatData.countMap[i] ++;		
		}

		seatData.holds.push(i);
		//逐个判定手上的牌
		let ret = checkCanHu(seatData, DongStartID);
		if(ret){
			//平胡 0番
			seatData.tingMap[i] = {
				pattern:"normal",
                arrayPengForPiaoHu: seatData.arrayOfPengWhenCheckTingOrHu,
                fan:0
			};
		}
		
		//搞完以后，撤消刚刚加的牌
		seatData.countMap[i] = old;
		seatData.holds.splice(seatData.holds.indexOf(i), 1);
	}	
}

let kanzi = [];
let record = false;
function debugRecord(pai){
	if(record){
		kanzi.push(pai);
	}
}

function matchSingle (seatData,selected, DongStartID){
	let roomId = roomMgr.getUserRoom(seatData.userId);
	if(seatData.game.mahjongs.length - seatData.game.currentIndex < 2){
        // Logger.log(`checking match to check ting. selectedPai: ${selected}, userId: ${seatData.userId}, seatIndex: ${seatData.seatIndex}`, roomId);
    }
	if(selected == null){
		return false;
	}
	//分开匹配 A-2,A-1,A
	let matched = true;
	let v = selected % 9;
	if(v < 2){
		matched = false;
	}
	else{
		for(let i = 0; i < 3; ++i){
			let t = selected - 2 + i;
			let cc = seatData.countMap[t];
			if(cc == null){
				matched = false;
				break;
			}
			if(cc <= 0){
				matched = false;
				break;
			}
		}		
	}


	//匹配成功，扣除相应数值
	if(matched){
		seatData.countMap[selected - 2] --;
		seatData.countMap[selected - 1] --;
		seatData.countMap[selected] --;
		// if(seatData.countMap[selected - 2] <= 0 || seatData.countMap[selected - 1] <= 0 || seatData.countMap[selected] <= 0){
         //    seatData.countMap[selected - 2] ++;
         //    seatData.countMap[selected - 1] ++;
         //    seatData.countMap[selected] ++;
        //
         //    debugRecord(selected - 2);
         //    debugRecord(selected - 1);
         //    debugRecord(selected);
         //    return false;
		// }
		let ret = checkSingle(seatData, DongStartID);
		seatData.countMap[selected - 2] ++;
		seatData.countMap[selected - 1] ++;
		seatData.countMap[selected] ++;
		if(ret == true){
			debugRecord(selected - 2);
			debugRecord(selected - 1);
			debugRecord(selected);
			return true;
		}
	}
	// if(matched){
	// 	seatData.countMap[selected - 2] --;
	// 	seatData.countMap[selected - 1] --;
	// 	seatData.countMap[selected] --;
	// 	let ret = checkSingle(seatData, DongStartID);
	// 	seatData.countMap[selected - 2] ++;
	// 	seatData.countMap[selected - 1] ++;
	// 	seatData.countMap[selected] ++;
	// 	if(ret == true){
	// 		debugRecord(selected - 2);
	// 		debugRecord(selected - 1);
	// 		debugRecord(selected);
	// 		return true;
	// 	}
	// }

	//分开匹配 A-1,A,A + 1
	matched = true;
	if(v < 1 || v > 7){
		matched = false;
	}
	else{
		for(let i = 0; i < 3; ++i){
			let t = selected - 1 + i;
			let cc = seatData.countMap[t];
			if(cc == null){
				matched = false;
				break;
			}
			if(cc == 0){
				matched = false;
				break;
			}
		}		
	}

	//匹配成功，扣除相应数值
	if(matched){
		seatData.countMap[selected - 1] --;
		seatData.countMap[selected] --;
		seatData.countMap[selected + 1] --;

        // if(seatData.countMap[selected - 1] <= 0 || seatData.countMap[selected] <= 0 || seatData.countMap[selected + 1] <= 0){
        //     seatData.countMap[selected - 1] ++;
        //     seatData.countMap[selected] ++;
        //     seatData.countMap[selected + 1] ++;
        //
        //     debugRecord(selected - 1);
        //     debugRecord(selected);
        //     debugRecord(selected + 1);
        //     return false;
        // }

		let ret = checkSingle(seatData, DongStartID);
		seatData.countMap[selected - 1] ++;
		seatData.countMap[selected] ++;
		seatData.countMap[selected + 1] ++;
		if(ret == true){
			debugRecord(selected - 1);
			debugRecord(selected);
			debugRecord(selected + 1);
			return true;
		}		
	}
	
	
	//分开匹配 A,A+1,A + 2
	matched = true;
	if(v > 6){
		matched = false;
	}
	else{
		for(let i = 0; i < 3; ++i){
			let t = selected + i;
			let cc = seatData.countMap[t];
			if(cc == null){
				matched = false;
				break;
			}
			if(cc == 0){
				matched = false;
				break;
			}
		}		
	}

	//匹配成功，扣除相应数值
	if(matched){
		seatData.countMap[selected] --;
		seatData.countMap[selected + 1] --;
		seatData.countMap[selected + 2] --;

        // if(seatData.countMap[selected] <= 0 || seatData.countMap[selected + 1] <= 0 || seatData.countMap[selected + 2] <= 0){
        //     seatData.countMap[selected] ++;
        //     seatData.countMap[selected + 1] ++;
        //     seatData.countMap[selected + 2] ++;
        //
        //     debugRecord(selected);
        //     debugRecord(selected + 1);
        //     debugRecord(selected + 2);
        //     return false;
        // }

		let ret = checkSingle(seatData, DongStartID);
		seatData.countMap[selected] ++;
		seatData.countMap[selected + 1] ++;
		seatData.countMap[selected + 2] ++;
		if(ret == true){
			debugRecord(selected);
			debugRecord(selected + 1);
			debugRecord(selected + 2);
			return true;
		}		
	}
	return false;
}

function checkSingle(seatData, DongStartID){
	let holds = seatData.holds;
	let selected = -1;
	let c = 0;
	for(let i = 0; i < holds.length; ++i){
		let pai = holds[i];
		c = seatData.countMap[pai];
		if(c > 0){
			selected = pai;
			break;
		}
	}
	//如果没有找到剩余牌，则表示匹配成功了
	if(selected == -1){
		return true;
	}
	//否则，进行匹配
    let index0 = -1;
    if(c == 3){
		//直接作为一坎
		seatData.countMap[selected] = 0;

		seatData.arrayOfPengWhenCheckTingOrHu.push(selected);

		debugRecord(selected);
		debugRecord(selected);
		debugRecord(selected);
		let ret = checkSingle(seatData, DongStartID);
		//立即恢复对数据的修改
		seatData.countMap[selected] = c;
		if(ret == true){
			return true;
		}
		index0 = seatData.arrayOfPengWhenCheckTingOrHu.indexOf(selected);
        seatData.arrayOfPengWhenCheckTingOrHu.splice(index0, 1);
	}
	else if(c == 4){
		//直接作为一坎
		seatData.countMap[selected] = 1;
        seatData.arrayOfPengWhenCheckTingOrHu.push(selected);
		debugRecord(selected);
		debugRecord(selected);
		debugRecord(selected);
		let ret = checkSingle(seatData, DongStartID);
		//立即恢复对数据的修改
		seatData.countMap[selected] = c;
		//如果作为一坎能够把牌匹配完，直接返回TRUE。
		if(ret == true){
			return true;
		}
        index0 = seatData.arrayOfPengWhenCheckTingOrHu.indexOf(selected);
        seatData.arrayOfPengWhenCheckTingOrHu.splice(index0, 1);
	}
	
	//按单牌处理
	if(selected >= DongStartID){
		return false;
	}
	else{
        return matchSingle(seatData,selected, DongStartID);
	}

}

function checkCanHu(seatData, DongStartID){
	for(let k in seatData.countMap){
		if(seatData.countMap.hasOwnProperty(k)){
            let kk = parseInt(k);
            let c = seatData.countMap[kk];
            if(c < 2){
                continue;
            }
            //우선 머리를 완성하기 위하여 2패보다 많은 패에서 2패를 뺀다.
            seatData.countMap[kk] -= 2;
            //逐个判定剩下的牌是否满足　３Ｎ规则,一个牌会有以下几种情况
            //1、0张，则不做任何处理
            //2、2张，则只可能是与其它牌形成匹配关系
            //3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎
            //4、4张，则只可能是一坎+单张
            kanzi = [];
            let ret = checkSingle(seatData, DongStartID);
            seatData.countMap[kk] += 2;
            if(ret){
                //kanzi.push(k);
                //kanzi.push(k);
                //console.log(kanzi);
                return true;
            }
		}

	}
}

/*
console.log(Date.now());
//检查筒子
checkTingPai(seatData,0,9);
//检查条子
checkTingPai(seatData,9,18);
//检查万字
checkTingPai(seatData,18,27);
console.log(Date.now());

for(k in seatData.tingMap){
	console.log(nameMap[k]);	
}
*/

exports.checkTingPai = checkTingPai;

// exports.getMJType = function(pai){
//       if(id >= 0 && id < 9){
//           return 0;
//       }
//       else if(id >= 9 && id < 18){
//           return 1;
//       }
//       else if(id >= 18 && id < 27){
//           return 2;
//       }
// }