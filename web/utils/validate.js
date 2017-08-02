var validator = function(){
};

validator.isUserName = function( str ){
    return /^[a-zA-Z][a-zA-Z0-9_]{4,11}$/.test( str );
};
validator.isTimestamp = function( str ){
    return /^[0-9]{0,13}$/.test( str );
};
validator.isProjectId = function( str ){
    return /^[0-9]{4,100}$/.test( str );
};
validator.isGBKName = function( str ){
    return /[\u4e00-\u9fa5]/.test( str );
};
validator.isPsd = function( str ){
    return /(?!^\\d+$)(?!^[a-zA-Z]+$)(?!^[_#@]+$).{6,}/.test( str );
};
validator.isEn = function( str ){
    return /^\S+[a-z A-Z]$/.test( str );
};
module.exports = validator;