require('dotenv').config()
const express = require("express")
const http = require("http");
const socketio = require("socket.io")
const path = require("path")
const formateMessage = require("./utils/messageFormate.js");
const bodyParser = require("body-parser");
const flash = require("express-flash")


const models = require("./models.js");
const User = models.User;
const session_model = models.session_model;

//session and passport and 
//database
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;


//express server, socket io
const app = express();
const server = http.createServer(app)
const io = socketio(server);


//configuring passport
require("./passport-config.js")(passport, User);

//static folder
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json())

//ejs template
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');

//connection to database
const connection = models.connection;

//mongoStore session
const sessionStore = new MongoStore({
    mongooseConnection: connection,
    collection: 'sessions',
    autoRemove: "interval",
    autoRemoveInterval: 60 * 24 * 15
})

//flash
app.use(flash());

//session
const sessionMiddleware = session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
        maxAge: 60 * 60 * 24 * 15 //after how much time session from datbases deleted in second
    }
});
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());


//login routes --------------------------------------
console.log("first route");
app.get("/", function (req, res) {
    // console.log("/ get");
    if(req.isAuthenticated()){
        // return res.redirect("/chat-window.html");
        return res.sendFile(path.join(__dirname, "public/chat-window.html"));
    }
    res.render('login');
});

//sign up
app.get("/signup", function (req, res) {
  //  console.log("/signup get");
    if(req.isAuthenticated()){
        return res.sendFile(path.join(__dirname, "public/chat-window.html"));
    }
    res.render("signup");
})

app.post("/signup", function (req, res) {
  //  console.log("route: /signup", req.user ? req.user.username : null, " sessionId ", req.sessionID);
    const name = req.body.name;
    const username = req.body.username;
    const password = req.body.password;

    const user = new User({
        name: name,
        username: username,
        password: password,
    })

    //validating input like name, username, password
    if(name.length  < 2) {
        req.flash("signup_error", "Name is too short");
        return res.redirect("/signup");
    }
    if(username.length <4){
        req.flash("signup_error", "Username is too short");
        return res.redirect("/signup");
    }
    if(password.length  <1){
        req.flash("signup_error", "Password is too short");
        return res.redirect("/signup");
    }


    
    User.findOne({username: username}, (err, docs)=>{
        if(err) return next(new Error("Error route = signup, findOne"));
        if(docs){
            req.flash("signup_error", "username already exist");
            return res.redirect("/signup");
        }
        else{
            user.save(function (err, user) {
                if (err) {
                    console.error(err.err);
                    req.flash("signup_error", "Some error occured");
                    return res.redirect("/signup");
                }
                else {     
                    //below code same as in login route for create session when user signup
                    req.logIn(user, function(err) {
    
                        if (err) { return next(err); }
                        //adding session_id to user db
                
                        User.findById(user._id, function(err, doc){   
                            if (err) { return next(err); }
                            doc.sessions.push(req.sessionID);
                            doc.save((e)=>{
                               if(e) {
                                req.flash("login_error", "Some error occured\nTry again");
                                console.error("Error while attaching sessionID to User-collection in database");
                
                                req.logout(); // can do req.session  = "" or // req.session.destroy();
                                return res.redirect('/login');
                               }
                               else return res.sendFile(path.join(__dirname, "public/chat-window.html"));
                            });
                        });
                      });
                }
            })
        }
    });
});


//login
app.get("/login", function (req, res) {
  //  console.log("login get")
    if(req.isAuthenticated()){
        return res.redirect('/chat-window.html');
    }
    res.render("login");
})


app.post('/login', function(req, res, next) {
    console.debug("/login POST")
    if(req.isAuthenticated()){
        return res.redirect('/chat-window.html');
    }
    passport.authenticate('local', function(err, user, info) {
        // console.log("info ", info);
      if (err) { return next(err); }
      if (!user) { 
          req.flash("login_error", info.message);
          return res.redirect('/login'); 
       }


       //req.logIn is passport function use to save session
      req.logIn(user, function(err) {
        // //  console.log("req.user ", req.user); //attach by deserialize passport function
        // //  console.log("req.logIn" , user);

        if (err) { return next(err); }
        //adding session_id to user db

        User.findById(user._id, function(err, doc){
            if (err) { return next(err); }
            // console.log("find by id" , doc);
            doc.sessions.push(req.sessionID);
            doc.save((e)=>{
               if(e) {
                req.flash("login_error", "Some error occured\nTry again");
                console.error("Error while attaching sessionID to User-collection in database");

                req.logout(); // can do req.session  = "" or // req.session.destroy();
                return res.redirect('/login');
               }
               else return res.redirect('/chat-window.html');
            });
        });
      });

    })(req, res, next);
  });

