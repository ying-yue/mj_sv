let roomMgr = require("./roommgr");
let userMgr = require("./usermgr");
let mjutils = require('./mjutils');
let db = require("../utils/db");
let Logger = require('../utils/logger');
let crypto = require("../utils/crypto");
let games = {};

let ACTION_CHUPAI = 1;
let ACTION_MOPAI = 2;
let ACTION_PENG = 3;
let ACTION_GANG = 4;
let ACTION_HU = 5;
let ACTION_ZIMO = 6;
let ACTION_SHUNZI = 7;
let ACTION_GANGTONGNANSEBEI = 8;
let ACTION_GANGBAIBALZUNG = 9;
let ACTION_TINGED = 10;
let ACTION_TINGED_PAI = 11;
let ACTION_GANGTINGED = 55;
let ACTION_PIAO_TINGED = 66;
let ACTION_YISE_TING = 77;
let ACTION_YISE_TINGED = 88;
let ACTION_YISE_GANGFORGANGTING = 99;
let ACTION_SCORE_CHANGE = 22;
let ACTION_BASE_INFO = 33;




let gameSeatsOfUsers = {};

let dicePlayed = {};
let diceUserList = {};
let diceNumberList1 = {};
let diceNumberList2 = {};
let LevelScore = {};
let HunagZhuang = {};
let HongResult = {};




function shuffle(game) {

    let mahjongs = game.mahjongs;

    //万 (0 ~ 8 表示筒子
    let index = 0;
    for(let i = game.WanStartID; i < game.WanStartID + 9; ++i){
        for(let c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }

    if(game.PingStartID > 0){
        //筒 9 ~ 17表示条子
        for(let i = game.PingStartID; i < game.PingStartID + 9; ++i){
            for(let c = 0; c < 4; ++c){
                mahjongs[index] = i;
                index++;
            }
        }
    }


    if(game.TiaoStartID > 0){
        //条 18 ~ 26表示万
        for(let i = game.TiaoStartID; i < game.TiaoStartID + 9; ++i){
            for(let c = 0; c < 4; ++c){
                mahjongs[index] = i;
                index++;
            }
        }
    }

    if(game.conf.mahjongtype == 0){
        for(let c = 0; c < 4; ++c){
            mahjongs[index] = game.SanWenPaiStartID;
            index++;
        }
    }
    else{
        for(let i = game.DongStartID; i < game.DongStartID + 4; ++i){
            for(let c = 0; c < 4; ++c){
                mahjongs[index] = i;
                index++;
            }
        }

        for(let i = game.SanWenPaiStartID; i < game.SanWenPaiStartID + 3; ++i){
            for(let c = 0; c < 4; ++c){
                mahjongs[index] = i;
                index++;
            }
        }
    }



    for(let i = 0; i < mahjongs.length; ++i){
        let lastIndex = mahjongs.length - 1 - i;
        let index1 = Math.floor(Math.random() * lastIndex);
        let t = mahjongs[index1];
        mahjongs[index1] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
}

function mopai(game,seatIndex) {
    if(game.currentIndex == game.mahjongs.length){
        return -1;
    }
    let data = game.gameSeats[seatIndex];
    let mahjongs = data.holds;
    let pai = game.mahjongs[game.currentIndex];
    mahjongs.push(pai);

    //统计牌的数目 ，用于快速判定（空间换时间）
    let c = data.countMap[pai];
    if(c == null) {
        c = 0;
    }
    data.countMap[pai] = c + 1;
    game.currentIndex ++;
    if(pai == null){
        console.log("mopai null");
    }
    return pai;
}

function deal(game){
    //强制清0
    game.currentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    let seatIndex = game.button;
    for(let i = 0; i < 13 * game.seatCount; ++i){
        let mahjongs = game.gameSeats[seatIndex].holds;
        if(mahjongs == null){
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        mopai(game,seatIndex);
        seatIndex ++;
        seatIndex %= game.seatCount;
    }

    //庄家多摸最后一张
    mopai(game,game.button);
    //当前轮设置为庄家
    game.turn = game.button;
}

//检查是否可以碰
function checkCanPeng(game,seatData,targetPai) {
    if(isTinged(seatData)){
        return;
    }

    let roomId = roomMgr.getUserRoom(seatData.userId);

    // Logger.log(`Start checking for peng.(userId: ${seatData.userId}), (seat index: ${seatData.seatIndex})`, roomId)
    // Logger.log(`peng checking --- Holds Data: ${seatData.holds}`, roomId);
    // Logger.log(`peng checking --- TargetPai: ${targetPai}`, roomId);


    let count = seatData.countMap[targetPai];
    if(count != null && count >= 2){
        game.TARGETPAI = targetPai;
        seatData.canPeng = true;

        Logger.log(`peng checking --- found available peng. game.TARGETPAI: ${game.TARGETPAI}`, roomId);
    }
    if(!seatData.canPeng){
        Logger.log(`peng checking --- don't find available peng. `, roomId);
    }
    if(seatData.canPeng){
        if(!pengpengHuCondition(seatData)){
            seatData.canPeng = false;
        }
    }

}

// 슌찌를 할수 있는지를 검사한다.
function checkCanShunZi(game,seatData,targetPai) {

    // 패가 동서남북 or 백발중이면 검사하지 않는다
    if(targetPai >= game.DongStartID || isTinged(seatData)){
        return;
    }


    // if(game.conf.budaichi || seatData.tinged){
    //     return;
    // }

    // if(getMJType(targetPai) == seatData.que){
    //     return;
    // }
    let key1 = '', key2 = '', key3 = '', key4 = '', n;
    
    seatData.paisAvailableShunzi = [];

    let roomId = roomMgr.getUserRoom(seatData.userId);

    // Logger.log(`Start checking for shunzi.(userId: ${seatData.userId}), (seat index: ${seatData.seatIndex})`, roomId)
    // Logger.log(`shunzi checking --- Holds Data: ${seatData.holds}`, roomId);
    // Logger.log(`shunzi checking --- TargetPai: ${targetPai}`, roomId);

    switch ((targetPai + 1) % 9){
        case 1:
            key1 = (targetPai + 1).toString();
            key2 = (targetPai + 2).toString();

            if(seatData.countMap[key1] > 0 && seatData.countMap[key2] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key1, key2]);

                // Logger.log(`shunzi checking --- Holds Data: ${seatData.holds}`, roomId);
                // Logger.log(`shunzi checking --- TargetPai: ${targetPai}`, roomId);
                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);

            }
            break;

        case 2:
            key1 = (targetPai - 1).toString();
            
            n = targetPai + 1;
            key2 = n.toString();

            n = targetPai + 2;
            key3 = n.toString();

            if(seatData.countMap[key1] > 0 && seatData.countMap[key2] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key1, key2]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }

            if(seatData.countMap[key2] > 0 && seatData.countMap[key3] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key2, key3]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }
            break;

        case 0:
            key1 = (targetPai - 2).toString();
            key2 = (targetPai - 1).toString();
            if(seatData.countMap[key1] > 0 && seatData.countMap[key2] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key1, key2]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }
            break;

        case 8:
            key1 = (targetPai - 2).toString();
            key2 = (targetPai - 1).toString();

            n = targetPai + 1;
            key3 = n.toString();

            if(seatData.countMap[key1] > 0 && seatData.countMap[key2] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key1, key2]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }

            if(seatData.countMap[key2] > 0 && seatData.countMap[key3] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key2, key3]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }
            break;

        default:
            key1 = (targetPai - 2).toString();
            key2 = (targetPai - 1).toString();

            n = targetPai + 1;
            key3 = n.toString();

            n = targetPai + 2;
            key4 = n.toString();


            if(seatData.countMap[key1] > 0 && seatData.countMap[key2] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key1, key2]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }
            if(seatData.countMap[key2] > 0 && seatData.countMap[key3] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key2, key3]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }
            if(seatData.countMap[key3] > 0 && seatData.countMap[key4] > 0){
                seatData.canShunZi = true;
                seatData.paisAvailableShunzi.push([key3, key4]);

                // Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

                // console.log('targetPai:' + targetPai);
                // console.log(seatData.paisAvailableShunzi);
            }
            break;
    }

    if(!seatData.canShunZi){
        Logger.log(`shunzi checking --- don't find pais available shunzi. `, roomId);
    }
    else{
        Logger.log(`shunzi checking --- Holds Data: ${seatData.holds}`, roomId);
        Logger.log(`shunzi checking --- TargetPai: ${targetPai}`, roomId);
        Logger.log(`shunzi checking --- found pais available shunzi. paisAvailableShunzi: ${seatData.paisAvailableShunzi}`, roomId);

    }

    return seatData.canShunZi;
}


// 이 함수는 동서남북과 백발중에 대한 깡을 할수있는가를 검사한다.
// 이 함수는 손에 패가 14개일때 즉 player가 mopai 했을때 리용한다.
function checkCanGangTongSeNanBeiAndGangBaiBalZung(seatData, targetPai){
    if (seatData == null) {
        // console.log("can't find user game data.");
        return;
    }

    if(!seatData.game.conf.bubaibalzhung){
        return;
    }

    // 동서남북이 존재하는가를 검사한다.
    if (seatData.countMap[seatData.game.DongID] > 0) {
        if (seatData.countMap[seatData.game.NanID] > 0) {
            if (seatData.countMap[seatData.game.SeID] > 0) {
                if (seatData.countMap[seatData.game.BeiID] > 0) {
                    // console.log("gang tong_nan_se_bei.");
                    seatData.canGangTongnansebei = true;
                }
            }
        }
    }


    seatData.paisAvailableGangBaibalzung = [];
    if(seatData.countMap[seatData.game.ZhungID] > 1 && seatData.countMap[seatData.game.BalID] > 0 && seatData.countMap[seatData.game.BaiID] > 0){
        seatData.canGangBaiBalZung = true;
        seatData.paisAvailableGangBaibalzung.push([seatData.game.ZhungID, seatData.game.BalID, seatData.game.BaiID, seatData.game.ZhungID]);
    }
    if(seatData.countMap[seatData.game.ZhungID] > 0 && seatData.countMap[seatData.game.BalID] > 1 && seatData.countMap[seatData.game.BaiID] > 0){
        seatData.canGangBaiBalZung = true;
        seatData.paisAvailableGangBaibalzung.push([seatData.game.ZhungID, seatData.game.BalID, seatData.game.BaiID, seatData.game.BalID]);
    }
    if(seatData.countMap[seatData.game.ZhungID] > 0 && seatData.countMap[seatData.game.BalID] > 0 && seatData.countMap[seatData.game.BaiID] > 1){
        seatData.canGangBaiBalZung = true;
        seatData.paisAvailableGangBaibalzung.push([seatData.game.ZhungID, seatData.game.BalID, seatData.game.BaiID, seatData.game.BaiID]);
    }

    if(seatData.canGangBaiBalZung || seatData.canGangTongnansebei){
        if(!pengpengHuCondition(seatData)){
            seatData.canGangTongnansebei = false;
            seatData.canGangBaiBalZung = false;
            seatData.paisAvailableGangBaibalzung = [];
        }
    }
}

//检查是否可以点杠
function checkCanMingGang(game,seatData,targetPai){
    //检查玩家手上的牌
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        return;
    }

    if(isTinged(seatData) && !game.conf.tinghoufeigang){
        return;
    }
    // if(getMJType(targetPai) == seatData.que){
    //     return;
    // }
    let count = seatData.countMap[targetPai];
    if(count != null && count >= 3){
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
    }

    if(seatData.canGang){
        if(!pengpengHuCondition(seatData)){
            seatData.canGang = false;
            seatData.gangPai.pop();
        }
    }
}

