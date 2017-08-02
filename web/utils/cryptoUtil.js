//cryptoutil.js加密解密
var crypto = require( 'crypto' );
var secretKey = 'doorbell';
/**
 * aes加密
 * @param data
 * @param secretKey
 */
exports.aesEncrypt = function( data ){
    var cipher = crypto.createCipher( 'aes-128-ecb', secretKey );
    return cipher.update( data, 'utf8', 'hex' ) + cipher.final( 'hex' );
}

/**
 * aes解密
 * @param data
 * @param secretKey
 * @returns {*}
 */
exports.aesDecrypt = function( data ){
    var cipher = crypto.createDecipher( 'aes-128-ecb', secretKey );
    return cipher.update( data, 'hex', 'utf-8' ) + cipher.final( 'utf8' );
};

