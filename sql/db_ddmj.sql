# Host: localhost  (Version 5.1.73-community)
# Date: 2017-11-27 22:15:36
# Generator: MySQL-Front 6.0  (Build 2.20)


#
# Structure for table "t_accounts"
#

DROP TABLE IF EXISTS `t_accounts`;
CREATE TABLE `t_accounts` (
  `account` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

#
# Data for table "t_accounts"
#


#
# Structure for table "t_dealer_profit"
#

DROP TABLE IF EXISTS `t_dealer_profit`;
CREATE TABLE `t_dealer_profit` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `dealer_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `time` int(11) NOT NULL,
  `amount` float(5,2) NOT NULL,
  `type` int(5) NOT NULL,
  `charge_amount` float(5,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1 ROW_FORMAT=COMPACT;

#
# Data for table "t_dealer_profit"
#

INSERT INTO `t_dealer_profit` VALUES (1,35,38,1506008103,4.80,0,12.00),(2,35,38,1506008299,7.20,0,18.00),(3,35,38,1506009301,9.60,0,24.00),(4,35,38,1506173541,2.40,0,6.00),(5,39,43,1506174045,2.40,0,6.00);

#
# Structure for table "t_games"
#

DROP TABLE IF EXISTS `t_games`;
CREATE TABLE `t_games` (
  `room_uuid` char(20) NOT NULL,
  `game_index` smallint(6) NOT NULL,
  `base_info` varchar(1024) NOT NULL,
  `create_time` int(11) NOT NULL,
  `snapshots` char(255) DEFAULT NULL,
  `action_records` varchar(2048) DEFAULT NULL,
  `result` char(255) DEFAULT NULL,
  PRIMARY KEY (`room_uuid`,`game_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_games"
#

INSERT INTO `t_games` VALUES ('1511176338859497021',0,'{\"type\":\"xzdd\",\"button\":0,\"renshu\":3,\"index\":0,\"mahjongs\":[14,15,5,8,9,15,1,1,13,8,10,8,10,2,12,5,9,13,9,11,3,1,12,2,4,6,13,2,4,5,10,15,0,7,14,12,11,11,14,6,4,6,3,1,12,0,7,10,6,7,7,14,9,11,15,0,4,5,13,3,2,0,3,8],\"game_seats\":[[14,5,9,1,13,10,10,12,9,9,3,12,4,13],[15,8,15,1,8,8,2,5,13,11,1,2,6]]}',1511176672,NULL,'[0,1,14,1,2,2,1,1,13,0,2,4,0,1,12,1,2,5,1,1,11,0,2,10,0,1,10,1,2,15,1,1,15,0,2,0,0,1,10,1,2,7,1,1,15,0,2,14,0,1,9,1,2,12,1,1,15,0,2,11,0,1,14,1,2,11,1,1,11,0,2,14,0,1,13,1,2,6,1,1,12,0,2,4,0,1,14,1,2,6,1,1,2,0,2,3,0,1,13,1,2,1,1,1,5,0,2,12,0,1,12,1,2,0,1,1,8,0,2,7,0,1,9,1,2,10,1,1,10,0,2,6,1,2,7,1,10,1,1,1,2,0,5,2]','[4,-4]'),('1511176338859497021',1,'{\"type\":\"xzdd\",\"button\":0,\"renshu\":3,\"index\":1,\"mahjongs\":[11,0,13,12,3,8,1,1,0,6,4,14,10,13,7,9,9,15,7,6,11,10,11,1,6,5,2,6,2,3,13,4,9,8,0,12,7,4,4,12,15,13,1,5,0,3,14,10,15,9,11,12,10,14,5,3,7,8,15,2,14,8,5,2],\"game_seats\":[[11,13,3,1,0,4,10,7,9,7,11,11,6,2],[0,12,8,1,6,14,13,9,15,6,10,1,5]]}',1511176965,NULL,'[0,1,13,1,2,6,1,1,13,0,2,2,0,1,11,1,2,3,1,1,9,0,2,13,0,1,13,1,2,4,1,1,15,0,2,9,0,1,9,1,2,8,1,1,14,0,2,0,0,1,11,1,2,12,1,1,10,0,2,7,0,1,11,1,2,4,1,1,12,0,2,4,0,1,10,1,2,12,1,1,12,0,2,15,0,1,9,1,2,13,1,1,12,0,2,1,0,1,15,1,2,5,1,1,13,0,2,0,0,10,1,0,1,6,1,4,6,1,2,3,1,1,3,0,5,3]','[4,-4]'),('1511493399847282533',0,'{\"type\":\"xzdd\",\"button\":0,\"renshu\":1,\"index\":0,\"mahjongs\":[6,5,12,29,33,32,17,18,4,24,15,9,32,32,31,4,29,26,25,30,13,0,6,20,9,13,21,12,30,15,1,13,19,25,18,21,3,5,11,22,7,0,2,0,21,11,7,23,32,24,19,9,16,17,2,13,25,2,8,3,27,17,21,30,12,14,20,11,8,14,4,10,9,22,15,6,20,16,1,30,26,31,3,14,16,16,28,19,33,1,0,33,31,26,25,1,4,2,10,23,6,22,19,27,22,8,15,26,31,12,3,23,7,18,5,27,14,24,28,18,10,7,29,5,17,29,8,23,11,27,28,10,24,33,28,20],\"game_seats\":[[6,29,17,24,32,4,25,0,9,12,1,25,3,22],[5,33,18,15,32,29,30,6,13,30,13,18,5],[12,32,4,9,31,26,13,20,21,15,19,21,11]]}',1511493486,NULL,'[0,1,29,1,2,7,1,1,29,2,2,0,2,1,31,0,2,2,0,1,32,1,2,0,1,1,0,2,2,21,2,1,32,0,2,11,0,1,9,1,2,7,1,1,7,2,2,23,2,1,23,0,7,[\"22\",\"23\",\"24\"],0,1,6,1,2,32,1,1,33,2,2,24,2,1,9,0,2,19,0,1,19,1,2,9,1,1,9,2,2,16,2,1,16,0,2,17,0,1,11,1,2,2,1,1,2,2,2,13,2,1,15,0,2,25,0,1,12,1,2,2,1,1,2,0,5,2]','[4,-2,-2]'),('1511493399847282533',1,'{\"type\":\"xzdd\",\"button\":0,\"renshu\":1,\"index\":1,\"mahjongs\":[28,25,33,13,28,33,8,19,3,23,15,11,9,15,12,18,6,2,29,33,26,1,32,26,1,15,27,17,31,13,17,31,13,29,14,2,20,3,31,4,30,11,0,21,5,27,7,25,4,15,27,30,21,12,23,14,32,16,18,8,22,7,32,8,23,32,18,4,30,29,31,5,11,25,4,6,16,29,10,24,16,24,3,1,5,17,16,25,24,21,9,26,33,11,12,19,30,13,27,0,8,10,0,26,20,0,3,17,9,9,28,14,20,22,2,12,20,28,22,19,14,24,2,10,10,7,6,19,21,22,6,1,5,18,7,23],\"game_seats\":[[28,13,8,23,9,18,29,1,1,17,17,29,20,4],[25,28,19,15,15,6,33,32,15,31,31,14,3],[33,33,3,11,12,2,26,26,27,13,13,2,31]]}',1511493770,NULL,'[0,1,8,1,2,30,1,9,[\"31\",\"32\",\"33\",\"31\"],2,2,11,2,1,11,0,2,0,0,1,0,1,2,21,1,1,30,2,2,5,2,1,5,0,2,27,0,1,9,1,2,7,1,1,28,2,2,25,2,1,25,0,2,4,0,1,13,2,3,{\"pai\":13,\"getSeatIndex\":0},2,1,27,0,2,15,0,1,1,1,2,27,1,1,27,2,2,30,2,1,30,0,2,21,0,1,23,1,2,12,1,1,25,2,2,23,2,1,23,0,2,14,0,1,1,1,2,32,1,1,32,2,2,16,2,1,16,0,7,[\"14\",\"15\",\"16\"],0,1,29,1,2,18,1,1,18,2,2,8,2,1,8,0,2,22,0,1,22,1,2,7,1,1,3,2,2,32,2,1,3,0,2,8,0,1,18,1,2,23,1,1,12,2,2,32,2,1,32,0,2,18,0,1,18,1,2,4,1,1,4,0,3,{\"pai\":4,\"getSeatIndex\":1},0,1,8,1,2,30,1,1,30,2,2,29,2,1,29,0,2,31,0,1,17,1,2,5,1,1,7,2,2,11,2,1,12,0,2,25,0,1,17,1,2,4,1,1,4,2,2,6,2,1,6,0,2,16,0,1,16,1,2,29,1,1,29,2,2,10,2,1,10,0,2,24,0,1,24,1,2,16,1,1,19,2,2,24,2,1,24,0,2,3,0,1,25,1,2,1,1,1,1,2,2,5,2,1,5,0,2,17,0,1,31,1,2,16,1,1,16,2,2,25,2,9,[\"31\",\"32\",\"33\",\"33\"],0,2,24,0,1,24,1,2,21,1,1,21,2,2,9,2,1,9,0,2,26,0,1,26,2,3,{\"pai\":26,\"getSeatIndex\":0},2,1,25,0,2,33,0,1,33,1,2,11,1,1,11,2,5,11]','[-2,-1,3]'),('1511776612394796509',0,'{\"type\":\"xzdd\",\"button\":0,\"renshu\":2,\"index\":0,\"mahjongs\":[2,5,1,14,3,17,1,22,6,13,21,12,5,18,8,4,8,10,10,20,12,17,20,22,20,10,16,8,11,8,0,13,14,13,1,19,19,2,0,0,14,5,11,4,2,24,13,11,3,19,7,23,23,12,9,1,4,5,6,21,12,15,4,0,21,24,20,23,16,9,16,17,18,3,24,16,9,17,9,22,18,24,10,18,6,7,7,2,7,21,15,23,11,15,15,14,3,6,22,19],\"game_seats\":[[2,14,1,13,5,4,10,17,20,8,0,13,19,0],[5,3,22,21,18,8,20,20,10,11,13,1,2],[1,17,6,12,8,10,12,22,16,8,14,19,0]]}',1511776815,NULL,'[0,1,20,1,3,{\"pai\":20,\"getSeatIndex\":0},1,1,21,2,2,14,2,1,22,0,2,5,0,1,19,1,2,11,1,1,22,2,2,4,2,1,19,0,2,2,0,1,2,1,7,[\"1\",\"2\",\"3\"],1,1,18,2,2,24,2,1,24,0,2,13,0,1,10,1,2,11,1,1,11,2,2,3,2,1,3,0,7,[\"1\",\"2\",\"3\"],0,1,4,1,2,19,1,1,19,2,2,7,2,1,7,0,2,23,0,1,23,1,2,23,1,1,23,2,2,12,2,1,12,0,7,[\"12\",\"13\",\"14\"],0,1,8,2,3,{\"pai\":8,\"getSeatIndex\":0},2,1,16,0,2,9,0,1,13,1,2,1,1,1,1,2,2,4,2,1,4,0,2,5,0,1,5,1,2,6,1,1,6,2,2,21,2,1,0,0,3,{\"pai\":0,\"getSeatIndex\":2},0,1,9,1,7,[\"10\",\"11\",\"9\"],1,1,2,2,2,12,2,1,21,0,2,15,0,1,13,1,2,4,1,1,8,2,2,0,2,1,0,0,2,21,0,1,21,1,2,24,1,1,24,2,2,20,2,1,20,0,2,23,0,1,23,1,2,16,1,1,16,0,5,16]','[4,-4,0]');

#
# Structure for table "t_games_archive"
#

DROP TABLE IF EXISTS `t_games_archive`;
CREATE TABLE `t_games_archive` (
  `room_uuid` char(20) NOT NULL,
  `game_index` smallint(6) NOT NULL,
  `base_info` varchar(1024) NOT NULL,
  `create_time` int(11) NOT NULL,
  `snapshots` char(255) DEFAULT NULL,
  `action_records` varchar(2048) DEFAULT NULL,
  `result` char(255) DEFAULT NULL,
  PRIMARY KEY (`room_uuid`,`game_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_games_archive"
#


#
# Structure for table "t_goods"
#

DROP TABLE IF EXISTS `t_goods`;
CREATE TABLE `t_goods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `price` float NOT NULL,
  `sales` int(11) NOT NULL,
  `gems` int(11) NOT NULL,
  `type` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=COMPACT;

#
# Data for table "t_goods"
#

INSERT INTO `t_goods` VALUES (1,'2 gems',10,1003,2,'gems'),(2,'4 gems',20,430,4,'gems'),(3,'6 gems',30,329,6,'gems'),(4,'10 gems',50,1318,10,'gems'),(5,'20 gems',100,30,20,'gems'),(6,'30 gems',150,30,30,'gems');

#
# Structure for table "t_guests"
#

DROP TABLE IF EXISTS `t_guests`;
CREATE TABLE `t_guests` (
  `guest_account` varchar(255) NOT NULL,
  PRIMARY KEY (`guest_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

#
# Data for table "t_guests"
#


#
# Structure for table "t_manual_charge_history"
#

DROP TABLE IF EXISTS `t_manual_charge_history`;
CREATE TABLE `t_manual_charge_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `datetime` int(11) DEFAULT NULL,
  `userid` int(11) unsigned DEFAULT NULL,
  `before_gem` int(11) unsigned DEFAULT NULL,
  `after_gem` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT;

#
# Data for table "t_manual_charge_history"
#

INSERT INTO `t_manual_charge_history` VALUES (1,1510504178,1,100,200),(2,1510504282,821,12,27),(3,1510504319,821,15,31),(4,1510504408,821,16,33),(5,1510504420,821,17,18);

#
# Structure for table "t_message"
#

DROP TABLE IF EXISTS `t_message`;
CREATE TABLE `t_message` (
  `type` varchar(32) NOT NULL,
  `msg` varchar(1024) NOT NULL,
  `version` varchar(32) NOT NULL,
  PRIMARY KEY (`type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

#
# Data for table "t_message"
#

/*!40000 ALTER TABLE `t_message` DISABLE KEYS */;
INSERT INTO `t_message` VALUES ('fkgm','dfgdfgdfgsdfgsgsdfgadfgdfgsertergfgsdfg738337822@qq.com','20161128'),('notice','dfgdfggghggtthfghghdhdfhdfhdfhdfghdfghrtsrthrthrthh hgndnhjhjtyjyjtyjtyjjjghghjj hh tyhrtyhrtyrty y tyrtyrtyrtyrtytydsfgfdgsrtyty738337822@qq.com !!!!!','20161128');
/*!40000 ALTER TABLE `t_message` ENABLE KEYS */;

#
# Structure for table "t_orders"
#

DROP TABLE IF EXISTS `t_orders`;
CREATE TABLE `t_orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `goods_name` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `goods_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `channel` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `created_at` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `total_amount` int(11) NOT NULL,
  `buyer_id` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `trade_no` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1511546300853 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci ROW_FORMAT=COMPACT;

#
# Data for table "t_orders"
#

INSERT INTO `t_orders` VALUES (1511343361152,'6 gems',3,1,'waiting','weixin','1511343361152',30,NULL,NULL),(1511343863130,'4 gems',2,2,'waiting','weixin','1511343863130',20,NULL,NULL),(1511344228564,'4 gems',2,2,'waiting','weixin','1511344228564',20,NULL,NULL),(1511344288232,'4 gems',2,2,'waiting','weixin','1511344288232',20,NULL,NULL),(1511348388757,'2 gems',1,1,'waiting','weixin','1511348388757',10,NULL,NULL),(1511348407719,'10 gems',4,2,'waiting','weixin','1511348407719',50,NULL,NULL),(1511349137205,'30 gems',6,2,'waiting','weixin','1511349137205',150,NULL,NULL),(1511349160610,'20 gems',5,2,'waiting','weixin','1511349160610',100,NULL,NULL),(1511546300852,'30 gems',6,29,'waiting','weixin','1511546300852',150,NULL,NULL);

#
# Structure for table "t_rooms"
#

DROP TABLE IF EXISTS `t_rooms`;
CREATE TABLE `t_rooms` (
  `uuid` char(20) NOT NULL,
  `id` char(8) NOT NULL,
  `base_info` varchar(256) NOT NULL DEFAULT '0',
  `create_time` int(11) NOT NULL,
  `num_of_turns` int(11) NOT NULL DEFAULT '0',
  `next_button` int(11) NOT NULL,
  `user_id0` int(11) NOT NULL DEFAULT '0',
  `user_icon0` varchar(128) NOT NULL,
  `user_name0` varchar(32) NOT NULL,
  `user_score0` int(11) NOT NULL DEFAULT '0',
  `user_id1` int(11) NOT NULL DEFAULT '0',
  `user_icon1` varchar(128) NOT NULL,
  `user_name1` varchar(32) NOT NULL,
  `user_score1` int(11) NOT NULL DEFAULT '0',
  `user_id2` int(11) NOT NULL DEFAULT '0',
  `user_icon2` varchar(128) NOT NULL,
  `user_name2` varchar(32) NOT NULL,
  `user_score2` int(11) NOT NULL DEFAULT '0',
  `user_id3` int(11) NOT NULL DEFAULT '0',
  `user_icon3` varchar(128) NOT NULL,
  `user_name3` varchar(32) NOT NULL,
  `user_score3` int(11) NOT NULL DEFAULT '0',
  `ip` varchar(16) DEFAULT NULL,
  `port` int(11) DEFAULT '0',
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

#
# Data for table "t_rooms"
#


#
# Structure for table "t_users"
#

DROP TABLE IF EXISTS `t_users`;
CREATE TABLE `t_users` (
  `userid` int(11) unsigned NOT NULL AUTO_INCREMENT COMMENT '',
  `account` varchar(64) NOT NULL DEFAULT '' COMMENT '',
  `name` varchar(32) DEFAULT NULL COMMENT '',
  `sex` int(1) DEFAULT NULL,
  `headimg` varchar(256) DEFAULT NULL,
  `lv` smallint(6) DEFAULT '1' COMMENT '',
  `exp` int(11) DEFAULT '0' COMMENT '',
  `coins` int(11) DEFAULT '0' COMMENT '',
  `gems` int(11) DEFAULT '0' COMMENT '',
  `roomid` varchar(8) DEFAULT NULL,
  `history` varchar(4096) NOT NULL,
  `charge_amount` float NOT NULL DEFAULT '0',
  PRIMARY KEY (`userid`),
  UNIQUE KEY `account` (`account`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4;

#
# Data for table "t_users"
#