//检查是否可以暗杠
function checkCanAnGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        return;
    }
    if(isTinged(seatData) && !game.conf.tinghoufeigang){
        return;
    }

    for(let key in seatData.countMap){
        if(seatData.countMap.hasOwnProperty(key)){
            let pai = parseInt(key);
            // if(getMJType(pai) != seatData.que){
            let c = seatData.countMap[key];
            if(c != null && c == 4){
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }
        }
        
    }
    if(seatData.canGang){
        if(!pengpengHuCondition(seatData)){
            seatData.canGang = false;
            seatData.gangPai.pop();
        }
    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanJiaGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        return;
    }

    if(isTinged(seatData) && !game.conf.tinghoufeigang){
        return;
    }

    //从碰过的牌中选
    for(let i = 0; i < seatData.pengs.length; ++i){
        let pai = seatData.pengs[i].pai;
        if(seatData.countMap[pai] == 1){
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

function checkCanHu(game,seatData,targetPai) {
    game.lastHuPaiSeat = -1;
    // if(getMJType(targetPai) == seatData.que){
    //     return;
    // }
    seatData.canHu = false;

    // 손에 14개의 패가 다 있으면 팅을 해야 후할수 있다.
    if(seatData.holds.length == 14 && !isTinged(seatData)){
        return;
    }

    // // 손에 동서남북 혹은 백발중중 등이 있으면 먼저 깡을 해야 후 할수 있다.
    // if(checkIsExistingFengpaiOrSanyuanpai(seatData)){
    //     return
    // }

    if(!isTinged(seatData)){
        checkCanTingOrHuCondition(seatData);

        seatData.tingMap = {};

        for(let kk in seatData.availableTingMap){
            if(seatData.availableTingMap.hasOwnProperty(kk)){
                for(let k in seatData.availableTingMap[kk]) {
                    if (seatData.availableTingMap[kk].hasOwnProperty(k)) {

                        let data = seatData.availableTingMap[kk][k];

                        if(targetPai == k && targetPai == kk){

                            let checkParams = checkTingCondition(seatData);
                            if(data != null && data.pattern == '7pairs'){
                                game.huedByQidui = true;
                            }
                            if(seatData.game.conf.renshu == 3 && checkParams.isExistingOneOrNine){
                                if (checkCanHuForPeng4(seatData, targetPai, data.arrayPengForPiaoHu, null, null, true)) {
                                    seatData.canPiaoTing = false;
                                    seatData.canHu = true;
                                }
                                else{
                                    seatData.canHu = false;
                                }
                            }
                            else {
                                if (checkParams.isExistingPing && checkParams.isExistingTiao && checkParams.isExistingWan && checkParams.isExistingOneOrNine) {
                                    if (checkCanHuForPeng4(seatData, targetPai, data.arrayPengForPiaoHu, null, null, true)) {
                                        seatData.canPiaoTing = false;
                                        seatData.canHu = true;
                                    }
                                    else{
                                        seatData.canHu = false;
                                    }

                                }
                                else if (game.conf.yise && checkYise(seatData, checkParams.isExistingPing, checkParams.isExistingTiao, checkParams.isExistingWan, checkParams.isExistingOneOrNine)) {
                                    seatData.canQingYiseTing = false;
                                    seatData.canHunYiseTing = false;

                                    game.huedByQingyise = true;
                                    game.huedByHunyise = true;
                                    seatData.canHu = false;
                                    if(game.conf.mahjongtype == 0){
                                        seatData.canHu = true;
                                    }

                                }
                            }


                            if(seatData.canHu){
                                let pattern = "hu";
                                if(data && data.pattern){
                                    pattern = data.pattern;
                                }

                                seatData.tingMap[targetPai] = {
                                    fan:5,
                                    arrayPengForPiaoHu: data.arrayPengForPiaoHu,
                                    pattern:pattern
                                };
                            }


                        }
                    }
                }



            }

        }
        seatData.canHunYiseTing = false;
        seatData.canQingYiseTing = false;
        seatData.canTing = false;
        seatData.canPiaoTing = false;
        return;
    }



    for(let k in seatData.tingMap){
        if(seatData.tingMap.hasOwnProperty(k)){
            if(targetPai == k){
                seatData.canHu = true;

                if(seatData.tingMap[k] != null && seatData.tingMap[k].pattern == '7pairs'){
                    game.huedByQidui = true;
                }

                if(seatData.canHu){
                    let pattern = "hu";
                    if(seatData.tingMap[targetPai] && seatData.tingMap[targetPai].pattern){
                        pattern = seatData.tingMap[targetPai].pattern;
                    }
                }


            }
        }
        
    }


}

function checkPiaoOrYiseInBeijing(seatData) {
    let checkParams = checkTingCondition(seatData);
    checkYise(seatData, checkParams.isExistingPing, checkParams.isExistingTiao, checkParams.isExistingWan, checkParams.isExistingOneOrNine);
    checkCanHuForPeng4(seatData);
}

function checkTingCondition(seatData, a_pais){
    let isExistingWan = false;
    let isExistingPing = false;
    let isExistingTiao = false;
    let isExistingOneOrNine = false;
    let n;

    for(let p of seatData.pengs){
        let inPai = getMahjongType(parseInt(p.pai), seatData.game);
        switch (inPai) {
            case 0:
                isExistingWan = true;
                break;
            case 1:
                isExistingPing = true;
                break;
            case 2:
                isExistingTiao = true;
                break;
            default:
                break;
        }

        if(parseInt(p.pai) >= parseInt(seatData.game.DongStartID)){
            isExistingOneOrNine = true;

        }

        n = (parseInt(p.pai) + 1) % 9;
        if(n == 1 || n == 0){
            isExistingOneOrNine = true;
        }
    }

    for(let p of seatData.diangangs ){
        let inPai = getMahjongType(parseInt(p.pai), seatData.game);
        switch (inPai) {
            case 0:
                isExistingWan = true;
                break;
            case 1:
                isExistingPing = true;
                break;
            case 2:
                isExistingTiao = true;
                break;
            default:
                break;
        }

        if(parseInt(p.pai) >= parseInt(seatData.game.DongStartID)){
            isExistingOneOrNine = true;

        }

        n = (parseInt(p.pai) + 1) % 9;
        if(n == 1 || n == 0){
            isExistingOneOrNine = true;
        }
    }

    for(let p of seatData.wangangs){
        let inPai = getMahjongType(parseInt(p.pai), seatData.game);
        switch (inPai) {
            case 0:
                isExistingWan = true;
                break;
            case 1:
                isExistingPing = true;
                break;
            case 2:
                isExistingTiao = true;
                break;
            default:
                break;
        }

        if(parseInt(p.pai) >= parseInt(seatData.game.DongStartID)){
            isExistingOneOrNine = true;

        }

        n = (parseInt(p.pai) + 1) % 9;
        if(n == 1 || n == 0){
            isExistingOneOrNine = true;
        }
    }

    for(let p of seatData.angangs ){
        let inPai = getMahjongType(parseInt(p), seatData.game);
        switch (inPai) {
            case 0:
                isExistingWan = true;
                break;
            case 1:
                isExistingPing = true;
                break;
            case 2:
                isExistingTiao = true;
                break;
            default:
                break;
        }

        if(parseInt(p) >= parseInt(seatData.game.DongStartID)){
            isExistingOneOrNine = true;

        }

        n = (parseInt(p) + 1) % 9;
        if(n == 1 || n == 0){
            isExistingOneOrNine = true;
        }
    }
    for(let s of seatData.shunzis ){
        for(let p of s){
            let inPai = getMahjongType(parseInt(p), seatData.game);
            switch (inPai) {
                case 0:
                    isExistingWan = true;
                    break;
                case 1:
                    isExistingPing = true;
                    break;
                case 2:
                    isExistingTiao = true;
                    break;
                default:
                    break;
            }

            n = (parseInt(p) + 1) % 9;
            if(n == 1 || n == 0){
                isExistingOneOrNine = true;
            }
        }

    }


    for(let p in seatData.countMap){
        if(seatData.countMap.hasOwnProperty(p)){
            if(seatData.countMap[p] < 1){
                continue;
            }
            let inPai = getMahjongType(parseInt(p), seatData.game);
            switch (inPai) {
                case 0:
                    isExistingWan = true;
                    break;
                case 1:
                    isExistingPing = true;
                    break;
                case 2:
                    isExistingTiao = true;
                    break;
                default:
                    break;
            }

            n = (parseInt(p) + 1) % 9;
            if((n == 0 || n == 1) && (parseInt(p) < seatData.game.DongStartID)){
                isExistingOneOrNine = true;
            }

            if(isExistingPing && isExistingTiao && isExistingWan && isExistingOneOrNine){
                break;
            }
        }
        
    }

    if(!isExistingOneOrNine){
        //백발중, 동서남북 깡이 존재하는가를 검사하고 존재하면 isExistingOneOrNine 을 true로 설정한다.
        if((seatData.gang_baibalzungs && seatData.gang_baibalzungs.length > 0) || (seatData.gang_tongnansebeis && seatData.gang_tongnansebeis.length > 0)){
            isExistingOneOrNine = true;
        }
        else{
            //펑들에 백발중, 동서남북 펑이 존재하는가를 검사하고 존재하면 isExistingOneOrNine 을 true로 설정한다.
            let isExistingDongBaiInPeng = false;
            for(let tempPeng of seatData.pengs){
                if(parseInt(tempPeng.pai) >= parseInt(seatData.game.DongID)){
                    isExistingDongBaiInPeng = true;
                }
            }
            if(isExistingDongBaiInPeng){
                isExistingOneOrNine = true;
            }
            else{
                for(let p of seatData.holds){
                    if((parseInt(p) >= seatData.game.DongStartID)){
                        if(seatData.countMap[p] == 2 || seatData.countMap[p] == 1 || seatData.countMap[p] == 3){
                            // if(seatData.countMap[p] == 2 && seatData.tingMap[p] != null){
                            //     delete seatData.tingMap[p];
                            // }
                            isExistingOneOrNine = true;
                        }
                    }
                }
            }

        }

    }
    // a_pais 는 깡팅을 할때 깡을 하는 패 array이다. 그래서 a_pais 도 패검사에 참가해야 한다.
    // 그것은 깡팅을 검사할때 이 배렬을 빼고 검사하기때문이다.
    if(a_pais){
        let inPai0 = getMahjongType(parseInt(a_pais[0]), seatData.game);
        switch (inPai0) {
            case 0:
                isExistingWan = true;
                break;
            case 1:
                isExistingPing = true;
                break;
            case 2:
                isExistingTiao = true;
                break;
            default:
                break;
        }

        if(parseInt(a_pais[0]) >= parseInt(seatData.game.DongStartID)){
            isExistingOneOrNine = true;

        }

        n = (parseInt(a_pais[0]) + 1) % 9;
        if(n == 1 || n == 0){
            isExistingOneOrNine = true;
        }
    }
    ///////////////////////////////////////////////////////////////

    if(seatData.game.conf.renshu == 2){
        isExistingTiao = true;
    }

    return {isExistingWan: isExistingWan, isExistingPing: isExistingPing,
        isExistingTiao:isExistingTiao, isExistingOneOrNine:isExistingOneOrNine};
}

function guoHu(game, seatData){
    let roomId = roomMgr.getUserRoom(seatData.userId);
    let hasActions = false;
    let isExistingShunzi  = false;
    let seatIndexWithPengOrGang = null;

    if(seatData.seatIndex == game.turn){
        // seatData.tingMap = {};
        seatData.canTing = false;
        userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
        if(isTinged(seatData)){
            seatData.tingPaiClicked = true;
            let sendData = JSON.stringify({data:[seatData.userId,seatData.game.actionList[seatData.game.actionList.length - 1],seatData.tingPaiClicked]});
            userMgr.broacastInRoom('tinged_pai_notify_push',sendData,seatData.userId,true);
        }

        moveToNextUser(game, seatData.seatIndex);
        seatData.canChuPai = true;
        clearAllOptions(game);

        // Logger.log(`user canceled ting or gang_ting. userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);

        return;
    }

    Logger.log(`Checking whether some user can do 'peng' or 'gang'. current seat index: ${seatData.seatIndex}`, roomId);
    for(let i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        let ddd = game.gameSeats[i];


        checkCanPeng(game,ddd,game.chuPai);
        if(ddd.canPeng){
            isExistingShunzi = ddd.canPeng;
            seatIndexWithPengOrGang = i;
            break;
        }

        checkCanMingGang(game,ddd,game.chuPai);
        if(ddd.canGang){
            isExistingShunzi = ddd.canGang;
            seatIndexWithPengOrGang = i;
            ddd.gangPai.pop();
            break;
        }
    }

    Logger.log(`Finish checking whether some user can do 'peng' or 'gang'.`, roomId);

    for(let i = 0; i < game.gameSeats.length; ++i){
        //玩家自己不检查
        if(game.turn == i){
            continue;
        }
        let ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if(ddd.hued){
            continue;
        }

        //player가 후를 할수 있는지를 먼저 판정한다.
        // if((game.turn + 1) % game.seatCount == i){
        if(seatData.seatIndex != i){
            ddd.holds.push(parseInt(game.chuPai));
            ddd.countMap[game.chuPai]++;

            checkCanHu(game,ddd,game.chuPai);
            if(!ddd.canHu){
                ddd.canTing = false;
            }

            ddd.holds.splice(ddd.holds.indexOf(game.chuPai), 1);
            ddd.countMap[game.chuPai]--;
        }

        checkCanPeng(game,ddd,game.chuPai);
        checkCanMingGang(game,ddd,game.chuPai);

        if(isTinged(ddd) && ddd.canGang){
            for(let k in ddd.tingMap) {
                if (ddd.tingMap.hasOwnProperty(k)) {
                    let canGangAfterTing = false;
                    for(let gangP of ddd.tingMap[k].arrayPengForPiaoHu){
                        if(gangP == game.chuPai){
                            canGangAfterTing = true;
                            break;
                        }
                    }
                    if(!canGangAfterTing){
                        ddd.canGang = false;
                        ddd.gangPai.pop();
                    }
                    else{
                        break;
                    }
                }
            }
        }
        if(!isTinged(ddd)){
            if(ddd.canGang){
                ddd.countMap[game.chuPai]++;
                ddd.holds.push(parseInt(game.chuPai));

                checkCanGangTing(game.chuPai);

                ddd.countMap[game.chuPai]--;
                ddd.holds.splice(ddd.holds.indexOf(parseInt(game.chuPai)), 1);
            }
        }


        // // 패를 낸 사용자 다음 사용자에 대하여서만 슌찌검사를 한다
        if(!isExistingShunzi){
            if((game.turn + 1) % game.seatCount == i){
                checkCanShunZi(game, ddd, game.chuPai);
            }
        }

        if(hasOperations(ddd)){
            Logger.log(`Sent 'guo_notify_push' to all users because some user have action. Seat index: ${seatData.seatIndex}`, roomId);
            sendOperations(game,ddd,game.chuPai);
            hasActions = true;
        }
    }

    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if(!hasActions){
        setTimeout(function(){
            Logger.log(`Sent 'guo_notify_push' to all users because some user don't have action.`, roomId);
            // userMgr.broacastInRoom('guo_notify_push',{userId:seatData.userId,pai:game.chuPai},seatData.userId,true);
            // seatData.folds.push(game.chuPai);
            game.chuPai = -1;
            moveToNextUser(game);
            doUserMoPai(game);
        },500);
    }
}

function calcSelfFan(seatData, otherSeat, isQidui) {
    let roomId = roomMgr.getUserRoom(seatData.userId);

    Logger.log(`***** fan calculation start *****`, roomId);


    let game = seatData.game;
    //원래 기초점수가 2이므로 이 점수는 핑쟈의 점수이다. 즉 쫭에 대하여서는 2배해주어야 한다.
    let jangFan = 1;
    if(seatData.seatIndex == game.button || otherSeat.seatIndex == game.button){
        jangFan = 2;

        Logger.log(`As zhuang, jangFan: ${jangFan}`, roomId);
    }

    let selfFan = 0;
    // 여기서는 사용자들이 팅을 하였을때 조건을 따진다. 즉 두 사용자가 다같이 이써팅을 하였다면 높은 점수를 따른다.
    // 하지만 서로 다른 종류의 팅일때는 서로 곱해주어야 한다.
    //커팅과 일반깡팅일때도 높은 점수를 취한다.
    Logger.log(`seatData.hunYiseTinged: ${seatData.hunYiseTinged}`, roomId);
    Logger.log(`seatData.qingYiseTinged: ${seatData.qingYiseTinged}`, roomId);
    Logger.log(`seatData.piaoTinged: ${seatData.piaoTinged}`, roomId);

    if(((seatData.hunYiseTinged || seatData.qingYiseTinged) && (otherSeat.hunYiseTinged || otherSeat.qingYiseTinged)) ||
        (seatData.piaoTinged && otherSeat.piaoTinged)){
        if(otherSeat.self_fan >= seatData.self_fan){
            selfFan = otherSeat.self_fan;
        }
        else{
            selfFan = seatData.self_fan;
        }
    }

    else{
        selfFan = otherSeat.self_fan * seatData.self_fan;
    }

    Logger.log(`selfFan: ${selfFan}`, roomId);

    let fan_ke = 1;

    Logger.log(`isQidui: ${isQidui}`, roomId);

    Logger.log(`seatData.isKeTing: ${seatData.isKeTing}`, roomId);
    Logger.log(`otherSeat.isKeTing: ${otherSeat.isKeTing}`, roomId);

    //qidui를 성공한 경우 커 는 생각하지 않는다.
    if(!isQidui){
        if(seatData.isKeTing || otherSeat.isKeTing){
            fan_ke = 2;
            Logger.log(`seatData.isKeTing=${seatData.isKeTing} otherSeat.isKeTing=${otherSeat.isKeTing} fan_ke: ${fan_ke}`, roomId);
        }
        else if((seatData.holds.length == 1 || seatData.holds.length == 2) || (otherSeat.holds.length == 1 || otherSeat.holds.length == 2) ){
            fan_ke = 2;
            Logger.log(`As holds of seatdata or otherseat is 1 pai.   fan_ke: ${fan_ke}`, roomId);
        }
        // if((isTinged(seatData) && (seatData.holds.length == 1 || seatData.holds.length == 2 || seatData.holds.length == 13 || seatData.holds.length == 14)) ||
        //     (isTinged(otherSeat) && (otherSeat.holds.length == 1 || otherSeat.holds.length == 2 || otherSeat.holds.length == 13 || otherSeat.holds.length == 14))){
        //     fan_ke *= 2;
        // }
        // else if((seatData.gangTinged && seatData.holds.length >= 10) || (otherSeat.gangTinged && otherSeat.holds.length >= 10)){
        //     fan_ke *= 2;
        // }
    }

    Logger.log(`fan_ke: ${fan_ke}`, roomId);

    selfFan *= jangFan * fan_ke;

    Logger.log(`******* fan calculation end :  selfFan = ${selfFan}  **************`, roomId);

    return selfFan;
}

function calcPengCount(seatData) {
    let pengCount = 0;
    pengCount = seatData.pengs.length + seatData.angangs.length + seatData.diangangs.length +
            seatData.wangangs.length + seatData.gang_tongnansebeis.length + seatData.gang_baibalzungs.length;
    for(let k in seatData.countMap){
        if(parseInt(seatData.countMap[k]) >= 3){
            pengCount++;
        }
    }
    return pengCount;
}

function checkPengBeforeTingAndSaveScore(seatData, isGangTinged){
    let roomId = roomMgr.getUserRoom(seatData.userId);

    Logger.log(`----- 팅을 할때 그전에 펑을 하였는가를 검사하고 거기에 그때의 dianpo점수를 보관하였다가 만일 그 패로 jiangang을 하면 그점수를 리용해야 한다.--------------`, roomId);

    let game = seatData.game;
    ////////////////////////////////////////////////////////////////
    // 팅을 하기전에 펑을 했는가를 검사하고 그때의 점수를 보관했다가 후에
    // 이 펑을 가지고 jiagang을 하면 그 점수의 2배로 해주어야 한다.

    let gameActionListLength = game.actionList.length;

    let calcGangValToSave = 0;
    let n = 3;
    if(!isGangTinged){
        n = 6;
    }
    //팅을 하기전에 peng 을 하였는가를 검사한다.
    if(game.actionList[gameActionListLength - n + 1] == ACTION_PENG){
        let seatIndexSaved = game.actionList[gameActionListLength - n];
        if(parseInt(seatIndexSaved) == parseInt(seatData.seatIndex)){
            let tempPeng = game.actionList[gameActionListLength - n + 2];
            let getSeatIndex = tempPeng.getSeatIndex;
            let pengPai = tempPeng.pai;

            let fan = 1;

            //다음 실지로 chupai 하였는가를 검사
            n += 3;
            if(game.actionList[gameActionListLength - n + 1] == ACTION_CHUPAI){

                n += 3;
                // 다음 chupai 하기전에 실지로 깡을 하였는가를 검사.
                if(game.actionList[gameActionListLength - n] == seatIndexSaved &&
                    (game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
                    game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
                    game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI  ||
                    game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED)){
                    fan *= 2;
                    Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
                }
            }


            if(parseInt(pengPai) >= parseInt(game.SanWenPaiStartID) ||
                parseInt(pengPai) == parseInt(game.WanStartID) ||
                parseInt(pengPai) == parseInt(game.PingStartID) ||
                parseInt(pengPai) == parseInt(game.TiaoStartID)){

                fan *= 2;

                Logger.log(`----- WanStartID OR PingStartID OR TiaoStartID OR SanWenPai = true : pai = ${pengPai}*`, roomId);
                Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);

            }

            /////////////////////////////////////////////////////////

            if(game.conf.hongdian && game.dice_paly_result){
                fan = 2;

                Logger.log(`------ hongdian = true `, roomId);
                Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
            }

            if(HunagZhuang[roomId]){
                fan *= 2;

                Logger.log(`------ HunagZhuang = true `, roomId);
                Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
            }

            Logger.log(`------ fan calc end---------- `, roomId);



            let otherSeat = game.gameSeats[getSeatIndex];
            let selfFan = calcSelfFan(seatData, otherSeat);
            calcGangValToSave = game.basic_score * selfFan * fan;

            //그펑에 점수를 보관한다.
            let pengLen = seatData.pengs.length;
            let peng1 = seatData.pengs[pengLen - 1];
            peng1.gangValToSave = calcGangValToSave;

            Logger.log(`score = ${calcGangValToSave} `, roomId);
        }

    }
    /////////////////////////////////////////////////////////////////////////////////////////////
}

function calcScoreByBaibalzhungSanwanpaiGang(game, seatData, gangPais){
    // 이것은 련속적인 깡을 검사하는 부분이다. 깡을 한다음에는 패를 뒤에서 뜨는데 이렇게 뒤에서 뜨면 점수가 배로 오른다.
    // 이것을 검사하기 위하여 action의 배렬을 검사한다.
    let roomId = roomMgr.getUserRoom(seatData.userId);
    Logger.log(`******* starting calculation gang score (userID: ${seatData.userId}) **************`, roomId);

    Logger.log(`gangPais: ${gangPais} **************`, roomId);

    Logger.log(`------ fan calc start ---------- `, roomId);

    let fan = 1;
    let n = 0;

    let curGangVal = 0;

    let gameActionListLength = game.actionList.length;
    n += 3;
    //먼저 정말 마지막에 뜬 패로 깡을 하였는가를 검사
    if(game.paiMopaiByUser != null && seatData.seatIndex == game.turn && gangPais.indexOf(game.paiMopaiByUser.toString()) != -1){
        //다음 실지로 모파이를 하였는가를 검사
        if(game.actionList[gameActionListLength - n] == seatData.seatIndex &&
            game.actionList[gameActionListLength - n + 1] == ACTION_MOPAI){

            n += 3;
            // 다음 모파이를 하기전에 실지로 깡을 하였는가를 검사.
            if(game.actionList[gameActionListLength - n] == seatData.seatIndex &&
                (game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI  ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED)){
                if(!seatData.gangHouGangList){
                    seatData.gangHouGangList = [];
                }
                seatData.gangHouGangList.push(gangPais);
                fan *= 2;

                Logger.log(`------ gangHouGang = true : gangHouGangList = ${seatData.gangHouGangList}*`, roomId);
                Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
            }
        }
    }


    if(parseInt(gangPais[1]) >= parseInt(game.SanWenPaiStartID) ||
        parseInt(gangPais[1]) == parseInt(game.WanStartID) ||
        parseInt(gangPais[1]) == parseInt(game.PingStartID) ||
        parseInt(gangPais[1]) == parseInt(game.TiaoStartID)){
        if(parseInt(gangPais[0]) == parseInt(gangPais[1])){
            fan *= 2;

            Logger.log(`----- WanStartID OR PingStartID OR TiaoStartID OR SanWenPai = true : pai = ${gangPais[1]}*`, roomId);
            Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
        }



    }

    /////////////////////////////////////////////////////////

    if(game.conf.hongdian && game.dice_paly_result){
        fan = 2;

        Logger.log(`------ hongdian = true `, roomId);
        Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
    }

    if(HunagZhuang[roomId]){
        fan *= 2;

        Logger.log(`------ HunagZhuang = true `, roomId);
        Logger.log(`fan *= 2  : fan = ${fan}*`, roomId);
    }

    Logger.log(`------ fan calc end---------- `, roomId);




    //깡을 한 사람이 짱일때 점수를 2배로 해주고 나머지 사람들에게 2배씩 덜어준다.
    if(gangPais.length != 3){

        Logger.log(`------ In case of 동서남북 혹은 백발중깡 ------- `, roomId);

        for(let otherSeat of game.gameSeats){
            if(otherSeat.seatIndex == seatData.seatIndex){
                continue;
            }

            Logger.log(`------ starting calculation for userid : ${otherSeat.userId} ------- `, roomId);

            let selfFan = calcSelfFan(seatData, otherSeat);

            Logger.log(`selfFan : ${selfFan} ------- `, roomId);

            //실지 점수의 계산.
            let score = game.basic_score * selfFan * fan;

            Logger.log(`score : ${score} ------- `, roomId);

            curGangVal += score;
            // otherSeat.score -= score;
            otherSeat.levelScore -= score;

            Logger.log(`otherSeat.levelScore : ${otherSeat.levelScore} ------- `, roomId);

            // seatData.score += score;
            seatData.levelScore += score;

            Logger.log(`levelScore of gang man : ${seatData.levelScore} ------- `, roomId);

            Logger.log(`------ end calculation for userid : ${otherSeat.userId} ------- `, roomId);
        }
        game.currentGangVal = [0, curGangVal];

        Logger.log(`------ 동서남북 혹은 백발중깡 calc end------- `, roomId);
    }
    else{

        Logger.log(`------ In case of diangangting ------- `, roomId);
        let otherSeat = game.gameSeats[game.turn];

        Logger.log(`------ starting calculation for userid : ${otherSeat.userId} ------- `, roomId);

        let selfFan = calcSelfFan(seatData, otherSeat);

        Logger.log(`selfFan : ${selfFan} ------- `, roomId);

        //실지 점수의 계산.

        let calcGangValToSave = 0;
        n = 6;
        //chupai를 하기전에 mopai를 하였는가를 검사한다.
        if(game.actionList[gameActionListLength - n + 1] == ACTION_MOPAI){
            // mopai를 하기전에 깡을 하였는가를 검사한다.
            n += 3;
            if(game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI  ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED){
                if(game.currentGangVal){
                    if(game.currentGangVal[0] == 0){
                        calcGangValToSave = game.basic_score * selfFan * fan * 2;
                    }
                    else{
                        if(otherSeat.seatIndex == game.button){
                            calcGangValToSave = game.currentGangVal[1] * 4;
                        }
                        else{
                            calcGangValToSave = game.currentGangVal[1] * 2;
                        }

                    }
                }

            }
        }

        game.currentGangVal = [];
        /////////////////////////////////////////////////////////////////////////////////////////////
        let score = 0;

        if(calcGangValToSave > 0){
            Logger.log(`----- continuous gang = true------`, roomId);
            score = calcGangValToSave;
        }
        else{
            score = game.basic_score * selfFan * fan;
        }

        Logger.log(`score : ${score} ------- `, roomId);

        curGangVal = score;
        game.currentGangVal = [1, curGangVal];
        // otherSeat.score -= score;
        otherSeat.levelScore -= score;

        Logger.log(`otherSeat.levelScore : ${otherSeat.levelScore} ------- `, roomId);

        // seatData.score += score;
        seatData.levelScore += score;

        Logger.log(`levelScore of gang man : ${seatData.levelScore} ------- `, roomId);

        Logger.log(`------ end calc diangangting score ------- `, roomId);
    }

    Logger.log(`******* end calculation gang score (userID: ${seatData.userId}) **************`, roomId);



    let resultScores = [];
    let resultLevelScores = [];
    for(let seat of game.gameSeats){
        resultScores.push(seat.score);
        resultScores.push(seat.levelScore);

        resultLevelScores.push(seat.levelScore);
    }

    recordGameAction(game,-1,ACTION_SCORE_CHANGE,resultScores);

    userMgr.broacastInRoom('add_score_notify_push',{resultScores:resultLevelScores},seatData.userId,true);


}

function checkCanHuForPeng4(seatData, targetPai, arrayPengForPiaoHu, isCanGangTing, isExistingFeng, isCheckInHu) {
    //seatData의 countMap에 targetPai를 추가
    // seatData.countMap[targetPai]++;
    if(!seatData.game.conf.piaohu){
        return true;
    }

    let pengCount = seatData.pengs.length;
    let isExisting = isExistingFeng;
    let isExistingSanWenPai = false;

    if(isCanGangTing){
        pengCount++;
    }



    if(seatData.tingMap[targetPai] && seatData.tingMap[targetPai].pattern == "7pairs"){
        return true;
    }

    // seatData.countMap[targetPai]--;
    let flag = false;
    // if(pengCount == 4){
    if(arrayPengForPiaoHu){
        pengCount += seatData.diangangs.length + seatData.angangs.length + seatData.wangangs.length +
            seatData.gang_baibalzungs.length + seatData.gang_tongnansebeis.length + arrayPengForPiaoHu.length;
    }
    else{
        pengCount += seatData.diangangs.length + seatData.angangs.length + seatData.wangangs.length +
            seatData.gang_baibalzungs.length + seatData.gang_tongnansebeis.length;
    }


    //countMap가 정확하지 않기때문에 할수 없이 holds를 리용하였다.
    let existingPaisInHolds = [];
    // seatData.holds.push(parseInt(targetPai));
    let f = false;
    for(let pp of seatData.holds){
        f = false;
        for(let ppp of existingPaisInHolds){
            if(pp == ppp){
                f = true;
                break;
            }
        }
        if(!f){
            existingPaisInHolds.push(pp);
        }
    }

    let onePai = 0;
    let twoPai = 0;

    for(let p of existingPaisInHolds){
        let c = 0;
        for(let p1 of seatData.holds){
            if(p == p1){
                c++;
            }
        }
        if(c == 1){
            onePai++;
        }
        else if(c == 2){
            twoPai++;
        }
    }

    // seatData.holds.splice(seatData.holds.indexOf(parseInt(targetPai)), 1);

    let checkFlag = false;
    if(seatData.game.conf.mahjongtype == 0){
        checkFlag = true;
    }
    else{
        checkFlag = isCanGangTing || seatData.seatIndex == seatData.game.turn;
    }

    if(pengCount == 4){
        // if(isExisting){
        if(checkFlag){
            seatData.canPiaoTing = true;
        }

            // seatData.game.huedByPiaohu = true;
        flag = true;
        // }
    }
    else if(seatData.shunzis.length == 0){
        if((onePai == 0 && twoPai == 2) || (onePai == 1 && twoPai == 0)){
            // if(isExisting){
            if(checkFlag){
                seatData.canPiaoTing = true;
                flag = true;
            }

            // }
        }
        else{
            // if(seatData.hued){
            //     seatData.canPiaoTing = true;
            // }
            flag = true;
        }

    }
    else{
        flag = true;
    }

    if(pengCount == 0){

        for(let ppp of seatData.holds){
            if(parseInt(ppp) >= parseInt(seatData.game.ZhungID)){
                isExistingSanWenPai = true;
                break;
            }
        }
        if(!isExistingSanWenPai){
            flag = false;
        }
        if(onePai == 0 && twoPai == 2){
            flag = true;
        }
    }

    return flag;
}

function checkYise(seatData, isExistingPing, isExistingTiao, isExistingWan, isExistingOneOrNine, isExistingFeng, isGangTing) {
    let flag= false;
    if(seatData.qingYiseTinged || seatData.hunYiseTinged){
        return true;
    }

    if(seatData.game.conf.renshu == 2){
        isExistingTiao = false;
    }
    if(isExistingFeng){
        isExistingOneOrNine = true;
    }

    if(isExistingOneOrNine){
        if(isExistingWan && !isExistingTiao && !isExistingPing){
            flag = true;
        }
        else if(!isExistingWan && isExistingTiao && !isExistingPing){
            flag = true;
        }
        else if(!isExistingWan && !isExistingTiao && isExistingPing){
            flag = true;
        }
    }
    if(seatData.game.conf.renshu == 2){
        isExistingTiao = true;
    }

    let checkFlag = true;//isGangTing || seatData.seatIndex == seatData.game.turn;

    if(flag){
        if(!isExistingFeng){
            for(let p of seatData.pengs){
                if(parseInt(p.pai) >= parseInt(seatData.game.DongID) ){
                    if(checkFlag){
                        seatData.canHunYiseTing = true;
                    }

                    return true;
                }
            }

            for(let p of seatData.angangs){
                if(parseInt(p) >= parseInt(seatData.game.DongID) ){
                    if(checkFlag){
                        seatData.canHunYiseTing = true;
                    }
                    return true;
                }
            }

            for(let p of seatData.diangangs){
                if(parseInt(p.pai) >= parseInt(seatData.game.DongID) ){
                    if(checkFlag){
                        seatData.canHunYiseTing = true;
                    }
                    return true;
                }
            }

            for(let p of seatData.wangangs){
                if(parseInt(p.pai) >= parseInt(seatData.game.DongID) ){
                    if(checkFlag){
                        seatData.canHunYiseTing = true;
                    }
                    return true;
                }
            }

            if(seatData.gang_tongnansebeis.length > 0 || seatData.gang_baibalzungs.length > 0){
                if(checkFlag){
                    seatData.canHunYiseTing = true;
                }
                return true;
            }

            for(let pp of seatData.holds){
                if(parseInt(pp) >= parseInt(seatData.game.DongID) ){
                    if(checkFlag){
                        seatData.canHunYiseTing = true;
                    }
                    return true;
                }
            }
            if(!seatData.canHunYiseTing){
                if(checkFlag){
                    seatData.canQingYiseTing = true;
                }
                return true;
            }
        }
        else{
            seatData.canHunYiseTing = true;
            return true;
        }

    }

    return flag;
}

//이 함수는 user가 mopai했을때 즉 14패일때 리용한다.
function checkIsExistingFengpaiOrSanyuanpai(seatData) {
    //seatData의 countMap에 targetPai를 추가
    // seatData.countMap[targetPai]++;
    let flag = false;
    if(seatData.countMap[seatData.game.DongID] > 0 && seatData.countMap[seatData.game.NanID] > 0 &&
        seatData.countMap[seatData.game.SeID] > 0 && seatData.countMap[seatData.game.BeiID] > 0 ){
        flag = true;
    }
    else{
        if(seatData.countMap[seatData.game.ZhungID] > 1 && seatData.countMap[seatData.game.BalID] > 0 && seatData.countMap[seatData.game.BaiID] > 0){
            flag = true;
        }
        else if(seatData.countMap[seatData.game.ZhungID] > 0 && seatData.countMap[seatData.game.BalID] > 1 && seatData.countMap[seatData.game.BaiID] > 0){
            flag = true;
        }
        else if(seatData.countMap[seatData.game.ZhungID] > 0 && seatData.countMap[seatData.game.BalID] > 0 && seatData.countMap[seatData.game.BaiID] > 1){
            flag = true;
        }
        else{
            let arr = [seatData.game.DongID, seatData.game.NanID, seatData.game.SeID, seatData.game.BeiID, seatData.game.ZhungID, seatData.game.BalID, seatData.game.BaiID];
            for(let p of arr){
                if(seatData.countMap[p] == 4){
                    flag = true;
                    break;
                }
            }
        }

    }

    // seatData.countMap[targetPai]--;
    return flag;
}

function clearCanTing(game,seatData){
    let fnClear = function(sd){
        sd.canHu = false;
        sd.canGangTing = false;
        sd.canHunYiseTing = false;
        sd.canQingYiseTing = false;
        sd.canPiaoTing = false;
        sd.canTing = false;
        sd.lastFangGangSeat = -1;
        sd.paisAvailableTing = [];
    };
    if(seatData){
        fnClear(seatData);
    }
    else{
        game.qiangGangContext = null;
        for(let i = 0; i < game.gameSeats.length; ++i){
            fnClear(game.gameSeats[i]);
        }
    }
}

function clearAllOptions(game,seatData){
    let fnClear = function(sd){
        sd.canPeng = false;
        sd.canGang = false;
        sd.canShunZi = false;
        sd.canGangTongnansebei = false;
        sd.canGangBaiBalZung = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.canGangTing = false;
        sd.canHunYiseTing = false;
        sd.canQingYiseTing = false;
        sd.canPiaoTing = false;
        sd.lastFangGangSeat = -1;
        sd.paisAvailableTing = [];

    };
    if(seatData){
        fnClear(seatData);
    }
    else{
        game.qiangGangContext = null;
        for(let i = 0; i < game.gameSeats.length; ++i){
            fnClear(game.gameSeats[i]);
        }
    }
}

function getMahjongType(pai, game) {
    if(pai >= 0 && pai < game.WanStartID + 9){
        return 0;
    }
    else if(pai >= game.PingStartID && pai < game.PingStartID + 9){
        return 1;
    }
    else if(pai >= game.TiaoStartID && pai < game.TiaoStartID + 9){
        return 2;
    }
    else if(pai >= game.DongStartID && pai < game.DongStartID + 4){
        return 3;
    }
    return -1;
}



// function isAvailableTingCondition(seatData, restPais) {
//     let isExistingWan = false;
//     let isExistingPing = false;
//     let isExistingTiao = false;
//     let isExistingOneOrNine = false;
//
//     for(let p of seatData.pengs){
//         let inPai = getMahjongType(parseInt(p), seatData.game);
//         switch (inPai) {
//             case 0:
//                 isExistingPing = true;
//                 break;
//             case 1:
//                 isExistingTiao = true;
//                 break;
//             case 2:
//                 isExistingWan = true;
//                 break;
//             default:
//                 break;
//         }
//
//         if(parseInt(p) >= seatData.game.DongStartID){
//             continue;
//         }
//
//         let n = (parseInt(p) + 1) % 9;
//         if(n == 1 || n == 0){
//             isExistingOneOrNine = true;
//         }
//     }
//
//     for(let p of seatData.diangangs ){
//         let inPai = getMahjongType(parseInt(p), seatData.game);
//         switch (inPai) {
//             case 0:
//                 isExistingPing = true;
//                 break;
//             case 1:
//                 isExistingTiao = true;
//                 break;
//             case 2:
//                 isExistingWan = true;
//                 break;
//             default:
//                 break;
//         }
//
//         if(parseInt(p) >= seatData.game.DongStartID){
//             continue;
//         }
//
//         let n = (parseInt(p) + 1) % 9;
//         if(n == 1 || n == 0){
//             isExistingOneOrNine = true;
//         }
//     }
//
//     for(let p of seatData.wangangs){
//         let inPai = getMahjongType(parseInt(p), seatData.game);
//         switch (inPai) {
//             case 0:
//                 isExistingPing = true;
//                 break;
//             case 1:
//                 isExistingTiao = true;
//                 break;
//             case 2:
//                 isExistingWan = true;
//                 break;
//             default:
//                 break;
//         }
//
//         if(parseInt(p) >= seatData.game.DongStartID){
//             continue;
//         }
//
//         let n = (parseInt(p) + 1) % 9;
//         if(n == 1 || n == 0){
//             isExistingOneOrNine = true;
//         }
//     }
//
//     for(let p of seatData.angangs ){
//         let inPai = getMahjongType(parseInt(p), seatData.game);
//         switch (inPai) {
//             case 0:
//                 isExistingPing = true;
//                 break;
//             case 1:
//                 isExistingTiao = true;
//                 break;
//             case 2:
//                 isExistingWan = true;
//                 break;
//             default:
//                 break;
//         }
//
//         if(parseInt(p) >= seatData.game.DongStartID){
//             continue;
//         }
//
//         let n = (parseInt(p) + 1) % 9;
//         if(n == 1 || n == 0){
//             isExistingOneOrNine = true;
//         }
//     }
//     for(let s of seatData.shunzis ){
//         for(let p of s){
//             let inPai = getMahjongType(parseInt(p), seatData.game);
//             switch (inPai) {
//                 case 0:
//                     isExistingPing = true;
//                     break;
//                 case 1:
//                     isExistingTiao = true;
//                     break;
//                 case 2:
//                     isExistingWan = true;
//                     break;
//                 default:
//                     break;
//             }
//
//             let n = (parseInt(p) + 1) % 9;
//             if(n == 1 || n == 0){
//                 isExistingOneOrNine = true;
//             }
//         }
//
//     }
//
//     let countT = 0;
//     let f = {isExistingPing: isExistingPing, isExistingTiao: isExistingTiao,
//         isExistingWan: isExistingWan};
//     for(let k in f){
//         if(f[k]){
//             countT++;
//         }
//     }
//
//     let resultPais = [];
//
//     if(countT < 2){
//         return {result: false, selectAblePais: null};
//     }
//     else if(countT == 3){
//         if(isExistingOneOrNine){
//             return {result: true, selectAblePais: restPais};
//         }
//         else{
//             resultPais = [];
//             for(let p of restPais){
//                 let n  = (parseInt(p) + 1) % 9;
//                 if((n == 0 || n == 1) && (parseInt(p) < seatData.game.DongStartID)){
//                     resultPais.push(p);
//                 }
//             }
//
//             if((parseInt(restPais[0]) >= seatData.game.DongStartID && parseInt(restPais[0]) < seatData.game.DongStartID + 4)){
//                 resultPais.push(restPais[0]);
//             }
//             if((parseInt(restPais[1]) >= seatData.game.DongStartID && parseInt(restPais[1]) < seatData.game.DongStartID + 4)){
//                 resultPais.push(restPais[0]);
//             }
//             if(restPais[0] == restPais[1]){
//                 if(resultPais.length == 2){
//                     resultPais.pop();
//                 }
//             }
//             // if(restPais.length == 0){
//             //     return {result: false, selectAblePais: null};
//             // }
//             // else{
//             //     return {result: true, selectAblePais: restPais};
//             // }
//         }
//     }
//     else{
//         if(!isExistingPing){
//             resultPais = simpleCheck(restPais, 0, isExistingOneOrNine);
//
//         }
//         else if(!isExistingTiao){
//             resultPais = simpleCheck(restPais, 1, isExistingOneOrNine);
//         }
//         else{
//             resultPais = simpleCheck(restPais, 2, isExistingOneOrNine);
//         }
//
//     }
//     return {result: resultPais.length > 0, selectAblePais: resultPais};
//
//
//     // return {isExistingPing: isExistingPing, isExistingTiao: isExistingTiao,
//     //     isExistingWan: isExistingWan, isExistingOneOrNine: isExistingOneOrNine}
// }

// function simpleCheck(arr, n, isExistingOneOrNine){
//     let r = [];
//     for(let p of arr){
//         if(getMahjongType(parseInt(p), seatData.game) == n){
//             if(isExistingOneOrNine){
//                 r.push(p);
//             }
//             else{
//                 let n  = (parseInt(p) + 1) % 9;
//                 if((n == 0 || n == 1) && (parseInt(p) < seatData.game.DongStartID)){
//                     r.push(p);
//                 }
//             }
//
//         }
//     }
//     return r;
// }

function checkCanTingOrHuCondition(seatData) {
    // 이 함수는 player가 패를 집을때 실행한다. (즉 자기의 패들의 수가 14개일때).
    //그래서 팅을 검사할때에 holds, countMap에서 한패를 먼저 뽑고
    // checkCanTingPai함수를 리용하여 조건을 검사하여야 한다.

    seatData.tingMap = {};
    seatData.canHu = false;
    seatData.canTing = false;
    seatData.canGangTing = false;
    seatData.canHunYiseTing = false;
    seatData.canQingYiseTing = false;
    seatData.canPiaoTing = false;
    // seatData.tinged = false;
    // seatData.tingPai = null;
    seatData.paisAvailableTing = [];
    seatData.availableTingMap = {};

    // 존재하는 모든 패들의 array를 얻는다.
    let existingPais = [];
    for(let k in seatData.countMap){
        if(seatData.countMap.hasOwnProperty(k)){
            if(parseInt(seatData.countMap[k]) > 0){
                existingPais.push(k);
            }
        }
        
    }

    for(let k of existingPais) {
        // holds, countMap에서 한패를 뽑는다.
        seatData.countMap[k]--;
        let i = 0;
        let f = false;
        for(let paiOfHolds of seatData.holds){
            if(paiOfHolds == k){
                seatData.holds.splice(i, 1);
                f = true;
                break;
            }
            i++;
        }
        if(!f){
            let nnnn = 0;
        }

        checkCanTingPai(seatData.game, seatData);

        for(let kk in seatData.tingMap){
            if(!seatData.tingMap[kk]){
                delete seatData.tingMap[kk];
                continue
            }
            seatData.countMap[kk]++;

            let fff = checkCanHuForPeng4(seatData, kk, seatData.tingMap[kk].arrayPengForPiaoHu);
            seatData.countMap[kk]--;

            if(!fff){
                delete seatData.tingMap[kk];
            }
        }

        let availableCondition = false;

        if(Object.keys(seatData.tingMap).length > 0 && seatData.tingMap.constructor === Object){
            let checkParams = checkTingCondition(seatData);

            if(seatData.game.conf.renshu == 3){
                if(checkParams.isExistingOneOrNine){
                    availableCondition = true;
                }

            }
            else {
                if (checkParams.isExistingPing && checkParams.isExistingTiao && checkParams.isExistingWan && checkParams.isExistingOneOrNine) {
                    availableCondition = true;
                }
                else if (seatData.game.conf.yise && checkYise(seatData, checkParams.isExistingPing, checkParams.isExistingTiao, checkParams.isExistingWan, checkParams.isExistingOneOrNine)) {
                    availableCondition = true;
                }
            }

            if(availableCondition){
                if(seatData.canHunYiseTing || seatData.canQingYiseTing){
                    if(seatData.canPiaoTing){
                        seatData.paisAvailableTing.push([k, true, true]);
                    }
                    else{
                        seatData.paisAvailableTing.push([k, true, false]);
                    }

                }
                else{
                    if(seatData.canPiaoTing){
                        seatData.paisAvailableTing.push([k, false, true]);
                    }
                    else{
                        seatData.paisAvailableTing.push([k, false, false]);
                    }
                }

                seatData.availableTingMap[k] = seatData.tingMap;


                seatData.canPiaoTing = false;
                seatData.canHunYiseTing = false;
                seatData.canQingYiseTing = false;
                seatData.canTing = false;
            }

        }

        // 검사를 위하여 뽑았던 패를 다시 holds, countMap에 다시 넣는다.

        seatData.countMap[k]++;
        seatData.holds.push(parseInt(k));

        // if(avalableCondition){
        //     break;
        // }
    }

    if(seatData.paisAvailableTing.length > 0){
        if(seatData.holds.length == 14){
            seatData.canTing = true;
        }

        for(let ppp of seatData.paisAvailableTing){
            if(ppp[1] && ppp[2]){
                seatData.canHunYiseTing = true;
                seatData.canQingYiseTing = true;
                seatData.canPiaoTing = true;
            }
            else if(ppp[1] && !ppp[2]){
                seatData.canHunYiseTing = true;
                seatData.canQingYiseTing = true;
            }
            else if(!ppp[1] && ppp[2]){
                seatData.canPiaoTing = true;
            }
            else if(!ppp[1] && !ppp[2]){
                if(seatData.holds.length == 14){
                    seatData.canTing = true;
                }
            }
        }

        seatData.tingMap = {};


        for(let removeKey in seatData.availableTingMap){
            for(let k in seatData.availableTingMap[removeKey]){
                let map1 = seatData.availableTingMap[removeKey][k];
                if(removeKey == k){
                    if(seatData.game.conf.mahjongtype == 0 || (!seatData.canPiaoTing && !seatData.canQingYiseTing && !seatData.canHunYiseTing)){
                        seatData.canHu = true;
                        seatData.canTing = false;
                        let pattern = "hu";
                        if(seatData.availableTingMap[removeKey][k]){
                            pattern = seatData.availableTingMap[removeKey][k].pattern;
                        }

                        seatData.tingMap[k] = {
                            fan:5,
                            arrayPengForPiaoHu: map1.arrayPengForPiaoHu,
                            pattern:pattern
                        };
                    }


                }
            }
        }
    }
    else {
        seatData.tingMap = {};
        clearCanTing(seatData.game, seatData);
    }





    // let singleCount = 0;
    // let colCount = 0;
    // let gangCount = 0;
    // let pairCount = 0;
    // let arr = [];
    // for(let k in seatData.countMap){
    //     let c = seatData.countMap[k];
    //     if(c == 1){
    //         singleCount++;
    //         arr.push(k);
    //     }
    //     else if(c == 2){
    //         pairCount++;
    //         arr.push(k);
    //     }
    //     else if(c == 3){
    //         colCount++;
    //         pairCount++;
    //         singleCount++;
    //         arr.push(k);
    //     }
    //     else if(c == 4){
    //         //手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
    //         singleCount++;
    //         pairCount+=2;
    //     }
    // }
    //
    // if((pairCount == 1 && singleCount == 0) || (pairCount == 0 && singleCount == 2) ){
    //     let result = isAvailableTingCondition(seatData, arr);
    //     if(result.result){
    //         if(pairCount == 1){
    //             seatData.canHu = true;
    //             if(seatData.tingMap[arr[0]] == null){
    //                 seatData.tingMap[arr[0]] = {
    //                     pattern:"hu",
    //                     fan:7
    //                 };
    //             }
    //         }
    //         else{
    //             for(let p of result.selectAblePais){
    //                 if(seatData.tingMap[p] == null){
    //                     seatData.tingMap[p] = {
    //                         pattern:"ting",
    //                         fan:6
    //                     };
    //                 }
    //             }
    //             seatData.canTing = true;
    //             seatData.paisAvailableTing = result.selectAblePais;
    //         }
    //     }
    // }
}

//检查听牌

function checkCanGangTing(seatData) {

    seatData.canGangTing = false;
    seatData.gnagTinged = false;
    seatData.paisAvailableGangTing = [];
    seatData.availableTingMap = {};

    // if(seatData.holds.length != 14){
    //     return;
    // }
    seatData.tingMap = {};


    let game = seatData.game;
    let roomId = roomMgr.getUserRoom(seatData.userId);

    Logger.log(`User (id-${seatData.userId}, seatIndex-${seatData.seatIndex}) is starting checking GangTing`, roomId);
    Logger.log(`Holds of user- ${seatData.holds}`, roomId);

    let avalablePais = [];
    let paisAvailableTing = [];

    let isExistingFeng = false;

    if(seatData.canGang){
        let latestGangPai = seatData.gangPai[seatData.gangPai.length - 1];
        if(seatData.countMap[latestGangPai] == 4){
            avalablePais.push([latestGangPai, latestGangPai, latestGangPai, latestGangPai]);
            if(parseInt(latestGangPai) >= parseInt(game.DongID)){
                isExistingFeng = true;
            }
        }
    }
    if(seatData.canGangBaiBalZung){
        for(let ps of seatData.paisAvailableGangBaibalzung){
            avalablePais.push(ps);
        }

        isExistingFeng = true;
    }

    if(seatData.canGangTongnansebei){
        avalablePais.push([game.DongID, game.NanID, game.SeID, game.BeiID]);
        isExistingFeng = true;
    }

    Logger.log(`pais available gangting- ${avalablePais}`, roomId);
    Logger.log(`start whether can be ting for gangting without pais available.`, roomId);

    for(let a_pais of avalablePais){
        for(let p of a_pais){
            seatData.countMap[p]--;
            let i = 0;
            for(let paiOfHolds of seatData.holds){
                if(parseInt(paiOfHolds) == parseInt(p)){
                    seatData.holds.splice(i, 1);
                    break;
                }
                i++;
            }
        }




        checkCanTingPai(seatData.game, seatData);

        for(let kk in seatData.tingMap){
            if(!seatData.tingMap[kk]){
                delete seatData.tingMap[kk];
                continue
            }
            seatData.countMap[kk]++;

            let fff = checkCanHuForPeng4(seatData, kk, seatData.tingMap[kk].arrayPengForPiaoHu, true, isExistingFeng);
            seatData.countMap[kk]--;

            if(!fff){
                delete seatData.tingMap[kk];
            }
        }

        let availableCondition = false;

        if(Object.keys(seatData.tingMap).length > 0 && seatData.tingMap.constructor === Object){
            let checkParams = checkTingCondition(seatData, a_pais);
            if(parseInt(a_pais[0]) >= parseInt(seatData.game.DongID)){
                checkParams.isExistingOneOrNine = true;
            }

            if(seatData.game.conf.renshu == 3){
                if(checkParams.isExistingOneOrNine){
                    availableCondition = true;
                }

            }
            else {
                if (checkParams.isExistingPing && checkParams.isExistingTiao && checkParams.isExistingWan && checkParams.isExistingOneOrNine) {
                    availableCondition = true;
                }
                else if (seatData.game.conf.yise && checkYise(seatData, checkParams.isExistingPing, checkParams.isExistingTiao, checkParams.isExistingWan, checkParams.isExistingOneOrNine, isExistingFeng)) {
                    availableCondition = true;
                }
            }

            if(availableCondition){
                for(let kk in seatData.tingMap){
                    seatData.availableTingMap[kk] = seatData.tingMap[kk];
                }

            }

        }

        if(availableCondition){
            seatData.canGangTing = true;
            seatData.paisAvailableGangTing.push(a_pais);
        }


        for(let p of a_pais){
            seatData.countMap[p]++;
            seatData.holds.push(parseInt(p));
        }
    }

    if(seatData.canGangTing){
        if(!seatData.canHunYiseTing && !seatData.canQingYiseTing && !seatData.canPiaoTing){
            if(seatData.holds.length != 14){
                seatData.canGangTing = false;
                seatData.gnagTinged = false;
                seatData.paisAvailableGangTing = [];
                seatData.tingMap = {};
            }
        }

        // if(seatData.canPiaoTing && (seatData.holds.length == 4 || seatData.holds.length == 5)){
        //
        // }
    }
    else{
        seatData.canQingYiseTing = false;
        seatData.canHunYiseTing = false;
        seatData.canPiaoTing = false;
        seatData.tingMap = {};
        seatData.availableTingMap = {};
    }





}

function checkCanTingPai(game,seatData){
    seatData.tingMap = {};
    let singleCount = 0;
    let colCount = 0;
    let pairCount = 0;

    //손에 13자의 패가 다 있고 <七对> 준비가 되였는지 검사한다.
    if(seatData.holds.length == 13 && (game.conf.qidui4 || game.conf.qidui8)){
        //有5对牌
        // let hu = false;
        let danPai = -1;
        for(let k in seatData.countMap){
            if(seatData.countMap.hasOwnProperty(k)){
                let c = seatData.countMap[k];
                if( c == 2 || c == 3){
                    pairCount++;
                }
                else if(c == 4){
                    pairCount += 2;
                }

                if(c == 1 || c == 3){
                    //如果已经有单牌了，表示不止一张单牌，并没有下叫。直接闪
                    if(danPai >= 0){
                        break;
                    }
                    danPai = k;
                }
            }
            
        }

        //检查是否有6对 并且单牌是不是目标牌
        if(pairCount == 6){
            //七对只能和一张，就是手上那张单牌
            //七对的番数＝ 2番+N个4个牌（即龙七对）
            seatData.tingMap[danPai] = {
                fan:2,
                arrayPengForPiaoHu: [],
                pattern:"7pairs"
            };
            return;
            //如果是，则直接返回咯
        }
    }

    let arr = [];
    pairCount = 0;

    for(let k in seatData.countMap){
        if(seatData.countMap.hasOwnProperty(k)){
            let c = seatData.countMap[k];
            if(c == 1){
                singleCount++;
                arr.push(k);
            }
            else if(c == 2){
                pairCount++;
                arr.push(k);
            }
            else if(c == 3){
                colCount++;
                // arr.push(k);
            }
            else if(c == 4){
                //手上有4个一样的牌，在四川麻将中是和不了对对胡的 随便加点东西
                singleCount++;
                pairCount+=2;
            }
        }
        
    }

    if((pairCount == 2 && singleCount == 0) || (pairCount == 0 && singleCount == 1) ){
        for(let i = 0; i < arr.length; ++ i){
            //对对胡1番
            let p = arr[i];
            if(seatData.tingMap[p] == null){
                seatData.tingMap[p] = {
                    pattern:"duidui",
                    arrayPengForPiaoHu: [],
                    fan:1
                };
            }
        }
        return;
    }

    mjutils.checkTingPai(seatData,0,game.SanWenPaiStartID + 3, game.DongStartID);
}

function hasOperations(seatData){
    return (seatData.canGang || seatData.canPeng || seatData.canHu ||
    seatData.canShunZi || seatData.canGangTongnansebei || seatData.canGangBaiBalZung ||
    seatData.canTing || seatData.canGangTing || seatData.canPiaoTing || seatData.canHunYiseTing || seatData.canQingYiseTing);

    
}

function sendOperations(game,seatData,pai) {
    if(hasOperations(seatData) || (seatData.paisAvailableTing && seatData.paisAvailableTing.length > 0) ||  isTinged(seatData)){
        if(pai == -1){
            pai = seatData.holds[seatData.holds.length - 1];
        }

        // let pengCount = calcPengCount(seatData);
        // if(!seatData.canPiaoTing && (pengCount == 4 || pengCount == 3) && (seatData.holds.length == 4 || seatData.holds.length == 5)){
        //     seatData.canPeng = false;
        //     seatData.canGang = false;
        //     seatData.canPiaoTing = false;
        //     seatData.canGangTing = false;
        //     if(!seatData.canShunZi){
        //         return;
        //     }
        //
        // }

        if(seatData.canHu){
            if(seatData.game.conf.mahjongtype == 1 && !seatData.piaoTinged && calcPengCount(seatData) == 4){
                seatData.canHu = false;
            }
        }

        if(seatData.canHunYiseTing || seatData.canQingYiseTing || seatData.canPiaoTing){
            seatData.canTing = false;
        }

        if(game.totalCountCanHu > 1){
            seatData.canPeng = false;
            seatData.canShunZi = false;
            seatData.canTing = false;
            seatData.canGang = false;
            seatData.canGangTing = false;
            seatData.canHunYiseTing = false;
            seatData.canQingYiseTing = false;
            seatData.canPiaoTing = false;
            seatData.canGangBaiBalZung = false;
            seatData.canGangTongnansebei = false;
        }



        let data = {
            pai:pai,
            hu:seatData.canHu,
            peng:seatData.canPeng,
            gang:seatData.canGang,
            shunzi:seatData.canShunZi,
            tongnansebei:seatData.canGangTongnansebei,
            baibalzung: seatData.canGangBaiBalZung,
            gangpai:seatData.gangPai,
            paisAvailableShunzi:seatData.paisAvailableShunzi,
            paisAvailableTing: seatData.paisAvailableTing,
            tinged: seatData.tinged,
            ting:seatData.canTing,
            gangTing: seatData.canGangTing,
            hunYiseTing: seatData.canHunYiseTing,
            qingYiseTing: seatData.canQingYiseTing,
            piaoTing: seatData.canPiaoTing,
            tingPai: seatData.tingPai,
            tingMap: seatData.tingMap,
            paisAvailableGangBaibalzung: seatData.paisAvailableGangBaibalzung,
            paisAvailableGangTing: seatData.paisAvailableGangTing,
            chupai: seatData.game.chuPai,
            totalCountCanHu: game.totalCountCanHu,
        };

        //如果可以有操作，则进行操作
        userMgr.sendMsg(seatData.userId,'game_action_push',data);

        data.si = seatData.seatIndex;
    }
    else{
        userMgr.sendMsg(seatData.userId,'game_action_push');
    }
}

function moveToNextUser(game,nextSeat){
    game.fangpaoshumu = 0;
    //找到下一个没有和牌的玩家
    if(nextSeat == null){
        while(true){
            game.turn ++;
            game.turn %= game.seatCount;
            let turnSeat = game.gameSeats[game.turn];
            if(turnSeat.hued == false){
                break;
            }
        }
    }
    else{
        game.turn = nextSeat;
    }
}

function pengpengHuCondition(seatData) {
    if(isTinged(seatData)){
        return true;
    }
    let pengCount = calcPengCount(seatData);
    if(seatData.shunzis.length == 0 && (pengCount == 3 || pengCount == 4) && (seatData.holds.length == 4 || seatData.holds.length == 5)){
        let checkParams = checkTingCondition(seatData);
        if(seatData.game.conf.renshu != 3){
            if(!checkParams.isExistingPing || !checkParams.isExistingWan || !checkParams.isExistingTiao){
                if (seatData.game.conf.yise && checkYise(seatData, checkParams.isExistingPing, checkParams.isExistingTiao, checkParams.isExistingWan, checkParams.isExistingOneOrNine)) {
                    seatData.canHunYiseTing = false;
                    seatData.canQingYiseTing = false;
                    return true;
                }
                else{
                    seatData.canHunYiseTing = false;
                    seatData.canQingYiseTing = false;
                    return false;
                }

            }
        }
    }
    return true;
}

function isTinged(seatData) {
    if(seatData.tinged || seatData.gangTinged || seatData.piaoTinged || seatData.hunYiseTinged || seatData.qingYiseTinged){
        return true;
    }
    return false;
}

function doUserMoPai(game){
    game.chuPai = -1;
    let turnSeat = game.gameSeats[game.turn];
    turnSeat.lastFangGangSeat = -1;
    turnSeat.guoHuFan = -1;

    // checkCanTingPai(game, turnSeat);



    if(!isTinged(turnSeat)){
        let p = game.mahjongs[game.currentIndex];

        turnSeat.holds.push(parseInt(p));
        turnSeat.countMap[p]++;

        checkCanHu(game,turnSeat, p);
        if(turnSeat.canHu){
            turnSeat.canChuPai = true;

            if(calcPengCount(turnSeat) == 4) {
                //piaoting을 해야 후룰 할수 있다.
            }
            else{
                // turnSeat.countMap[p]--;
                // turnSeat.holds.pop();

                checkCanAnGang(game,turnSeat);
                checkCanJiaGang(game,turnSeat);

                recordGameAction(game,game.turn,ACTION_MOPAI,p);

                //通知前端新摸的牌
                // mopai(game,game.turn);
                userMgr.sendMsg(turnSeat.userId,'game_mopai_push',p);

                userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);

                //通知玩家做对应操作
                sendOperations(game,turnSeat,game.chuPai);
                game.currentIndex++;
                return;
            }


        }

        turnSeat.countMap[p]--;
        turnSeat.holds.splice(turnSeat.holds.indexOf(p), 1);
        turnSeat.tingMap = {};
    }

    let pai = mopai(game,game.turn);
    game.paiMopaiByUser = pai;


    let roomId = roomMgr.getUserRoom(turnSeat.userId);
    Logger.info(`User(userID: ${turnSeat.userId}) is mopai. mopai: ${pai}`, roomId);

    if(isTinged(turnSeat)){
        turnSeat.tingPai = pai;
    }

    //牌摸完了，结束
    if(pai == -1){
        doGameOver(game,turnSeat.userId);
        return;
    }
    else{
        let numOfMJ = game.mahjongs.length - game.currentIndex;
        userMgr.broacastInRoom('mj_count_push',numOfMJ,turnSeat.userId,true);
    }

    recordGameAction(game,game.turn,ACTION_MOPAI,pai);

    //通知前端新摸的牌
    userMgr.sendMsg(turnSeat.userId,'game_mopai_push',pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠


    checkCanAnGang(game,turnSeat);
    checkCanJiaGang(game,turnSeat,pai);
    // checkCanMingGang(game, turnSeat, pai);

    if(!isTinged(turnSeat) && game.conf.mahjongtype == 1){
        checkCanGangTongSeNanBeiAndGangBaiBalZung(turnSeat, pai);
    }

    if(isTinged(turnSeat) || turnSeat.hued){

        game.chuPai = -1;
        if(turnSeat.canGang){
            for(let k in turnSeat.tingMap) {
                if (turnSeat.tingMap.hasOwnProperty(k)) {
                    let canGangAfterTing = false;
                    if(!turnSeat.piaoTinged){
                        for(let gangP of turnSeat.tingMap[k].arrayPengForPiaoHu){
                            if(gangP == pai){
                                canGangAfterTing = true;
                                break;
                            }
                        }
                    }
                    else{
                        canGangAfterTing = true;
                    }

                    if(!canGangAfterTing){
                        Logger.log(`Can not do gang after ting. turnSeat.piaoTinged: ${turnSeat.piaoTinged}, canGangAfterTing: ${canGangAfterTing})`, roomId);
                        turnSeat.canGang = false;
                        turnSeat.gangPai.pop();
                    }
                    else{
                        break;
                    }
                }
            }
        }


        checkCanHu(game,turnSeat,pai);
        userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);

        if(turnSeat.canHu || turnSeat.canGang){
            //广播通知玩家出牌方
            turnSeat.canChuPai = true;
            // userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);

            //通知玩家做对应操作
            sendOperations(game,turnSeat,game.chuPai);
            return;
        }
        // else if(turnSeat.canGang){
        //     // checkCanHu(game,turnSeat,pai);
        //     turnSeat.canChuPai = true;
        //     // userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);
        //     sendOperations(game,turnSeat,game.chuPai);
        //     return;
        // }



        setTimeout(function(){
            let sendData = JSON.stringify({data:[turnSeat.userId, turnSeat.tingPai, turnSeat.tingPaiClicked]});
            userMgr.broacastInRoom('tinged_pai_notify_push',
                sendData,
                turnSeat.userId,true);
            moveToNextUser(game, turnSeat.seatIndex);

        },700);
        //广播通知其它玩家
        // userMgr.sendMsg(seatData.userId,'tinged_notify_push',{userid:seatData.userId,tingPai: seatData.tingPai});
        turnSeat.canChuPai = true;
        return;
    }
    else{
        checkCanTingOrHuCondition(turnSeat);
        if(game.conf.mahjongtype == 1 && turnSeat.canHu && calcPengCount(turnSeat) == 4){
            seatData.canHu = false;
        }
        // if(!checkIsExistingFengpaiOrSanyuanpai(turnSeat)){
        //     checkCanTingOrHuCondition(turnSeat);
        // }
    }




    //检查看是否可以和
    // checkCanHu(game,turnSeat,pai);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);

    //通知玩家做对应操作

    //깡팅을 할수 있는가를 검사.
    if(!isTinged(turnSeat)) {
        checkCanGangTing(turnSeat);

        //손에 14패가 다 있으면 안깡과 동서남북, 백발중깡을 할수 없다.
        if (turnSeat.canGangTing) {
            let ssss = 0;
        }

        if (turnSeat.holds.length > 13) {
            turnSeat.canGangBaiBalZung = false;
            turnSeat.canGangTongnansebei = false;

            if (turnSeat.canGang) {
                let latestGangPai = turnSeat.gangPai[turnSeat.gangPai.length - 1];
                if (turnSeat.countMap[latestGangPai] == 4) {
                    turnSeat.canGang = false;
                    turnSeat.gangPai.pop();
                }
            }
        }

        if (!turnSeat.canGangTing) {
            checkCanTingOrHuCondition(turnSeat);
            if (game.conf.mahjongtype == 1 && turnSeat.canHu && calcPengCount(turnSeat) == 4) {
                seatData.canHu = false;
            }
        }


    }
    sendOperations(game, turnSeat, game.chuPai);
}

