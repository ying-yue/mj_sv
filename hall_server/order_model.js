var logger = require('../utils/logger');
var alipay = require('../utils/alipay');
var WxPay = require('../utils/WxPay');
var db = require('../utils/db.js');
var model = 'orders';

var OS_WAITING = 'waiting';
var OS_SUCCESS = 'success';
var OS_REQUEST_FAIL = 'fail';
var OS_FINISHED = 'finished';
var OS_CLOSED = 'closed';

var OT_ALIPAY = 'alipay';
var OT_WEIXIN = 'weixin';
var OT_APPLE_PAY = 'apple_pay';

exports.OT_ALIPAY = OT_ALIPAY;
exports.OT_WEIXIN = OT_WEIXIN;

exports.OS_WAITING = OS_WAITING;
exports.OS_SUCCESS = OS_SUCCESS;
exports.OS_REQUEST_FAIL = OS_REQUEST_FAIL;
exports.OS_FINISHED = OS_FINISHED;
exports.OS_CLOSED = OS_CLOSED;

/**
 * 根据编号获取订单信息
 * @param {String} id 商品编号
 * @param {Function} callback 回调
 */
exports.getByID = function (id, callback) {
    db.getOrderByID(id, callback);
};

/**
 * 保存订单数据
 * @param {object} order 订单数据
 * @param {Function} callback 回调
 */
exports.save = function (order, callback) {
    data_mgr.saveModel(model, order, callback);
};

/**
 * 获取订单列表
 * @param {Array} conditions 条件
 * @param {Array} sorts 排序顺序
 * @param {number} page_no 页号
 * @param {number} page_size 页面大小
 * @param {Function} callback 用户信息
 */
exports.getOrderList = function (conditions, sorts, page_no, page_size, callback) {
    //  先检查缓存
    data_mgr.getByFieldsPaginationEx(model, conditions, sorts, page_no, page_size, callback);
};

/**
 * 获取总交易额
 * @param callback
 */
exports.getTradeAmount = function (callback) {
    data_mgr.getColumnSum(model, [['status', OS_SUCCESS]], 'total_amount', callback);
};

/**
 * 创建订单
 * @param goods
 * @param user
 * @param channel
 * @param callback
 * @param {string} [ip_address]
 */
exports.createOrder = function (goods, user, channel, callback, ip_address) {
    var order = {};

    order.goods_name = goods.name;
    order.goods_id = goods.id;
    order.user_id = user.userid;
    order.status = OS_WAITING;
    order.channel = channel;
    order.created_at = Date.now();
    order.total_amount = goods.price;

    db.create_order(order, function (order_id, err) {
        if (err)
            return callback(err);

        var order_info;

        if (channel == OT_ALIPAY) {
            order_info = alipay.pay(data.id, goods.name, goods.name, order.total_amount);
            callback(null, order_info);
        }
        else if (channel == OT_WEIXIN) {
            WxPay.pay(order_id, goods.name, ip_address, order.total_amount, callback);
        }
        else if (channel == OT_APPLE_PAY) {
            callback(null, {'product_id': goods.id, 'user_id': user.userid});
        }
        else {
            return callback(new Error('unsupported_pay_channel'));
        }
    });
};

/**
 * 订单支付成功
 * @param {string} order_id 订单号
 * @param {string} trade_no 渠道流水号
 * @param {string} buyer_id 买家编号
 * @param {number} total_amount 支付费用
 * @param {function} callback 回调
 */
exports.orderPayed = function (order_id, trade_no, buyer_id, total_amount, callback) {
    //  获取订单信息
    db.get_order_by_id(order_id, function (order_info, err) {
        if (err)
            return callback(err);

        if (!order_info)
            return callback(new Error('can not find order info. order_id = ' + order_id));

        if (order_info.status != OS_WAITING)
            return callback(null);

        //  获取用户信息
        db.get_user_data_by_userid(order_info.user_id, function (user_info) {
            if (!user_info)
                return callback(new Error('can not find user info. user_id = ' + order_info.user_id));

            //  更新用户信息
            logger.log("userId: " + order_info.user_id + " increased gem from " + user_info.gems + " to " + (user_info.gems + order_info.gems), "gem_history");

            user_info.gems += order_info.gems;
            user_info.charge_amount += parseFloat(order_info.total_amount);

            db.update_user_gem_and_charge_amount(user_info.userid, user_info.gems, user_info.charge_amount);
            db.update_goods_sales(order_info.goods_id, order_info.sales + 1);
            db.update_order_results(order_info.id, OS_SUCCESS, buyer_id, trade_no);
            // db.update_dealer_profit(order_info.user_id, order_info.total_amount, function (ret) {

            // });

            callback(null);
        });
    });
};