var net = require( 'net' );
var sha1 = require( 'sha1' );
var request = require( 'request' );
var config = require( '/home/doorbell_socket/conf/config.json' );
var utils = require('./utils/utils');
var cryptoUtil = require('./utils/cryptoUtil');
var ipUtils = require('./utils/ipUtils');
var time = parseInt( Math.round( new Date().getTime() / 1000 ) );
var api_key = config.system.api_key;
var api_secret = config.system.api_secret;

//判断运行环境
var host;
if(config.environment == 'developing'){
    host = ipUtils.getAzureIP();
    // host ="192.168.8.241";
}else if (config.environment =='staging'){
    ip = ipUtils.getLocalIP();
    host = ip[0].intranet_ip;
    // host = '0.0.0.0';
}else if(config.environment =='product'){
    host = ipUtils.getAzureIP();
    //ip = ipUtils.getLocalIP();
    //host = ip[0].intranet_ip;
}else if (config.environment =='pro2'){    
    host = ipUtils.getAzureIP();
}else{
    host = '0.0.0.0';
}


var port = config.port;
utils.consoleAndLogger('host:'+host);
utils.consoleAndLogger('port:'+port);
function Map(){
    this.container = new Object();
}
Map.prototype.put = function(key, value){
    this.container[key] = value;
}
Map.prototype.get = function(key){
    return this.container[key];
}
Map.prototype.remove = function(key) {
    delete this.container[key];
}
var map = new Map();
var socketMap = new Map();
var server = net.createServer( function( socket ){
    var remoteAddress = socket.remoteAddress;
    var remotePort = socket.remotePort;
    utils.consoleAndLogger('new connect: ' + remoteAddress + ' ' + remotePort);
    // socket.setKeepAlive(true, 180000);
    // socket.setTimeout( 360*1000 );
    socket.on('error',function(err){
        // utils.consoleAndLogger('socket err:'+ err + socket.remoteAddress + ' ' + socket.remotePort);
    });
    socket.on( 'data', function( data ){
        var date = new Date();

        var logTxt = '';
        var logObj = {};
        var logTxtArr = [];

        logTxt = 'new connect. address:' + socket.remoteAddress + ',port:' + socket.remotePort +' '+date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
        logObj = {"text":logTxt,"time":parseInt(date.getTime()  /1000) };
        logTxtArr.push(logObj);
        utils.consoleAndLogger(logTxt);
        //解析消息
        /*
         msg = {
         "clientType":"socket",
         "msg":{
         "id":'sdafjdbakg',
         "command":"connect"
         }
         }
         */


        try{
            var msg = JSON.parse( data );
            var id = msg.msg.id;
            var command = msg.msg.command;
            utils.consoleAndLogger('client data.id: '+id+' command:'+command);

            if( msg.clientType == 'http' ){
                //httpServer发送的消息
                socket.write( 'success' );
                //根据id从缓存中找到该device所在的端口并取出socket，并通过socket发送消息给device
                var s = socketMap.get(id);

                //如果该device已连接，则下发16进制消息
                if(s){
                    logTxt = id + 'http find socket. address:' + s._peername.address + ',port:' + s._peername.port;
                    logObj = {"text":logTxt,"time":parseInt(date.getTime()  /1000) };
                    logTxtArr.push(logObj);
                    utils.consoleAndLogger(logTxt);

                    //s.write(JSON.stringify(msg.msg));
                    s.write(new Buffer([0x00, 0x00, 0x00, 0x03, 0x00, 0x02,0x00,0x01]));
                    //s.end(new Buffer([0x00, 0x00, 0x98, 0x3B, 0x16, 0xF8,0xF3,0x9C]));
                    logTxt = id+' http send cmd '+ command + ' success ....';
                    logObj = {"text":logTxt,"time":parseInt(date.getTime()  /1000) };
                    logTxtArr.push(logObj);
                    utils.consoleAndLogger(logTxt);
                    //一发完唤醒包后，直接断开socket
                    /* s.end(function(){
                     utils.consoleAndLogger(id+' socket close success ....');
                     });*/
                }else{
                    logTxt = id + 'http send cmd '+ command + 'find no socket.';
                    logObj = {"text":logTxt,"time":parseInt(date.getTime()  /1000) };
                    logTxtArr.push(logObj);
                    utils.consoleAndLogger(logTxt);

                    //如果该device未连接，是否需要进行缓存该命令，然后等门铃连接上来后再下发命令
                    logTxt = id + ' http send cmd '+ command + " fail";
                    logObj = {"text":logTxt,"time":parseInt(date.getTime()  /1000) };
                    logTxtArr.push(logObj);
                    utils.consoleAndLogger(logTxt);
                }

                setPushServerLog(logTxtArr,id.split('::')[1],1);
            } else if( msg.clientType == 'device' ){
                //硬件上报的消息
                //权限验证
                if(command == 'connect'){
                    //权限校验，如果校验不过，则直接关闭链接
                    //权限校验，校验id是否合法,是否能查询得到
                    var data = {
                        "api_key" : api_key,
                        "time" : time,
                        "api_token" : sha1( api_secret + time ),
                        "doc_id":"init::"+id.split('::')[1]
                    };
                    var option = {
                        url :  config.sdcp.devicedata+'/getbydocid',
                        "Content-type" : "application/json",
                        "method" : 'POST',
                        "headers" : {
                            "api_key" : api_key,
                            "time" : time,
                            "api_token" : sha1( api_secret + time )
                        },
                        "json" : data
                    };

                    request( option, function( err, res, body ){
                        if(typeof (body) == 'string'){
                            body = JSON.parse(body)
                        }
                        if(err){
                            //断开链接
                            //格式错误，则关闭该socket client
                            logTxt =  id + 'device connect sdcp request err ,socket end address:'+ socket._peername.address +', port:'+ socket._peername.port;
                            logObj = {"text":logTxt,"time":parseInt(date.getTime() /1000) };
                            logTxtArr.push(logObj);
                            utils.consoleAndLogger(logTxt);
                            socket.end('err');

                        }else{
                            if(body._status._code!=200){
                                logTxt = id + ' device connect sdcp return code not 200 err,socket end address:'+ socket._peername.address +', port:'+ socket._peername.port;
                                logObj = {"text":logTxt,"time":parseInt(date.getTime() /1000) };
                                logTxtArr.push(logObj);
                                utils.consoleAndLogger(logTxt);
                                socket.end('err');
                            }else{
                                socket.write( 'success' );
                                var date = new Date();
                                logTxt = id + ' device connect success. '+ date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
                                logObj = {"text":logTxt,"time":parseInt(date.getTime() /1000) };
                                logTxtArr.push(logObj);
                                utils.consoleAndLogger(logTxt);
                                //新的硬件接入，登记起来
                                var device = {
                                    "id":id,
                                    "port":socket._peername.port
                                };
                                //把旧的socket取出来，先关闭，再存入新的socket
                                var preSocket = socketMap.get(device.id);

                                if(preSocket){
                                    utils.consoleAndLogger( id + 'preSocket end address:'+ preSocket._peername.address +', port:'+ preSocket._peername.port);
                                    preSocket.end();
                                    // preSocket.end(new Buffer([0x00, 0x00, 0x98, 0x3B, 0x16, 0xF8,0xF3,0x9C]));
                                }else{
                                    utils.consoleAndLogger(id + ' no preSocket ');
                                }

                                //把所有连接的socket
                                socketMap.put(device.id,socket);
                                map.put(device.port,device.id);
                                utils.consoleAndLogger(id + ' set socket port ' + device.port);
                                //console.log(map);
                                //调用sdcp存入数据库
                                var data = {
                                    "did":device.id,
                                    "server":{
                                        "host":host,
                                        "port":port
                                    },
                                    "time":new Date().getTime(),
                                    "status":1//在线状态  1：表示在线  0：离线
                                };
                                var option = {
                                    url :  config.sdcp.base_url+'/classes/socket_relation/' + utils.removeStr(device.id,'::'),
                                    "Content-type" : "application/json",
                                    "method" : 'PUT',
                                    "headers" : {
                                        "api_key" : api_key,
                                        "time" : time,
                                        "api_token" : sha1( api_secret + time )
                                    },
                                    "json" : {
                                        "object" : data
                                    }
                                };
                                request( option, function( err, res, body ){
                                } );
                            }
                        }
                    } );

                    setPushServerLog(logTxtArr,id.split('::')[1],2);
                }else if(command == 'iconnect'){
                    socket.write( 'success' );
                    var date = new Date();
                    logTxt = id + ' device iconnect success. '+ date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
                    logObj = {"text":logTxt,"time":parseInt(date.getTime() /1000) };
                    logTxtArr.push(logObj);
                    utils.consoleAndLogger(logTxt);
                    //新的硬件接入，登记起来
                    var device = {
                        "id":id,
                        "port":socket._peername.port
                    };
                    //把旧的socket取出来，same ip & port,no need to store; if not same 先关闭，再存入新的socket
                    var preSocket = socketMap.get(device.id);
                    var sameSocket = 0;
                    if(preSocket){
                        if( (preSocket._peername.address == socket._peername.address) &&
                            (preSocket._peername.port == socket._peername.port)
                          ){
                            sameSocket = 1;
                            utils.consoleAndLogger(id + 'preSocket  is the same as current socket.');
                        }else {
                            utils.consoleAndLogger(id + 'preSocket end address:' + preSocket._peername.address + ', port:' + preSocket._peername.port);
                            preSocket.end();
                            // preSocket.end(new Buffer([0x00, 0x00, 0x98, 0x3B, 0x16, 0xF8,0xF3,0x9C]));
                        }
                    }else{
                        utils.consoleAndLogger(id + ' no preSocket ');
                    }

                    if(sameSocket){

                    }else {
                        //把所有连接的socket
                        socketMap.put(device.id, socket);
                        map.put(device.port, device.id);
                        utils.consoleAndLogger(id + ' set socket port ' + device.port);
                        //console.log(map);
                        //调用sdcp存入数据库
                        var data = {
                            "did": device.id,
                            "server": {
                                "host": host,
                                "port": port
                            },
                            "time": new Date().getTime(),
                            "status": 1//在线状态  1：表示在线  0：离线
                        };
                        var option = {
                            url: config.sdcp.base_url + '/classes/socket_relation/' + utils.removeStr(device.id, '::'),
                            "Content-type": "application/json",
                            "method": 'PUT',
                            "headers": {
                                "api_key": api_key,
                                "time": time,
                                "api_token": sha1(api_secret + time)
                            },
                            "json": {
                                "object": data
                            }
                        };
                        request(option, function (err, res, body) {
                        });
                    }

                }
            } else{
                //未知的消息类型
                socket.write( 'unknown message.' );
            }
        }catch(e){
            //格式错误，则关闭该socket client
            logTxt = id + 'data exception' + e + ',socket end ' + socket._peername.address +', port:'+ socket._peername.port;
            utils.consoleAndLogger(logTxt);
            socket.end('err');
            logObj = {"text":logTxt,"time":parseInt(date.getTime() /1000) };
            logTxtArr.push(logObj);
            setPushServerLog(logTxtArr,"socketerr",1);
        }

    } );

    // 为这个socket实例添加一个"close"事件处理函数
    socket.on( 'close', function( err ){
        if(socket._peername){
            var closeHost = socket._peername.address;
            var closePort = socket._peername.port;
            var date = new Date();
            if(map.get(closePort)){
                var date = new Date();
                //socketMap.remove(map.get(closePort));
                utils.consoleAndLogger("socket close err :" + err );
                var logTxt = 'id:'+map.get(closePort)+' port:'+closePort + ',host:'+ closeHost + ' offline... ' +date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
                utils.consoleAndLogger(logTxt);
                var logTxtArr = [];
                logTxtArr.push({"text":logTxt,"time":parseInt(date.getTime() /1000) });
                setPushServerLog(logTxtArr,(map.get(closePort)).split('::')[1],3);
                //map.remove(closePort);
            }         

        }else{
            //utils.consoleAndLogger("SLB socket closed.")
        }
    } );
} );
server.listen( port, host );
process.on('uncaughtException',function(err){
    utils.consoleAndLogger('err:'+err);
    utils.consoleAndLogger('err time:'+new Date());
    process.exit()
})