// function isMenQing(gameSeatData){
//     return (gameSeatData.pengs.length + gameSeatData.wangangs.length + gameSeatData.diangangs.length) == 0;
// }

// function isZhongZhang(gameSeatData){
//     let fn = function(arr){
//         for(let i = 0; i < arr.length; ++i){
//             let pai = arr[i];
//             if(pai == 0 || pai == 8 || pai == 9 || pai == 17 || pai == 18 || pai == 26){
//                 return false;
//             }
//         }
//         return true;
//     };
//
//     if(fn(gameSeatData.pengs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.angangs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.diangangs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.wangangs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.holds) == false){
//         return false;
//     }
//     else{
//
//     }
//     return true;
// }

// function isJiangDui(gameSeatData){
//     let fn = function(arr){
//         for(let i = 0; i < arr.length; ++i){
//             let pai = arr[i];
//             if(pai != 1 && pai != 4 && pai != 7
//                && pai != 9 && pai != 13 && pai != 16
//                && pai != 18 && pai != 21 && pai != 25
//                ){
//                 return false;
//             }
//         }
//         return true;
//     };
//
//     if(fn(gameSeatData.pengs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.angangs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.diangangs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.wangangs) == false){
//         return false;
//     }
//     if(fn(gameSeatData.holds) == false){
//         return false;
//     }
//     else{
//
//     }
//     return true;
// }

