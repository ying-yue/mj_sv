// let HALL_IP = "49.79.224.152";
let HALL_IP = "192.168.1.12";
let GAME_SERVER_IP = "192.168.1.12";
// let HALL_IP = "192.168.1.49";
let HALL_CLIENT_PORT = 9001;
let HALL_ROOM_PORT = 9002;
let GAME_HTTP_PORT = 9003;

let MANAGER_PORT = 9004; //ADMINISTRATOR_CONNECT_PORT

let ACCOUNT_PRI_KEY = "^&*#$%()@";
let ROOM_PRI_KEY = "~!@#$(*&^%$&";

let LOCAL_IP = 'localhost';

exports.mysql = function(){
    return {
        HOST:'localhost',
        USER:'root',
        PSWD:'root',
        DB:'nodejs',
        PORT:3306,
    }
};

//账号服配置
exports.account_server = function(){
    return {
        CLIENT_PORT:9000,
        HALL_IP:HALL_IP,
        HALL_CLIENT_PORT:HALL_CLIENT_PORT,
        ACCOUNT_PRI_KEY:ACCOUNT_PRI_KEY,

        //
        DEALDER_API_IP:LOCAL_IP,
        DEALDER_API_PORT:12581,
        VERSION:'20161227',
        APP_WEB:'http://39.106.27.41/mahjongAppDownload/link.htm',
    };
};

//大厅服配置
exports.hall_server = function(){
    return {
        HALL_IP:HALL_IP,
        CLEINT_PORT:HALL_CLIENT_PORT,
        FOR_ROOM_IP:LOCAL_IP,
        ROOM_PORT:HALL_ROOM_PORT,
        ACCOUNT_PRI_KEY:ACCOUNT_PRI_KEY,
        ROOM_PRI_KEY:ROOM_PRI_KEY
    };
};

//游戏服配置
exports.game_server = function(){
    return {
        SERVER_ID:"001",

        //暴露给大厅服的HTTP端口号
        HTTP_PORT:GAME_HTTP_PORT,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME:5000,
        //大厅服IP
        HALL_IP:LOCAL_IP,
        FOR_HALL_IP:LOCAL_IP,
        //大厅服端口
        HALL_PORT:HALL_ROOM_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY:ROOM_PRI_KEY,

        //暴露给客户端的接口
        CLIENT_IP:HALL_IP,
        CLIENT_PORT:10000,
    };
};

//管理者页面
exports.manager_server = function(){
    return {
        CLIENT_PORT:MANAGER_PORT,
        HALL_IP:HALL_IP,
        GAME_SERVER_IP: GAME_SERVER_IP,
        GAME_HTTP_PORT: GAME_HTTP_PORT
    };
};