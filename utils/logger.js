let fs = require("fs");
let path = require("path");

const LOG_CONSOLE_TYPE = 0;
const LOG_FILE_TYPE = 1;

// let logType = LOG_CONSOLE_TYPE;
let logType = LOG_FILE_TYPE;

Date.prototype.Format = function (fmt) {
    let o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (let k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};

function mkdirpath(dirPath)
{
    'use strict';
    if(!fs.existsSync(dirPath))
    {
        try
        {
            fs.mkdirSync(dirPath);
        }
        catch(e)
        {
            mkdirpath(path.dirname(dirPath));
            mkdirpath(dirPath);
        }
    }
}

Object.defineProperty(global, '__stack', {
    get: function(){
        let orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function(_, stack){ return stack; };
        let err = new Error;
        //noinspection JSUnresolvedFunction
        Error.captureStackTrace(err, arguments.callee);
        let stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    }
});

function log(message, filename, tag, ignoreMetaData) {
    //noinspection JSUnresolvedFunction
    let sourceFileName = __stack[2].getFileName();

    sourceFileName = path.basename(sourceFileName);

    //noinspection JSUnresolvedFunction
    let methodName = __stack[2].getMethodName();

    //noinspection JSUnresolvedFunction
    let line =  __stack[2].getLineNumber();

    let dateStr = new Date().Format("yyyy-MM-dd");
    let timeStr = new Date().Format("hh:mm:ss");

    let info = dateStr + " " + timeStr + " ";

    info = info + "<" + tag + ">" + " ";
    info = info + sourceFileName + ":" + line;

    if(methodName) {
        info = " " + info + "(" + methodName + ")";
    }

    if(ignoreMetaData) {
        info = message;
    }
    else {
        info = info + " " + message;
    }

    if (logType == LOG_FILE_TYPE) {
        info = info + "\r\n";
    }

    if (logType == LOG_CONSOLE_TYPE) {
        console.log(info);
    }
    else if (logType == LOG_FILE_TYPE) {
        let directory = path.join(__dirname, '..');

        let sep = path.sep;

        directory = directory + sep + "log" + sep + dateStr;

        mkdirpath(directory);

        if (filename == null) {
            filename = "common";
        }

        filename = directory + sep + filename + ".log";

        fs.appendFileSync(filename, info);
    }
    else {
        console.log(info);
    }
}

exports.log = function (message, filename, ignoreMetaData) {
    log(message, filename, "log", ignoreMetaData);
};

exports.info = function (message, filename) {
    log(message, filename, "info");
};

exports.warning = function (message, filename) {
    log(message, filename, "warning");
};

exports.error = function (message, filename) {
    log(message, filename, "error");
};