// function isTinged(seatData){
//     return Object.keys(seatData.tingMap).length > 0;
//     // for(let k in seatData.tingMap){
//     //     return true;
//     // }
//     // return false;
// }

// function computeFanScore(game,fan){
//     if(fan > game.conf.maxFan){
//         fan = game.conf.maxFan;
//     }
//     return (1 << fan) * game.conf.baseScore;
// }

//是否需要查大叫(有两家以上未胡，且有人没有下叫)
// function needChaDaJiao(game){
//     //查叫
//     let numOfHued = 0;
//     let numOfTinged = 0;
//     let numOfUntinged = 0;
//     for(let i = 0; i < game.gameSeats.length; ++i){
//         let ts = game.gameSeats[i];
//         if(ts.hued){
//             numOfHued ++;
//             numOfTinged++;
//         }
//         else if(isTinged(ts)){
//             numOfTinged++;
//         }
//         else{
//             numOfUntinged++;
//         }
//     }
//
//     //如果三家都胡牌了，不需要查叫
//     if(numOfHued == 3){
//         return false;
//     }
//
//     //如果没有任何一个人叫牌，也没有任何一个胡牌，则不需要查叫
//     if(numOfTinged == 0){
//         return false;
//     }
//
//     //如果都听牌了，也不需要查叫
//     // if(numOfUntinged == 0){
//     //     return false;
//     // }
//     return numOfUntinged !== 0;
//     // return true;
// }

// function findMaxFanTingPai(ts){
//     //找出最大番
//     let cur = null;
//     for(let k in ts.tingMap){
//         if(ts.tingMap.hasOwnProperty(k)){
//             let pai = ts.tingMap[k];
//             if(cur == null || pai.fan > cur.fan){
//                 cur = pai;
//             }
//         }
//
//     }
//     return cur;
// }

// function findUnTingedPlayers(game){
//     let arr = [];
//     for(let i = 0; i < game.gameSeats.length; ++i){
//         let ts = game.gameSeats[i];
//         //如果没有胡，且没有听牌
//         if(!ts.hued && !isTinged(ts)){
//             arr.push(i);
//             recordUserAction(game,ts,"beichadajiao",-1);
//         }
//     }
//     return arr;
// }

// function chaJiao(game){
//     let arr = findUnTingedPlayers(game);
//     for(let i = 0; i < game.gameSeats.length; ++i){
//         let ts = game.gameSeats[i];
//         //如果没有胡，但是听牌了，则未叫牌的人要给钱
//         if(!ts.hued && isTinged(ts)){
//             let cur = findMaxFanTingPai(ts);
//             ts.fan = cur.fan;
//             ts.pattern = cur.pattern;
//             recordUserAction(game,ts,"chadajiao",arr);
//         }
//     }
// }

function calculateResult(game){


    for(let i = 0; i < game.gameSeats.length; ++i){
        let sd = game.gameSeats[i];

        //统计杠的数目  막대 개수를 센다.
        sd.numAnGang = sd.angangs.length + sd.gang_baibalzungs.length + sd.gang_tongnansebeis.length;
        sd.numMingGang = sd.wangangs.length + sd.diangangs.length;
    }
}

function doGameOver(game,userId,forceEnd, isZimo){
    let roomId = roomMgr.getUserRoom(userId);

    let roomLevelScore = LevelScore[roomId];
    if(roomId == null){
        return;
    }
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    let results = [];
    let dbresult = [];
    for(let seat of game.gameSeats){
        dbresult.push(0);
    }

    let fnNoticeResult = function(isEnd){
        let endinfo = null;
        if(isEnd){
            endinfo = [];
            for(let i = 0; i < roomInfo.seats.length; ++i){
                let rs = roomInfo.seats[i];
                endinfo.push({
                    numzimo:rs.numZiMo,
                    numjiepao:rs.numJiePao,
                    numdianpao:rs.numDianPao,
                    numangang:rs.numAnGang,
                    numminggang:rs.numMingGang,
                    numchadajiao:rs.numChaJiao,
                });
            }
        }
        userMgr.broacastInRoom('game_over_push',{results:results,endinfo:endinfo},userId,true);
        //如果局数已够，则进行整体结算，并关闭房间
        if(isEnd){
            setTimeout(function(){
                if(roomInfo.numOfGames > 1){
                    store_history(roomInfo);
                }

                userMgr.kickAllInRoom(roomId);
                roomMgr.destroy(roomId);
                db.archive_games(roomInfo.uuid);
            },1500);
        }
    };

    let isHuangZhunag = true;

    if(game != null){
        if(!forceEnd){
            calculateResult(game);
        }

        for(let i = 0; i < roomInfo.seats.length; ++i){
            let rs = roomInfo.seats[i];
            let sd = game.gameSeats[i];

            if(sd.hued){
                isHuangZhunag = false;
            }
            sd.score += sd.levelScore;

            rs.ready = false;
            rs.score = sd.score;
            rs.numZiMo += sd.numZiMo;
            rs.numJiePao += sd.numJiePao;
            rs.numDianPao += sd.numDianPao;
            rs.numAnGang += sd.numAnGang;
            rs.numMingGang += sd.numMingGang;
            rs.numChaJiao += sd.numChaJiao;

            let tingType = -1;

            if(sd.hunYiseTinged && sd.piaoTinged){
                tingType = 5;
            }
            else if(sd.qingYiseTinged && sd.piaoTinged){
                tingType = 6;
            }
            else if(sd.hunYiseTinged){
                tingType = 2;
            }
            else if(sd.qingYiseTinged){
                tingType = 3;
            }
            else if(sd.piaoTinged){
                tingType = 4;
            }
            else if(sd.gangTinged){
                tingType = 0;
            }
            else if(sd.tinged){
                tingType = 1;
            }

            let hongResult = false;

            if(game.conf.hongdian && game.dice_paly_result){
                hongResult = true;
            }



            let userRT = {
                userId:sd.userId,
                userName:sd.name,
                pengs:sd.pengs,
                shunzis:sd.shunzis,
                gang_tongnansebeis:sd.gang_tongnansebeis,
                gang_baibalzungs:sd.gang_baibalzungs,
                actions:[],
                wangangs:sd.wangangs,
                diangangs:sd.diangangs,
                angangs:sd.angangs,
                numofgen:sd.numofgen,
                holds:sd.holds,
                fan:0,
                tingType: tingType,
                hongResult: hongResult,
                huangZhuang: HunagZhuang[roomId],
                // fan:sd.fan,
                score:sd.score,
                gameTurn:game.turn,
                levelScore:sd.levelScore,
                totalscore:rs.score,
                qingyise:sd.qingyise,
                pattern:sd.pattern,
                isganghu:sd.isGangHu,
                menqing:sd.isMenQing,
                zhongzhang:sd.isZhongZhang,
                // gangHouHu:true,
                // kou: sd.isKeTing,
                gangHouHu:game.isGangHouHu,
                haidihu:sd.isHaiDiLao,
                // haidihu:true,
                tianhu:sd.isTianHu,
                dihu:sd.isDiHu,
                zimo:sd.iszimo,
                // gangting:sd.gangTinged,
                // hunyiseting: sd.hunYiseTinged,
                // qingyiseting: sd.qingYiseTinged,
                // piaoting: sd.piaoTinged,
                seatIndex: sd.seatIndex,
                huorder:game.hupaiList.indexOf(i),
                gangHouGangList: sd.gangHouGangList,
            };

            for(let k in sd.actions){
                userRT.actions[k] = {
                    type:sd.actions[k].type,
                };
            }
            results.push(userRT);


            dbresult[i] = sd.score;

            //한 회전의 점수들을 보관하고 있다가 방이 끝날때 없앤다.
            roomLevelScore[sd.userId] = sd.score;

            delete gameSeatsOfUsers[sd.userId];
            deleteDiceInfos(roomId);
        }
        delete games[roomId];

        let old = roomInfo.nextButton;
        if(game.yipaoduoxiang >= 0){
            roomInfo.nextButton = game.yipaoduoxiang;
        }
        else if(game.firstHupai >= 0){
            roomInfo.nextButton = game.firstHupai;
        }
        else{
            roomInfo.nextButton = (game.turn + 1) % game.seatCount;
        }

        if(old != roomInfo.nextButton){
            HongResult[roomId] = false;
            db.update_next_button(roomId,roomInfo.nextButton);
        }
        else{
            HongResult[roomId] = game.dice_paly_result;
        }
    }

    if(forceEnd || game == null){
        deleteDiceInfos(roomId);
        fnNoticeResult(true);
    }
    else{
        //保存游戏
        store_game(game,function(ret){

            db.update_game_result(roomInfo.uuid,game.gameIndex,dbresult);

            //记录打牌信息
            let str = JSON.stringify(game.actionList);
            db.update_game_action_records(roomInfo.uuid,game.gameIndex,str);

            //保存游戏局数
            db.update_num_of_turns(roomId,roomInfo.numOfGames);

            //如果是第一次，并且不是强制解散 则扣除房卡
            // if(roomInfo.numOfGames == 1){
            //     let cost = 2;
            //     if(roomInfo.conf.maxGames == 8){
            //         cost = 3;
            //     }
            //     db.cost_gems(game.gameSeats[0].userId,cost);
            // }

            let isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames);

            if(isEnd){
                deleteDiceInfos(roomId);
                deleteInformation(roomId )
            }
            fnNoticeResult(isEnd);

            HunagZhuang[roomId] = isHuangZhunag;
        });
    }
}

function deleteInformation(roomId) {
    delete LevelScore[roomId];
    delete HunagZhuang[roomId];
    delete HongResult[roomId];
}



function deleteDiceInfos(roomId) {
    delete dicePlayed[roomId];
    delete diceUserList[roomId];
    delete diceNumberList1[roomId];
    delete diceNumberList2[roomId];
    // diceUserList = [];
    // dicePlayed = false;
    // dice_paly_result = false;
    // diceNumberList1 = [];
    // diceNumberList2 = [];
    // delete LevelScore[roomId];
    // delete HunagZhuang[roomId];
}

function recordUserAction(game,seatData,type,target){
    let d = {type:type,targets:[]};
    if(target != null){
        if(typeof(target) == 'number'){
            d.targets.push(target);
        }
        else{
            d.targets = target;
        }
    }
    else{
        for(let i = 0; i < game.gameSeats.length; ++i){
            let s = game.gameSeats[i];
            if(i != seatData.seatIndex && s.hued == false){
                d.targets.push(i);
            }
        }
    }

    seatData.actions.push(d);
    return d;
}

function recordGameAction(game,si,action,pai){
    game.actionList.push(si);
    game.actionList.push(action);
    if(pai != null){
        game.actionList.push(pai);
    }
    else{
        let i =  0;
    }
}

