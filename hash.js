const crypto = require('crypto');

// sha1 방식의 해쉬함수
exports.hash = (str) => {
    return crypto.createHash('sha1').update(str).digest('hex');
}