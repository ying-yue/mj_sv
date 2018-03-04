
var crypto = require('crypto');
var fs = require('fs');
var request = require('request');
var xml2js = require('xml2js');

var WxPayConfig = {
    //↓↓↓↓↓↓↓↓↓↓请在这里配置您的基本信息↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    appid: "wxfc530321fb1ee1c2",
    appsecret: "baa7d1598bc0dc7b051ed7e31236fd62",
    mchID: "1486610082",
    apikey: "df5fdb7d17a725e01592894f4d7f1e7e",
    notify_url: "http://39.108.213.109:9001/weixin/WxPay_notify"
};

var DEBUG_MODE = false;

var WxPay = {
    // 随机字符串产生函数
    createNonceStr: function() {
        return Math.random().toString(36).substr(2, 15);
    },

    // 时间戳产生函数
    createTimeStamp: function() {
        return parseInt(new Date().getTime() / 1000) + '';
    },

    /***
     * 生成与支付订单，并返回
     */
    pay: function(order_id, name, ip_address, total_amount, callback) {//(attach, body, mch_id, openid, bookingNo, total_fee, notify_url, callback) {
        var nonce_str = this.createNonceStr();
        var timeStamp = this.createTimeStamp();
        var url = "https://api.mch.weixin.qq.com/pay/unifiedorder";

        var total_fee;

        if (DEBUG_MODE)
            total_fee = 1;
        else
            total_fee = Math.round(total_amount * 100);

        //test
        // var order_model = require('../hall_server/order_model');
        //
        // order_model.orderPayed(121212, 1221, 12121, 12 / 100, function (err, data) {
        //     if (err) {
        //         console.log(err.toString());
        //         return res.send("fail");
        //     }
        //
        //     res.send("success");	//请不要修改或删除——
        // });
        /////

        var data = {
            appid: WxPayConfig.appid,
            body: name,
            mch_id: WxPayConfig.mchID,
            nonce_str: nonce_str,
            notify_url: WxPayConfig.notify_url,
            out_trade_no: order_id,
            spbill_create_ip: ip_address,
            total_fee: total_fee,
            trade_type: 'APP'
        };

        data.sign = this.sign(data);
        var xmlBuilder = new xml2js.Builder();

        var self = this;

        request({
            url: url,
            method: 'POST',
            body: xmlBuilder.buildObject(data)
        }, function(err, response, body) {
            if (!err && response.statusCode == 200) {
                console.log(body);

                var parser = new xml2js.Parser({ trim:true, explicitArray:false, explicitRoot:false });
                parser.parseString(body, function (err, params) {
                    if (err)
                        return callback(err);

                    console.log(params);

                    if (params.result_code == "FAIL") {
                        callback(order_id);
                        return;
                    }

                    if (params.return_code == "FAIL") {
                        callback(order_id);
                        return;
                    }

                    //签名
                    var ret = {
                        appid: WxPayConfig.appid,
                        noncestr: nonce_str,
                        package: 'Sign=WXPay',
                        partnerid: WxPayConfig.mchID,
                        prepayid: params['prepay_id'],
                        timestamp: timeStamp
                    };

                    ret.sign = self.sign(ret);
                    callback(null, ret);
                });
            } else {
                callback(err);
            }
        });
    },

    /**
     * 进行签名
     * @param param
     * @return {*}
     */
    sign: function(param) {
        var querystring = Object.keys(param).filter(function(key){
                return param[key] !== undefined && param[key] !== '' && key != '_' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key)<0;
            }).sort().map(function(key){
                return key + '=' + param[key];
            }).join("&") + "&key=" + WxPayConfig.apikey;

        return crypto.createHash('md5').update(querystring, 'utf8').digest('hex').toUpperCase();
    },

    /**
     * 支付回调通知
     */
    notify: function(req, res) {
        console.log(JSON.stringify(req.params) + ':' + JSON.stringify(req.body));

        var parser = new xml2js.Parser({trim: true, explicitArray: false, explicitRoot: false});

        parser.parseString(req.body, function (err, params) {

            if (params['return_code'] == 'SUCCESS' && params['result_code'] == 'SUCCESS') {
                var sign = WxPay.sign(params);

                if (sign == params['sign']) {
                    console.log('verify success');
                    var order_model = require('../hall_server/order_model');

                    order_model.orderPayed(params["out_trade_no"], params["transaction_id"], params["openid"], params["total_fee"] / 100, function (err, data) {
                        if (err) {
                            console.log(err.toString());
                            return res.send("fail");
                        }

                        res.send("success");	//请不要修改或删除——
                    });
                }
                else {
                    console.log('verify failed');
                    res.send("fail");	//请不要修改或删除——
                }
            }
            else {
                res.send("success");	//请不要修改或删除——
            }
        });
    }
};

module.exports = WxPay;