exports.setReady = function(userId,callback){
    let roomId = roomMgr.getUserRoom(userId);
    if(roomId == null){
        return;
    }
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }
    

    roomMgr.setReady(userId,true);

    let game = games[roomId];


    
    if(game == null){
        for(let i = 0; i < roomInfo.seats.length; ++i){
            let s = roomInfo.seats[i];
            if(s.ready == false || userMgr.isOnline(s.userId)==false){
                return;
            }
        }
        //4个人到齐了，并且都准备好了，则开始新的一局
        exports.begin(roomId);
        // if(roomInfo.seats.length == game.seatCount){
        //     for(let i = 0; i < roomInfo.seats.length; ++i){
        //         let s = roomInfo.seats[i];
        //         if(s.ready == false || userMgr.isOnline(s.userId)==false){
        //             return;
        //         }
        //     }
        //     //4个人到齐了，并且都准备好了，则开始新的一局
        //     exports.begin(roomId);
        //
        // }
    }
    else{
        let numOfMJ = game.mahjongs.length - game.currentIndex;
        let remainingGames = roomInfo.conf.maxGames - roomInfo.numOfGames;

        let data = {
            state:game.state,
            numofmj:numOfMJ,
            button:game.button,
            turn:game.turn,
            chuPai:game.chuPai,
            renshu: game.conf.renshu,
            huanpaimethod:game.huanpaiMethod
        };

        data.seats = [];
        let seatData = null;
        for(let i = 0; i < game.seatCount; ++i){
            let sd = game.gameSeats[i];

            if(sd.tingPaiClicked || (isTinged(sd) && !sd.tingPaiClicked) == false){
                sd.paisAvailableTing = [];
            }

            let ps = [];
            for(let pp of sd.paisAvailableTing){
                if(sd.hunYiseTinged && sd.qingYiseTinged){
                    if(sd.piaoTinged){
                        if(pp[1] && pp[2]){
                            ps.push(pp);
                        }
                    }
                    else{
                        if(pp[1]){
                            ps.push(pp);
                        }
                    }

                }
                else{
                    if(sd.piaoTinged){
                        if(pp[2]){
                            ps.push(pp);
                        }
                    }
                    else{
                        ps.push(pp);
                    }
                }
            }
            sd.paisAvailableTing = ps;

            let s = {
                userid:sd.userId,
                folds:sd.folds,
                angangs:sd.angangs,
                diangangs:sd.diangangs,
                wangangs:sd.wangangs,
                pengs:sd.pengs,
                shunzis: sd.shunzis,
                gang_tongnansebeis: sd.gang_tongnansebeis,
                gang_baibalzungs: sd.gang_baibalzungs,
                que:sd.que,
                hued:sd.hued,
                tingPai: sd.tingPai,
                tinged: sd.tinged,
                gangTinged:sd.gangTinged,
                hunYiseTinged: sd.hunYiseTinged,
                qingYiseTinged: sd.qingYiseTinged,
                piaoTinged: sd.piaoTinged,
                score: sd.score,
                levelScore: sd.levelScore,
                iszimo:sd.iszimo,
                paisAvailableTing: sd.paisAvailableTing,
                hongResult: game.conf.hongdian && game.dice_paly_result,
                huangZhuang: HunagZhuang[roomId]
            };
            if(sd.userId == userId){
                s.holds = sd.holds;
                s.huanpais = sd.huanpais;
                seatData = sd;
            }
            else{
                s.huanpais = sd.huanpais? []:null;
            }
            data.seats.push(s);
        }

        //同步整个信息给客户端
        userMgr.sendMsg(userId,'game_sync_push',data);
        sendOperations(game,seatData,game.chuPai);
    }

    var seat = gameSeatsOfUsers[userId];

    userMgr.broacastInRoom('user_ready_push',{userid:userId,ready:true, score:seat.score, levelScore:seat.levelScore},userId,true);
};

// function realGameover(game, numOfHued) {
//   if(game.totalCountCanHu > 0) {
//       if(num)
//   }
// };

function store_single_history(userId,history){
    db.get_user_history(userId,function(data){
        if(data == null){
            data = [];
        }
        while(data.length >= 10){
            data.shift();
        }
        data.push(history);
        db.update_user_history(userId,data);
    });
}

function store_history(roomInfo){
    let seats = roomInfo.seats;
    let history = {
        uuid:roomInfo.uuid,
        id:roomInfo.id,
        time:roomInfo.createTime,
        seats:new Array(seats.length)
    };

    for(let i = 0; i < seats.length; ++i){
        let rs = seats[i];
        let hs = history.seats[i] = {};
        hs.userid = rs.userId;
        hs.name = rs.name;
        hs.name = crypto.toBase64(rs.name);
        hs.score = rs.score;
    }

    for(let i = 0; i < seats.length; ++i){
        let s = seats[i];
        store_single_history(s.userId,history);
    }
}

function construct_game_base_info(game){
    let baseInfo = {
        type:game.conf.type,
        button:game.button,
        renshu: game.conf.renshu,
        index:game.gameIndex,
        mahjongs:game.mahjongs,
        game_seats:new Array(game.seatCount)
    };

    for(let i = 0; i < game.seatCount; ++i){
        baseInfo.game_seats[i] = game.gameSeats[i].holds;
    }
    game.baseInfoJson = JSON.stringify(baseInfo);
}

function store_game(game,callback){
    db.create_game(game.roomInfo.uuid,game.gameIndex,game.baseInfoJson,callback);
}

// function initVariables(){
//     dicePlayed = false;
//     diceNumberList1 = [];
//     diceNumberList2 = [];
// }

//开始新的一局
exports.begin = function(roomId) {
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }
    let seats = roomInfo.seats;
    let game = {
        conf:roomInfo.conf,
        roomInfo:roomInfo,
        gameIndex:roomInfo.numOfGames,

        huedByQidui: false,
        huedByPiaohu: false,
        huedByQingyise : false,
        huedByHunyise : false,

        basic_score: 1 * roomInfo.conf.baseScore,
        
        seatCount: roomInfo.seats.length,



        button:roomInfo.nextButton,
        mahjongs:null,
        currentIndex:0,
        gameSeats:new Array(roomInfo.seats.length),

        numOfQue:0,
        turn:0,
        chuPai:-1,
        state:"idle",
        firstHupai:-1,
        yipaoduoxiang:-1,
        fangpaoshumu:-1,
        actionList:[],
        hupaiList:[],
        chupaiCnt:0,


        WanStartID: 0,
        PingStartID: 9,
        TiaoStartID: 18,
        DongStartID: 27,
        SanWenPaiStartID: 31,
    
        DongID: '27',
        SeID: '29',
        NanID: '28',
        BeiID: '30',
        ZhungID: '31',
        BalID: '32',
        BaiID: '33',

        TARGETPAI: null,

        dice_paly_result:false,

        paiMopaiByUser: null,

        currentGangVal:[],

        totalCountCanHu:0,
        countHued:0,
        countCancelHu:0,
    };
    
    let MJ_TotalCount = 136;

    roomInfo.numOfGames++;

    if(roomInfo.conf.renshu == 2){
        if(roomInfo.conf.mahjongtype == 0){
            game.WanStartID = 0;
            game.PingStartID = 9;
            game.TiaoStartID = 0;
            game.SanWenPaiStartID = 18;

            game.DongID = '18';
            game.SeID = null;
            game.NanID = null;
            game.BeiID = null;
            game.ZhungID = '18';
            game.BalID = null;
            game.BaiID = null;

            MJ_TotalCount = 76;
        }
        else{
            game.WanStartID = 0;
            game.PingStartID = 9;
            game.TiaoStartID = 0;
            game.DongStartID = 18;
            game.SanWenPaiStartID = 22;

            game.DongID = '18';
            game.SeID = '20';
            game.NanID = '19';
            game.BeiID = '21';
            game.ZhungID = '22';
            game.BalID = '23';
            game.BaiID = '24';

            MJ_TotalCount = 100;
        }



    }
    else if(roomInfo.conf.renshu == 3){
        if(roomInfo.conf.mahjongtype == 0){
            game.WanStartID = 0;
            game.PingStartID = 0;
            game.TiaoStartID = 0;
            // game.DongStartID = 9;
            game.SanWenPaiStartID = 9;

            game.DongID = '9';
            game.SeID = null;
            game.NanID = null;
            game.BeiID = null;
            game.ZhungID = '9';
            game.BalID = null;
            game.BaiID = null;

            MJ_TotalCount = 40;
        }
        else{
            game.WanStartID = 0;
            game.PingStartID = 0;
            game.TiaoStartID = 0;
            game.DongStartID = 9;
            game.SanWenPaiStartID = 13;

            game.DongID = '9';
            game.SeID = '11';
            game.NanID = '10';
            game.BeiID = '12';
            game.ZhungID = '13';
            game.BalID = '14';
            game.BaiID = '15';

            MJ_TotalCount = 64;
        }


    }
    else{
        if(roomInfo.conf.mahjongtype == 0){
            game.WanStartID = 0;
            game.PingStartID = 9;
            game.TiaoStartID = 18;
            game.SanWenPaiStartID = 27;

            game.DongID = '27';
            game.SeID = null;
            game.NanID = null;
            game.BeiID = null;
            game.ZhungID = '27';
            game.BalID = null;
            game.BaiID = null;

            MJ_TotalCount = 112;
        }
        // else{
        //     game.WanStartID = 0;
        //     game.PingStartID = 9;
        //     game.TiaoStartID = 18;
        //     game.DongStartID = 27;
        //     game.SanWenPaiStartID = 31;
        //
        //     game.DongID = '18';
        //     game.SeID = '20';
        //     game.NanID = '19';
        //     game.BeiID = '21';
        //     game.ZhungID = '22';
        //     game.BalID = '23';
        //     game.BaiID = '24';
        //
        //     MJ_TotalCount = 136;
        // }
    }

    game.mahjongs = new Array(MJ_TotalCount);

    if(LevelScore[roomId] == null){
        LevelScore[roomId] = {};
    }

    if(HunagZhuang[roomId] == null){
        HunagZhuang[roomId] = false;
    }

    let roomLevelScore = LevelScore[roomId];

    for(let i = 0; i < roomInfo.seats.length; ++i){
        let data = game.gameSeats[i] = {};

        data.game = game;

        data.seatIndex = i;

        data.userId = seats[i].userId;
        data.isKeTing = false;

        //持有的牌
        data.holds = [];
        //打出的牌
        data.folds = [];
        //暗杠的牌
        data.angangs = [];
        //点杠的牌
        data.diangangs = [];
        //弯杠的牌
        data.wangangs = [];
        //碰了的牌
        data.pengs = [];
        //顺子(shunzi)   련속패(슌쯔)        차례로 된 3장의 패의 list
        data.shunzis = [];

        data.gang_tongnansebeis = [];
        data.gang_baibalzungs = [];
        //缺一门
        data.que = -1;

        //换三张的牌
        data.huanpais = null;

        //玩家手上的牌的数目，用于快速判定碰杠
        data.countMap = {};
        //玩家听牌，用于快速判定胡了的番数
        data.tingMap = {};
        data.pattern = "";

        //是否可以杠
        data.canGang = false;
        //用于记录玩家可以杠的牌
        data.gangPai = [];

        //是否可以碰
        data.canPeng = false;
        //是否可以胡
        data.canHu = false;
        data.canTing = false;
        //是否可以出牌
        data.canChuPai = false;

        data.canGangTing = false;
        data.canQingYiseTing = false;
        data.canHunYiseTing = false;
        data.canPiaoTing = false;


        // 슌찌(차례로 된 3장의 패)를 할수 있는가를 표시하는 변수
        data.canShunZi = false;
        data.canGangTongnansebei = false;
        data.canGangBaiBalZung = false;

        // 슌찌를 할수 있는 패의 list
        data.paisAvailableShunzi = [];
        data.paisAvailableGangBaibalzung = [];
        data.paisAvailableGangTing = [];
        data.paisAvailableTing = [];
        data.paisGangTinged = [];

        //如果guoHuFan >=0 表示处于过胡状态，
        //如果过胡状态，那么只能胡大于过胡番数的牌
        data.guoHuFan = -1;

        //是否胡了
        data.hued = false;
        data.tinged = false;
        data.gangTinged = false;
        data.hunYiseTinged = false;
        data.qingYiseTinged = false;
        data.piaoTinged = false;
        data.tingPai = null;
        //是否是自摸
        data.iszimo = false;

        data.isGangHu = false;

        data.arrayOfPengWhenCheckTingOrHu = [];

        //
        data.actions = [];

        data.self_fan = 1;

        if(Object.keys(roomLevelScore).length > 0){
            data.score = roomLevelScore[data.userId];
        }
        else{
            data.score = 0;
        }
        data.lastFangGangSeat = -1;

        data.tingPaiClicked = false;

        //统计信息
        data.numZiMo = 0;
        data.numJiePao = 0;
        data.numDianPao = 0;
        data.numAnGang = 0;
        data.numMingGang = 0;
        data.numChaJiao = 0;

        data.levelScore = 0;
        data.availableTingMap = {};

        gameSeatsOfUsers[data.userId] = data;
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);



    let numOfMJ = game.mahjongs.length - game.currentIndex;
    let huansanzhang = roomInfo.conf.hsz;

    let scoreList = [];

    for(let i = 0; i < seats.length; ++i){
        //开局时，通知前端必要的数据
        let s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId,'game_holds_push',game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId,'mj_count_push',numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId,'game_num_push',roomInfo.numOfGames);
        //通知游戏开始
        userMgr.sendMsg(s.userId,'game_begin_push',{button:game.button, dicePlayed: dicePlayed[roomId], levelScore: LevelScore[roomId] , huangZhuang: HunagZhuang[roomId]});
        // if(!dicePlayed){
        //     userMgr.sendMsg(s.userId,'game_begin_push',{button: game.button, diceNumberList1: diceNumberList1, diceNumberList2:diceNumberList2});
        // }
        // else{
        //     userMgr.sendMsg(s.userId,'game_begin_push',{button: game.button, diceNumberList1: null, diceNumberList2:null});
        // }

        // userMgr.broacastInRoom('get_renshu_notify_push',roomInfo.conf.renshu,s.userId,true);

        // game.state = "dingque";

        if(huansanzhang == true){
            game.state = "huanpai";
            //通知准备换牌
            userMgr.sendMsg(s.userId,'game_huanpai_push');
        }
        else{
            game.state = "dingque";
            //通知准备定缺
            userMgr.sendMsg(s.userId,'game_dingque_push');
        }

        scoreList.push(s.score);
        scoreList.push(0);


        // userMgr.sendMsg(s.userId,'game_renshu_push',roomInfo.conf.renshu);
    }

    recordGameAction(game,-1,ACTION_SCORE_CHANGE,scoreList);
};

exports.huanSanZhang = function(userId,p1,p2,p3){
    let seatData = gameSeatsOfUsers[userId];
    let roomId = roomMgr.getUserRoom(userId);
    if(seatData == null){
        Logger.error(`can't find user game data.`, roomId);
        return;
    }

    let game = seatData.game;
    if(game.state != "huanpai"){
        Logger.error(`can't recv huansanzhang when game.state == ${game.state}, user id: ${userId}`, roomId);
        return;
    }

    if(seatData.huanpais != null){
        Logger.error(`player has done this action, user id: ${userId}`, roomId);
        return;
    }

    if(seatData.countMap[p1] == null || seatData.countMap[p1] == 0){
        return;
    }
    seatData.countMap[p1]--;

    if(seatData.countMap[p2] == null || seatData.countMap[p2] == 0){
        seatData.countMap[p1]++;
        return;
    }
    seatData.countMap[p2]--;

    if(seatData.countMap[p3] == null || seatData.countMap[p3] == 0){
        seatData.countMap[p1]++;
        seatData.countMap[p2]++;
        return;
    }

    seatData.countMap[p1]++;
    seatData.countMap[p2]++;

    seatData.huanpais = [p1,p2,p3];

    for(let i = 0; i < seatData.huanpais.length; ++i){
        let p = seatData.huanpais[i];
        let idx = seatData.holds.indexOf(p);
        seatData.holds.splice(idx,1);
        seatData.countMap[p] --;
    }
    userMgr.sendMsg(seatData.userId,'game_holds_push',seatData.holds);

    for(let i = 0; i < game.gameSeats.length; ++i){
        let sd = game.gameSeats[i];
        if(sd == seatData){
            let rd = {
                si:seatData.userId,
                huanpais:seatData.huanpais
            };
            userMgr.sendMsg(sd.userId,'huanpai_notify',rd);
        }
        else{
            let rd = {
                si:seatData.userId,
                huanpais:[]
            };
            userMgr.sendMsg(sd.userId,'huanpai_notify',rd);
        }
    }

    //如果还有未换牌的玩家，则继承等待
    for(let i = 0; i < game.gameSeats.length; ++i){
        if(game.gameSeats[i].huanpais == null){
            return;
        }
    }


    //换牌函数
    let fn = function(s1,huanjin){
        for(let i = 0; i < huanjin.length; ++i){
            let p = huanjin[i];
            s1.holds.push(parseInt(p));
            if(s1.countMap[p] == null){
                s1.countMap[p] = 0;
            }
            s1.countMap[p] ++;
        }
    };

    //开始换牌
    let f = Math.random();
    let s = game.gameSeats;
    let huanpaiMethod = 0;
    //对家换牌
    if(f < 0.33){
        fn(s[0],s[2].huanpais);
        fn(s[1],s[3].huanpais);
        fn(s[2],s[0].huanpais);
        fn(s[3],s[1].huanpais);
        huanpaiMethod = 0;
    }
    //换下家的牌
    else if(f < 0.66){
        fn(s[0],s[1].huanpais);
        fn(s[1],s[2].huanpais);
        fn(s[2],s[3].huanpais);
        fn(s[3],s[0].huanpais);
        huanpaiMethod = 1;
    }
    //换上家的牌
    else{
        fn(s[0],s[3].huanpais);
        fn(s[1],s[0].huanpais);
        fn(s[2],s[1].huanpais);
        fn(s[3],s[2].huanpais);
        huanpaiMethod = 2;
    }

    let rd = {
        method:huanpaiMethod,
    };
    game.huanpaiMethod = huanpaiMethod;

    game.state = "dingque";
    for(let i = 0; i < s.length; ++i){
        let userId = s[i].userId;
        userMgr.sendMsg(userId,'game_huanpai_over_push',rd);

        userMgr.sendMsg(userId,'game_holds_push',s[i].holds);
        //通知准备定缺
        userMgr.sendMsg(userId,'game_dingque_push');
    }
};

exports.login_result = function(userId, ret){
    // ret.data.conf['dicePlayed'] = dicePlayed;
    // userMgr.broacastInRoom('login_result',ret,userId);
    userMgr.sendMsg(userId,'login_result', ret);
};

exports.dice_start = function(userId){

    // if(dicePlayed){
    //     return;
    // }
    let roomId = roomMgr.getUserRoom(userId);

    if(diceUserList[roomId] == null){
        diceUserList[roomId] = [];
        diceNumberList1[roomId] = [];
        diceNumberList2[roomId] = [];
        // LevelScore[roomId] = {};
    }

    if(dicePlayed[roomId]){
        userMgr.broacastInRoom('dice_play_push',{dicePlayed: true}, userId,true);
        return;
    }

    if(diceUserList[roomId].indexOf(userId) != -1){
        return;
    }

    if(diceUserList[roomId].indexOf(userId) != -1){
        return;
    }

    let roomInfo = roomMgr.getRoom(roomId);

    diceUserList[roomId].push(userId);

    if(diceUserList[roomId].length == roomInfo.seats.length){
        let n;
        for(let i = 0; i < 12; i++){
            n = Math.floor(Math.random() * 5);
            diceNumberList1[roomId].push(n);
        }

        for(let i = 0; i < 12; i++){
            n = Math.floor(Math.random() * 5);
            diceNumberList2[roomId].push(n);
        }

        // diceNumberList1[rotinged_pai_notifyId].push(0);

        // for(let seat of roomInfo.seats){
        userMgr.broacastInRoom('dice_play_push',{renshu: roomInfo.conf.renshu, dicePlayed: false, numList1: diceNumberList1[roomId], numList2: diceNumberList2[roomId]},userId,true);
        // }
        dicePlayed[roomId] = true;
    }
};

exports.dice_play_result = function (userId, dice_result) {
    let seatData = gameSeatsOfUsers[userId];
    let roomId = roomMgr.getUserRoom(userId);
    if(HongResult[roomId]){
        seatData.game.dice_paly_result = true;
    }
    else{
        if(dice_result == 0){
            seatData.game.dice_paly_result = false;
        }
        else{
            seatData.game.dice_paly_result = true;
        }

    }

    let sendNum = 0;
    if(seatData.game.dice_paly_result){
        sendNum = 1;
    }

    recordGameAction(seatData.game,-1,ACTION_BASE_INFO,[seatData.game.dice_paly_result, HunagZhuang[roomId], seatData.game.conf.mahjongtype]);

    userMgr.sendMsg(userId, 'hong_display_push',sendNum);

};

exports.dingQue = function(userId,type){
    let seatData = gameSeatsOfUsers[userId];
    let roomId = roomMgr.getUserRoom(userId);
    if(seatData == null){
        Logger.error(`Can't find user game data by userID(${userId}).`, roomId);
        return;
    }

    let game = seatData.game;

    if(game.turn != seatData.seatIndex){
        return;
    }

    if(game.state != "dingque"){
        // Logger.error(`Can't receive dingQue when game.state == '${game.state}'.`, roomId);
        return;
    }

    if(seatData.que < 0){
        game.numOfQue++;
    }

    seatData.que = type;


    //检查玩家可以做的动作
    //如果4个人都定缺了，通知庄家出牌
    // if(game.numOfQue == 4){
        construct_game_base_info(game);

        let arr = [];
        if(game.seatCount == 2){
            arr = [1,1];
        }
        else if(game.seatCount == 3){
            arr = [1,1,1];
        }
        else if(game.seatCount == 4){
            arr = [1,1,1,1];
        }

        for(let i = 0; i < game.gameSeats.length; ++i){
            arr[i] = game.gameSeats[i].que;
        }
        userMgr.broacastInRoom('game_dingque_finish_push',arr,seatData.userId,true);
        userMgr.broacastInRoom('game_playing_push',null,seatData.userId,true);

        //进行听牌检查
        for(let i = 0; i < game.gameSeats.length; ++i){
            let duoyu = -1;
            let gs = game.gameSeats[i];
            if(gs.holds.length == 14){
                duoyu = gs.holds.pop();
                gs.countMap[duoyu] -= 1;
            }
            checkCanTingPai(game,gs);
            if(duoyu >= 0){
                gs.holds.push(parseInt(duoyu));
                gs.countMap[duoyu] ++;
            }
        }

        let turnSeat = game.gameSeats[game.turn];
        game.state = "playing";
        //通知玩家出牌方
        turnSeat.canChuPai = true;

        Logger.log(`Sent ''game_chupai_push' to all users(in dingchu function).`, roomId);

        userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);
        //检查是否可以暗杠或者胡
        //直杠
        // checkCanAnGang(game,turnSeat);
        // checkCanGangTongSeNanBeiAndGangBaiBalZung(turnSeat, turnSeat.holds[turnSeat.holds.length - 1]);

        //检查胡 用最后一张来检查
        checkCanHu(game,turnSeat,turnSeat.holds[turnSeat.holds.length - 1]);
        //通知前端
        sendOperations(game,turnSeat,game.chuPai);
    // }
    // else{
    //     userMgr.broacastInRoom('game_dingque_notify_push',seatData.userId,seatData.userId,true);
    // }
};