//logout
app.get("/logout", function (req, res) {
  //  console.log("route: /logout", req.user ? req.user.username : null, " sessionId ", req.sessionID);
    if(req.isAuthenticated()){
        User.findById(req.user._id, (err, doc)=>{
            if(err){
                console.error("Error >> _route : /logout;  _error : mongoose findbyid");
                res.redirect("/login");
            }
            else{
                let i = 0;
                doc.sessions.forEach((element, ind) => {
                    if(element === req.sessionID) {
                        i = ind;
                    }
                })

                if(doc.sessions.length){
                    doc.sessions.splice(i, 1);
                }
                else console.error("ERROR :: route: /logout  (error :doc.sessions.length  is zero) ")

                req.logout();
                req.session.destroy();
                res.clearCookie("connect.sid");
                doc.save((e)=>{
                    if(e) {
                        console.error("Error :: database : error in clearing one session from user-collection");
                    }
                    res.redirect("/login");
                });
            }
        });
    }else{
        res.redirect("/");
    }
});

app.get("/logout-from-all-session", function(req, res){
  //  console.log("route: /logout-from-all-session", req.user ? req.user.username : null, " sessionId ", req.sessionID);
    if(req.isAuthenticated()){
        User.findById(req.user._id, (err, doc)=>{
            if(err){
                console.error("Error >> _route : /logout;  _error : mongoose findbyid");
                res.redirect("/login");
            }
            else{
                //removing sessions other than current session
              //  console.log(doc.sessions);

                if(doc.sessions.length == 0) {
                    console.error("ERROR :: /logout-from-all-session, doc.sessions.length == 0")
                    return res.sendFile(path.join(__dirname, "public/chat-window.html"));
                }
                
                //to delete multitple session
                let i = 0;
                function util_1(){
                  //  console.log(`ind ${i}`);
                    if(doc.sessions[i] != req.sessionID) {
                        session_model.deleteOne({_id : doc.sessions[i]}, (err)=>{
                          //  console.log("debugging  multiple delete", i);
                            if(!err) delete doc.sessions[i];
                            else {
                                console.error("Error :: database : error in  CLEARING SESSIONS from SESSIONS-DB");
                                console.error("Error >> _r  oute : /logout-from-all-session;  _error : mongoose session_model.deleteOne");
                            }
                            if(i != doc.sessions.length -1){
                              //  console.log("debug 2");
                                i++;
                                return util_1();
                            }
                            else if(i == doc.sessions.length -1){
                              //  console.log("debug 10");
                                 return util_2();
                            }
                        });
                    }
                    else if(doc.sessions[i] == req.sessionID){
                        if(i != doc.sessions.length -1){
                            i++;
                            return util_1();
                        }
                        else{
                            return util_2();
                        }
                    }
                }
                util_1();
                //just to run below code in sync
                function util_2(){
                  //  console.log(doc.sessions);
                    doc.sessions = doc.sessions.filter((el)=>{
                        return el != null;
                    })
                    // console.log(doc.sessions);
                  //  console.log(doc);
                    // doc.markModified("sessions");
                    doc.save((e, result)=>{
                      //  console.log(result);
                        if(e) {
                            console.error("Error(not a big issue):: database : error in  UPDATING CLEARED SESSIONS IN user-collection");
                        }
                        return res.sendFile(path.join(__dirname, "public/chat-window.html"));
                    });
                }

            }
        });
    } else{
        res.redirect("/");
    }
});


//error handler
app.use(function(err, req, res, next){
    if(err){
        console.error("ERROR(error handler) :: ", err.message ? err.message : err);
        res.render("error");
    }
});

//-----------code for socket io

// convert a connect middleware to a Socket.IO middleware
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

//checking for user
io.use((socket, next)=>{
    
    if(socket.request.user){
        // console.log("io.use :  ", socket.request.user);  //will print curr user detail
        next();
    }
    else{
        console.debug("Error: io.use : No user found :: socket");
        next(new Error("io.use : No user found :: socket"));//where it get handled ???
    }
})





