// const { set } = require("mongoose");

const chatForm = document.getElementById("chat-form");
const chatBox = document.querySelector(".chat-box");
const userAddButton = document.querySelector("#user-add-button");
const userNameInput = document.querySelector(".user-name-input");
const userShowArea = document.querySelector('.user-show-area');
const chatmateButton = document.querySelector('.chatmate-button');
const messageInputField = document.querySelector(".message-input-field");
// const disconnectBotton = document.querySelector(".disconnect-button");
const logoutButtonElement = document.querySelector(".logout-button-elment");
const currentUsernameElement = document.querySelector(".current-username-elment");

const socket = io();
var current_user_username ="";
var current_user_fullname="";

const current_chatmate = {
    fullname: "",
    username: ""
}

const chats = [];

const chatmates = [];
const chatmates_set = new Set();

/*
{
    toClient: ,
    fromClient: ,
    message: ,
    time: 
}
*/

socket.on("tome", (m)=>{
  //  console.log("tome ::", m);
})

socket.on("message", ({type, toClient, fromClient, message, time})=>{ //m is message
    // console.log(m);
    // console.log({type, toClient, fromClient, message, time});
    
    if(type === "message"){
        const curr_chat = {
            toClient,
            fromClient,
            message,
            time
        }
        chats.push(curr_chat);
    }
        
    
    if(type === "first-time-user"){
      //  console.log("first-time-user");
        // const username_div = document.createElement("div");
        // username_div.classList.add("row","container", "d-flex", "flex-row-reverse");
   
        currentUsernameElement.innerHTML = `${toClient.username}`;
        currentUsernameElement.style.display="inline-block";
        logoutButtonElement.style.display="inline-block";
        // username_div.innerHTML = `
        //    <h2 class="p-1">Welcome, ${toClient.username}</h2>
         
        //     <button id="logout-button" class="badge badge-light logout-div">Logout</button>
        // `
     
    
        logoutButtonElement.addEventListener("click", ()=>{
          //  console.log("logout_div clicked");
            // socket.disconnect(); 
            current_user_username = "";
            current_user_fullname = "";
            // window.location("http://" + window.location.hostname + ":3000/logout");
        })


        // const username_div = document.getElementById("")

        current_user_username = toClient.username;
        current_user_fullname= toClient.fullname

      //  console.log("user saved");

        //requesting for the data from the database first time
        socket.emit("client:first-time-data", "");
    }


    //for message display
    if(current_chatmate.username === fromClient.username || current_chatmate.username === toClient.username){
        displayMessage(fromClient, message, time, current_user_username);
    }

    // console.log(new_message);

    chatBox.scrollTop = chatBox.scrollHeight;
})


//first time data received from the server
socket.on("server:chatdata first-time", (m)=>{
  //  console.log("server:chatdata first-time ");
    // console.log(m);
    
    m.forEach((single_json_message)=>{
        const parsed_message = JSON.parse(single_json_message);

        //adding to chat
        chats.push(parsed_message);
    })

    //reversing so that message most recent message Username will show upperside

    for(let it = chats.length-1; it>=0; it--){
        const {fromClient, toClient} = chats[it];
        //extracting another chatmate 
        if(fromClient.username !== current_user_username && !chatmates_set.has(fromClient.username)){
            chatmates_set.add(fromClient.username);
            chatmates.push({username: fromClient.username, fullname: fromClient.fullname});
        }
        if(toClient.username != current_user_username && !chatmates_set.has(toClient.username)){
            chatmates_set.add(toClient.username);
            chatmates.push({username: toClient.username, fullname: toClient.fullname});
        }
    }

    ///first time usernames adding
    firstTimeUsernamesAdding();
})

//first time usernames adding 
function firstTimeUsernamesAdding(){
    let zero_user = true;

    chatmates.forEach(({username, fullname},i)=>{
        if(i === 0){//first user chat will be shown 
            addUser(username, fullname).click();
            zero_user = false;
        }
        else{
            addUser(username, fullname)
        }
    });

    if(zero_user){
        showMessageInMessageBox("No User Found");
    }
}

//show append alert message in message box
function showMessageInMessageBox(message){
    chatBox.innerHTML = chatBox.innerHTML + `
    <div class="alert alert-success mt-2" role="alert">
        <h4 class="alert-heading">${message}</h4>
    </div>
    `
}


//for message display in message box
function displayMessage(fromClient, message, time, current_user_username){
    const new_message = document.createElement("div")
    new_message.classList.add("row", "chat-message")
    new_message.style.margin = "2px"


    console.debug("diaplay message", current_user_username);

    if(fromClient.username == current_user_username){
         //message display in right right
        
        new_message.innerHTML = 
        `<div class="col"></div>
        <div class="col-10 col-sm-8 border bg-dark text-light break-word border-dark rounded-left rounded-bottom">
            <div>
                <span class="text-muted">${"you"}</span>
                <span class="text-muted">${time}</span>
            </div>
            <p>${message}</p>
        </div>`;
    }
    else{
        //message display in left side
        new_message.innerHTML = 
        `<div class="col-10 col-sm-8 border bg-dark break-word text-light border-dark rounded-right rounded-bottom">
            <div>
                <span class="text-muted">${fromClient.fullname}</span>
                <span class="text-muted">${time}</span>
            </div>
            <p>${message}</p>
        </div>
        <div class="col"></div>`
    }

    chatBox.appendChild(new_message);
}