exports.chuPai = function(userId,pai){
    pai = Number.parseInt(pai);
    let seatData = gameSeatsOfUsers[userId];

    let roomId = roomMgr.getUserRoom(userId);
    if(seatData == null){
        Logger.error(`Can't find user game data by userID(${userId}).`, roomId);
        return;
    }

    Logger.info(`User(userID: ${userId}) is starting chupai. chupai: ${pai}`, roomId);

    let game = seatData.game;




    let seatIndex = seatData.seatIndex;
    //如果不该他出，则忽略
    if(game.turn != seatData.seatIndex){
        Logger.error(`Not your turn. Current game turn: ${game.turn}, your index: ${seatData.seatIndex}`, roomId);
        return;
    }

    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. Current index: ${seatData.seatIndex}`, roomId);
        return;
    }

    if(seatData.canChuPai == false){
        Logger.error(`you can not chupai. Current index: ${seatData.seatIndex}, canChupai: ${seatData.canChuPai}`, roomId);
        return;
    }

    if(hasOperations(seatData)){
        Logger.error(`There remains some action. Please quo before you chupai. Current index: ${seatData.seatIndex}`, roomId);
        return;
    }

    Logger.log(`user did chupai. pai: ${pai} userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);


    //从此人牌中扣除
    let index = seatData.holds.indexOf(pai);
    if(index == -1){
        Logger.error(`Can not find mj in current seat's holds. Pai to find: ${pai}, Current seat index: ${seatData.seatIndex}, seat's holds: ${seatData.holds}`, roomId);
        return;
    }

    seatData.canChuPai = false;
    game.chupaiCnt ++;
    seatData.guoHuFan = -1;

    seatData.holds.splice(index,1);
    seatData.countMap[pai] --;
    game.chuPai = pai;

    game.paiMopaiByUser = null;

    recordGameAction(game,seatData.seatIndex,ACTION_CHUPAI,pai);



    Logger.info(`Sent 'game_chupai_notify_push' to all users.`, roomId);
    userMgr.broacastInRoom('game_chupai_notify_push',{userId:seatData.userId,pai:pai},seatData.userId,true);

    //如果出的牌可以胡，则算过胡
    // if(seatData.tingMap[game.chuPai]){
    //     seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
    // }

    //检查是否有人要胡，要碰 要杠
    let hasActions = false;

    let isExistingShunzi  = false;
    let seatIndexWithPengOrGang = null;

    game.totalCountCanHu = 0;

    for(let i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        let ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        ddd.holds.push(parseInt(pai));
        ddd.countMap[pai]++;

        checkCanHu(game, ddd, pai);
        if (!ddd.canHu) {
            ddd.canTing = false;
        }
        else {
            if(game.conf.mahjongtype == 1 && !ddd.piaoTinged && calcPengCount(ddd) == 4) {
                ddd.canHu = false;
                //piaoting을 해야 후룰 할수 있다.
            }
            else{
                ddd.holds.splice(ddd.holds.indexOf(pai), 1);
                ddd.countMap[pai]--;
                Logger.log(`Sent 'guo_notify_push' to all users because some user have action. Seat index: ${seatData.seatIndex}`, roomId);
                userMgr.broacastInRoom('guo_notify_push', {
                    userId: seatData.userId,
                    pai: game.chuPai
                }, seatData.userId, true);
                seatData.folds.push(game.chuPai);

                // sendOperations(game, ddd, game.chuPai);
                game.totalCountCanHu++;
                continue;
            }


        }

        ddd.holds.splice(ddd.holds.indexOf(parseInt(pai)), 1);
        ddd.countMap[pai]--;
    }
    if(game.totalCountCanHu > 0){
        for(let i = 0; i < game.gameSeats.length; ++i) {
            //玩家自己不检查
            if (game.turn == i) {
                continue;
            }
            let ddd = game.gameSeats[i];
            //已经和牌的不再检查
            if (ddd.hued) {
                continue;
            }
            if (ddd.canHu) {
                sendOperations(game, ddd, game.chuPai);
            }
        }
        return;
    }

    Logger.log(`Checking whether some user can do 'peng' or 'gang'. current seat index: ${seatData.seatIndex}`, roomId);
    for(let i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        let ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        checkCanPeng(game,ddd,pai);
        if(ddd.canPeng){
            isExistingShunzi = ddd.canPeng;
            seatIndexWithPengOrGang = i;
            break;
        }

        checkCanMingGang(game,ddd,pai);
        if(ddd.canGang){
            isExistingShunzi = ddd.canGang;
            seatIndexWithPengOrGang = i;
            ddd.gangPai.pop();
            break;
        }
    }

    Logger.log(`Finish checking whether some user can do 'peng' or 'gang'. `, roomId);

    for(let i = 0; i < game.gameSeats.length; ++i){
        //玩家自己不检查
        if(game.turn == i){
            continue;
        }
        let ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if(ddd.hued){
            continue;
        }

        checkCanPeng(game,ddd,pai);
        checkCanMingGang(game,ddd,pai);

        if(isTinged(ddd)){
            if(!ddd.piaoTinged && ddd.canGang){
                for(let k in ddd.tingMap) {
                    if (ddd.tingMap.hasOwnProperty(k)) {
                        let canGangAfterTing = false;
                        if(!ddd.tingMap[k]){
                            continue;
                        }
                        for(let gangP of ddd.tingMap[k].arrayPengForPiaoHu){
                            if(gangP == pai){
                                canGangAfterTing = true;
                                break;
                            }
                        }
                        if(!canGangAfterTing){
                            let isExistingFengPengPais = false;
                            for(let countMapKey in ddd.countMap){
                                if(ddd.countMap.hasOwnProperty(countMapKey)){
                                    if(parseInt(countMapKey) >= parseInt(game.DongID) && ddd.countMap[countMapKey] == 3){
                                        isExistingFengPengPais = true;
                                        break;
                                    }
                                }
                            }
                            if(!isExistingFengPengPais){
                                ddd.canGang = false;
                                ddd.gangPai.pop();
                            }

                        }
                        else{
                            break;
                        }
                    }
                }
            }

        }
        else{
            if(ddd.canGang){
                ddd.countMap[pai]++;
                ddd.holds.push(parseInt(pai));

                checkCanGangTing(ddd);

                ddd.countMap[pai]--;
                ddd.holds.splice(ddd.holds.indexOf(parseInt(pai)), 1);
            }
        }




        if(!isExistingShunzi){
            if((game.turn + 1) % game.seatCount == i){
                checkCanShunZi(game, ddd, pai);
            }
        }

        if(hasOperations(ddd)){
            Logger.log(`Sent 'guo_notify_push' to all users because some user have action. Seat index: ${seatData.seatIndex}`, roomId);
            userMgr.broacastInRoom('guo_notify_push',{userId:seatData.userId,pai:game.chuPai},seatData.userId,true);
            seatData.folds.push(game.chuPai);
            sendOperations(game,ddd,game.chuPai);
            hasActions = true;
        }
    }

    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if(!hasActions){
        setTimeout(function(){
            Logger.log(`Sent 'guo_notify_push' to all users because some user don't have action.`, roomId);
            userMgr.broacastInRoom('guo_notify_push',{userId:seatData.userId,pai:game.chuPai},seatData.userId,true);
            seatData.folds.push(game.chuPai);
            game.chuPai = -1;
            game.currentGangVal = [];
            moveToNextUser(game);
            doUserMoPai(game);
        },500);
    }
};

exports.gang_ting = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;
    let roomId = roomMgr.getUserRoom(userId);

    Logger.info(`User(userID: ${userId}, SeatIndex: ${seatData.seatIndex}) agree gangting`, roomId);

    let i = game.turn;
    while(true){
        i = (i + 1) % game.seatCount;
        if(i == game.turn){
            break;
        }
        else{
            let ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }




    //进行碰牌处理  카드를 수행하려면
    //扣掉手上的牌  카드의 손을 낸다.
    //从此人牌中扣除  이 카드에서 공제하십시오.

    let resultPais = [];
    if(typeof data === "string"){
        resultPais = JSON.parse(data).data;
    }
    else {
        resultPais = data['data'];
    }

    if(seatData.countMap[resultPais[0]] == 3){
        resultPais.pop();
    }


    for(let i = 0; i < resultPais.length; ++i){
        let index = seatData.holds.indexOf(parseInt(resultPais[i])) ;
        if(index == -1){
            Logger.error(`can't find mj. mj: ${resultPais[i]}, holds: ${seatData.holds}`, roomId);
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[resultPais[i]] --;
    }

    if(resultPais.length == 3){
        seatData.diangangs.push({pai:resultPais[0], getSeatIndex: seatData.game.turn});
    }
    else if(resultPais[0] == resultPais[1] && resultPais[2] == resultPais[1] && resultPais[2] == resultPais[3]){
        var angangs = seatData.angangs;
        angangs.push(resultPais[0]);
    }
    else if(parseInt(resultPais[0]) == parseInt(game.DongID)){
        var gang_tongnansebeis = seatData.gang_tongnansebeis;
        gang_tongnansebeis.push(resultPais);
    }
    else{
        var gang_baibalzungs = seatData.gang_baibalzungs;
        gang_baibalzungs.push(resultPais);
    }


    seatData.tinged = true;
    seatData.gangTinged = true;
    seatData.canTing = false;
    seatData.paisGangTinged = resultPais;
    seatData.tingMap = seatData.availableTingMap;

    if(seatData.canHunYiseTing){
        seatData.canHunYiseTing = false;
        seatData.hunYiseTinged = true;
        seatData.tinged = false;
        seatData.gangTinged = false;
    }
    else if(seatData.canQingYiseTing){
        seatData.canQingYiseTing = false;
        seatData.qingYiseTinged = true;
        seatData.tinged = false;
        seatData.gangTinged = false;
    }

    if(seatData.canPiaoTing){
        seatData.canPiaoTing = false;
        seatData.piaoTinged = true;
        seatData.tinged = false;
        seatData.gangTinged = false;
    }
    clearAllOptions(game);




    if(seatData.hunYiseTinged){
        if(seatData.game.conf.mahjongtype == 0){
            seatData.self_fan *= 4;
        }
        else{
            seatData.self_fan *= 2;
        }

    }
    else if(seatData.qingYiseTinged){
        if(seatData.game.conf.mahjongtype == 0){
            seatData.self_fan *= 8;
        }
        else{
            seatData.self_fan *= 4;
        }
    }
    if(seatData.piaoTinged){
        if(seatData.game.conf.mahjongtype == 0){
            seatData.self_fan *= 4;
        }
        else{
            seatData.self_fan *= 2;
        }
    }

    if(seatData.holds.length == 1 || seatData.holds.length >= 10){
        seatData.isKeTing = true;
    }

    checkPengBeforeTingAndSaveScore(seatData, true);

    calcScoreByBaibalzhungSanwanpaiGang(seatData.game, seatData, resultPais);

    recordGameAction(game,seatData.seatIndex, ACTION_GANGTINGED, [resultPais, [seatData.hunYiseTinged, seatData.qingYiseTinged, seatData.piaoTinged]]);

    userMgr.broacastInRoom('gangtinged_notify_push',{userid:seatData.userId,resultPais: resultPais, yisePiaoTings:[seatData.hunYiseTinged, seatData.qingYiseTinged, seatData.piaoTinged]},seatData.userId,true);
    //
    seatData.canChuPai = false;
    setTimeout(function(){
        moveToNextUser(game, seatData.seatIndex);
        doUserMoPai(game);
    },500);



};

exports.gang_baibalzung = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;
    let roomId = roomMgr.getUserRoom(userId);
    // 현재 후 가 준비되였는지 검사한다.
    Logger.info(`User(userID: ${userId}) agree gang(baibalzung)`, roomId);
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. userID: ${userId}`, roomId);
        return;
    }



    // //깡을 한 사람이 짱일때 점수를 2배로 해주고 나머지 사람들에게 2배씩 덜어준다.
    // if(game.button == seatData.seatIndex){
    //     seatData.score += game.basic_score * game.conf.baseScore * 2 * game.seatCount;
    //     for(let seat of game.gameSeats){
    //         if(seat.seatIndex != seatData.seatIndex){
    //             seat.score -= game.basic_score * game.conf.baseScore * 2;
    //         }
    //     }
    // }
    // else{
    //     seatData.score += game.basic_score * game.conf.baseScore * game.seatCount;
    //     for(let seat of game.gameSeats){
    //         if(seat.seatIndex != seatData.seatIndex){
    //             continue;
    //         }
    //         if(game.button == seat.seatIndex) {
    //             seat.score -= game.basic_score * game.conf.baseScore * 2;
    //         }
    //         else{
    //             seat.score -= game.basic_score * game.conf.baseScore;
    //         }
    //     }
    // }



    //如果有人可以胡牌，则需要等待  누군가가 나쁜 카드를 만들 수 있다면 기다려야합니다.
    let i = game.turn;
    while(true){
        i = (i + 1) % game.seatCount;
        if(i == game.turn){
            break;
        }
        else{
            let ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    clearAllOptions(game);

    //进行碰牌处理  카드를 수행하려면
    //扣掉手上的牌  카드의 손을 낸다.
    //从此人牌中扣除  이 카드에서 공제하십시오.

    let resultPais;
    if(typeof data === "string"){
        resultPais = JSON.parse(data).data;
    }
    else {
        resultPais = data['data'];
    }

    calcScoreByBaibalzhungSanwanpaiGang(game, seatData, resultPais);

    for(let i = 0; i < 4; ++i){
        let index = seatData.holds.indexOf(parseInt(resultPais[i]));
        if(index == -1){
            Logger.error(`can't find mj. mj: ${resultPais[i]}, holds: ${seatData.holds}`, roomId);
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[resultPais[i]] --;
    }
    seatData.gang_baibalzungs.push(resultPais);
    game.chuPai = -1;

    recordGameAction(game,seatData.seatIndex,ACTION_GANGBAIBALZUNG,resultPais);
    // userMgr.sendMsg(seatData.userId,'gang_baibalzung_notify_push',{userid:seatData.userId,paisToRemove: data.data});

    //广播通知其它玩家
    Logger.log(`Sent 'gang_baibalzung_notify_push' to all users.`, roomId);

    userMgr.broacastInRoom('gang_baibalzung_notify_push',{userid:seatData.userId,paisToRemove: resultPais},seatData.userId,true);
    seatData.canChuPai = false;
    setTimeout(function(){
        moveToNextUser(game,seatData.seatIndex);
        doUserMoPai(game);
        // moveToNextUser(game);
        // doUserMoPai(game);
    },500);
};


exports.gang_tongnansebei = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;
    // 현재 후 가 준비되였는지 검사한다.

    let roomId = roomMgr.getUserRoom(userId);
    Logger.info(`User(userID: ${userId}) agree gang(gang_tongnansebei)`, roomId);
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. userID: ${userId}`, roomId);
        return;
    }

    // seatData.gangHouGangList = [game.DongID, game.NanID, game.SeID, game.BeiID];

    calcScoreByBaibalzhungSanwanpaiGang(game, seatData, [game.DongID, game.NanID, game.SeID, game.BeiID]);

    //如果有人可以胡牌，则需要等待  누군가가 나쁜 카드를 만들 수 있다면 기다려야합니다.
    let i = game.turn;
    while(true){
        i = (i + 1) % game.seatCount;
        if(i == game.turn){
            break;
        }
        else{
            let ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    clearAllOptions(game);

    //进行碰牌处理  카드를 수행하려면
    //扣掉手上的牌  카드의 손을 낸다.
    //从此人牌中扣除  이 카드에서 공제하십시오.
    let pais = [game.DongID, game.NanID, game.SeID, game.BeiID];
    for(let i = 0; i < 4; ++i){
        let index = seatData.holds.indexOf(parseInt(pais[i]));
        if(index == -1){
            Logger.error(`can't find mj. mj: ${pais[i]}, holds: ${seatData.holds}`, roomId);
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pais[i]] --;
    }
    seatData.gang_tongnansebeis.push(pais);
    game.chuPai = -1;

    recordGameAction(game,seatData.seatIndex,ACTION_GANGTONGNANSEBEI,pais);
    // userMgr.sendMsg(seatData.userId,'gang_tongnansebei_notify_push',{userid:seatData.userId,paisToRemove: pais});

    //广播通知其它玩家
    Logger.log(`Sent 'gang_tongnansebei_notify_push' to all users.`, roomId);

    userMgr.broacastInRoom('gang_tongnansebei_notify_push',{userid:seatData.userId,paisToRemove: pais},seatData.userId,true);
    seatData.canChuPai = false;
    setTimeout(function(){

        moveToNextUser(game,seatData.seatIndex);
        doUserMoPai(game);
        // moveToNextUser(game);
        // doUserMoPai(game);
    },500);

};

exports.ting_pai_client = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;

    // checkCanTingOrHuCondition(seatData);


    let tingPaiData = null;
    if(typeof data === 'string'){
        tingPaiData = JSON.parse(data);
    }
    else{
        tingPaiData = data;
    }

    seatData.tingMap = seatData.availableTingMap[tingPaiData.tingPai];

    seatData.tingPai = tingPaiData.tingPai;
    seatData.paisAvailableTing = [];
    seatData.tingPaiClicked = true;
    seatData.game.currentGangVal = [];

    let roomId = roomMgr.getUserRoom(userId);
    Logger.info(`User(userID: ${userId}) agree ting_pai_client`, roomId);

    // 현재 후 가 준비되였는지 검사한다.
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. userID: ${userId}`, roomId);
        return;
    }

    clearAllOptions(game);

    game.chuPai = -1;

    //yise ting인 경우
    if(tingPaiData.yise){
        let hunYiseTing = false;
        for(let p of seatData.pengs){
            if(parseInt(p.pai) >= parseInt(seatData.game.DongID) ){
                hunYiseTing = true;
            }
        }

        for(let p of seatData.angangs){
            if(parseInt(p) >= parseInt(seatData.game.DongID)){
                hunYiseTing = true;
            }
        }

        for(let p of seatData.diangangs){
            if(parseInt(p.pai) >= parseInt(seatData.game.DongID) ){
                hunYiseTing = true;
            }
        }

        for(let p of seatData.wangangs){
            if(parseInt(p.pai) >= parseInt(seatData.game.DongID) ){
                hunYiseTing = true;
            }
        }

        if(seatData.gang_tongnansebeis.length > 0 || seatData.gang_baibalzungs.length > 0){
            hunYiseTing = true;
        }

        let idx  = seatData.holds.indexOf(seatData.tingPai);
        if(idx >= 0){
            seatData.holds.splice(idx, 1);
        }

        for(let pp of seatData.holds){
            if(parseInt(pp) >= parseInt(seatData.game.DongID) ){
                hunYiseTing = true;
            }
        }
        seatData.holds.push(seatData.tingPai);

        let registerVal = 1;
        seatData.hunYiseTinged = false;
        seatData.qingYiseTinged = true;
        if(hunYiseTing){
            registerVal = 2;
            seatData.hunYiseTinged = true;
            seatData.qingYiseTinged = false;
        }

        seatData.canHunYiseTing = false;
        seatData.canQingYiseTing = false;
        
        if(seatData.hunYiseTinged){
            if(seatData.game.conf.mahjongtype == 0){
                seatData.self_fan *= 4;
            }
            else{
                seatData.self_fan *= 2;
            }
        }
        else if(seatData.qingYiseTinged){
            if(seatData.game.conf.mahjongtype == 0){
                seatData.self_fan *= 8;
            }
            else{
                seatData.self_fan *= 4;
            }
        }
        
        if(seatData.piaoTinged){
            if(seatData.game.conf.mahjongtype == 0 && (!seatData.qingYiseTinged && !seatData.hunYiseTinged)){
                seatData.self_fan *= 4;
            }
            else{
                seatData.self_fan *= 2;
            }

        }

        if(seatData.holds.length == 2 || seatData.holds.length == 14){
            seatData.isKeTing = true;
        }

        checkPengBeforeTingAndSaveScore(seatData);

        let sendData = JSON.stringify({data:[seatData.userId,tingPaiData.tingPai,seatData.tingPaiClicked, registerVal]});
        userMgr.broacastInRoom('tinged_yise_pai_notify_push',sendData,seatData.userId,true);

        moveToNextUser(game,seatData.seatIndex);
        seatData.canChuPai = true;

        recordGameAction(game,seatData.seatIndex, ACTION_YISE_TINGED, [registerVal, tingPaiData.tingPai, seatData.piaoTinged]);
        return;
    }



    // recordGameAction(game,seatData.seatIndex, ACTION_TINGED_PAI, tingPaiData.tingPai);

    //广播通知其它玩家
    
    // if(seatData.piaoTinged && (seatData.holds.length == 14 || seatData.holds.length == 2)){
    //     seatData.self_fan *= 4;
    // }
    if(seatData.piaoTinged){
        if(seatData.game.conf.mahjongtype == 0){
            seatData.self_fan *= 4;
        }
        else{
            seatData.self_fan *= 2;
        }
    }
    if(seatData.holds.length == 2 || seatData.holds.length == 14){
        seatData.isKeTing = true;
    }

    checkPengBeforeTingAndSaveScore(seatData);
    
    let sendData = JSON.stringify({data:[seatData.userId,tingPaiData.tingPai,seatData.tingPaiClicked]});
    userMgr.broacastInRoom('tinged_pai_notify_push',sendData,seatData.userId,true);

    moveToNextUser(game,seatData.seatIndex);
    seatData.canChuPai = true;
    // userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
};

exports.ting_client = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;

    seatData.tinged = true;
    seatData.canTing = false;
    seatData.game.currentGangVal = [];

    recordGameAction(game,seatData.seatIndex, ACTION_TINGED, 1);
    //
    // //广播通知其它玩家
    userMgr.broacastInRoom('tinged_notify_push',{userid:seatData.userId,tinged: seatData.tinged},seatData.userId,true);
    //
    moveToNextUser(game,seatData.seatIndex);
    seatData.canChuPai = true;
    // // userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
};

exports.ting_client_yise = function(userId, data) {

    let resultData = {};
    if(typeof data === 'string'){
        resultData = JSON.parse(data);
    }
    else{
        resultData = data;
    }

    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;

    // seatData.tinged = true;
    seatData.canTing = false;
    seatData.canHunYiseTing = false;
    seatData.canQingYiseTing = false;

    seatData.hunYiseTinged = true;
    seatData.qingYiseTinged = true;
    seatData.game.currentGangVal = [];

    if(parseInt(resultData.yiseonly) == 2){
        seatData.canPiaoTing = false;
        seatData.piaoTinged = true;
    }

    recordGameAction(game,seatData.seatIndex, ACTION_YISE_TING, resultData.yiseonly);

    userMgr.broacastInRoom('tinged_yise_notify_push',{userid:seatData.userId, yiseonly: resultData.yiseonly},seatData.userId,true);
    //
    moveToNextUser(game,seatData.seatIndex);
    seatData.canChuPai = true;
    // // userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
};

exports.ting_client_piao = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let game = seatData.game;

    seatData.piaoTinged = true;
    seatData.canPiaoTing = false;
    seatData.canTing = false;
    seatData.game.currentGangVal = [];

    recordGameAction(game,seatData.seatIndex, ACTION_PIAO_TINGED, 1);
    //
    // //广播通知其它玩家
    userMgr.broacastInRoom('tinged_piao_notify_push',{userid:seatData.userId, piaoTinged: seatData.piaoTinged},seatData.userId,true);
    //
    moveToNextUser(game,seatData.seatIndex);
    seatData.canChuPai = true;
    // // userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
};

exports.get_renshu = function(userId) {
    let seatData = gameSeatsOfUsers[userId];
    userMgr.broacastInRoom('get_renshu_notify_push',{renshu: seatData.game.conf.renshu},seatData.userId,true);

};

exports.shunzi = function(userId, data) {
    let seatData = gameSeatsOfUsers[userId];
    let roomId = roomMgr.getUserRoom(userId);
    Logger.info(`User(userID: ${userId}) agree shunzi`, roomId);
    if (seatData == null) {
        Logger.error(`can't find user game data.`, roomId);
        return;
    }

    let game = seatData.game;

    // 패를 낸 사용자기 자기자신인지 검사한다
    if(game.turn == seatData.seatIndex){
        Logger.error(`it's your turn. turn: ${game.turn}, seat Index: ${seatData.seatIndex}`, roomId);
        return;
    }

    // 현재의 상태가 슌쯔인지 검사한다.
    if(seatData.canShunZi == false){
        Logger.error(`seatData.shunzi == false. seat index: ${seatData.seatIndex}`, roomId);
        return;
    }

    // 현재 후 가 준비되였는지 검사한다.
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. seat index: ${seatData.seatIndex}`, roomId);
        return;
    }

    //如果有人可以胡牌，则需要等待  누군가가 나쁜 카드를 만들 수 있다면 기다려야합니다.
    let i = game.turn;
    while(true){
        i = (i + 1)%game.seatCount;
        if(i == game.turn){
            break;
        }
        else{
            let ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    game.currentGangVal = [];

    clearAllOptions(game);
    //进行碰牌处理  카드를 수행하려면
    //扣掉手上的牌  카드의 손을 낸다.
    //从此人牌中扣除  이 카드에서 공제하십시오.

    let resultPais;
    if(typeof data === "string"){
        resultPais = JSON.parse(data).data;
    }
    else {
        resultPais = data['data'];
    }

    for(let i = 0; i < 2; ++i){
        let index = seatData.holds.indexOf(parseInt(resultPais[i]));
        if(index == -1){
            Logger.error(`can't find mj. mj: ${resultPais[i]} seat index: ${seatData.seatIndex}`, roomId);
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[resultPais[i]] --;
    }
    let pai = game.chuPai;
    // let temp = [pai, parseInt(resultPais[0]), parseInt(resultPais[1])];
    // let temp0 = temp.sort();
    // let pais = [temp0[0].toString(), temp0[1].toString(), temp0[2].toString()];
    let pais = [resultPais[0], pai.toString(), resultPais[1]];
    seatData.shunzis.push(pais);
    game.chuPai = -1;

    recordGameAction(game,seatData.seatIndex,ACTION_SHUNZI,pais);

        //广播通知其它玩家
    userMgr.broacastInRoom('shunzi_notify_push',{userid:seatData.userId,pais:pais, paisToRemove: resultPais},seatData.userId,true);

    game.gameSeats[game.turn].folds.pop();

    checkCanAnGang(game, seatData);
    checkCanJiaGang(game, seatData);
    if(game.conf.mahjongtype == 1){
        checkCanGangTongSeNanBeiAndGangBaiBalZung(seatData);
    }


    moveToNextUser(game,seatData.seatIndex);

    // 우선 깡팅을 할수 있는가를 검사한다.
    checkCanGangTing(seatData);

    if(hasOperations(seatData)){
        sendOperations(game, seatData, game.chuPai);
        moveToNextUser(game,seatData.seatIndex);
        return;
    }
    ///////////////////////////////////


    checkCanTingOrHuCondition(seatData);

    if(hasOperations(seatData)){
        sendOperations(game, seatData, game.chuPai);
        moveToNextUser(game,seatData.seatIndex);
        return;
    }


    // checkCanTingOrHuCondition(seatData);
    // if(seatData.canTing || seatData.canHu){
    //     if (hasOperations(seatData)) {
    //         sendOperations(game, seatData, game.chuPai);
    //         // hasActions = true;
    //     }
    //     return;
    // }


    //碰的玩家打牌

    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);

};

