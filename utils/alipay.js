/**
 * Created by Administrator on 2017/5/19.
 */
var order_model = require('../hall_server/order_model');

// var util = require('./util');
var crypto = require('crypto');
var fs = require('fs');

/* *
 *类名：AlipayConfig
 *功能：基础配置类
 *详细：设置帐户有关信息及返回路径
 *版本：3.2
 *日期：2011-03-17
 *说明：
 *以下代码只是为了方便商户测试而提供的样例代码，商户可以根据自己网站的需要，按照技术文档编写,并非一定要使用该代码。
 *该代码仅供学习和研究支付宝接口使用，只是提供一个参考。
 *提示：如何获取安全校验码和合作身份者ID
 *1.用您的签约支付宝账号登录支付宝网站(www.alipay.com)
 *2.点击“商家服务”(https://b.alipay.com/order/myOrder.htm)
 *3.点击“查询合作者身份(PID)”、“查询安全校验码(Key)”
 *安全校验码查看时，输入支付密码后，页面呈灰色的现象，怎么办？
 *解决方法：
 *1、检查浏览器配置，不让浏览器做弹框屏蔽设置
 *2、更换浏览器或电脑，重新登录查询。
 */
var AlipayConfig = {
    //↓↓↓↓↓↓↓↓↓↓请在这里配置您的基本信息↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    app_id: "2017050507131101",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA",
    version: "1.0",
    notify_url: "http://39.108.76.235:3001/api/alipay_notify"
};

var PRIVATE_KEY = "MIICXAIBAAKBgQDXsqZxu46LhK223Iw2i4e0lwo1TyMZM+C/nZVOM0rkoitUpuA/5wtEeZeFPsxxRhDRi7txEnyY+QSgiOQT7krRFiB9QilL/ad5JbKGoHfT/bytxuQMU8jgAL8fYZ2O6IAz/+rkI8Zj6okxVGNgdiQe+L7ik79Uv0oSBmFwSVNsVQIDAQABAoGAb7boe+lPN7V9H0N1H17+5yp/MAMPw6LZ2YRtavYn6OiRFqPja1VnwYxUTL+stVI7rbv4VeTkQXpfyiF8N1JozpSEk+VXBx2kkhKJsCz7uh06WWqbJ4LXolVecb8uk/ce4UiJ2rav4vwqOL5k3Fq1fqW1tt1GiRLjmT93FQBh3BUCQQDrC+pVCPDFTy4jDhycv0k8pWYmGjwY69768gaxY7+PBV7Du4uw2c22LGCf6mSU2CFW2SVXot/EVgAEWvG5SZsjAkEA6u0rzer+Ky+2G1BpsVUJ92mxzEWCgGR1PudbZKT5UsauK/A1hIALP9MuU9EL/j6QLjjg5Ms0KSDaojdVTdmuJwJBANBslnSlIuuz1NOc9d5A+S5f9H6hEN2Aew/HggvWycyHFIs4SRyfZny+SUhEzr/2D0o175kQgqBVKlqyUlrdXEUCQDKfTLMgkghoTYtxNnU5593ibqefytEz1HfrjqwPSJJnsZxSNJYKqWHldbQl9bmhbZwoMX3bs6+xHquZ1M3jvD0CQApOmNbs+YEW2Ke6BlUCWw5IUEVKBPAD8OjbHoLd4pZXEp/dG2mOz/lV37xVAfMHaXEVOTMQVfE+/oYZ+WJvCCQ=";
var PUBLIC_KEY = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDI6d306Q8fIfCOaTXyiUeJHkrIvYISRcc73s3vF1ZT7XN8RNPwJxo8pWaJMmvyTn9N4HQ632qJBVHf8sxHi/fEsraprwCtzvzQETrNRwVxLO5jVmRGi60j8Ue1efIlzPXV9je9mkjzOmdssymZkh2QhUrCmZYI/FCEa3/cNMW0QIDAQAB";
var DEBUG_MODE = true;

var getSignedParam = function (sParaTemp) {
    var sPara = [];
    //除去数组中的空值和签名参数
    for (var i1 = 0; i1 < sParaTemp.length; i1++) {
        var value = sParaTemp[i1];
        if (value[1] == null || value[1] == "" || value[0] == "sign")
            continue;
        sPara.push(value);
    }
    sPara.sort();
    //生成签名结果
    var prestr = "";
    //把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
    for (var i2 = 0; i2 < sPara.length; i2++) {
        var obj = sPara[i2];
        if (i2 == sPara.length - 1) {
            prestr = prestr + obj[0] + "=" + obj[1];
        } else {
            prestr = prestr + obj[0] + "=" + obj[1] + "&";
        }
    }

    var privatePem = fs.readFileSync(__dirname + '/rsa_private_key.pem');
    var privateKey = privatePem.toString();
    var mysign = crypto.createSign('RSA-SHA1').update(prestr).sign(privateKey, 'base64');
    sPara.push(['sign', mysign]);
//    prestr += "&sign=" + encodeURIComponent(mysign);

    var result = "";
    //把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
    for (i2 = 0; i2 < sPara.length; i2++) {
        obj = sPara[i2];
        if (i2 == sPara.length - 1) {
            result = result + obj[0] + "=" + encodeURIComponent(obj[1]);
        } else {
            result = result + obj[0] + "=" + encodeURIComponent(obj[1]) + "&";
        }
    }

    return result;
};

