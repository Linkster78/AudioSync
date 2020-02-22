const SESSION_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SESSION_CODE_LENGTH = 5;

var sessions = [];

var createSession = function(uuid) {
    var sessionCode = "";
    do {
        for(var i = 0; i < SESSION_CODE_LENGTH; i++) {
            sessionCode += SESSION_CHARACTERS.charAt(Math.floor(Math.random() * SESSION_CHARACTERS.length));
        }
    } while(sessionCode in sessions.map((session) => session.code));
    
    var session = {
        code: sessionCode,
        members: [uuid]
    };

    sessions.push(session);
    return session;
};

var disconnectMember = function(uuid) {
    var session = getSessionByUUID(uuid);
    if(!(session === undefined)) {
        session.members.splice(session.members.indexOf(uuid), 1);
        if(session.members.length == 0) {
            sessions.splice(sessions.indexOf(session), 1);
        }
    }
}

var getSessionByUUID = function(uuid) {
    return sessions.find((session) => session.members.includes(uuid));
}

module.exports = {
    createSession: createSession,
    disconnectMember: disconnectMember,
    getSessionByUUID: getSessionByUUID
};