exports.peng = function(userId){
    let seatData = gameSeatsOfUsers[userId];

    let roomId = roomMgr.getUserRoom(userId);
    Logger.info(`User(userID: ${userId}) agree peng`, roomId);
    if(seatData == null){
        Logger.error(`can't find user game data.`, roomId);
        return;
    }

    let game = seatData.game;

    //如果是他出的牌，则忽略
    if(game.turn == seatData.seatIndex){
        Logger.error(`it's your turn. turn: ${game.turn}, seat Index: ${seatData.seatIndex}`, roomId);
        return;
    }

    //如果没有碰的机会，则不能再碰
    if(seatData.canPeng == false){
        Logger.error(`seatData.peng == false. seat index: ${seatData.seatIndex}`, roomId);
        return;
    }

    //和的了，就不要再来了
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. seat index: ${seatData.seatIndex}`, roomId);
        return;
    }

    //如果有人可以胡牌，则需要等待
    let i = game.turn;
    while(true){
        i = (i + 1)%game.seatCount;
        if(i == game.turn){
            break;
        }
        else{
            let ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    // ////////////////////////////////////////////////////////////////
    // // 깡을 한다음에 버린 패로 펑을 하는가를 검사하고 그때 얻은 깡의 점수를 보관했다가 후에
    // // 이 펑을 가지고 jiagang을 하면 그 점수의 2배로 해주어야 한다.
    // let n = 0;
    // let gangValToSave = [];
    //
    // let gameActionListLength = game.actionList.length;
    //
    // let turnSeat = game.gameSeats[game.turn];
    //
    //
    // let selfFan = calcSelfFan(seatData, turnSeat);
    //
    // //실지 점수의 계산.
    //
    // ////////////////////////////////////////////////////////////////
    // // 깡을 한다음에 버린 패로 펑을 하는가를 검사하고 그때 얻은 깡의 점수를 보관했다가 후에
    // // 이 펑을 가지고 jiagang을 하면 그 점수의 2배로 해주어야 한다.
    //
    // let calcGangValToSave = 0;
    // n = 6;
    // //chupai를 하기전에 mopai를 하였는가를 검사한다.
    // if(game.actionList[gameActionListLength - n + 1] == ACTION_MOPAI){
    //     // mopai를 하기전에 깡을 하였는가를 검사한다.
    //     n += 3;
    //     if(game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
    //         game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
    //         game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI  ||
    //         game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED){
    //         if(game.currentGangVal){
    //             if(game.currentGangVal[0] == 0){
    //                 calcGangValToSave = game.basic_score * selfFan * game.currentGangVal[1] * 2;
    //             }
    //             else{
    //                 if(seatData.seatIndex == game.button){
    //                     calcGangValToSave = game.currentGangVal[1] * 4;
    //                 }
    //                 else{
    //                     calcGangValToSave = game.currentGangVal[1] * 2;
    //                 }
    //
    //             }
    //         }
    //
    //     }
    // }
    // /////////////////////////////////////////////////////////////////////////////////////////////

    game.currentGangVal = [];
    /////////////////////////////////////////////////////////////////////////////////////////////


    clearAllOptions(game);

    //验证手上的牌的数目
    let pai = game.chuPai;
    let c = seatData.countMap[pai];
    if(c == null || c < 2){
        Logger.error(`lack of mj to do peng. paiToPeng: ${pai}, count: ${c}, seat index: ${seatData.seatIndex}, holds: ${seatData.holds}`, roomId);
        return;
    }

    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for(let i = 0; i < 2; ++i){
        let index = seatData.holds.indexOf(pai);
        if(index == -1){
            Logger.error(`can't find mj. pai: ${pai}, holds: ${seatData.holds}`, roomId);
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pai] --;
    }
    // if(calcGangValToSave <= 0){
        seatData.pengs.push({pai:pai, getSeatIndex: game.turn});
    // }
    // else{
    //     seatData.pengs.push({pai:pai, getSeatIndex: game.turn, gangValToSave: calcGangValToSave});
    // }

    game.chuPai = -1;




    recordGameAction(game,seatData.seatIndex,ACTION_PENG, {pai:pai, getSeatIndex: game.turn});


    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push',{userid:seatData.userId,peng:{pai:pai, getSeatIndex: game.turn}},seatData.userId,true);

    //碰的玩家打牌

    game.gameSeats[game.turn].folds.pop();

    checkCanAnGang(game, seatData);
    checkCanJiaGang(game, seatData);

    if(game.conf.mahjongtype == 1){
        checkCanGangTongSeNanBeiAndGangBaiBalZung(seatData);
    }


    moveToNextUser(game,seatData.seatIndex);

    // 우선 깡팅을 할수 있는가를 검사한다.
    checkCanGangTing(seatData);

    if(hasOperations(seatData)){
        sendOperations(game, seatData, game.chuPai);
        return;
    }
    ///////////////////////////////////

    /// 다음에 일반 커팅을 할수 있는가를 검사.
    checkCanTingOrHuCondition(seatData);

    if(hasOperations(seatData)){
        sendOperations(game, seatData, game.chuPai);
        return;
    }
    //////////////////////////////////////////////



    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
};

exports.isPlaying = function(userId){
    let seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        return false;
    }

    let game = seatData.game;

    return game.state !== "idle";
    // if(game.state == "idle"){
    //     return false;
    // }
    // return true;
};

function checkCanQiangGang(game,turnSeat,seatData,pai){
    let hasActions = false;
    for(let i = 0; i < game.gameSeats.length; ++i){
        //杠牌者不检查
        if(seatData.seatIndex == i){
            continue;
        }
        let ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if(ddd.hued){
            continue;
        }

        ddd.holds.push(parseInt(pai));
        ddd.countMap[pai]++;

        checkCanHu(game,ddd,pai);

        ddd.holds.splice(ddd.holds.indexOf(pai), 1);
        ddd.countMap[pai]--;

        if(ddd.canHu){
            sendOperations(game,ddd,pai);
            hasActions = true;
        }
    }
    if(hasActions){
        game.qiangGangContext = {
            turnSeat:turnSeat,
            seatData:seatData,
            pai:pai,
            isValid:true,
        }
    }
    else{
        game.qiangGangContext = null;
    }
    return game.qiangGangContext != null;
}

function doGang(game,turnSeat,seatData,gangtype,numOfCnt,pai){
    let seatIndex = seatData.seatIndex;
    let gameTurn = turnSeat.seatIndex;

    let roomId = roomMgr.getUserRoom(seatData.userId);

    let curGangVal = 0;

    let isGangHouGang = false;



    let seatIndexToOutPengPai = null;

    let gangValToSave = 0;
    if(gangtype == 'wangang'){
        for(let peng of seatData.pengs){
            if(peng.pai == pai){
                seatIndexToOutPengPai = peng.getSeatIndex;
                if(peng.gangValToSave){
                    gangValToSave = peng.gangValToSave;
                }
                break;
            }
        }
    }

    // 깡을 한 user가 짱인 경우


    Logger.log(`******* staring calculation gang score (userID: ${seatData.userId}) **************`, roomId);


    // 이것은 련속적인 깡을 검사하는 부분이다. 깡을 한다음에는 패를 뒤에서 뜨는데 이렇게 뒤에서 뜨면 점수가 배로 오른다.
    // 이것을 검사하기 위하여 action의 배렬을 검사한다.

    let fen = 1;
    let n = 0;

    let gameActionListLength = game.actionList.length;
    n += 3;
    //먼저 뜬패로 깡을 하였는가를 검사한다.
    if(game.paiMopaiByUser != null && (seatData.seatIndex == game.turn) && (parseInt(pai) == parseInt(game.paiMopaiByUser))){
    // if((parseInt(seatData.gangPai[seatData.gangPai.length - 1]) == parseInt(seatData.holds[seatData.holds.length - 1])) ||
    //     ((seatData.seatIndex == game.turn) && (parseInt(pai) == parseInt(seatData.holds[seatData.holds.length - 1])))){
        //다음 깡을 하기전에 실지로 모파이를 하였는가를 검사한다.
        if(game.actionList[gameActionListLength - n] == seatData.seatIndex &&
            game.actionList[gameActionListLength - n + 1] == ACTION_MOPAI){

            n += 3;
            //다음 모파이를 하기전에 깡을 하였는가를 검사한다.
            if(game.actionList[gameActionListLength - n] == seatData.seatIndex &&
                (game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI  ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED)){

                if(!seatData.gangHouGangList){
                    seatData.gangHouGangList = [];
                }
                seatData.gangHouGangList.push([pai, pai, pai, pai]);

                Logger.log(`gangHouGang = true (seatData.gangHouGangList: ${seatData.gangHouGangList})`, roomId);

                fen *= 2;

                Logger.log(`fan *= 2;   fan = ${fen}`, roomId);

                isGangHouGang = true;
            }
        }
    }
    /////////////////////////////////////////////////////////////////////////////////////////////

    if(parseInt(pai) >= parseInt(game.SanWenPaiStartID) ||
        parseInt(pai) == parseInt(game.WanStartID) ||
        parseInt(pai) == parseInt(game.PingStartID) ||
        parseInt(pai) == parseInt(game.TiaoStartID)){
        fen *= 2;

        Logger.log(`WanStartID OR PingStartID OR TiaoStartID OR  SanWenPai = true:    pai = ${pai}`, roomId);
        Logger.log(`fan *= 2;   fan = ${fen}`, roomId);
    }

    if(game.conf.hongdian && game.dice_paly_result){
        fen *= 2;

        Logger.log(`hongdian = true`, roomId);
        Logger.log(`fan *= 2;   fan = ${fen}`, roomId);
    }

    if(HunagZhuang[roomId]){
        fen *= 2;

        Logger.log(`HunagZhuang = true`, roomId);
        Logger.log(`fan *= 2;   fan = ${fen}`, roomId);
    }

    let score = 0;

    if(gangtype == 'angang'){
        Logger.log(`--------- in case of angang ----------`, roomId);

        for(let otherSeat of game.gameSeats){
            if(otherSeat.seatIndex == seatData.seatIndex){
                continue;
            }
            Logger.log(`otherSeat.userId = ${otherSeat.userId}`, roomId);

            let selfFan = calcSelfFan(seatData, otherSeat);

            Logger.log(`selfFan = ${selfFan}`, roomId);

            //실지 점수의 계산.

            score = game.basic_score * selfFan * fen;

            Logger.log(`score = ${score}`, roomId);

            curGangVal += score;
            // otherSeat.score -= score;
            otherSeat.levelScore -= score;

            Logger.log(`otherSeat.levelScore = ${otherSeat.levelScore}`, roomId);

            // seatData.score += score;
            seatData.levelScore += score;

            Logger.log(`levelScore of gang man = ${seatData.levelScore}`, roomId);
        }
        game.currentGangVal = [0, fen];
    }
    else if(gangtype == 'wangang'){
        Logger.log(`--------- in case of wangang ----------`, roomId);

        let otherSeat = game.gameSeats[seatIndexToOutPengPai];

        Logger.log(`otherSeat.userId = ${otherSeat.userId}`, roomId);

        let selfFan = 1;

        if(seatIndexToOutPengPai == game.button){
            selfFan = 2;
        }

        let selfFanToSaveGangScore = calcSelfFan(seatData, otherSeat);

        Logger.log(`selfFan = ${selfFan}`, roomId);

        //// 실지 점수의 계산.
        if(gangValToSave > 0){
            score = gangValToSave;

            Logger.log(`continuous gang = true`, roomId);

        }
        else{
            score = game.basic_score * selfFan * fen;
        }

        Logger.log(`score = ${score}`, roomId);

        // score = game.basic_score * selfFan * fen;


        curGangVal = game.basic_score * selfFanToSaveGangScore * fen;;
        game.currentGangVal = [1, curGangVal];

        // otherSeat.score -= score;
        otherSeat.levelScore -= score;

        Logger.log(`otherSeat.levelScore = ${otherSeat.levelScore}`, roomId);

        // seatData.score += score;
        seatData.levelScore += score;

        Logger.log(`levelScore of gang man = ${otherSeat.levelScore}`, roomId);
    }
    else{
        Logger.log(`--------- in case of diangang ----------`, roomId);
        Logger.log(`turnSeat.userId = ${turnSeat.userId}`, roomId);

        let selfFan = calcSelfFan(seatData, turnSeat);

        Logger.log(`selfFan = ${selfFan}`, roomId);

        //실지 점수의 계산.

        ////////////////////////////////////////////////////////////////
        // 깡을 한다음에 버린 패로 펑을 하는가를 검사하고 그때 얻은 깡의 점수를 보관했다가 후에
        // 이 펑을 가지고 jiagang을 하면 그 점수의 2배로 해주어야 한다.

        let calcGangValToSave = 0;
        n = 6;
        //chupai를 하기전에 mopai를 하였는가를 검사한다.
        if(game.actionList[gameActionListLength - n + 1] == ACTION_MOPAI){
            // mopai를 하기전에 깡을 하였는가를 검사한다.
            n += 3;
            if(game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI  ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED){
                if(game.currentGangVal){
                    if(game.currentGangVal[0] == 0){
                        calcGangValToSave = game.basic_score * selfFan * fen * 2;
                    }
                    else{
                        if(seatData.seatIndex == game.button){
                            calcGangValToSave = game.currentGangVal[1] * 4;
                        }
                        else{
                            calcGangValToSave = game.currentGangVal[1] * 2;
                        }

                    }
                }

            }
        }

        game.currentGangVal = [];
        /////////////////////////////////////////////////////////////////////////////////////////////

        if(calcGangValToSave > 0){
            score = calcGangValToSave;

            Logger.log(`continuous gang = true`, roomId);
        }
        else{
            score = game.basic_score * selfFan * fen;
        }

        Logger.log(`score = ${score}`, roomId);

        curGangVal = score;
        game.currentGangVal = [1, curGangVal];

        // turnSeat.score -= score;
        turnSeat.levelScore -= score;

        Logger.log(`turnSeat.levelScore = ${turnSeat.levelScore}`, roomId);

        // seatData.score += score;
        seatData.levelScore += score;

        Logger.log(`levelScore of gang man = ${seatData.levelScore}`, roomId);
    }

    Logger.log(`******* end calculation gang score (userID: ${seatData.userId}) **************`, roomId);

    let getSeatIndex = null;
    let resultScores = [];
    let resultLevelScores = [];
    for(let seat of game.gameSeats){
        resultScores.push(seat.score);
        resultScores.push(seat.levelScore);

        resultLevelScores.push(seat.levelScore);
    }
    recordGameAction(game,-1,ACTION_SCORE_CHANGE,resultScores);
    userMgr.broacastInRoom('add_score_notify_push',{resultScores:resultLevelScores},seatData.userId,true);
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////


    let isZhuanShouGang = false;
    if(gangtype == "wangang"){
        let idx = -1;
        let i = 0;

        for(let peng of seatData.pengs){
            if(peng.pai == pai){
                idx = i;
                getSeatIndex = peng.getSeatIndex;
                break;
            }
            i++;
        }
        // let idx = seatData.pengs.indexOf(pai);
        if(idx >= 0){
            seatData.pengs.splice(idx,1);
        }

        seatData.wangangs.push({pai:pai, getSeatIndex: getSeatIndex});
        recordUserAction(game,seatData,"wangang");

        //如果最后一张牌不是杠的牌，则认为是转手杠
        // if(seatData.holds[seatData.holds.length - 1] != pai){
        //     isZhuanShouGang = true;
        // }
    }
    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for(let i = 0; i < numOfCnt; ++i){
        let index = seatData.holds.indexOf(pai);
        if(index == -1){
            // Logger.error(`can't find mj. pai: ${pai}, holds: ${seatData.holds}`, roomId);
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pai] --;
    }

    // recordGameAction(game,seatData.seatIndex,ACTION_GANG,pai);

    //记录下玩家的杠牌
    if(gangtype == "angang"){
        seatData.angangs.push(pai);
        let ac = recordUserAction(game,seatData,"angang");
        // ac.score = game.conf.baseScore*2;
        // recordGameAction(game,seatData.seatIndex,ACTION_GANG,pai);
    }
    else if(gangtype == "diangang"){
        seatData.diangangs.push({pai:pai, getSeatIndex: gameTurn});
        let dianGangPai = pai;
        pai = {pai:dianGangPai, getSeatIndex: gameTurn};
        let ac = recordUserAction(game,seatData,"diangang",gameTurn);
        // ac.score = game.conf.baseScore*2;
        // let fs = turnSeat;
        recordUserAction(game,turnSeat,"diangang",seatIndex);

        game.gameSeats[game.turn].folds.pop();
    }
    else if(gangtype == "wangang"){
        let p = pai;
        pai = {pai:p, getSeatIndex: getSeatIndex};
        // seatData.wangangs.push(pai);
        // if(isZhuanShouGang == false){
        //     let ac = recordUserAction(game,seatData,"wangang");
        //     // ac.score = game.conf.baseScore;
        // }
        // else{
        //     recordUserAction(game,seatData,"zhuanshougang");
        // }
    }
    recordGameAction(game,seatData.seatIndex,ACTION_GANG,pai);

    // if(!seatData.tinged){
    //     checkCanTingPai(game,seatData);
    // }


    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push',{userid:seatData.userId,pai:pai,gangtype:gangtype},seatData.userId,true);

    //变成自己的轮子
    if(game.turn != seatData.seatIndex){
        if(!isTinged(seatData)){
            moveToNextUser(game,seatIndex);
            checkCanTingOrHuCondition(seatData);
            // checkCanTingPai(game,seatData);
        }

        if(seatData.canTing || seatData.canHu){

            if (hasOperations(seatData)) {
                sendOperations(game, seatData, game.chuPai);
                moveToNextUser(game,seatIndex);
                // hasActions = true;
            }
            return;
        }

        // moveToNextUser(game,seatIndex);
        // //再次摸牌
        // doUserMoPai(game);
    }

    moveToNextUser(game,seatIndex);
    //再次摸牌
    doUserMoPai(game);
    // else{
    //     moveToNextUser(game);
    //     //再次摸牌
    //     doUserMoPai(game);
    // }


    //只能放在这里。因为过手就会清除杠牌标记
    seatData.lastFangGangSeat = gameTurn;
}

