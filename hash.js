/*
    문제 풀이용에는 사용 안했습니다.
    개인적인 공부용으로 사용하였습니다...
*/

const crypto = require('crypto');


exports.hash = (str) => {
    return crypto.createHash('sha1').update(str).digest('hex');
}