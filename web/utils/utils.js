var url = require('url'),
    querystring = require('querystring'),
    fs = require('fs'),
    util = require('util'),
    cryptoUtil = require('./cryptoUtil');
var config = require( '/home/doorbell_socket/conf/config.json' );
var MODULE_NAME = 'utils';
var PROJECT_NAME = config.proName;
var logger = require('./logger');
var validate = require('./validate');
/**
 * 输出到console
 */
exports.console=function(message){
    console.log(message);
}
/**
 * 输出到控制台和日志
 * @param message
 */
exports.consoleAndLogger=function(message){
    if (config.environment =='developing' || config.environment =='staging' ) {
        console.log(PROJECT_NAME + ' ' + message);
        logger.info(PROJECT_NAME + ' ' + message);
    }
}


/**
 *json配置文件解析成json字段
 *@author zjy
 * @time 2014-12-08
 * @param filename
 * @param key
 * @returns {{}}
 */
exports.fileToJson = function(filename,key){
    var configJson = {};
    try{
        var str = fs.readFileSync(filename,'utf8');
        configJson = JSON.parse(str.toString());//str用str.toString，防止报异常
    }catch(e){
        util.debug(e);
    }
    return configJson[key];
}
/**
 * 生成access_token
 * 生成规则：用户id+100内的随机数
 * @param data
 * @returns {*}
 */
exports.enAccess_token = function(data){
    return cryptoUtil.aesEncrypt(data+Math.random().toString(36).substr(2).slice(0,2));
}

/**
 * 解析access_token
 * 生成规则：用户id+用户最后的一次时间戳
 * @param data
 * @returns {*}
 */
exports.deAccess_token = function(data){
    return cryptoUtil.aesEncrypt(data);
}


/**
 * 验证传入的参数是否满足要求
 * @param params
 * @param pattern
 *  * @returns boolean
 */