//to check if message contain only spaces
const valid_message = (message)=>{
    for(i in message){
        if(message[i] != " ") {
            return true;
        }
    }
    return false;
}

//click on send button
chatForm.addEventListener("submit", (e)=>{
    e.preventDefault();

    if(current_chatmate.username === "") {
      //  console.log("chatmate not contain username");
        return;
    };

    const message = e.target.elements.message.value;

    if(message.length !==  0 && valid_message(message)){
        const m = {
            type:"message",
            toClient:{
                fullname: current_chatmate.fullname,
                username: current_chatmate.username
            },
            fromClient:{
                fullname: current_user_fullname,
                username: current_user_username
            },
            message,
            time: null
        }
        socket.emit("chatMessage", m);
        e.target.elements.message.value = "";
    }
    else{
        //make bold, change color when there is nothing in input field
        e.target.elements.message.value = "";
        e.target.elements.message.classList.add("write-something-alert");

        setTimeout(()=>{
            e.target.elements.message.classList.remove("write-something-alert");
        }, 2000);
    }

    e.target.elements.message.focus();
})

//to add new user by button
userAddButton.addEventListener("click", () =>{
    const username = userNameInput.value; //chatmate username

    if(!valid_message(username)){ ///check for only empty spaces
       return;
    }

    //checking if entered username is valid or not
    if(!chatmates_set.has(username)){
        socket.emit("isvalidUsername", username);
    }
    else{
        showUsernameExist("Already added");
    }
    
    // console.log(userNameInput.value);
})

userNameInput.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
        // console.log("userNameInput Enter");
        userAddButton.click();
    }
})

//getting from server that username is valid
socket.on("isvalidUsername", ({username, fullname, isValid})=>{ //if not valid it will send empty string
    if(isValid && username !== "" && username != current_user_username){
      //  console.log("valid");
        addUser(username, fullname);
        chatmates_set.add(username);
    }
    else{
      //  console.log("invalid");
        showUsernameInvalid("Not found.");
    }
});

//to add user and to select user and render its messages in message box
function addUser(username, fullname){
    const add_user_button = document.createElement("a");
    add_user_button.href = "#";
    add_user_button.classList.add("list-group-item", "list-group-item-action", "chatmate-button");
    add_user_button.innerHTML = fullname;
    add_user_button.setAttribute("username", username);

    //to focus(color) the current selected button :: work remain
    add_user_button.addEventListener("click", (e)=>{
        if(Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) < 576){
            backButtonClick(); //this function will toggle the view to message box
        }
      //  console.log("chatmate button clicked :: ", username);
        // console.log(e.target);

        //setting current chatmate name
        current_chatmate.username = username;
        current_chatmate.fullname = fullname;


        //removing selected color from previous
        const all_add_user_buttons = document.querySelectorAll(".chatmate-button");
        all_add_user_buttons.forEach((element)=>{
            if(element.classList.contains("bg-dark")){
                element.classList.remove("bg-dark");
            }
            if(element.classList.contains("text-light")){
                element.classList.remove("text-light");
            }
        });


        //add selected color to current chatemate name
        e.target.classList.add("bg-dark", "text-light");

        //now loading chat for that particular chatmate
        chatBox.innerHTML = "";

        let zero_chat = true;
        // console.log("username", username);
        chats.forEach(({fromClient, toClient, message, time})=>{
            if(fromClient !== null && (fromClient.username === username || toClient.username === username)){
                zero_chat = false;
                displayMessage(fromClient, message, time, current_user_username);
            }
        })
        if(zero_chat){
            showMessageInMessageBox("Say hi to " + fullname);

        }
        //loading username, fullname in header of chatbox
        document.querySelector(".current-chat-mate-fullname").innerHTML = fullname;
        document.querySelector(".current-chat-mate-username").innerHTML = username;
        socket.emit("isOnline", username);

        chatBox.scrollTop = chatBox.scrollHeight;
    })


    userShowArea.appendChild(add_user_button);
    userNameInput.value = "";
    userNameInput.focus();
    // <a href="#" class="list-group-item list-group-item-action">asdf</a>

    return add_user_button; //returning this button object
}

//checking for online offline
socket.on("isOnline", ({username, isOnline})=>{
    const isTypingBox = document.querySelector(".is-typing");

    if(isTypingBox.innerHTML != "typing..."){
        if(current_chatmate.username === username && isOnline === true){
            isTypingBox.innerHTML = "online";
            if(isTypingBox.classList.contains("text-muted")){
                isTypingBox.classList.remove("text-muted");
            }
            isTypingBox.classList.add("text-success");
        }
        else if(current_chatmate.username === username && isOnline === false){
            isTypingBox.innerHTML = "offline"
    
            if(isTypingBox.classList.contains("text-success")){
                isTypingBox.classList.remove("text-success");
            }
            
            isTypingBox.classList.add("text-muted");
        }
    }
})

