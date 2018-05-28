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

//判断运行环境,如果是开发的话，就是azure；测试的阿里云
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
    //国外环境
    host = ipUtils.getAzureIP();
}else{
    host = '0.0.0.0';
}

// host = "192.168.41.241";

var port = config.port;
utils.consoleAndLogger('host:'+host);
utils.consoleAndLogger('port:'+port);
var uport = config.uport;
utils.consoleAndLogger('uport:'+uport);

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
var notifyMap = new Map();
var server = net.createServer( function( socket ){
    var remoteAddress = socket.remoteAddress;
    var remotePort = socket.remotePort;
    utils.consoleAndLogger('new connect created: ' + remoteAddress + ' ' + remotePort);
    socket.on('connection', function(sock) {
        utils.consoleAndLogger('CONNECTED: ' +sock.remoteAddress +':'+ sock.remotePort);
    });

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
            var app_type = msg.msg.app_type;
            utils.consoleAndLogger('client data.id: '+id+',command:'+command+',app_type:'+app_type);
            if(app_type && app_type === 1){
                api_key = config.camera_doorbell.api_key;
                api_secret = config.camera_doorbell.api_secret;
                utils.consoleAndLogger('client data.id: '+id+',app_type===1');
            }else{
                api_key = config.system.api_key;
                api_secret = config.system.api_secret;
                utils.consoleAndLogger('client data.id: '+id+',app_type===undefined');
            }
            utils.consoleAndLogger('client data.id: '+id+',api_key:'+api_key);
            if( msg.clientType == 'http' ){
                //httpServer发送的消息
                if(command == 'wakeup') {
                    // socket.write( 'success' );

                    //根据id从缓存中找到该device所在的端口并取出socket，并通过socket发送消息给device
                    var s = socketMap.get(id);

                    //如果该device已连接，则下发16进制消息
                    if (s) {

                        var s_type = 0; //0->tcp socket,1->udp socket

                        if(s._peername === undefined){
                            s_type = 1;
                            logTxt = id + ' http find udp socket. address:' + s.address + ',port:' + s.port;
                        }else{
                            logTxt = id + ' http find tcp socket. address:' + s._peername.address + ',port:' + s._peername.port;
                        }

                        logObj = {"text": logTxt, "time": parseInt(date.getTime() / 1000)};
                        logTxtArr.push(logObj);
                        utils.consoleAndLogger(logTxt);

                        logTxt = id + ' http send cmd ' + command + ' start ....';
                        utils.consoleAndLogger(logTxt);
                        //s.write(JSON.stringify(msg.msg));

                        var data_to_send = new Buffer([0x00, 0x00, 0x98, 0x3B, 0x16, 0xF8, 0xF3, 0x9C]);
                        if(s_type) {
                            userver.send(data_to_send,0,data_to_send.length,s.port,s.address);
                            logTxt = id + ' http send wakeup cmd 1st time..';
                            utils.consoleAndLogger(logTxt);
                            setTimeout(function(){
                                userver.send(data_to_send,0,data_to_send.length,s.port,s.address);
                                logTxt = id + ' http send wakeup cmd 2nd time..';
                                utils.consoleAndLogger(logTxt);
                            },200); //200ms resend
                            setTimeout(function(){
                                userver.send(data_to_send,0,data_to_send.length,s.port,s.address);
                                logTxt = id + ' http send wakeup cmd 3rd time..';
                                utils.consoleAndLogger(logTxt);
                            },400); //400ms resend
                            setTimeout(function(){
                                userver.send(data_to_send,0,data_to_send.length,s.port,s.address);
                                logTxt = id + ' http send wakeup cmd 4th time..';
                                utils.consoleAndLogger(logTxt);
                            },2000); //2s resend
                            setTimeout(function(){
                                userver.send(data_to_send,0,data_to_send.length,s.port,s.address);
                                logTxt = id + ' http send wakeup cmd 5th time..';
                                utils.consoleAndLogger(logTxt);
                            },5000); //5s resend

                            socket.write('success');
                            logTxt = id + ' http send cmd ' + command + ' success end ....';
                        }else if(id.length > 20 ){ //original device id,e.g `device::QD2ZGG04VL00133E`,length 24
                            s.write(data_to_send);

                            socket.write('success');
                            logTxt = id + ' http send cmd ' + command + ' success end ....';
                        }else{//tk_doorbell device id,e.g `device::B0F1ECADDD33`,length 20
                            s.setNoDelay();
                            s.write(data_to_send,'UTF8',function(ret){
                                utils.consoleAndLogger(id + ' write callback return:' + ret);
                               if(ret) {
                                   logTxt = id + ' http send cmd ' + command + ' failed';
                                   socket.write('failure');
                               }else{
                                   logTxt = id + ' http send cmd ' + command + ' success';
                                   socket.write('success');
                               }
                            });


                        }


                        logObj = {"text": logTxt, "time": parseInt(date.getTime() / 1000)};
                        logTxtArr.push(logObj);
                        utils.consoleAndLogger(logTxt);


                        //一发完唤醒包后，直接断开socket
                        /* s.end(function(){
                         utils.consoleAndLogger(id+' socket close success ....');
                         });*/
                    } else {

                        socket.write('find_no_socket');
                        logTxt = id + ' http send cmd ' + command + 'find no socket.';
                        logObj = {"text": logTxt, "time": parseInt(date.getTime() / 1000)};
                        logTxtArr.push(logObj);
                        utils.consoleAndLogger(logTxt);

                        //如果该device未连接，是否需要进行缓存该命令，然后等门铃连接上来后再下发命令
                        logTxt = id + ' http send cmd ' + command + " fail";
                        logObj = {"text": logTxt, "time": parseInt(date.getTime() / 1000)};
                        logTxtArr.push(logObj);
                        utils.consoleAndLogger(logTxt);
                    }

                    setPushServerLog(logTxtArr, id.split('::')[1], 1);
                }else{
                    utils.consoleAndLogger("invalid params");
                }
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
                                if(id.length > 20 ) { //original device id,e.g `device::QD2ZGG04VL00133E`,length 24
                                    socket.write('success');
                                }
                                // tk_doorbell device id,e.g `device::B0F1ECADDD33`,length 20.There is no need to send success
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
                                    utils.consoleAndLogger( id + ' preSocket end address:'+ preSocket._peername.address +', port:'+ preSocket._peername.port);
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
                    // var sameSocket = 0;
                    if(preSocket){
                        if(preSocket._peername !== undefined) {
                            if ((preSocket._peername.address == socket._peername.address) &&
                                (preSocket._peername.port == socket._peername.port)
                            ) {
                                // sameSocket = 1;
                                utils.consoleAndLogger(id + ' preSocket  is the same as current socket.');
                            } else {
                                utils.consoleAndLogger(id + ' preSocket end address:' + preSocket._peername.address + ', port:' + preSocket._peername.port);
                                preSocket.end();
                                // preSocket.end(new Buffer([0x00, 0x00, 0x98, 0x3B, 0x16, 0xF8,0xF3,0x9C]));
                            }
                        }else{
                            utils.consoleAndLogger(id + ' preSocket  is udp socket address:' + preSocket.address + ', port:' + preSocket.port);
                        }
                    }else{
                        utils.consoleAndLogger(id + ' no preSocket ');
                    }

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
                    utils.consoleAndLogger(id + " set entitymanage option api_key:" + api_key + ",data:"+JSON.stringify(data));
                    request(option, function (err, res, body) {
                        if(body._status._code == 200) {
                            utils.consoleAndLogger(id + " set entitymanage socket success.host:" + host +","+JSON.stringify(body.data));
                        }else{
                            utils.consoleAndLogger(id + " set entitymanage socket fail.host:" + host);
                        }
                    });

                    socket.write( 'success' );
                }else if(command == 'notify' && msg.msg.type){
                    var data = {
                        "did": msg.msg.id,
                        "type": msg.msg.type, //1->keypress,3->pir
                        "visit": time
                    };
                    var option = {
                        url: config.camera_doorbell.url + '/v1/notification/push/intl',
                        "Content-type": "application/json",
                        "method": 'POST',
                        "headers": {
                            "apikey": api_key,
                            "time": time,
                            "apitoken": sha1(api_secret + time)
                        },
                        "json": true,
                        "body": data
                    };
                    utils.consoleAndLogger(id + " set cameradoorbell option api_key:" + api_key + ",data:"+JSON.stringify(data));
                    request(option, function (err, res, body) {
                        utils.consoleAndLogger( id + JSON.stringify(body));
                        if(body.errorCode == 0) {
                            utils.consoleAndLogger(id + " set internal push success");
                        }else{
                            utils.consoleAndLogger(id + " set internal push failed with errCode:"+body.errorCode + ",errMsg:"+ body.errorMessage);
                        }
                    });
                    socket.write( 'success' );
                }
            } else{
                //未知的消息类型
                socket.write( 'unknown message.' );
            }
        }catch(e){
            //格式错误，则关闭该socket client
            logTxt = 'data exception' + e + ',socket end ' + socket._peername.address +', port:'+ socket._peername.port;
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
                //socketMap.remove(map.get(closePort));
                utils.consoleAndLogger("socket close err :" + err );
                var logTxt = 'id:'+map.get(closePort)+' port:'+closePort + ',host:'+ closeHost + ' offline... ' +date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+' '+date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();
                utils.consoleAndLogger(logTxt);
                var logTxtArr = [];
                logTxtArr.push({"text":logTxt,"time":parseInt(date.getTime() /1000) });
                setPushServerLog(logTxtArr,(map.get(closePort)).split('::')[1],3);
                //map.remove(closePort);
            }
            //utils.consoleAndLogger('close date:'+date.getFullYear()+' '+(date.getMonth()+1)+' '+date.getDate()+' '+date.getHours()+' '+date.getMinutes()+' '+date.getSeconds());
            //utils.consoleAndLogger( 'close: ' + closeHost + ' ' + closePort );
            //更新该id的在线状态
            /*var option = {
             url :  config.sdcp.base_url+'/classes/socket_relation/' + utils.removeStr(map.get(closePort),'::'),
             "Content-type" : "application/json",
             "method" : 'GET',
             "headers" : {
             "api_key" : api_key,
             "time" : time,
             "api_token" : sha1( api_secret + time )
             }
             };
             request( option, function( err, res, body ){
             //utils.consoleAndLogger(body);
             body = JSON.parse(body);
             if(body._status._code == 200){
             var data = {
             "did":map.get(closePort),
             "server":{
             "host":host,
             "port":port
             },
             "time":body.data.time,
             "status":0//在线状态  1：表示在线  0：离线
             };
             var option = {
             url :  config.sdcp.base_url+'/classes/socket_relation/' +utils.removeStr(map.get(closePort),'::'),
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
             //utils.consoleAndLogger('sdcp.remove.err:'+err);
             //utils.consoleAndLogger('sdcp.upload.body:'+JSON.stringify(body));
             socketMap.remove(map.get(closePort));
             map.remove(closePort);
             var date = new Date();
             utils.consoleAndLogger('close date:'+date.getFullYear()+' '+(date.getMonth()+1)+' '+date.getDate()+' '+date.getHours()+' '+date.getMinutes()+' '+date.getSeconds());
             utils.consoleAndLogger( 'close: ' + closeHost + ' ' + closePort );

             //console.log(map);
             } );
             }
             } );*/

        }else{
            //utils.consoleAndLogger("SLB socket closed.")
        }
    } );
    //2分钟
    /*socket.setTimeout(1000);
     //socket.setTimeout(2*60000);
     socket.on('timeout',function(){
     if(socket._peername){
     var closeHost = socket._peername.address;
     var closePort = socket._peername.port;
     utils.consoleAndLogger( 'timeout: ' + closeHost + ' ' + closePort );
     //更新该id的在线状态
     var option = {
     url :  config.sdcp.base_url+'/classes/socket_relation/' + utils.removeStr(map.get(closePort),'::'),
     "Content-type" : "application/json",
     "method" : 'GET',
     "headers" : {
     "api_key" : api_key,
     "time" : time,
     "api_token" : sha1( api_secret + time )
     }
     };
     request( option, function( err, res, body ){
     //utils.consoleAndLogger(body);
     body = JSON.parse(body);
     if(body._status._code == 200){
     var data = {
     "did":map.get(closePort),
     "server":{
     "host":host,
     "port":port
     },
     "time":body.data.time,
     "status":0//在线状态  1：表示在线  0：离线
     };
     var option = {
     url :  config.sdcp.base_url+'/classes/socket_relation/' +utils.removeStr(map.get(closePort),'::'),
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
     utils.consoleAndLogger('sdcp.remove.err:'+err);
     //utils.consoleAndLogger('sdcp.upload.body:'+JSON.stringify(body));
     socketMap.remove(map.get(closePort));
     map.remove(closePort);
     console.log(map);
     } );
     }
     } );

     }
     });*/
} );
server.listen( port, host );