exports.check_params = function(params,pattern){
    try{
        if(pattern === 'post /users/token'){
            var username = params.username,
                password = params.password;
            if(username == undefined || password == undefined){
                return false;
            }
            if(validate.isUserName(username) && validate.isPsd(password)){
                return true;
            }else{
                return false;
            }
        }else if(pattern === 'delete /users/token'){
            var username = params.username;
            if(username == undefined){
                return false;
            }
            return validate.isUserName(username);
        }else if(pattern === 'get /data/statistics'){
            var time = params.time;
            if(time == undefined){
                return false;
            }
            return validate.isTimestamp(time);
        }else if(pattern === 'get /data/increment/:projectId'){
            var projectId = params.projectId;
            var starttime = params.starttime;
            var endtime = params.endtime;
            if(projectId == undefined || starttime == undefined || endtime == undefined){
                return false;
            }
            return (validate.isProjectId(projectId) && validate.isTimestamp(starttime) && validate.isTimestamp(endtime));
        }else if(pattern === 'get /data/user/:projectId'){
            var projectId = params.projectId;

            if(projectId == undefined){
                return false;
            }
            return validate.isProjectId(projectId);
        }else if(pattern === 'get /data/device/:projectId'){
            var projectId = params.projectId;

            if(projectId == undefined){
                return false;
            }
            return validate.isProjectId(projectId);
        }

        else if(pattern === 'user.login'){
            var phoneno = params.phoneno,
                password = params.password,
                lastLoginTime = params.lastLoginTime,
                lastLoginLoc = params.lastLoginLoc;
            //验证手机号码 ，最后登录时间 和密码
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.user.login.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+lastLoginTime+':'+(lastLoginTime.length === 13)+'__'+password+':'+cryptoUtil.aesDecrypt(password));
            if(re.test(phoneno) && lastLoginTime.length === 13  && cryptoUtil.aesDecrypt(password)){
                //lastLoginLoc 是个String对象
                var loc = JSON.parse(lastLoginLoc);
                var lon =loc.lon,
                    lat = loc.lat;
                if(lon >= -180 && lon <= 180 && lat >= 0 && lat <= 90){
                    console.log('Utils.user.login.check_params____>登录参数验证成功！');
                    return true;
                }else{
                    console.log('Utils.user.login.check_params____>登录参数验证失败！');
                    return false;
                }
            }else{
                console.log('Utils.user.login.check_params____>登录参数验证失败！');
                return false;
            }
        }else if(pattern === 'photo.upload'){
            var phoneno = params.phoneno,
                token = params.access_token,
                key = params.key;//15080176015_21234444444444
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.photo.upload.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+token+':'+cryptoUtil.aesDecrypt(token)+'_'+key+':'+key.indexOf("_"));
            //验证手机号码 ，注册时间 和密码
            if(re.test(phoneno) && key.indexOf("_") && cryptoUtil.aesDecrypt(token)){
                console.log('Utils.photo.upload.check_params____>图片上传参数验证成功！');
                return true;
            }else{
                console.log('Utils.photo.upload.check_params____>图片上传参数验证失败！');
                return false;
            }
        }else if(pattern === 'photo.view'){
            var phoneno = params.phoneno,
                token = params.access_token;
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.photo.view.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+token+':'+cryptoUtil.aesDecrypt(token));
            //验证手机号码 ，注册时间 和密码
            if(re.test(phoneno) && cryptoUtil.aesDecrypt(token)){
                console.log('Utils.photo.view.check_params____>查看个人图片参数验证成功！');
                return true;
            }else{
                console.log('Utils.photo.view.check_params____>查看个人图片参数验证失败！');
                return false;
            }
        }else if(pattern === 'photo.viewOne'){
            var phoneno = params.phoneno,
                token = params.access_token,
                key = params.key;//15080176015_21234444444444
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.photo.viewOne.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+token+':'+cryptoUtil.aesDecrypt(token)+'_'+key+':'+key.indexOf("_"));
            //验证手机号码 ，注册时间 和密码
            if(re.test(phoneno) && key.indexOf("_") && cryptoUtil.aesDecrypt(token)){
                console.log('Utils.photo.viewOne.check_params____>根据key查找图片参数验证成功！');
                return true;
            }else{
                console.log('Utils.photo.viewOne.check_params____>根据key查找图片参数验证失败！');
                return false;
            }
        }else if(pattern === 'photo.delete'){
            var phoneno = params.phoneno,
                token = params.access_token,
                key = params.key;//15080176015_21234444444444
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.photo.viewOne.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+token+':'+cryptoUtil.aesDecrypt(token)+'_'+key+':'+key.indexOf("_"));
            //验证手机号码 ，注册时间 和密码
            if(re.test(phoneno) && key.indexOf("_") && cryptoUtil.aesDecrypt(token)){
                console.log('Utils.photo.delete.check_params____>根据keys删除图片参数验证成功！');
                return true;
            }else{
                console.log('Utils.photo.delete.check_params____>根据key删除图片参数验证失败！');
                return false;
            }
        }else if(pattern === 'user.modifyPwd'){
            var phoneno = params.phoneno,
                pwd = params.pwd,
                newPwd = params.newPwd;
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.user.modifyPwd.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+pwd+':'+cryptoUtil.aesDecrypt(pwd)+'__'+newPwd+':'+cryptoUtil.aesDecrypt(newPwd));
            //验证手机号码 、旧密码和新密码
            if(re.test(phoneno)  && cryptoUtil.aesDecrypt(pwd) && cryptoUtil.aesDecrypt(newPwd) ){
                console.log('Utils.user.modifyPwd.check_params____>修改用户密码参数验证成功！');
                return true;
            }else{
                console.log('Utils.user.modifyPwd.check_params____>修改用户密码参数验证失败！');
                return false;
            }
        }else if(pattern === 'user.view'){
            var phoneno = params.phoneno,
                access_token = params.access_token,
                viewphoneno = params.viewphoneno;
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.user.view.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+access_token+':'+cryptoUtil.aesDecrypt(access_token)+'__'+viewphoneno+':'+re.test(viewphoneno));
            //验证手机号码 、旧密码和新密码
            if(re.test(phoneno)  && cryptoUtil.aesDecrypt(access_token) && re.test(viewphoneno) ){
                console.log('Utils.user.view.check_params____>查看用户资料参数验证成功！');
                return true;
            }else{
                console.log('Utils.user.view.check_params____>查看用户资料参数验证失败！');
                return false;
            }
        }else if(pattern === 'guiji.add'){
            console.log("guiji.add参数验证")
            var phoneno = params.phoneno,
                access_token = params.access_token,
                gid = JSON.parse(params.guiji).gid.toString();
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.guiji.add.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+access_token+':'+cryptoUtil.aesDecrypt(access_token)+'_gid:_'+gid+':'+(gid.length === 25 && gid.indexOf(phoneno) != -1));
            //验证手机号码、token
            if(re.test(phoneno)  && cryptoUtil.aesDecrypt(access_token)&&(gid.length === 25 && gid.indexOf(phoneno) != -1)){
                console.log('Utils.guiji.add.check_params____>添加轨迹参数验证成功！');
                return true;
            }else{
                console.log('Utils.guiji.add.check_params____>添加轨迹参数验证失败！');
                return false;
            }
        }else if(pattern === 'guiji.delete'){
            console.log("guiji.delete参数验证")
            var phoneno = params.phoneno,
                access_token = params.access_token,
                gid = params.gid
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            //gid 长度为11+1+13=25位，且gid必须包含phoneno,表示为删除自己账号的轨迹信息
            //验证手机号码、token
            console.log('Utils.guiji.add.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+access_token+':'+cryptoUtil.aesDecrypt(access_token)+'_gid:_'+gid+':'+(gid.length === 25 && gid.indexOf(phoneno) != -1));
            if(re.test(phoneno)  && cryptoUtil.aesDecrypt(access_token)&&(gid.length === 25 && gid.indexOf(phoneno) != -1)){
                console.log('Utils.guiji.delete.check_params____>删除轨迹参数验证成功！');
                return true;
            }else{
                console.log('Utils.guiji.delete.check_params____>删除轨迹参数验证失败！');
                return false;
            }
        }else if(pattern === 'user.viewLogo'){
            var phoneno = params.phoneno,
                access_token = params.access_token,
                viewphoneno = params.viewphoneno;
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.user.view.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+access_token+':'+cryptoUtil.aesDecrypt(access_token)+'__'+viewphoneno+':'+re.test(viewphoneno));
            if(re.test(phoneno)  && cryptoUtil.aesDecrypt(access_token) && re.test(viewphoneno) ){
                console.log('Utils.user.viewLogo.check_params____>查看用户头像参数验证成功！');
                return true;
            }else{
                console.log('Utils.user.viewLogo.check_params____>查看用户头像参数验证失败！');
                return false;
            }
        }else if(pattern === 'guiji.view'){
            var phoneno = params.phoneno,
                access_token = params.access_token,
                reg = params.reg;
            var re = /^0?(13[0-9]|15[012356789]|18[0236789]|14[57])[0-9]{8}$/ ;
            console.log('Utils.guiji.view.check_params____>'+phoneno+':'+re.test(phoneno)+'__'+access_token+':'+cryptoUtil.aesDecrypt(access_token));
            if(re.test(phoneno)  && cryptoUtil.aesDecrypt(access_token) ){
                console.log('Utils.guiji.view.check_params____>搜索轨迹参数验证成功！');
                return true;
            }else{
                console.log('Utils.user.viewLogo.check_params____>搜索轨迹参数验证失败！');
                return false;
            }
        }
    }catch (e){
        return false;
        console.log(e)
        util.debug('check_params____>'+e);
    }
}

/**
 * 去除指定字符
 * @param str
 * @param remove_str
 * @returns str
 */
exports.removeStr = function(str,remove_str){
    if(str){
        return str.replace(remove_str, "");
    }
    return '';
}
