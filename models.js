const mongoose = require("mongoose");

//connecting to database

//mongodb://localhost:27017/userTempDB
const connection = mongoose.createConnection(`mongodb+srv://admin-rajat32:${process.env.MONGODB_PASSWORD}@cluster0.n5haz.mongodb.net/userTempDB?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }
);


//session schema
const session_schema = new mongoose.Schema({
    _id: String,
    expires: Date,
    session: String
})

exports.session_model = connection.model("Session", session_schema, "sessions");

//user schema 
const user_schema = new mongoose.Schema({
    name: String,
    username: {
        type: String,
        unique: true
    },
    password: String,
    socket_data: [String],
    chat_data:[String],
    sessions: [String]
}, {
    timestamps: true
});

module.exports.User = connection.model("User", user_schema, "users"); //****



module.exports.connection = connection