//add udp case
var dgram=require('dgram');
var userver = dgram.createSocket('udp4');

//listening事件监听
userver.on('listening',function(){
    var address=userver.address();
    utils.consoleAndLogger('udp server listening on:'+address.address+':'+address.port)
});

//message事件监听
userver.on('message', function( data, rinfo) {
    var logTxt = 'new udp connect. address:' + rinfo.address + ',port:' + rinfo.port;
    utils.consoleAndLogger(logTxt);
    //return ;
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
        var msg = JSON.parse( data.toString() );
        var id = msg.msg.id;
        var command = msg.msg.command;
        utils.consoleAndLogger('udp message client data.id: '+id+' command:'+command);
        var date = new Date();
        if( msg.clientType == 'http' ){
            //httpServer发送的消息
            if(command == 'wakeup') {


                //根据id从缓存中找到该device所在的端口并取出socket，并通过socket发送消息给device
                var s = socketMap.get(id);

                //如果该device已连接，则下发16进制消息
                if (s) {
                    var lock = 0;
                    logTxt = id + ' http find socket. address:' + s.address + ',port:' + s.port;
                    utils.consoleAndLogger(logTxt);

                    logTxt = id + ' http send cmd ' + command + ' start ....';
                    utils.consoleAndLogger(logTxt);
                    //s.write(JSON.stringify(msg.msg));
                    if(!lock) {
                        lock=1;
                        //将收到的消息回发给客户端
                        var data_to_send = new Buffer([0x00, 0x00, 0x98, 0x3B, 0x16, 0xF8, 0xF3, 0x9C]);
                        userver.send(data_to_send,0,data_to_send.length,s.port,s.address);
                        logTxt = id + ' http send cmd ' + command + ',length:'+data_to_send.length+',success end ....';
                        utils.consoleAndLogger(logTxt);
                        var message = new Buffer('success');
                        userver.send( message, 0, message.length, rinfo.port, rinfo.address);
                        lock = 0;
                    }
                } else {
                    var message = new Buffer('find_no_socket');
                    userver.send( message, 0, message.length, rinfo.port, rinfo.address);
                    logTxt = id + ' http send cmd ' + command + 'find no socket.';
                    utils.consoleAndLogger(logTxt);
                }

            }else{
                utils.consoleAndLogger("invalid params");
            }
        } else if( msg.clientType == 'device' ){
            //硬件上报的消息
            //权限验证
            if(command == 'iconnect'){
                //新的硬件接入，登记起来
                var device = {
                    "id":id,
                    "port":rinfo.port
                };
                var newSocket = {"address":rinfo.address,"port":rinfo.port};
                //把所有连接的socket
                socketMap.put(device.id, newSocket);

                var s = socketMap.get(device.id);
                map.put(device.port, device.id);
                utils.consoleAndLogger(id + ' set udp socket address:' + rinfo.address + ',address:' + rinfo.port);
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

                var message = new Buffer('success');
                userver.send( message, 0, message.length, rinfo.port, rinfo.address);
                logTxt = id + ' device udp iconnect success. ';
                utils.consoleAndLogger(logTxt);
            }else if(command == 'notify') {
                // {
                //     "clientType": "device",
                //     "msg": {
                //     "command": "notify",
                //         "type": 1, //removed
                //         "id": "device::B0F1ECADED2B",
                //         "app_type": 1 //removed
                //     }
                // }
                api_key = config.camera_doorbell.api_key;
                api_secret = config.camera_doorbell.api_secret;
                utils.consoleAndLogger('client data.id: ' + id + ', command:' + command);
                // 1 push within 10 seconds
                var now = parseInt( Math.round( new Date().getTime() / 1000 ) );
                var notifyData = {"key": "notify:" + id, "visit": now};
                var preNotifyData = notifyMap.get(notifyData.key);
                utils.consoleAndLogger(id + ' get udp preNotifyData:' + JSON.stringify(preNotifyData));
                if (preNotifyData && (preNotifyData!==undefined) && ( now - preNotifyData.visit) <= 10) {
                    logTxt = id + ' device udp notify repeat within 10 seconds.';
                    utils.consoleAndLogger(logTxt);
                } else {
                    notifyMap.put(notifyData.key, notifyData);
                    utils.consoleAndLogger(id + ' set udp notifyMap:' + JSON.stringify(notifyData));

                    var data = {
                        "did": id,
                        // "type": msg.msg.type, //1->keypress,3->pir
                        "type": 1,
                        "visit": now
                    };
                    var option = {
                        url: config.camera_doorbell.url + '/v1/notification/push/intl',
                        "Content-type": "application/json",
                        "method": 'POST',
                        "headers": {
                            "apikey": api_key,
                            "time": time,
                            "apitoken": sha1(api_secret + time)
                        },
                        "json": true,
                        "body": data
                    };
                    utils.consoleAndLogger(id + " set cameradoorbell push option api_key:" + api_key + ",data:" + JSON.stringify(data));
                    request(option, function (err, res, body) {
                        if (body.errorCode == 0) {
                            utils.consoleAndLogger(id + " set internal push success");
                            //set cache with expire 10 seconds

                        } else {
                            utils.consoleAndLogger(id + " set internal push failed with errCode:" + body.errorCode + ",errMsg:" + body.errorMessage);
                        }
                    });
                    // var message = new Buffer('success');
                    // userver.send( message, 0, message.length, rinfo.port, rinfo.address);
                    logTxt = id + ' device udp notify success. ';
                    utils.consoleAndLogger(logTxt);
                }

            }

        } else{
            //未知的消息类型
            utils.consoleAndLogger("udp socket invalid param,unknown message.");
            var message = new Buffer('udp unknown message.');
            userver.send( message, 0, message.length, rinfo.port, rinfo.address);
            // userver.close();
        }
    }catch(e){
        //格式错误，则关闭该socket client
        logTxt = 'OnMessage exception:' + e + ',socket end ' + rinfo.address +', port:'+ rinfo.port;
        utils.consoleAndLogger(logTxt);
        var message = new Buffer('err');
        userver.send( message, 0, message.length, rinfo.port, rinfo.address);
        // userver.close();
    }
});