//checking for online
setInterval(()=>{
    socket.emit("isOnline", current_chatmate.username);
}, 3000);



//checking for typing
var isTyping = false;
setInterval(()=>{
    if(isTyping === true){
      //  console.log("is typing is true")
        socket.emit("Typing", current_chatmate.username);
    }
}, 3000);

socket.on("Typing", (recieved_username)=>{
  //  console.log(recieved_username, " is typing");
    if(recieved_username === current_chatmate.username){
        const isTypingBox = document.querySelector(".is-typing");

        if(isTypingBox.classList.contains("text-muted")){
            isTypingBox.classList.remove("text-muted");
        }

        isTypingBox.innerHTML = "typing...";
        
        isTypingBox.classList.add("text-success");

        setTimeout(()=>{
            isTypingBox.innerHTML = "online";
        }, 3000);
    }
})

//checking for typing
messageInputField.addEventListener("keydown", ()=>{
    if(isTyping === false){
        isTyping = true;
        setTimeout(()=>{
            isTyping = false;
        }, 6000);
    }   
})



//for warning to the user, entered username is not valid
const showUsernameInvalid = (message)=>{
    userNameInput.value = "";
    userNameInput.placeholder = message;
    userNameInput.classList.add("warning-placeholder");
    
    setTimeout(()=>{
        userNameInput.classList.remove("warning-placeholder");
        userNameInput.placeholder = "Username";
    }, 2000);
}

const showUsernameExist = (message)=>{
    userNameInput.value = "";
    userNameInput.placeholder = message;
    userNameInput.classList.add("exist-placeholder");
    
    setTimeout(()=>{
        userNameInput.classList.remove("exist-placeholder");
        userNameInput.placeholder = "Username";
    }, 2000);
}

 

///frontend responsive display setup

const messageBoxesDiv = document.querySelector("#message-boxes-div");
const userAddChatmateDiv = document.querySelector("#user-add-chatmate-div");
// const backButton = document.querySelector("#back-button");
const  messageSendDiv =  document.querySelector("#message-send-div");

function backButtonClick(){
    if(messageBoxesDiv.style.display !== 'none'){
        // messageBoxesDiv.classList.remove("display-this");
        // messageBoxesDiv.classList.add("not-display-this");

        userAddChatmateDiv.style.display = 'block'
        messageBoxesDiv.style.display = 'none'
        messageSendDiv.style.display = "none"

        // userAddChatmateDiv.classList.remove("not-display-this");
        // userAddChatmateDiv.classList.add("display-this");
    }
    else{
        // userAddChatmateDiv.classList.remove("display-this");
        // userAddChatmateDiv.classList.add("not-display-this");

        // messageBoxesDiv.classList.remove("not-display-this");
        // messageBoxesDiv.classList.add("display-this");

        // messageSendDiv.style.display = 'block'
        // messageSendDiv.classList.add("display-top");

        userAddChatmateDiv.style.display = 'none'
        messageBoxesDiv.style.display = 'block'
        messageSendDiv.style.display = "block"

    }
}

const appHeight = () => {
    if(window.innerHeight > 575){
        userAddChatmateDiv.style.display = 'block'
        messageBoxesDiv.style.display = 'block'
        messageSendDiv.style.display = "block"

    }
    const doc = document.documentElement
    doc.style.setProperty('--app-height', `${window.innerHeight}px`)
  //  console.log(window.innerHeight)
}
window.addEventListener('resize', appHeight)
appHeight()


//info modal hid show
const cancelModel = document.querySelector(".cancel-model");
const modelInfo = document.querySelector(".model-info");

cancelModel.addEventListener("click", ()=>{
    modelInfo.classList.add("display-none");
})

currentUsernameElement.addEventListener("click", ()=>{
    document.querySelector(".info-username-div").innerHTML = current_user_username
    document.querySelector(".info-fullname-div").innerHTML = current_user_fullname
    modelInfo.classList.remove("display-none");
})

   
// const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
// console.log(Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0), "hi")
// if(Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) < 576){
//   //  console.log(vh);
//   //  console.log(messageBoxesDiv.style.height);

//     messageBoxesDiv.style.backgroundColor = "red";
//     userAddChatmateDiv.style.backgroundColor = 'black';

//     messageBoxesDiv.style.height = 100;
//     userAddChatmateDiv.style.height = vh - 250;
// }







// disconnectBotton.addEventListener("click", ()=>{
//     socket.disconnect();
//     window.close();
// })


// logoutButton.addEventListener("click", ()=>{
//     socket.disconnect();
//     // console.log("http://" + window.location.hostname + "/logout");
//     // window.location = "http://" + window.location.hostname + "/logout";

//       window.location = "http://" + window.location.hostname + ":3000/logout";
// })