exports.gang = function(userId,pai){
    let seatData = gameSeatsOfUsers[userId];

    let roomId = roomMgr.getUserRoom(userId);
    if(seatData == null){
        Logger.error(`can't find user game data. userID: ${userId}`, roomId);
        return;
    }

    let seatIndex = seatData.seatIndex;
    let game = seatData.game;

    //如果没有杠的机会，则不能再杠
    if(seatData.canGang == false) {
        Logger.error(`seatData.gang == false. userID: ${userId}`, roomId);
        return;
    }

    //和的了，就不要再来了
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. userID: ${userId}`, roomId);
        return;
    }

    if(seatData.gangPai.indexOf(pai) == -1){
        Logger.error(`the given pai can't be ganged. userID: ${userId}`, roomId);
        return;
    }

    //如果有人可以胡牌，则需要等待
    let i = game.turn;
    while(true){
        i = (i + 1)%game.seatCount;
        if(i == game.turn){
            break;
        }
        else{
            let ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;
            }
        }
    }

    let numOfCnt = seatData.countMap[pai];

    let gangtype = "";
    //弯杠 去掉碰牌
    if(numOfCnt == 1){
        gangtype = "wangang";
    }
    else if(numOfCnt == 3){
        gangtype = "diangang";
    }
    else if(numOfCnt == 4){
        gangtype = "angang";
    }
    else{
        Logger.error(`invalid pai count. userID: ${userId}`, roomId);
        return;
    }

    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;

    userMgr.broacastInRoom('hangang_notify_push',seatIndex,seatData.userId,true);

    //如果是弯杠，则需要检查是否可以抢杠
    let turnSeat = game.gameSeats[game.turn];
    if(numOfCnt == 1){

        // 일단 qianGang에 대한 기능을 막았다.
        let canQiangGang = checkCanQiangGang(game,turnSeat,seatData,pai);
        if(canQiangGang){
            return;
        }
    }

    doGang(game,turnSeat,seatData,gangtype,numOfCnt,pai);
};

exports.hu = function(userId){
    let seatData = gameSeatsOfUsers[userId];
    let roomId = roomMgr.getUserRoom(userId);
    if(seatData == null){
        Logger.error(`can't find user game data. userID: ${userId}`, roomId);
        return;
    }

    let seatIndex = seatData.seatIndex;
    let game = seatData.game;

    //如果他不能和牌，那和个啥啊
    if(seatData.canHu == false){
        Logger.error(`invalid request. userID: ${userId}`, roomId);
        return;
    }

    //和的了，就不要再来了
    if(seatData.hued){
        Logger.error(`you have already hued. no kidding plz. userID: ${userId}`, roomId);
        return;
    }

    //标记为和牌
    seatData.canHu = false;
    seatData.hued = true;
    let hupai = game.chuPai;
    let isZimo = false;

    let turnSeat = game.gameSeats[game.turn];
    seatData.isGangHu = turnSeat.lastFangGangSeat >= 0;
    let notify = -1;

    if(game.qiangGangContext != null){
        let gangSeat = game.qiangGangContext.seatData;
        hupai = game.qiangGangContext.pai;
        notify = hupai;
        let ac = recordUserAction(game,seatData,"qiangganghu",gangSeat.seatIndex);
        ac.iszimo = false;
        recordGameAction(game,seatIndex,ACTION_HU,hupai);
        seatData.isQiangGangHu = true;
        game.qiangGangContext.isValid = false;


        let idx = gangSeat.holds.indexOf(hupai);
        if(idx != -1){
            gangSeat.holds.splice(idx,1);
            gangSeat.countMap[hupai]--;
            userMgr.sendMsg(gangSeat.userId,'game_holds_push',gangSeat.holds);
        }
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(parseInt(hupai));
        if(seatData.countMap[hupai]){
            seatData.countMap[hupai]++;
        }
        else{
            seatData.countMap[hupai] = 1;
        }

        recordUserAction(game,gangSeat,"beiqianggang",seatIndex);
    }
    else if(game.chuPai == -1){
        hupai = game.mahjongs[game.currentIndex - 1];//seatData.holds[seatData.holds.length - 1];
        notify = -1;
        if(seatData.isGangHu){
            if(turnSeat.lastFangGangSeat == seatIndex){
                let ac = recordUserAction(game,seatData,"ganghua");
                ac.iszimo = true;
            }
            else{
                let diangganghua_zimo = game.conf.dianganghua == 1;
                if(diangganghua_zimo){
                    let ac = recordUserAction(game,seatData,"dianganghua");
                    ac.iszimo = true;
                }
                else{
                    let ac = recordUserAction(game,seatData,"dianganghua",turnSeat.lastFangGangSeat);
                    ac.iszimo = false;
                }
            }
        }
        else{
            let ac = recordUserAction(game,seatData,"zimo");
            ac.iszimo = true;
        }

        isZimo = true;
        recordGameAction(game,seatIndex,ACTION_ZIMO,hupai);
    }
    else{
        notify = game.chuPai;
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(parseInt(game.chuPai));
        if(seatData.countMap[game.chuPai]){
            seatData.countMap[game.chuPai]++;
        }
        else{
            seatData.countMap[game.chuPai] = 1;
        }

        let at = "hu";
        //炮胡
        if(turnSeat.lastFangGangSeat >= 0){
            at = "gangpaohu";
        }

        let ac = recordUserAction(game,seatData,at,game.turn);
        ac.iszimo = false;

        //毛转雨
        if(turnSeat.lastFangGangSeat >= 0){
            for(let i = turnSeat.actions.length-1; i >= 0; --i){
                let t = turnSeat.actions[i];
                if(t.type == "diangang" || t.type == "wangang" || t.type == "angang"){
                    t.state = "nop";
                    t.payTimes = 0;

                    let nac = {
                        type:"maozhuanyu",
                        owner:turnSeat,
                        ref:t
                    };
                    seatData.actions.push(nac);
                    break;
                }
            }
        }

        //记录玩家放炮信息
        let fs = game.gameSeats[game.turn];
        recordUserAction(game,fs,"fangpao",seatIndex);

        recordGameAction(game,seatIndex,ACTION_HU,hupai);

        game.fangpaoshumu++;

        if(game.fangpaoshumu > 1){
            game.yipaoduoxiang = seatIndex;
        }
    }

    if(game.firstHupai < 0){
        game.firstHupai = seatIndex;
    }

    //保存番数
    // let ti = seatData.tingMap[hupai];
    // seatData.fan = ti.fan;
    seatData.pattern = 'hu';
    seatData.iszimo = isZimo;
    //如果是最后一张牌，则认为是海底胡
    seatData.isHaiDiHu = game.currentIndex == game.mahjongs.length;
    game.hupaiList.push(seatData.seatIndex);

    if(game.conf.tiandihu){
        if(game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1){
            seatData.isTianHu = true;
        }
        else if(game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1){
            seatData.isDiHu = true;
        }
    }

    clearAllOptions(game,seatData);
    if(game.turn == seatData.seatIndex){
        isZimo = true;
        seatData.numZiMo = 1;
    }

    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push',{seatindex:seatIndex,iszimo:isZimo,hupai:notify},seatData.userId,true);

    //
    if(game.lastHuPaiSeat == -1){
        game.lastHuPaiSeat = seatIndex;
    }
    else{
        let lp = (game.lastFangGangSeat - game.turn + game.seatCount) % game.seatCount;
        let cur = (seatData.seatIndex - game.turn + game.seatCount) % game.seatCount;
        if(cur > lp){
            game.lastHuPaiSeat = seatData.seatIndex;
        }
    }

    //如果只有一家没有胡，则结束
    let numOfHued = 0;
    for(let i = 0; i < game.gameSeats.length; ++i){
        let ddd = game.gameSeats[i];
        if(ddd.hued){
            numOfHued ++;
        }
    }
    //和了三家

    //점수계산
    Logger.log(`******* staring calculation hu score (userID: ${seatData.userId}) **************`, roomId);

    let baseScore = game.basic_score;
    let fan = 1;
    
    //후를 한 사람의 정보에 의한 배수의 계산.
    if(seatData.isQiangGangHu){
        fan *= 2;

        Logger.log(`isQiangGangHu = true`, roomId);
        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
    }

    //베이징마장에서의 규칙이 조금 다르기때문에 후를 할때 고려해주어야 한다.
    // 베이징 마장에서 후를 할때 zhung으로 후를 하면 점수를 2배 해주어야 한다.
    if(game.conf.mahjongtype == 0 && parseInt(hupai) == parseInt(game.SanWenPaiStartID)){
        fan *= 2;

        Logger.log(`beijing mahjong = true ----- hupai = zhung`, roomId);
        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
    }

    if(game.conf.mahjongtype == 0){ // 베이징마장일때
        // 만일 팅을 부르지 않고 후를 했을 때 이서이거나 표후이면 점수를 고려해주어야 한다.
        // 즉:
       if(!isTinged(seatData)){
            checkPiaoOrYiseInBeijing(seatData);
            if(seatData.canHunYiseTing){
                fan *= 2;

                Logger.log(`beijing mahjong = true ----- no HunYiseTing`, roomId);
                Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
            }
            else if(seatData.canQingYiseTing){
                fan *= 4;

                Logger.log(`beijing mahjong = true ----- no QingYiseTing`, roomId);
                Logger.log(`fan *= 4; (fan = ${fan})`, roomId);
            }

            if(seatData.canPiaoTing){
                fan *= 2;

                Logger.log(`beijing mahjong = true ----- no PiaoTing`, roomId);
                Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
            }
        }

    }



    if(game.huedByQidui){
        if(game.conf.qidui4){
            fan *= 4;

            Logger.log(`huedByQidui = true ----- game.conf.qidui4 = true`, roomId);
            Logger.log(`fan *= 4; (fan = ${fan})`, roomId);
        }
        else if(game.conf.qidui8){
            fan *= 8;

            Logger.log(`huedByQidui = true ----- game.conf.qidui8 = true`, roomId);
            Logger.log(`fan *= 8; (fan = ${fan})`, roomId);
        }

        // 먼저 커팅을 할때 2배 해주었으므로 치뚜이로 <후> 하였을 때 2로 나누어준다.
        // 왜냐하면 치뚜이로 후를 하였을때에는 커팅배수를 곱해주지 않고 그냥 4 혹은 8배 해주어야 하기때분이다.
        // fan /= 2;
        //////////////////////////

        if(game.chuPai != -1){
            if(seatData.countMap[game.chuPai] == 4){
                fan *= 2;

                Logger.log(`huedByQidui = true ----- same pai is 3.`, roomId);
                Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
            }

            for(let kk in seatData.countMap){
                if(seatData.countMap[kk] == 4){
                    if(parseInt(kk) != parseInt(game.chuPai)){
                        fan *= 2;
                        Logger.log(`huedByQidui = true ----- same pai is 4.`, roomId);
                        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
                    }
                }
            }
        }
        else{
            if(seatData.countMap[game.mahjongs[game.currentIndex - 1]] == 4){
                fan *= 2;

                Logger.log(`huedByQidui = true ----- same pai is 3.`, roomId);
                Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
            }

            for(let kk in seatData.countMap){
                if(seatData.countMap[kk] == 4){
                    if(parseInt(kk) != parseInt(game.mahjongs[game.currentIndex - 1])){
                        fan *= 2;

                        Logger.log(`huedByQidui = true ----- same pai is 4.`, roomId);
                        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
                    }
                }
            }
        }



        // for(let kk in seatData.countMap){
        //     if(seatData.countMap[kk] == 4){
        //         if(parseInt(kk) != parseInt(seatData.holds[seatData.holds.length - 1])){
        //             fan *= 2;
        //         }
        //     }
        // }

    }

    if(game.mahjongs.length - game.currentIndex <= 4){
        seatData.isHaiDiLao = true;
        fan *= 2;

        Logger.log(`isHaiDiLao = true ----- 4 in latest`, roomId);
        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
    }

    if(game.conf.hongdian && game.dice_paly_result){
        fan *= 2;

        Logger.log(`hongdian = true`, roomId);
        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
    }

    if(HunagZhuang[roomId]){
        fan *= 2;

        Logger.log(`HunagZhuang = true`, roomId);
        Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
    }

    // 이것은 깡이나 깡팅을 한다음 후를 하였는가를 검사하는 부분이다. 깡을 한다음에는 패를 뒤에서 뜨는데 이렇게 뒤에서 뜨면 점수가 배로 오른다.
    // 이것을 검사하기 위하여 action의 배렬을 검사한다. 이런 경우는 쯔모일때만 가능.
    // if(isZimo){
        let n = 0;

        let gameActionListLength = game.actionList.length;
        n += 6;
        //다음 실지로 모파이를 하였는가를 검사
        if(game.actionList[gameActionListLength - n] == seatData.seatIndex &&
            game.actionList[gameActionListLength - n + 1] == ACTION_MOPAI){

            n += 3;
            // 다음 모파이를 하기전에 실지로 깡을 하였는가를 검사.
            if(game.actionList[gameActionListLength - n] == seatData.seatIndex &&
                (game.actionList[gameActionListLength - n + 1] == ACTION_GANG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGBAIBALZUNG ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTONGNANSEBEI ||
                game.actionList[gameActionListLength - n + 1] == ACTION_GANGTINGED)){
                fan *= 2;
                game.isGangHouHu = true;

                Logger.log(`isGangHouHu = true`, roomId);
                Logger.log(`fan *= 2; (fan = ${fan})`, roomId);
            }
        }
    // }
    /////////////////////////////////////////////////////////



    // 여기서 <baseScore * fan> 는 한명의 핑쟈의 점수를 의미한다.
    // 그래서 짱의 점수는 <baseScore * fan * 2> 로 된다.

    if(isZimo) {
        fan /= 2;

        Logger.log(`---------- starting score in case of zimo ----------`, roomId);
        Logger.log(`fan /= 2; (fan = ${fan})`, roomId);

        for(let otherSeat of game.gameSeats){
            if(otherSeat.seatIndex == seatData.seatIndex){
                continue;
            }
            Logger.log(`otherSeat.userId = ${otherSeat.userId}`, roomId);

            let selfFan = calcSelfFan(seatData, otherSeat, game.huedByQidui);

            Logger.log(`selfFan = ${selfFan}`, roomId);

            //실지 점수의 계산.

            let score = game.basic_score * selfFan * fan;

            Logger.log(`score = ${score}`, roomId);
            // otherSeat.score -= score;
             otherSeat.levelScore -= score;

            Logger.log(`otherSeat.levelScore = ${otherSeat.levelScore}`, roomId);

            // seatData.score += score;
            seatData.levelScore += score;

            Logger.log(`levelScore of hued man = ${seatData.levelScore}`, roomId);
        }
    }
    else{
        Logger.log(`---------- starting score in case of dianpo ----------`, roomId);

        let otherSeat = game.gameSeats[game.turn];

        Logger.log(`otherSeat.userId = ${otherSeat.userId}`, roomId);

        let selfFan = calcSelfFan(seatData, otherSeat, game.huedByQidui);

        Logger.log(`selfFan = ${selfFan}`, roomId);

        //실지 점수의 계산.

        let score = game.basic_score * selfFan * fan;

        Logger.log(`score = ${score}`, roomId);

        // otherSeat.score -= score;
        otherSeat.levelScore -= score;

        Logger.log(`otherSeat.levelScore = ${otherSeat.levelScore}`, roomId);

        // seatData.score += score;
        seatData.levelScore += score;

        Logger.log(`levelScore of hued man = ${seatData.levelScore}`, roomId);
    }

    Logger.log(`******* end calculation hu score (userID: ${seatData.userId}) **************`, roomId);

    let resultScores = [];
    let resultLevelScores = [];

    for(let s of game.gameSeats){
        resultScores.push(s.score);
        resultScores.push(s.levelScore);

        resultLevelScores.push(s.levelScore);
    }
    recordGameAction(game,-1,ACTION_SCORE_CHANGE,resultScores);


    if(game.totalCountCanHu == numOfHued || isZimo){
        setTimeout(function(){
            clearAllOptions(game);
            doGameOver(game,seatData.userId);
        },1500);
    }


    // if(numOfHued == 3){
    //     doGameOver(game,seatData.userId);
    //     return;
    // }

    // setInterval(realGameover(game, numOfHued), 300);
};

exports.guo = function(userId){
    let seatData = gameSeatsOfUsers[userId];
    let roomId = roomMgr.getUserRoom(userId);
    if(seatData == null){
        Logger.error(`can't find user game data. userID: ${userId}`, roomId);
        return;
    }
    


    let seatIndex = seatData.seatIndex;
    let game = seatData.game;

    game.huedByHunyise = false;
    game.huedByPiaohu = false;
    game.huedByQidui = false;
    game.huedByQingyise = false;

    //如果玩家没有对应的操作，则也认为是非法消息
    if((seatData.canGang || seatData.canPeng || seatData.canHu ||
        seatData.canShunZi || seatData.canGangTongnansebei ||
        seatData.canGangBaiBalZung || seatData.canTing || seatData.canGangTing ||
        seatData.canHunYiseTing || seatData.canQingYiseTing || seatData.canPiaoTing) == false){
        Logger.error(`no need guo. userID: ${userId}`, roomId);
        return;
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    let doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId,"guo_result");



    if(seatData.canGangTing){
        seatData.paisGangTinged = [];
    }
    // 팅을 취소했을때.
    if(seatData.canTing || seatData.canGangTing || seatData.canHunYiseTing || seatData.canQingYiseTing || seatData.canPiaoTing){
        seatData.tingMap = {};
        seatData.canTing = false;
        userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);

        if(seatData.seatIndex == game.turn){
            moveToNextUser(game, seatData.seatIndex);
            seatData.canChuPai = true;
            clearAllOptions(game);

            Logger.log(`user canceled ting or gang_ting. userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);

            return;
        }


    }

    // 후을 취소했을때.
    if(seatData.canHu){

        seatData.availableTingMap = {};
        Logger.log(`user canceled hu. userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);

        let qiangGangContext = game.qiangGangContext;
        //清除所有的操作
        // clearAllOptions(game);

        if(qiangGangContext != null && qiangGangContext.isValid){
            doGang(game,qiangGangContext.turnSeat,qiangGangContext.seatData,"wangang",1,qiangGangContext.pai);
            clearAllOptions(game);
        }
        else{
            clearAllOptions(game);
            guoHu(game, seatData);
        }





        return;
    }


    //펑이 취소되였을때 슌찌가 있으면 그것을 실행한다
    if(seatData.canGang && seatData.countMap[game.chuPai] == 3){
        Logger.log(`user canceled peng. userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);

        seatData.canGang = false;

        let index = game.turn + 1;
        index %= game.seatCount;
        if(checkCanShunZi(game, game.gameSeats[index], game.TARGETPAI)){
            if(hasOperations(game.gameSeats[index])){
                sendOperations(game,game.gameSeats[index],game.chuPai);
                return;
            }

        }



    }


    if(seatData.canPeng){
        Logger.log(`user canceled peng. userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);

        seatData.canPeng = false;
        if(game.TARGETPAI == null){
            Logger.error(`There is no TARGETPAI. so, you did not peng. userID: ${userId}`, roomId);
        }
        else{

            let index = game.turn + 1;
            index %= game.seatCount;
            if(checkCanShunZi(game, game.gameSeats[index], game.TARGETPAI)){
                if(hasOperations(game.gameSeats[index])){
                    sendOperations(game,game.gameSeats[index],game.chuPai);
                }
                game.TARGETPAI = null;
                return;
            }
            game.TARGETPAI = null;
        }
    }
    else if(seatData.canShunZi){
        seatData.canShunZi = false;
    }
    if(seatData.canGangBaiBalZung || seatData.canGangTongnansebei || (seatData.canGang && game.chuPai == -1)){
            userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
            moveToNextUser(game, seatData.seatIndex);
            seatData.canChuPai = true;
            clearAllOptions(game);

            Logger.log(`user canceled gang. userID: ${userId}, seatIndex: ${seatData.seatIndex}`, roomId);

            return;

    }



    //这里还要处理过胡的情况
    if(game.chuPai >= 0 && seatData.canHu){
        // seatData.guoHuFan = seatData.tingMap[game.chuPai].fan;
    }
    clearAllOptions(game);

    //如果是已打出的牌，则需要通知。
    if(game.chuPai >= 0){
        let uid = game.gameSeats[game.turn].userId;
        // userMgr.broacastInRoom('guo_notify_push',{userId:uid,pai:game.chuPai},seatData.userId,true);
        // seatData.folds.push(game.chuPai);
        game.chuPai = -1;
    }


    // let qiangGangContext = game.qiangGangContext;
    // //清除所有的操作
    // // clearAllOptions(game);
    //
    // if(qiangGangContext != null && qiangGangContext.isValid){
    //     doGang(game,qiangGangContext.turnSeat,qiangGangContext.seatData,"wangang",1,qiangGangContext.pai);
    // }
    // else{
        //下家摸牌

    moveToNextUser(game);
    doUserMoPai(game);
    // }
};

exports.hasBegan = function(roomId){
    let game = games[roomId];
    if(game != null){
        return true;
    }
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo != null){
        return roomInfo.numOfGames > 0;
    }
    return false;
};


let dissolvingList = [];

exports.doDissolve = function(roomId){
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return null;
    }

    let game = games[roomId];
    doGameOver(game,roomInfo.seats[0].userId,true);
};

exports.dissolveRequest = function(roomId,userId){
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return null;
    }

    if(roomInfo.dr != null){
        return null;
    }

    let seatIndex = roomMgr.getUserSeat(userId);
    if(seatIndex == null){
        return null;
    }

    let states = [];
    if(roomInfo.seats.length == 2){
        states = [false, false];
    }
    else if(roomInfo.seats.length == 3){
        states = [false, false, false];
    }
    else if(roomInfo.seats.length == 4){
        states = [false, false, false, false];
    }

    roomInfo.dr = {
        endTime:Date.now() + 30000,
        states:states
    };
    roomInfo.dr.states[seatIndex] = true;

    dissolvingList.push(roomId);

    return roomInfo;
};

exports.dissolveAgree = function(roomId,userId,agree){
    let roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return null;
    }

    if(roomInfo.dr == null){
        return null;
    }

    let seatIndex = roomMgr.getUserSeat(userId);
    if(seatIndex == null){
        return null;
    }

    if(agree){
        roomInfo.dr.states[seatIndex] = true;
    }
    else{
        roomInfo.dr = null;
        let idx = dissolvingList.indexOf(roomId);
        if(idx != -1){
            dissolvingList.splice(idx,1);
        }
    }
    return roomInfo;
};



function update() {
    for(let i = dissolvingList.length - 1; i >= 0; --i){
        let roomId = dissolvingList[i];

        let roomInfo = roomMgr.getRoom(roomId);
        if(roomInfo != null && roomInfo.dr != null){
            if(Date.now() > roomInfo.dr.endTime){
                Logger.log(`delete room and games.`, roomId);
                exports.doDissolve(roomId);
                dissolvingList.splice(i,1);
            }
        }
        else{
            dissolvingList.splice(i,1);
        }
    }
}

setInterval(update,1000);

/*
let mokgame = {
    gameSeats:[{folds:[]}],
    mahjongs:[],
    currentIndex:-1,
    conf:{
        wz_yaojidai:2,
    }
}
let mokseat = {
    holds:[9,9,9,9,1,2,3,3,4,5,18,18,18,18],
    isBaoTing:true,
    countMap:{},
    pengs:[],
    feis:[],
    diangangs:[],
    angangs:[],
    wangangs:[],
    diansuos:[],
    wansuos:[],
    ansuos:[],
    gangPai:[]
}

for(let k in mokseat.holds){
    let pai = mokseat.holds[k];
    if(mokseat.countMap[pai]){
        mokseat.countMap[pai] ++;
    }
    else{
        mokseat.countMap[pai] = 1;
    }
}
checkCanAnGang(mokgame,mokseat);
console.log(mokseat.gangPai);
*/