//error event
userver.on('error',function(err){
    var address=userver.address();
    utils.consoleAndLogger('udp socket err:'+ err + address.address + ' ' + address.port);
});


// 为这个socket实例添加一个"close"事件处理函数
userver.on( 'close', function( err ){
    utils.consoleAndLogger("udp socket close err :" + err );
} );

userver.bind( uport, host );
//end udp case


process.on('uncaughtException',function(err){
    utils.consoleAndLogger('err:'+err);
    utils.consoleAndLogger('err time:'+new Date());
    process.exit();
});

function setPushServerLog(logs,cid,type){
    var doc_id = "http:log:"+ cid;
    if(type ==2){
        doc_id = "device:connect:log:"+ cid;
    }else if(type == 3){
        doc_id = "heartbeat:log:"+ cid;
    }
    var data = {
        "api_key" : api_key,
        "time" : time,
        "api_token" : sha1( api_secret + time ),
        "doc_id":doc_id
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


    data.data = {cid:"",logs:[]};
    request( option, function( err, res, body ) {
        // body = JSON.parse(body);
        if (err) {
            utils.consoleAndLogger('set server log,sdcp devicedata getbydocid err');
        } else {
            if (body._status._code == 200) {
                data.data.logs = logs.concat(body.data.logs);
            } else {
                data.data.cid = cid;
                data.data.logs = logs;
            }

            if (data.data.logs.length > 6) {
                var delCount = data.data.logs.length -6;
                for(var i=0; i< delCount; i++){
                    data.data.logs.pop();
                }
            }

            option = {
                url :  config.sdcp.devicedata+'/set',
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
                if(err){
                    // utils.consoleAndLogger("set Device log fail.sdcp devicedata set err " + err);
                }else {
                    // utils.consoleAndLogger("set Device log success");
                }
            } );
        }

    });

}
