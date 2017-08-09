var express = require('express');
var router = express.Router();
var async = require('async');
var net = require('net');
var sha1 = require( 'sha1' );
var request = require( 'request' );
var config = require( '/home/doorbell_command_http/conf/config.json' );
var utils = require('../utils/utils');
var authUtil = require( '../utils/authUtil' );
var Result = require('../Result.js');
var time = parseInt( Math.round( new Date().getTime() / 1000 ) );
var api_key = config.system.api_key;
var api_secret = config.system.api_secret;

/**
 * 批量获取设备状态
 * body:{
 *      dids:["aaa","aaa"]
 * }
 *
 * response:{
       "data": {
        "ids": [
          "ccc"
        ],
        "status": [
          1
        ]
      }
 * }
 */
//router.post('/v1/command/status',authUtil.auth);
router.post('/v1/command/status',function(req,res){
    var ids = req.body.ids;
    var index = 0;
    var result = new Result();
    result._status._code = 200;
    result._status._message = 'success';
    var status = [];
    var item ={};
    async.whilst(function(){
        return index<ids.length;
    },function(cb){
        var id = ids[index++];
        var option = {
            url :  config.sdcp.base_url+'/classes/socket_relation/' +utils.removeStr(id,'::') ,
            "Content-type" : "application/json",
            "method" : 'GET',
            "headers" : {
                "api_key" : api_key,
                "time" : time,
                "api_token" : sha1( api_secret + time )
            }
        };

        request( option, function( err, res, body ){
            utils.consoleAndLogger(err);
            utils.consoleAndLogger(body);
            body = JSON.parse(body);

            //console.log(body);
            if(body._status._code != 200){
                status.push(0);
                item[id] = 0;
            }else{
                status.push(1);
                //item[id] = 1;
                item[id] = body.data.time;
            }
            cb(null,null);
        } );
    },function(err){
        if(err){
            utils.consoleAndLogger(err);
            res.status(500);
            result._status._code = 500;
            result._status._message = err;
        }else{
            res.status(200);
            result.data = item;
        }
        res.json(result);
    })

});

/**
 * 发送命令接口
 * body:{
 *      "did":"aaa",
 *      "command":"wake"\"unbind" //命令格式
 * }
 */
//router.post('/v1/command/',authUtil.auth);
router.post('/v1/command/',function(req,res){
    /* 解析客户端的命令
     {did:'xxxx',
     command:wake}
     */
    var id =req.body.did;
    var command =req.body.command;
    var result = new Result();
    result._status._code = 200;
    result._status._message = 'success';
    var msg = {
        "clientType":"http",
        "msg":{
            "id":id,
            "command":command
        }
    };
    //    console.log(msg);
    async.waterfall([function(cb){
        //根据id获取该设备所在的socket的host和port
        var option = {
            url :  config.sdcp.base_url+'/classes/socket_relation/' + utils.removeStr(id,'::'),
            "Content-type" : "application/json",
            "method" : 'GET',
            "headers" : {
                "api_key" : api_key,
                "time" : time,
                "api_token" : sha1( api_secret + time )
            }
        };
        request( option, function( err, res, body ){
            //utils.consoleAndLogger(err);
            body = JSON.parse(body);
            if(body._status._code != 200 || (body._status._code == 200 && body.data.status == 0)){
                result._status._code = 40001;
                result._status._message = 'Device disconnect';
                //如果设备当前是离线状态，则把该命令缓存起来,等设备上线后再直接下发
                var commandData = msg.msg;
                commandData.time = new Date().getTime();
                var option = {
                    url :  config.sdcp.base_url+'/classes/socket_command_cache/' + utils.removeStr(id,'::'),
                    "Content-type" : "application/json",
                    "method" : 'PUT',
                    "headers" : {
                        "api_key" : api_key,
                        "time" : time,
                        "api_token" : sha1( api_secret + time )
                    },
                    "json" : {
                        "object" : commandData
                    }
                };
                request( option, function( err, res, body ){
                    //utils.consoleAndLogger('sdcp.save.commandData.err:'+err);
                    cb('Device disconnect',null);
                    return;
                } );
            }else{
                var socketConfig = {
                    "host":body.data.server.host,
                    "port":body.data.server.port
                };
                //utils.consoleAndLogger('socketConfig:'+JSON.stringify(socketConfig));
                cb(null,socketConfig);
            }
        } );
    },function(socketConfig,cb){
        //新建socket客户端进行连接，并发送命令
        var client = new net.Socket();
        client.connect( socketConfig.port, socketConfig.host, function(){
            utils.consoleAndLogger('CONNECTED TO: ' + socketConfig.port + ':' + socketConfig.host);
            utils.consoleAndLogger('msg:'+JSON.stringify(msg));
            // 建立连接后立即向服务器发送数据，服务器将收到这些数据
            client.write( JSON.stringify(msg) );
        } );

        // 为客户端添加“data”事件处理函数
        // data是服务器发回的数据
        client.on( 'data', function( data ){
            utils.consoleAndLogger( 'DATA: ' + data );
            // 完全关闭连接
            if(data == 'success'){
                // 完全关闭连接
                client.destroy();
            }
        } );
        // 为客户端添加“close”事件处理函数
        client.on( 'close', function(){
            utils.consoleAndLogger(  'Connection closed'  );
        } );
        client.on('error',function(e){
            utils.consoleAndLogger(  'Connection error closed' +e );
        });
        cb(null,null);
    }],function(err,data){
        if(err){
            utils.consoleAndLogger(err);
            if(err != 'Device disconnect'){
                res.status(500);
                result._status._code = 500;
                result._status._message = err;
            }
        }else{
            res.status(200);
        }
        res.json(result);
    });
});



module.exports = router;