/**
 * 在应用中发送付款请求，替换掉构造form的应用
 */
exports.pay = function (order_id, name, desc, total_amount) {
    var biz_content = {};

    biz_content.out_trade_no = order_id;
    biz_content.subject = name;
    biz_content.body = desc;

    if (DEBUG_MODE)
        biz_content.total_amount = 0.01;
    else
        biz_content.total_amount = total_amount;

    biz_content.product_code = "QUICK_MSECURITY_PAY";

    //把请求参数打包成数组
    var sParaTemp = [];

    for (var key in AlipayConfig) {
        sParaTemp.push([key, AlipayConfig[key]]);
    }

    sParaTemp.push(["method", "alipay.trade.app.pay"]);
    sParaTemp.push(["timestamp", util.getTimeDesc()]);
    sParaTemp.push(["biz_content", JSON.stringify(biz_content)]);

    var order_info = getSignedParam(sParaTemp);

    logger.log(order_info);
    return order_info;
};

/**
 * 异步通知
 * @param req
 * @param res
 */
exports.notify = function(req, res){
    //http://127.0.0.1:3000/paynotify?trade_no=2008102203208746&out_trade_no=3618810634349901&discount=-5&payment_type=1&subject=iphone%E6%89%8B%E6%9C%BA&body=Hello&price=10.00&quantity=1&total_fee=10.00&trade_status=TRADE_FINISHED&refund_status=REFUND_SUCCESS&seller_email=chao.chenc1%40alipay.com&seller_id=2088002007018916&buyer_id=2088002007013600&buyer_email=13758698870&gmt_create=2008-10-22+20%3A49%3A31&is_total_fee_adjust=N&gmt_payment=2008-10-22+20%3A49%3A50&gmt_close=2008-10-22+20%3A49%3A46&gmt_refund=2008-10-29+19%3A38%3A25&use_coupon=N&notify_time=2009-08-12+11%3A08%3A32&notify_type=%E4%BA%A4%E6%98%93%E7%8A%B6%E6%80%81%E5%90%8C%E6%AD%A5%E9%80%9A%E7%9F%A5%28trade_status_sync%29&notify_id=70fec0c2730b27528665af4517c27b95&sign_type=DSA&sign=_p_w_l_h_j0b_gd_aejia7n_ko4_m%252Fu_w_jd3_nx_s_k_mxus9_hoxg_y_r_lunli_pmma29_t_q%253D%253D&extra_common_param=%E4%BD%A0%E5%A5%BD%EF%BC%8C%E8%BF%99%E6%98%AF%E6%B5%8B%E8%AF%95%E5%95%86%E6%88%B7%E7%9A%84%E5%B9%BF%E5%91%8A%E3%80%82
    //获取支付宝的通知返回参数，可参考技术文档中页面跳转同步通知参数列表(以下仅供参考)//
//    console.log(JSON.stringify(req.query) + ':' + JSON.stringify(req.body));

    var params = req.body;
    if (params["trade_status"] == "TRADE_SUCCESS") {
        var sPara = [];
        for(var key in params) {
            if((!params[key]) || key == "sign" || key == "sign_type") {
                continue;
            }
            sPara.push([key, params[key]]);
        }
        sPara = sPara.sort();

        var prestr = '';
        for(var i2 = 0; i2 < sPara.length; i2++) {
            var obj = sPara[i2];
            if(i2 == sPara.length - 1) {
                prestr = prestr + obj[0] + '=' + obj[1] + '';
            } else {
                prestr = prestr + obj[0] + '=' + obj[1] + '&';
            }
        }
        console.log(prestr);

        var publicPem = fs.readFileSync(__dirname + '/rsa_public_key.pem');
        var publicKey = publicPem.toString();
//        var prestr = getVerifyParams(params);
        var sign = params['sign'] ? params['sign'] : "";
        var verify = crypto.createVerify('RSA-SHA1');
        verify.update(prestr);
        if (verify.verify(publicKey, sign, 'base64')) {
            console.log('verify success');
            order_model.orderPayed(params["out_trade_no"], params["trade_no"], params["buyer_logon_id"], params["total_amount"], function (err, data) {
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
    else
        res.send("success");	//请不要修改或删除——
};