const LocalStrategy = require("passport-local").Strategy;

var initializer  = function(passport, User){
    const verifyCallBack = function (username, password, done) { //here username and password are from body i.e, username and password
      //  console.log("verifyCallBack start");            
        User.findOne({ username: username }, function (err, user) {
            // console.log("verifyCallBack", user);
            if (err) { return done(err); }
            if (!user) {
                // console.log("checking user", user);
                return done(null, false, { message: 'Invalid Username' });
            }
            if (!(user.password == password)) {
                // console.log("checking pass", user);
                return done(null, false, { message: 'Incorrect password' });
            }

            return done(null, user);
        });
    }
    
    passport.serializeUser(function (user, done) {
        // console.log("serializeUser", user);
        done(null, user.id);
    });
    
    passport.deserializeUser(function (id, done) {
        // console.log("deserializeUser", id);
        User.findById(id, function (err, user) {
            done(err, user);  
        });
    });
    
    const customField = {
        usernameField: "username",
        passwordField: "password",
    }
    
    const Strategy = new LocalStrategy(customField, verifyCallBack);
    passport.use(Strategy);    
}

module.exports = initializer;


// passport.use(Strategy); how previous code like this work without exports??? //sol: due to object and array in node/js are pass by reference
//but why it is returning same object second time 
//may be due to passport library or object get cached 
//___its bad idea to do like that i.e  to rely on cache or something that is not clear 
//___ and it good idea to take  object as reference and perform action

