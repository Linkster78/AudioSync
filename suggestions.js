const LOG_FILE = 'suggestions.log';

const fs = require('fs');

var logSuggestion = function(suggestion) {
    var timestamp = new Date().toISOString();
    fs.appendFile(LOG_FILE, `[${timestamp}] ${suggestion}\n`, function (err) {
        if (err) throw err;
    });
};

module.exports = {
    logSuggestion
};