// socket connection
io.on("connection", socket => {
    const current_user = socket.request.user;
    const curr_user = {
        fullname: current_user.name, 
        username: current_user.username
    };


    const chatBot = {
        fullname: "Chat Bot",
        username: "just some unknown random user 9238hf983hr983rhf"
    }
    ///////for one to one messaging------------------------------------------>
    const socket_id = socket.id;
    console.debug("socket id", socket.id);

    // io.to(socket_id).emit("tome", `${curr_user.fullname} connected`);

    //saving the socket id to respective user

    User.findById(current_user._id, function(err, doc){
        if (err) { return next(err);}
        // console.log("find by id" , doc);
        
        if(!doc){
            return;
        }

        if(doc.socket_data.length === 0){
            doc.socket_data.push(socket.id);
        }
        else {
            doc.socket_data.pop();
            doc.socket_data.push(socket.id);
        }
        // console.log(current_user._id);
        // console.log(doc);
        doc.save((e)=>{
           if(e) {
            console.error("Error while pushing socket_id to User-collection in database");
          //  console.log(e);
           }
        });
    });
    ///////for one to one messaging -------------------------------------->



    //only to current user
    socket.emit("message", formateMessage("first-time-user", curr_user, chatBot, "welcome to the chat"));

    //broadcast when the user connect (other except the current user)
    // socket.broadcast.emit("message", formateMessage("first-time-other", curr_user, chatBot, `${curr_user.username} joined the chat`));
    

    //sending chats from database to client
    socket.on("client:first-time-data", (m)=>{
        User.findById(current_user._id, function(err, doc){
            if (err) { return next(err);}
            // console.log("find by id" , doc);
            if(!doc){
                return;
            }

            const data_to_send = doc.chat_data;

            io.to(socket_id).emit("server:chatdata first-time", data_to_send);
            
        });
    });

    //one received message (from any user)
    socket.on("chatMessage", ({type, toClient, fromClient, message}) =>{

        const formated_message = formateMessage(type, toClient, fromClient, message);

        //to send to all the users
        // console.log({type, toClient, fromClient, message});
        // console.log("chatMessage ", formated_message);
        // io.emit("message", formated_message);

       
        //to send to a particular user

        //saving incoming message in database

        //chat message to push
        const database_chat = {
            toClient:toClient,
            fromClient:fromClient,
            message: message,
            time : formated_message.time 
        }
        const database_chat_json = JSON.stringify(database_chat);


        if(fromClient.username === curr_user.username){///this is just for checking we the user is sending to its own username
            //saving chat to database:: of fromClient
            User.findById(current_user._id, function(err, doc){
                if (err) { return next(err);}
                // console.log("find by id" , doc);
                

                if(doc){
                    doc.chat_data.push(database_chat_json);

                
                    doc.save((e)=>{
                        if(e) {
                            
                            console.error("1 Error while pushing chatdata to User-collection in database");
                            console.error(e);
                        }
                        else{
                            if(doc.socket_data.length !== 0){
                                //sending to the fromClient
                                io.to(doc.socket_data[0]).emit("message", formated_message);
                            }
                        }
                    });
                }
            });

            //saving chat to database:: to fromClient
            User.findOne({username: toClient.username}, (err, doc)=>{
                if(err){
                    //some error occure;
                    return next(err);
                }
                if(doc){
                    doc.chat_data.push(database_chat_json);


                    doc.save((e)=>{
                        if(e) {
                        
                        console.error("2 Error while pushing chatdata to User-collection in database");
                        console.error(e);
                        }
                        else{
                            if(doc.socket_data.length !== 0){
                                //sending to the toClient
                                io.to(doc.socket_data[0]).emit("message", formated_message);
                            }
                        }
                    });
                }
            })
        }
    })

    //checking if adding username by client is valid or not
    socket.on("isvalidUsername", (recieved_username)=>{
        User.findOne({username: recieved_username}, (err, doc)=>{
            if(err){
                //some error occure;
                return next(err);
            }
           
            if(doc !== null && doc.username === recieved_username){//recieved_username is valid
                io.to(socket_id).emit("isvalidUsername", {username: doc.username, fullname: doc.name, isValid: true});
            }
            else{//recieved_username is not valid
                io.to(socket_id).emit("isvalidUsername", {username: "", fullname: "", isValid: false});
            }
           
        });
    })

    //checking if a particular user is online or offline
    socket.on("isOnline", (recieved_username)=>{
        User.findOne({username: recieved_username}, (err, doc)=>{
            if(err){
                //some error occure;
                return next(err);
            }
            if(doc){
                if(doc.socket_data.length !== 0){
                    io.to(socket_id).emit("isOnline", {username: recieved_username, isOnline: true});
                }
                else{
                    io.to(socket_id).emit("isOnline", {username: recieved_username, isOnline: false});
                }
            }
        });
    })
    

    //checking if a user is typing or not
    socket.on("Typing", (toUsername)=>{
        User.findOne({username: toUsername}, (err, doc)=>{
            if(err){
                //some error occure;
                return next(err);
            }
            // console.log(curr_user.username, " is typing to", toUsername);
            if(doc){
                if(doc.socket_data.lenght !== 0){
                    io.to(doc.socket_data[0]).emit("Typing", curr_user.username);
                }
            }
            
        });
    })


    socket.on("disconnect", ()=>{
        //removing the socket it from respect user
      //  console.log("disconnect:: username: ", curr_user.username);

        User.findById(current_user._id, function(err, doc){
            if (err) { return next(err);}
            // console.log("find by id" , doc);
            

            if(doc){
                if(doc.socket_data.length !== 0){
                    doc.socket_data.pop();
                }
            }
            
    
            doc.save((e)=>{
               if(e) {
                console.error("Error while popping socket_id in User-collection in database:: disconnect");
               }
            });
        });

        io.emit("message", formateMessage("disconnect", {name: null, username: null} , chatBot, `${current_user.username} left the chat`));
    })
})



//port connection
const port = process.env.PORT ? process.env.PORT : 3000

server.listen(port, ()=>{
  //  console.log(`Chat application : server started at ${port}`);
})

