const moment = require("moment");

const  formateMessage =  (type, toClient, fromClient, message) => {
    return {
        type, //normal || first-time
        toClient :{
            fullname: toClient.fullname,
            username: toClient.username
        }, //fullname, username
        fromClient: {
            fullname: fromClient.fullname,
            username: fromClient.username
        }, //fullname, username
        message,
        time: moment().format("h:mm a")
    }
}

module.exports = formateMessage;