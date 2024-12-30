
const crypto = require('crypto');



module.exports.capitalizeEachWord = function capitalizeEachWord(str) {
    return str.replace(/\b\w/g, match => match.toUpperCase());
  }

 module.exports.generateSessionToken = function generateSessionToken(userId) {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();
    const data = `${userId}-${randomBytes}-${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }