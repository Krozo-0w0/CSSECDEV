//Routes
const { timeEnd, info } = require('console');
const responder = require('../models/Responder');
const fs = require('fs');
const session = require('express-session');
const { resourceLimits } = require('worker_threads');
const { Timestamp } = require('mongodb');



function dateToVerbose(inputDate){
    const dateObject = new Date(inputDate);

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const verboseDate = dateObject.toLocaleString('en-US', options);
    
    return verboseDate;

}

function dateToShortVerbose(inputDate){
    const dateObject = new Date(inputDate);

    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const verboseDate = dateObject.toLocaleString('en-US', options);

    return verboseDate;
}


function separateDateAndTime(dateTimeString) {
    const [datePart, timePart] = dateTimeString.split('|');
    const dateObject = new Date(datePart);
  
    const formattedDate = dateObject.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  
    const formattedTime = timePart.split(':').slice(0, 2).join(':'); // Removing seconds
  
    return { formattedDate, formattedTime };
}

function removeSeconds(timeString) {
    const [hours, minutes, seconds] = timeString.split(':');
    const formattedTime = `${hours}:${minutes}`;
    return formattedTime;
}

function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@dlsu\.edu\.ph$/;
    return emailRegex.test(email);
}

function add(server){
/******************insert controller code in this area, preferably new code goes at the bottom**************** */

const isValidNonNegativeNumber = (value) => {
    // Check if it's all digits
    if (!/^\d+$/.test(value)) return false;

    // Convert to number and check range
    const num = parseInt(value, 10);
    return num >= 0 && num <= 20;
};


server.use(session({
    secret: 'a secret fruit',
    saveUninitialized: false, 
    resave: false,
    cookie: {
        maxAge: 3 * 7 * 24 * 60 * 60 * 1000 // 3 weeks in milliseconds
    }
  }));


const isAuth = (allowedRoles) => {
    const rolesArray = Array.isArray(allowedRoles)
        ? allowedRoles
        : allowedRoles ? [allowedRoles] : [];

    return async (req, res, next) => {
        try {
            // 1. Unauthenticated users trying to access anything except "/"
            if (!req.session?.isAuth) {
                if (req.url === "/") return next();
                return errorPage(404, `Unknown user accessing ${req.url}`, req, res);
            }

            // 2. Authenticated users accessing login page → redirect
            if (req.url === "/") {
                return res.redirect('/mainMenu');
            }

            // 3. If role restrictions exist, validate from DB
            if (rolesArray.length > 0) {
                const user = await responder.getUserByEmail(req.session.curUserMail);

                if (!rolesArray.includes(user.role)) {
                    return errorPage(403, `Invalid Access: Tried to access ${req.url}`, req, res);
                }
            }

            // 4. All good
            return next();

        } catch (error) {
            return errorPage(500, error.message || error, req, res);
        }
    };
};




// LOGIN load login page 
server.get('/', isAuth(),function(req, resp){
    resp.render('login',{
      layout: 'loginIndex',
      title: 'Login Page'
    });
});

// REGISTER load register page
server.get('/register', function(req, resp){
    resp.render('register',{
      layout: 'registerIndex',
      title: 'Register Page'
    });
});

// Ajax that checks if the email is already registered by another user.
server.post('/email_checker', function(req, resp){
    var email  = String(req.body.email);

    if (!isValidEmail(email)){
        resp.send({taken : 2});
        return;
    }

    responder.isRegisteredUser(email)
    .then(booleanValue => {
        if (booleanValue){
            resp.send({taken : 1});
        } else {
            resp.send({taken : 0});
        }             
    }).catch(error => { errorPage(500, error, req, resp); });

 
});
// Ajax that checks if passwords match (Will update on password requirements in the future.)
server.post('/password_checker', function(req, resp){
    var password  = String(req.body.password);
    var vpassword = String(req.body.vpassword);

    if(password === vpassword){
        resp.send({match : 1})
    } else{
        resp.send({match: 0})
    }
});

//johans - add security questions 
// CHECK-REGISTER check if register info is valid, success => redirects to login, failure => rerender page
server.post('/register-checker', function(req, resp){
    var userEmail  = String(req.body.email);
    var userName  = String(req.body.username);
    var userPassword = String(req.body.password);
    var userVPassword = String(req.body.vpassword);
    var role = "roleB";

    if (userName.length > 15) {
        return resp.render('register',{
            layout: 'registerIndex',
            title: 'Register Page',
            emailErrMsg: 'Username must be 15 characters or less.'
        });
    }

    const securityQuestions = [
        {
            question: req.body.securityQuestion1,
            answer: req.body.securityAnswer1
        },
        {
            question: req.body.securityQuestion2,
            answer: req.body.securityAnswer2
        },
        {
            question: req.body.securityQuestion3,
            answer: req.body.securityAnswer3
        }
    ];

    for (let i = 0; i < securityQuestions.length; i++) {
        if (securityQuestions[i].answer.length > 200) {
            return resp.render('register', {
                layout: 'registerIndex',
                title: 'Register Page',
                emailErrMsg: 'Security answers must be 200 characters or less.'
            });
        }
    }

    for (let i = 0; i < securityQuestions.length; i++) {
        if (securityQuestions[i].question === "How many siblings do you have?") {
            const answer = securityQuestions[i].answer;
            if (!isValidNonNegativeNumber(answer)) {
                return resp.render('register',{
                    layout: 'registerIndex',
                    title: 'Register Page',
                    emailErrMsg: 'Security Answer "How many siblings do you have?" must be a non-negative number. and within (0-20)'
                });
            }
        }
    }

    const questionSet = new Set(securityQuestions.map(q => q.question));
    if (questionSet.size !== 3) {
        return resp.render('register',{
            layout: 'registerIndex',
            title: 'Register Page',
            emailErrMsg: 'Please select 3 distinct security questions.'
        });
    }

    responder.addUser(userEmail, userName, userPassword, userVPassword, role, securityQuestions)
    .then(result => {
        if (result == "Success!"){
            responder.addLogs(userEmail, role, `Success create new account.`, "Success");
            resp.redirect('/');
        } else {
            responder.addLogs(userEmail, role, `Failed Account Creation.`, "Fail");
            resp.render('register',{
                layout: 'registerIndex',
                title: 'Register Page',
                emailErrMsg: result
              });
        }               
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
});
async function errorPage(errorNum, error, req, resp) {
    let message = "";

    switch (errorNum) {
        case 400: message = "Bad Request. The data sent to the server was invalid."; break;
        case 401: message = "Unauthorized. You must be logged in to access this resource."; break;
        case 403: message = "Forbidden. You do not have permission to access this resource."; break;
        case 404: message = "Page Not Found. The resource you requested does not exist."; break;
        case 409: message = "Conflict. The request could not be completed due to a conflict."; break;
        case 429: message = "Too Many Requests. You are sending requests too quickly."; break;
        case 500: message = "Internal Server Error. Something went wrong on our end."; break;
        case 503: message = "Service Unavailable. The server is currently unavailable."; break;
        default: message = "Unknown Error Occurred.";
    }

    try {
        const user = await responder.getUserByEmail(req.session.curUserMail);
        const role = user?.role || "N/A";

        await responder.addLogs(
            req.session.curUserMail || "N/A",
            role,
            error,
            "Fail"
        );

    } catch (logErr) {
        await responder.addLogs("N/A", "N/A", error, "Fail");
    }

    // Render error page in both cases
    resp.render("error", {
        layout: "loginIndex",
        title: "Error Page",
        errNum: errorNum,
        errMess: message
    });
}



// johans - added lockout checker; if else lang yun
// CHECK-LOGIN check if login info is valid, success => redirects to main page, failure => rerender page
server.post('/login-checker', function(req, resp) {
    let userEmail = req.body.email;
    let userPassword = req.body.password;
    req.session.curUserMail = req.body.email;

    responder.verifyCredentials(userEmail, userPassword)
    .then(authResult => {
        if (authResult.valid && !authResult.user.locked) {
            // Store previous login info BEFORE updating
            const previousLoginTime = authResult.user.lastLogin;
            const previousLoginStatus = authResult.user.lastLoginStatus;
            
            // Update lastLogin in database for SUCCESSFUL login
            return responder.updateLastLogin(userEmail)
                .then(() => {
                    // Get the updated user data
                    return responder.getUserByEmail(userEmail)
                        .then(updatedUser => {
                            return {
                                success: true,
                                user: updatedUser,
                                previousLoginTime: previousLoginTime,
                                previousLoginStatus: previousLoginStatus
                            };
                        });
                });
        } else if (authResult.locked) {
            // Account is locked - update the database with failed attempt
            return responder.updateFailedLogin(userEmail)
                .then(() => {
                    responder.addLogs(userEmail, "N/A", `Account locked due to too many failed attempts`, "Fail");
                    return {
                        success: false,
                        locked: true,
                        message: 'Account locked. Please try again after 15 minutes.'
                    };
                });
        } else {
            // Failed login - update the database with failed attempt
            return responder.updateFailedLogin(userEmail)
                .then(() => {
                    responder.addLogs(userEmail, "N/A", `User Login Failed`, "Fail");
                    return {
                        success: false,
                        locked: false,
                        message: 'Invalid email and/or Password'
                    };
                });
        }             
    })
    .then(loginResult => {
        if (!loginResult) return; // Should not happen with current flow
        
        if (loginResult.success) {
            const { user, previousLoginTime, previousLoginStatus } = loginResult;
            
            responder.addLogs(userEmail, user.role, `User Login successfully`, "Success");
            req.session.isAuth = true;
            req.session.showLoginAlert = true;

            if(req.body.remember != 'on'){
                req.session.cookie.expires = false; 
            }

            // Store both current and previous login info
            req.session.lastLoginTime = previousLoginTime;
            req.session.lastLoginStatus = previousLoginStatus;
            req.session.curUserData = user;
            resp.redirect('/mainMenu');
        } else {
            // Handle failed login
            if (loginResult.locked) {
                resp.render('login', {
                    layout: 'loginIndex',
                    title: 'Login Page',
                    errMsg: loginResult.message
                });
            } else {
                resp.render('login', {
                    layout: 'loginIndex',
                    title: 'Login Page',
                    errMsg: loginResult.message
                });
            }
        }
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
});

// PROFILE 
server.get('/profile', isAuth(), function(req, resp) {
    responder.getReservedOfPerson( req.session.curUserData.email)
    .then(myReserves => {

        for (let i = 0; i < myReserves.length; i++){
            myReserves[i].bookDateVerbose = dateToVerbose(myReserves[i].bookDate);
            myReserves[i].bookDateShortVerbose = dateToShortVerbose(myReserves[i].bookDate);
            let dateAndTime = separateDateAndTime(myReserves[i].dateTime);
            myReserves[i].dateLogged = dateToVerbose(dateAndTime.formattedDate);
            myReserves[i].timeLogged = removeSeconds(dateAndTime.formattedTime);
        }

        resp.render('profile',{
            layout: 'profileIndex',
            title: 'Profile',
            user:  req.session.curUserData,
            reserves: myReserves
        });
       
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
});

//ABOUT PAGE
server.get('/about', isAuth(), function(req, resp) {
    resp.render('about', {
        layout: 'aboutIndex',
        title: 'About Page',
        user: req.session.curUserData
    });
})

// MAIN MENU 
server.get('/mainMenu', isAuth(), function(req, resp) {
    req.session.isLabs = true;

    console.log('req.session.showLoginStatus:', req.session.showLoginStatus);

    const showLoginStatus = req.session.showLoginAlert || false;
    req.session.showLoginAlert = false;

    responder.getUserByEmail(req.session.curUserMail)
    .then(user => {

        const lastLoginInfo = {
            lastLoginTime: req.session.lastLoginTime,
            lastLoginStatus: req.session.lastLoginStatus,
            currentLoginTime: new Date()
        };

        // Format the date
        if (lastLoginInfo.lastLoginTime) {
            try {
                const date = new Date(lastLoginInfo.lastLoginTime);
                lastLoginInfo.formattedTime = date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                lastLoginInfo.formattedTime = 'Invalid Date';
            }
        } else {
            lastLoginInfo.formattedTime = 'First login';
        }

        if(req.query.labs != null){
            let labs = [];
            labs = JSON.parse(req.query.labs);
            resp.render('mainMenu', {
                layout: 'mainMenuIndex',
                title: 'Main Menu',
                labs: labs,
                user:  req.session.curUserData,
                showLoginStatus: showLoginStatus,
                lastLoginInfo: lastLoginInfo
            });
        } else{
            // get lab data for display
            req.session.searchQuery = null;
            responder.getLabs()
            .then(labData => {
                let seenLabs = [];
                for (let i = 0; i < 3 && i < labData.length; i++){
                    seenLabs.push(labData[i]);
                }
                req.session.labPtr = seenLabs.length;

            if(user.role == "admin"){
                resp.render('mainMenuTech', {
                    layout: 'mainMenuIndexTech',
                    title: 'Main Menu Technician',
                    labs: seenLabs,
                    user:  req.session.curUserData,
                    showLoginStatus: showLoginStatus,
                    lastLoginInfo: lastLoginInfo
                });
            }else if(user.role == "roleA"){
                console.log("RoleA Main menu");
                resp.render('mainMenu-role-A', {
                    layout: 'mainMenuIndex-role-A',
                    title: 'Main Menu Role A',
                    labs: seenLabs,
                    user:  req.session.curUserData,
                    showLoginStatus: showLoginStatus,
                    lastLoginInfo: lastLoginInfo
                });
            }else{
                console.log("RoleB Main menu");
                resp.render('mainMenu', {
                    layout: 'mainMenuIndex',
                    title: 'Main Menu',
                    labs: seenLabs,
                    user:  req.session.curUserData,
                    showLoginStatus: showLoginStatus,
                    lastLoginInfo: lastLoginInfo
                });
            }     
        })
        .catch(error => {
            console.error(error);
        });
        }
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
});

// delete profile
server.post('/deleteProfile', isAuth(), function(req, resp){
    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.addLogs(req.session.curUserMail, user.role, `User Deleted.`, "Success");
    }).catch(error => {
        errorPage(500, error, req, resp);
    });
    responder.deleteProfile(req.session.curUserMail).then(function(){
        console.log("Profile delete success");
        req.session.destroy((err) => {
            if(err) throw err;
            resp.redirect('/');
        });
    }).catch(error => {
        errorPage(500, error, req, resp);
    });
});

// MAIN PAGE: NEXT BUTTON AJAX
server.post('/nextBtn', function(req, resp) {
    responder.getLabs()
    .then(labData => {
        
        if ( req.session.labPtr < labData.length){
            req.session.seenLabs = [];
            i =  req.session.labPtr;
            while (i <  req.session.labPtr+3 && i < labData.length){
                req.session.seenLabs.push(labData[i]);
                i++;
            }
             req.session.labPtr = i;
        }
        resp.send({labs:  req.session.seenLabs});
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
    
})

// MAIN PAGE: BACK BUTTON AJAX
server.post('/backBtn', function(req, resp) {
    responder.getLabs()
    .then(labData => {
        
        if ( req.session.labPtr -  req.session.seenLabs.length > 0){
             req.session.labPtr -=  req.session.seenLabs.length;
            req.session.seenLabs = [];
            
            i =  req.session.labPtr-3;
            while (i <  req.session.labPtr && i < labData.length){
                req.session.seenLabs.push(labData[i]);
                i++;
            }
        }
        resp.send({labs:  req.session.seenLabs});
        
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
    
})

//** Please keep new codes below this line, so its easier to append changes in the future. */

// EDIT-PROFILE
server.get('/edit-profile', isAuth(), function(req, resp) {
    resp.render('edit-profile',{
        layout: 'profileIndex',
        title: 'Edit Profile',
        user:  req.session.curUserData
    });
})

server.post('/deleteProfile', isAuth(), function(req, resp){
    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.addLogs(req.session.curUserMail, user.role, `User Deleted.`, "Success");
    }).catch(error => {
        errorPage(500, error, req, resp);
    });
    responder.deleteProfile( req.session.curUserMail).then(function(){
        console.log("Profile delete success");
        resp.redirect("/");
    }).catch(error => {
        errorPage(500, error, req, resp);
    });
});

// MAIN PAGE: SIDEBAR PEOPLE
server.post('/load-people', isAuth(), function(req, resp){
    if( req.session.searchQuery != null){
        responder.userSearch( req.session.searchQuery.slice(0, 256))
        .then(users => {
            resp.send({users:users,searchQuery :  req.session.searchQuery.slice(0, 256)});
        }).catch(error => {
        errorPage(500, error, req, resp);
    });
    } else{
        responder.getAllUsers()
        .then(users => {
            resp.send({users: users, searchQuery: "What are you looking for?"});
        })
        .catch(error => {
        errorPage(500, error, req, resp);
    });
    }
})

server.post('/load-labs', isAuth(), function(req, resp){
    if( req.session.searchQuery != null){
        responder.labSearch( req.session.searchQuery.slice(0, 256))
        .then(labs => {
            resp.send({labs:labs, searchQuery :  req.session.searchQuery.slice(0, 256)});
        }).catch(error => {errorPage(500, error, req, resp);});
    } else{
        responder.getLabs()
        .then(labs => {
            resp.send({labs: labs, searchQuery: "What are you looking for?"});
        }).catch(error => {errorPage(500, error, req, resp);});
    }
})


server.post('/load-labsbyTags', isAuth(), function(req, resp){
    if( req.session.searchQuery != null){
        responder.tagSearch( req.session.searchQuery.slice(0, 256))
        .then(labs => {
            resp.send({labs:labs, searchQuery : req.session.searchQuery.slice(0, 256)});
        }).catch(error => {errorPage(500, error, req, resp);});
    } else{
        responder.getLabs()
        .then(labs => {
            resp.send({labs: labs, searchQuery: "What are you looking for?"});
        }).catch(error => {errorPage(500, error, req, resp);});
    }
})


// PUBLIC PROFILE
server.get('/public-profile/:id/', isAuth(), function(req, resp) {
    req.session.isLabs = false;
 
    responder.getUserbyId(req.params.id)
    .then(userPublic => {
        if (userPublic.email ==  req.session.curUserData.email){
            resp.redirect('/profile');
        } else {
            resp.render('public-profile',{
                layout: 'profileIndex',
                title: userPublic.username,
                userPublic: userPublic,
                user:  req.session.curUserData
                });
        }
    }).catch(error => {errorPage(500, error, req, resp);});
})

// CHANGE USERNAME
server.post('/change_username', isAuth(), function(req, resp){
    var username  = String(req.body.username);
    var email =  req.session.curUserData.email;

    if (username.length > 15) {
        return resp.send({username : req.session.curUserData.username, error: 'Username must be 15 characters or less.'});
    }

    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.addLogs(req.session.curUserMail, user.role,
             `Username Changed from ${user.username} to ${username}`, "Success");
    }).catch(error => {errorPage(500, error, req, resp);});

    responder.changeUsername( req.session.curUserData.email,req.body.username)
    .then(booleanValue=>{
        if(booleanValue == true){
            console.log("UsernameChangeSuccess");
            responder.getUserByEmail(email)
            .then(user=>{
                 req.session.curUserData = user;
            }).catch(error => {errorPage(500, error, req, resp);});
            resp.send({username : username});
        } else{
            console.log("UsernameChangeFail");
            responder.addLogs(req.session.curUserMail, user.role,`Username Changed failed.`, "Fail");
        }
    }).catch(error => {errorPage(500, error, req, resp);});
});

// CHANGE PASSWORD
server.post('/change_password', isAuth(), function(req, resp){

    var password = String(req.body.password);
    var vpassword = String(req.body.vpassword);

    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.changePassword( req.session.curUserData.email,req.body.password,req.body.vpassword)
        .then(booleanValue =>{
            if(booleanValue == true){
                responder.addLogs(req.session.curUserMail, user.role,`User Password Changed Successfully`, "Success");
                console.log("PasswordChangeSuccess");
                resp.send({message : "Password Change Success!"});
            } else{
                responder.addLogs(req.session.curUserMail, user.role,`User Password Change Failed`, "Fail");
                console.log("PasswordChangeFail");
                resp.send({message : "Password Change Failed!"});
            }
        }).catch(error => {errorPage(500, error, req, resp);});
    }).catch(error => {errorPage(500, error, req, resp);});
});

// LAB VIEW
server.get('/labs/:id/', isAuth(), function(req, resp) {
    console.log('LAB ID OF ' + req.params.id + '!!!!');
    req.session.curLabId = req.params.id;
    let roomReservations = [];
    let room = [];

    console.log("mail: " +  req.session.curUserMail)

    responder.getLabById(req.params.id)
    .then(curLab => {
        responder.getUserByEmail( req.session.curUserMail)
        .then(name => {
            responder.getTimeslots(curLab, getCurrentDate())
            .then(dateData => {

                dateData = sortByStartTime(dateData);

                let timeFrame;

                if(dateData.length != 0){
                    timeFrame = dateData[0].timeStart + "-" + dateData[0].timeEnd;
                } 

                responder.getReservedYours(curLab, name, timeFrame)
                .then(reserveUser => {
                        responder.getReservedAll(curLab, getCurrentDate(), timeFrame)
                        .then(reserveList => {
                            responder.getReservedAll2(curLab, getCurrentDate())
                            .then(reserveListAll => {
                                // Access the resolved data here and extract room values
                                reserveList = reserveList.map(entry => entry.seat);
                                room = reserveList.map(entry => entry.room);
                                
                                //for the current user reservation
                                reserveUser = reserveUser.map(entry => entry.seat);
                                roomUser = reserveUser.map(entry => entry.room);

                                if(name.role == "admin"){
                                    resp.render('lab-view-tech', {
                                        layout: 'labIndex-tech',
                                        title: 'Lab View Tech',
                                        user:  req.session.curUserData,
                                        lab: curLab,
                                        reserved: reserveList,
                                        userRes: reserveUser,
                                        dateData: dateData,
                                        date: getCurrentDate(),
                                        resData: reserveListAll
                                    });
                                }else if (name.role == "roleA"){
                                    resp.render('lab-view-role-A', {
                                        layout: 'labIndex-role-A',
                                        title: 'Lab View Role A',
                                        user:  req.session.curUserData,
                                        lab: curLab,
                                        reserved: reserveList,
                                        userRes: reserveUser,
                                        dateData: dateData,
                                        date: getCurrentDate(),
                                        resData: reserveListAll
                                    });
                                }else{
                                    resp.render('lab-view', {
                                        layout: 'labIndex',
                                        title: 'Lab View',
                                        user:  req.session.curUserData,
                                        lab: curLab,
                                        reserved: reserveList,
                                        userRes: reserveUser,
                                        dateData: dateData,
                                        date: getCurrentDate()
                                    });
                                }
                            }).catch(error => { errorPage(500, error, req, resp); });
                            
                        }).catch(error => { errorPage(500, error, req, resp); });
                    })
                }).catch(error => { errorPage(500, error, req, resp); });

            })
            .catch(error => { errorPage(500, error, req, resp); });


    })
    .catch(error => { errorPage(500, error, req, resp); });

})

server.post('/labdetails', isAuth(), function(req, resp){

    responder.getLabByName(req.body.roomNum)
    .then(curLab => {
        resp.send({lab: curLab});

    }).catch(error => { errorPage(500, error, req, resp); });
});


server.post("/modal", isAuth(), function(req, resp){
    responder.getLabByName(req.body.roomNum)
    .then(curLab => {
        responder.getReservedAll(curLab, req.body.date, req.body.timeFrame)
        .then(reservations =>{
            responder.getUserByEmail( req.session.curUserMail)
            .then(user => {

                let modal = 'A';
                let name;
                
                for(let i = 0; i < reservations.length; i++){
                    //if current seat is reserved
                    if(reservations[i]["seat"] == String(req.body.seat)){
                        
                        name = reservations[i].name;

                        //if cur user is the one that reserved
                        if(reservations[i].email == user.email){
                            //if anonymous
                            if(reservations[i].anon){
                                modal = 'E';
                            }else{
                                modal = 'D';
                            }
                        }else if(reservations[i].isWalkin){
                            if(reservations[i].anon){
                                modal = 'C';
                            }else{
                                modal = 'F';
                            }
                        }else{
                            if(reservations[i].anon){
                                modal = 'C';
                            }else{
                                modal = 'B';
                            }
                        }
                    }
                }

                
                responder.getUserByName(name)
                .then(user2 => {
                    resp.send({modal, name, user: user2});

                }).catch(error => { errorPage(500, error, req, resp); });
            })
            .catch(error => { errorPage(500, error, req, resp); });
        })
        .catch(error => { errorPage(500, error, req, resp); });
    })
    .catch(error => { errorPage(500, error, req, resp); });
});


server.post("/modalTech", isAuth(), function(req, resp){
    responder.getLabByName(req.body.roomNum)
    .then(curLab => {
        responder.getReservedAll(curLab, req.body.date, req.body.timeFrame)
        .then(reservations =>{
            responder.getUserByEmail( req.session.curUserMail)
            .then(user => {

                let modal = 'A';
                let name;
                
                for(let i = 0; i < reservations.length; i++){
                    //if current seat is reserved
                    if(reservations[i]["seat"] == String(req.body.seat)){
                        
                        name = reservations[i].name;

                        //if cur user is tech user
                        if(reservations[i].isWalkin){
                            //if anonymous
                            if(reservations[i].anon){
                                modal = 'E';
                            }else{
                                modal = 'D';
                            }
                        }else{
                            if(reservations[i].anon){
                                modal = 'C';
                            }else{
                                modal = 'B';
                            }
                        }
                    }
                }

                
                responder.getUserByName(name)
                .then(user2 => {
                    resp.send({modal, name, user: user2});

                })
                .catch(error => { errorPage(500, error, req, resp); });
            })
            .catch(error => { errorPage(500, error, req, resp); });
        })
        .catch(error => { errorPage(500, error, req, resp); });
    })
    .catch(error => { errorPage(500, error, req, resp); });
});

server.post('/reserve', isAuth(), async function(req, resp){
    try {
        const currentDate = new Date();
        const date = getCurrentDate();
        const time = `${String(currentDate.getHours()).padStart(2,'0')}:${String(currentDate.getMinutes()).padStart(2,'0')}:${String(currentDate.getSeconds()).padStart(2,'0')}`;

        const user = await responder.getUserByEmail(req.session.curUserMail);
        const reserving = await responder.getUserByEmail(req.body.email);

        const seat = String(req.body.seat);
        const room = String(req.body.room);
        const timeFrame = String(req.body.timeFrame);
        const anon = req.body.anon === 'true';
        const resDate = req.body.date;
        const walkin = user.role === "admin" || user.role === "roleA";

        const roomData = await responder.getLabByName(room);

        const match = seat.match(/^C(\d+)S(\d+)$/i);
        if (!match) return resp.send({status: "Failed", reserve: null});

        const cNumber = parseInt(match[1], 10);
        const sNumber = parseInt(match[2], 10);

        if (cNumber < 1 || cNumber > roomData.numCols) return resp.send({status: "Failed", reserve: null});
        if (sNumber < 1 || sNumber > parseInt(roomData.seats)) return resp.send({status: "Failed", reserve: null});

        let name;

        if (walkin) {
            if (!reserving) {
                await responder.addLogs(req.session.curUserMail, user.role, `User reserve failed unknown email used`, "Fail");
                return resp.send({status: "failed", reserve: null});
            }
            name = reserving.username;
            await responder.addLogs(req.session.curUserMail, user.role, `User reserved for ${reserving.email} seat:${seat} room:${room} anon:${anon} walkin:${walkin}`, "Success");
            await responder.addReservation(`${date}|${time}`, name, req.body.email.slice(0, 256), resDate, seat, room, timeFrame, anon, walkin);
        } else {
            name = user.username;
            await responder.addLogs(req.session.curUserMail, user.role, `User reserved for ${user.email} seat:${seat} room:${room} anon:${anon} walkin:${walkin}`, "Success");
            await responder.addReservation(`${date}|${time}`, name, user.email, resDate, seat, room, timeFrame, anon, walkin);
        }

        const obj = {
            dateTime: `${date}|${time}`,
            name,
            email: req.body.email,
            bookDate: resDate,
            seat,
            room,
            timeFrame,
            anon,
            status: "active",
            isWalkin: walkin
        };

        console.log(obj);
        return resp.send({status: "reserved", reserve: obj});

    } catch (error) {
        return errorPage(500, error, req, resp); // only one response here
    }
});


server.post('/getTimeFrames', function(req, resp){

    if(req.session.isAuth){
        responder.getLabById( req.session.curLabId)
        .then(curLab => {
            responder.getTimeslots(curLab, req.body.date)
            .then(dateData => { 
                resp.send({dateData : dateData});
                    
            })
            .catch(error => { errorPage(500, error, req, resp); });
    
        })
        .catch(error => { errorPage(500, error, req, resp); });
    }else{
        resp.redirect('/');
    }

})

server.post('/dateChange', function(req, resp){
    let roomReservations = [];
    let room = [];
    let timeFrame;


    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getUserByEmail( req.session.curUserMail)
        .then(name => {
            responder.getTimeslots(curLab, req.body.date)
            .then(dateData => {
                dateData = sortByStartTime(dateData);

                if(dateData.length != 0){
                    if(req.body.changed == 1){
                        timeFrame = dateData[0].timeStart + "-" + dateData[0].timeEnd;
                    }else {
                        timeFrame = req.body.timeFrame;
                    }
                }

                responder.getReservedYours(curLab, name, timeFrame)
                .then(reserveUser => {
                        responder.getReservedAll(curLab, String(req.body.date), timeFrame)
                        .then(reserveList => { 
                            responder.getReservedAll2(curLab, String(req.body.date), timeFrame)
                            .then(reserveListAll => {
                                // Access the resolved data here and extract room values
                                reserveList = reserveList.map(entry => entry.seat);
                                room = reserveList.map(entry => entry.room);

                                //for the current user reservation
                                reserveUser = reserveUser.map(entry => entry.seat);
                                roomUser = reserveUser.map(entry => entry.room);
                                

                                if(name.role == "admin"){
                                    resp.send({
                                        user:  req.session.curUserData,
                                        lab: curLab,
                                        reserved: reserveList,
                                        userRes: reserveUser,
                                        dateData: dateData,
                                        date: req.body.date,
                                        resData: reserveListAll
                                    });
                                }else if(name.role == "roleA"){
                                    resp.send({
                                        user:  req.session.curUserData,
                                        lab: curLab,
                                        reserved: reserveList,
                                        userRes: reserveUser,
                                        dateData: dateData,
                                        date: req.body.date,
                                        resData: reserveListAll
                                    });
                                }else{
                                    resp.send({
                                        user:  req.session.curUserData,
                                        lab: curLab,
                                        reserved: reserveList,
                                        userRes: reserveUser,
                                        dateData: dateData,
                                        date: req.body.date
                                    });
                                }
                            })
                            .catch(error => { errorPage(500, error, req, resp); });
                        })
                        .catch(error => { errorPage(500, error, req, resp); });
                })
                .catch(error => { errorPage(500, error, req, resp); });

            })
            .catch(error => { errorPage(500, error, req, resp); });

        })
        .catch(error => {
            errorPage(500, error, req, resp);
        });


    })
    .catch(error => { errorPage(500, error, req, resp); });
});

server.get('/modifyLab', isAuth(["admin", "roleA"]), function(req, resp){
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getTimeslots(curLab, getCurrentDate())
        .then(dateData => {
            resp.render('modifyLab', {
                layout: 'modifyLabIndex',
                title: 'Modify Laboratory',
                date: getCurrentDate(),
                timeFrame: dateData
            });
        })
        .catch(error => { errorPage(500, error, req, resp); });
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
});

server.get('/manageRoles', isAuth("admin"), function(req, resp){
    responder.getAllUsers()
    .then(nonAdmin => {
        resp.render('manageRolesTech', {
        layout: 'manageRolesIndexTech',
        title: 'Manage Technician',
        date: getCurrentDate(),
        resData: nonAdmin
    });
    }).catch(error => { errorPage(500, error, req, resp); });
});

server.get('/viewLogs', isAuth("admin"), function(req, resp){

    responder.getLogs()
        .then(logs => {
            resp.render('viewLogs', {
            layout: 'viewLogs',
            title: 'View Logs',
            resData: logs
        });
    }).catch(error => { errorPage(500, error, req, resp); }); 

});

server.post('/filterLogs', isAuth("admin"), function (req, resp) {

    const { email, action, status, fromDate, toDate, role } = req.body;

    responder.filterLogs(email.slice(0, 256), action.slice(0, 256), role, status, fromDate, toDate)
        .then(logs => {
            resp.send({ log: logs });
        })
        .catch(err => {
            errorPage(500, err, req, resp);
    });
});


server.post('/changeModifyLab', isAuth(["admin", "roleA"]),function(req, resp){
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getTimeslots(curLab, req.body.date)
        .then(dateData => {
            resp.send({dateData: dateData});
        })
        .catch(error => { errorPage(500, error, req, resp); });
    })
    .catch(error => {
        errorPage(500, error, req, resp);
    });
});
// ADD NEW LINES BELOW HERE

function getCurrentDate(){
    //date
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    return date;
}

function sortByStartTime(array) {
    return array.sort((a, b) => {
        const timeA = new Date(`1970-01-01T${a.timeStart}`);
        const timeB = new Date(`1970-01-01T${b.timeStart}`);
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;
        return 0;
    });
}

server.post('/save-profile', isAuth(), function(req, resp){
    var username = String(req.body.username);
    var bio = String(req.body.bio);
    
    // Add username length validation
    if (username.length > 15) {
        return resp.render('edit-profile',{
            layout: 'profileIndex',
            title: 'Edit Profile',
            user: req.session.curUserData,
            errMsg: 'Username must be 15 characters or less.'
        });
    }

    if (bio.length > 1500) {
        return resp.render('edit-profile',{
            layout: 'profileIndex',
            title: 'Edit Profile',
            user: req.session.curUserData,
            errMsg: 'Bio must be 150 characters or less.'
        });
    }

    console.log('%d', bio.length);

    responder.updateProfile( req.session.curUserData.email, req.body.username, req.body['prof-pic'], req.body.bio)
    .then(whatever => {
        responder.getUserByEmail( req.session.curUserData.email)
        .then(user => {
            responder.addLogs(req.session.curUserMail, user.role,`Profile Saved`, "Success");
             req.session.curUserData = user;
            resp.redirect('/profile')
        })
        .catch(error => { errorPage(500, error, req, resp); });

    })
    .catch(error => { errorPage(500, error, req, resp); });

});

server.post('/searchFunction', isAuth(), function (req, resp) {
    const searchString = req.body.stringInput.slice(0, 256);
    req.session.searchQuery = searchString;
    responder.roomSearch(searchString)
        .then(searchQueryResults => {
            let seenLabs = [];
            for (let i = 0; i < 3 && i < searchQueryResults.length; i++) {
                seenLabs.push(searchQueryResults[i]);
            }

            // Redirect to /mainMenu with query parameters
            resp.redirect('/mainMenu?labs=' + encodeURIComponent(JSON.stringify(seenLabs)));

        })
        .catch(error => { errorPage(500, error, req, resp); });
});

server.get('/editReservation', isAuth(), function (req, resp) {
    responder.getLabByName(req.query.roomNum)
    .then(lab => {
        resp.redirect('/labs/' + lab._id);            
    })
    .catch(error => { errorPage(500, error, req, resp); });
});

server.post('/removeReservation', isAuth(), function (req, resp) {
    responder.removeReservation(req.body.date, req.body.timeFrame, req.body.seat, req.body.room)
    .then(result =>{
        responder.getUserByEmail(req.session.curUserMail).then(user=> {
            responder.addLogs(req.session.curUserMail, user.role,`Reservation Removed successfully seat:${req.body.seat} room:${req.body.room}`, "Success");
        }).catch(error => { errorPage(500, error, req, resp); });
        
        console.log('success update reservation');
        resp.send({stats: 'success'});
    })
    .catch(error => {
        responder.getUserByEmail(req.session.curUserMail).then(user=> {
            responder.addLogs(req.session.curUserMail, user.role,`Reservation Removed Failed seat:${req.body.seat} room:${req.body.room}`, "Fail");
        }).catch(error => { errorPage(500, error, req, resp); });
        errorPage(500, error, req, resp);
    });
});

server.get('/logout', isAuth(), function (req, resp) {
    const userEmail = req.session.curUserMail;
    responder.getUserByEmail(userEmail).then(user=> {
        responder.addLogs(userEmail, user.role,`User logout`, "Success");
    }).catch(error => { errorPage(500, error, req, resp); });
     req.session.curUserData = null;
    req.session.destroy((err) => {
        if(err) throw err;
        resp.redirect('/');
    });
});

server.post('/addTimeFrame', isAuth(["admin", "roleA"]), function(req, resp){
    const date = req.body.date;
    const timeStart = req.body.timeStart;
    const timeEnd = req.body.timeEnd;

    var valid = true;


    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getAllTimeSlots(curLab.roomNum, date).then(function(timeSlots){

            for(let i = 0; i < timeSlots.length; i++){
                
                if(isTimeOutsideFrame(timeStart, timeSlots[i].timeStart, timeSlots[i].timeEnd)){
                    valid = false;
                }
            }

            if(valid){
                responder.getUserByEmail(req.session.curUserMail).then(user=> {
                    responder.addLogs(req.session.curUserMail, user.role,`User added new time frame room:${curLab.roomNum} timestart:${timeStart} timeend:${timeEnd} date${date}`, "Success");
                }).catch(error => { errorPage(500, error, req, resp); });
                responder.addSchedule(timeStart, timeEnd, date, curLab.roomNum, curLab.seats * curLab.numCols)
                resp.send({stat: "success"});
            }else{
                responder.getUserByEmail(req.session.curUserMail).then(user=> {
                    responder.addLogs(req.session.curUserMail, user.role,`User failed adding new time frame room:${curLab.roomNum} timestart:${timeStart} timeend:${timeEnd} date${date}`, "Fail");
                }).catch(error => { errorPage(500, error, req, resp); });
                resp.send({stat: "fail"});
            }
        })
    }).catch(error => { errorPage(500, error, req, resp); });


});

server.post("/deleteTimeFrame", isAuth("admin", "roleA"), function(req, resp){
    const date = req.body.date;
    const timeStart = req.body.timeStart;
    const timeEnd = req.body.timeEnd;
    
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getUserByEmail(req.session.curUserMail).then(user=> {
            responder.addLogs(req.session.curUserMail, user.role,`Lab ${curLab.roomNum} timesFrame ${timeStart}-${timeEnd} Deleted`, "Success");
        }).catch(error => { errorPage(500, error, req, resp); });
        responder.removeTimeFrame(timeStart, timeEnd, date, curLab.roomNum);
        resp.send({stat: "success"});
    }).catch(error => { errorPage(500, error, req, resp); });

});



//automatic completed a reservation if its pass the endtime
function completeReservation(){
    responder.getReservationDB().then(function(reservations){
        for(let i = 0; i < reservations.length; i++){   
            let time = reservations[i].timeFrame.split("-");

            if(isDateTimeEarlierThanNow(reservations[i].bookDate, time[1])){

                if(reservations[i].status === 'active'){
                    responder.completeReservation(reservations[i].bookDate, reservations[i].timeFrame, reservations[i].seat, reservations[i].room).then(function(val){

                    })
                }

            }
        }
    }).catch(error => { errorPage(500, error, req, resp); });
    
}
setInterval(completeReservation, 10000);


server.post('/checkReserve', isAuth(), function(req, resp){
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getStatusSeat(curLab.roomNum, req.body.seat, req.body.timeFrame, req.body.date).then(function(result){
            if(result == null){
                resp.send({status: 'avail'});
            }else{
                resp.send({status: 'unavail'})
            }
        }).catch(error => { errorPage(500, error, req, resp); });
    }).catch(error => { errorPage(500, error, req, resp); });
});

server.post('/loadReserve', isAuth(), function(req, resp){

    if(req.session.isAuth){
        const time = req.body.time;
        const date = req.body.date;

        responder.getLabById(req.session.curLabId).then(function(lab){

            responder.getReservedAll(lab, date, time).then(function(reservation){
                responder.getReservedAll2(lab, date).then(function(resData){
                    resp.send({reservation, resData, lab});
                }).catch(error => { errorPage(500, error, req, resp); });

            }).catch(error => { errorPage(500, error, req, resp); });

        }).catch(error => { errorPage(500, error, req, resp); });
    } else{
        console.log('check');
        resp.send({status: "lol"});
    }
    
});


//automatic completed a reservation if its pass the endtime
function completeReservation(){
    responder.getReservationDB().then(function(reservations){
        for(let i = 0; i < reservations.length; i++){   
            let time = reservations[i].timeFrame.split("-");

            if(isDateTimeEarlierThanNow(reservations[i].bookDate, time[1])){

                if(reservations[i].status === 'active'){
                    responder.completeReservation(reservations[i].bookDate, reservations[i].timeFrame, reservations[i].seat, reservations[i].room).then(function(val){

                    }).catch(error => { errorPage(500, error, req, resp); });
                }

            }
        }
    }).catch(error => { errorPage(500, error, req, resp); });
    
}
setInterval(completeReservation, 10000);


server.post('/checkReserve', isAuth(), function(req, resp){
    responder.getLabById(req.session.curLabId)
    .then(curLab => {
        responder.getStatusSeat(curLab.roomNum, req.body.seat, req.body.timeFrame, req.body.date).then(function(result){
            if(result == null){
                resp.send({status: 'avail'});
            }else{
                resp.send({status: 'unavail'})
            }
        }).catch(error => { errorPage(500, error, req, resp); });
    }).catch(error => { errorPage(500, error, req, resp); });
});


function isDateTimeEarlierThanNow(dateString, timeString) {
    var [hours, minutes] = timeString.split(':').map(Number);
    var [year, month, day] = dateString.split('-').map(Number);
    var dateTimeToCheck = new Date(year, month - 1, day, hours, minutes);
    var currentDate = new Date();
    return dateTimeToCheck < currentDate;
}

function isDateTimeEarlierThanNow(dateString, timeString) {
    var [hours, minutes] = timeString.split(':').map(Number);
    var [year, month, day] = dateString.split('-').map(Number);
    var dateTimeToCheck = new Date(year, month - 1, day, hours, minutes);
    var currentDate = new Date();
    return dateTimeToCheck < currentDate;
}

function isTimeOutsideFrame(time, startTime, endTime) {
    // Parse the given time, start time, and end time
    var timeParts = time.split(":");
    var timeHours = parseInt(timeParts[0]);
    var timeMinutes = parseInt(timeParts[1]);
    
    var startParts = startTime.split(":");
    var startHours = parseInt(startParts[0]);
    var startMinutes = parseInt(startParts[1]);
    
    var endParts = endTime.split(":");
    var endHours = parseInt(endParts[0]);
    var endMinutes = parseInt(endParts[1]);
    
    // Convert all times to minutes for easier comparison
    var currentTimeInMinutes = timeHours * 60 + timeMinutes;
    var startTimeInMinutes = startHours * 60 + startMinutes;
    var endTimeInMinutes = endHours * 60 + endMinutes;
    
    // Check if the given time falls within the time frame
    if (startTimeInMinutes <= currentTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
        return true; // Time falls within the frame
    } else {
        return false; // Time falls outside the frame
    }
}

server.post('/assign_role', isAuth("admin"), function(req, resp){
    const email = req.body.email;
    const newRole = req.body.role;

    console.log(email);
    console.log(newRole);

    responder.getUserByEmail( req.session.curUserMail)
    .then(user=>{
        responder.updateRole(email, newRole)
        .then(result => {
            if(result){
                responder.addLogs(req.session.curUserMail, user.role,`User assigned new role: ${newRole} to user ${email}`, "Success");
                resp.send({status: "success"});
            }else{
                responder.addLogs(req.session.curUserMail, user.role,`User Failed to assign new role: ${newRole} to user ${email}`, "Fail");
                resp.send({status: "error"});
            }
        });
    })
    .catch(error => { errorPage(500, error, req, resp); });
});

server.post("/deleteUser", isAuth(), async (req, resp) => {
    try {
        const curuser = req.session.curUserMail;
        const adminPassword = req.body.adminPassword;
        const targetEmail = req.body.email;

        const user = await responder.getUserByEmail(curuser);

        const authResult = await responder.verifyCredentials(curuser, adminPassword);
        if (!authResult.valid) {
            await responder.addLogs(curuser, user.role, `Incorrect Password to delete user ${targetEmail}`, "Fail");
            return resp.send({ status: "error2" });
        }

        let result;
        if(user.role === "admin" && targetEmail){
            result = await responder.deleteProfile(targetEmail);
        } else {
            result = await responder.deleteProfile(curuser);
        }

        if (result) {
            // Respond differently for self-delete vs admin-delete
            if (user.role === "admin" && targetEmail) {
                await responder.addLogs(curuser, user.role, `User deleted user ${targetEmail}`, "Success");
                if(targetEmail === curuser){
                    req.session.destroy((err) => {
                        if (err) console.error("Session destroy error:", err);
                    });
                    return resp.send({ status: "success2" });
                }

                return resp.send({ status: "success" });
            } else {
                await responder.addLogs(curuser, user.role, `User deleted user deleted their account`, "Success");
                req.session.destroy((err) => {
                    if (err) console.error("Session destroy error:", err);
                });
                return resp.send({ status: "success" }); // frontend will redirect
            }

        } else {
            await responder.addLogs(curuser, user.role, `User failed to delete user ${targetEmail}`, "Fail");
            return resp.send({ status: "error" });
        }

    } catch (error) {
        console.error("🔥 Error in deleteUser:", error);
        return errorPage(500, error, req, resp);
    }
});


//johans - forgot password route
server.get('/forgot-password', function(req, res) {
  res.render('forgot-password', {
    layout: 'loginIndex',
    title: 'Forgot Password'
  });
});

//johans - forgot password initiation
server.post('/forgot-password-init', async function(req, res) {
  const email = req.body.email;
  
  try {
    const user = await responder.getUserByEmail(email);
    if (!user) {
        responder.addLogs(email, 'N/A', 'Forgot Password: Email not found', 'Fail');
      return res.render('forgot-password', {
        layout: 'loginIndex',
        title: 'Forgot Password',
        errMsg: 'Email not found. Please check your email address.'
      });
    }

    if (!user.securityQuestions || user.securityQuestions.length < 2) {
        responder.addLogs(email, user.role, 'Forgot Password: No security Questions', 'Fail');
      return res.render('forgot-password', {
        layout: 'loginIndex',
        title: 'Forgot Password',
        errMsg: 'No security questions set for this account. Please contact administrator.'
      });
    }

    // Check if account is locked due to too many attempts
    if (user.passwordResetLockUntil && user.passwordResetLockUntil > Date.now()) {
      const lockTime = Math.ceil((user.passwordResetLockUntil - Date.now()) / (1000 * 60));
      responder.addLogs(email, user.role, 'Forgot Password: Account Locked', 'Fail');
      return res.render('forgot-password', {
        layout: 'loginIndex',
        title: 'Forgot Password',
        errMsg: `Account temporarily locked. Please try again in ${lockTime} minutes.`
      });
    }

    // Select 2 random security questions
    const randomQuestions = user.securityQuestions
      .sort(() => 0.5 - Math.random())
      .slice(0, 2);

    // Generate temporary token
    const token = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store token and questions in session or temporary storage
    req.session.passwordReset = {
      email: email,
      token: token,
      questions: randomQuestions,
      tokenExpiry: tokenExpiry,
      attempts: 0
    };
    
    res.render('forgot-password-questions', {
      layout: 'loginIndex',
      title: 'Security Questions',
      email: email,
      token: token,
      securityQuestions: randomQuestions,
      attemptsRemaining: 3 - req.session.passwordReset.attempts
    });

    } catch (error) {
        errorPage(500, error, req, res);
    }
});

server.post('/forgot-password-verify', async function(req, res) {
  const { email, token, securityAnswers } = req.body;
  const resetData = req.session.passwordReset;

  // Validate session data
  if (!resetData || resetData.email !== email || resetData.token !== token) {
    return res.redirect('/forgot-password');
  }

  // Check token expiry
  if (Date.now() > resetData.tokenExpiry) {
    req.session.passwordReset = null;
    responder.addLogs(email, "N/A", 'Forgot Password: Security token expired', 'Fail');
    return res.render('forgot-password', {
      layout: 'loginIndex',
      title: 'Forgot Password',
      errMsg: 'Security token expired. Please start over.'
    });
  }

  // Check attempt limit
  if (resetData.attempts >= 3) {
    // Lock the account for 15 minutes
    await responder.lockPasswordReset(email, 15 * 60 * 1000);
    req.session.passwordReset = null;
    responder.addLogs(email, "N/A", 'Forgot Password: Too many failed attempts. Account locked for 15 minutes', 'Fail');
    return res.render('forgot-password', {
      layout: 'loginIndex',
      title: 'Forgot Password',
      errMsg: 'Too many failed attempts. Account locked for 15 minutes.'
    });
  }

  try {
    const user = await responder.getUserByEmail(email);
    const providedAnswers = Array.isArray(securityAnswers) ? securityAnswers : [securityAnswers];
    
    // Verify answers
    const isVerified = await responder.verifySecurityQuestionsForReset(email, resetData.questions, providedAnswers);
    
    if (isVerified) {
        responder.addLogs(email, "N/A", 'Forgot Password: Security Answer Correct', 'Success');
      // Answers correct - proceed to password reset
      req.session.passwordReset.verified = true;
      req.session.passwordReset.verifiedAt = Date.now();
      
      res.render('forgot-password-reset', {
        layout: 'loginIndex',
        title: 'Reset Password',
        email: email,
        token: token
      });
    } else {
      // Answers incorrect
      req.session.passwordReset.attempts++;
      responder.addLogs(email, "N/A", `Forgot Password: Security Answer incorrect attempts${req.session.passwordReset.attempts}`, 'Fail');
      res.render('forgot-password-questions', {
        layout: 'loginIndex',
        title: 'Security Questions',
        email: email,
        token: token,
        securityQuestions: resetData.questions,
        attemptsRemaining: 3 - req.session.passwordReset.attempts,
        errMsg: 'One or more answers are incorrect. Please try again.'
      });
    }
    } catch (error) {
        errorPage(500, error, req, res);
    }
});

//johans - Forgot Password - Reset password
server.post('/forgot-password-reset', async function(req, res) {
  const { email, token, newPassword, confirmPassword } = req.body;
  const resetData = req.session.passwordReset;

  // Validate session and verification
  if (!resetData || !resetData.verified || resetData.email !== email || resetData.token !== token) {
    return res.redirect('/forgot-password');
  }

  // chinecheck verification was done within last 10 minutes
  if (Date.now() - resetData.verifiedAt > 10 * 60 * 1000) {
    responder.addLogs(email, "N/A", `Forgot Password: Reset Session expired`, 'Fail');
    req.session.passwordReset = null;
    return res.render('forgot-password', {
      layout: 'loginIndex',
      title: 'Forgot Password',
      errMsg: 'Reset session expired. Please start over.'
    });
  }

  try {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.render('forgot-password-reset', {
        layout: 'loginIndex',
        title: 'Reset Password',
        email: email,
        token: token,
        errMsg: 'Passwords do not match.'
      });
    }

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.render('forgot-password-reset', {
        layout: 'loginIndex',
        title: 'Reset Password',
        email: email,
        token: token,
        errMsg: 'Password does not meet strength requirements.'
      });
    }

    // ichecheck password reuse and change frequency
    const canChangePassword = await responder.canChangePassword(email, newPassword);
    if (!canChangePassword.allowed) {
        responder.addLogs(email, "N/A", `Forgot Password: ${canChangePassword.reason}`, 'Fail');
      return res.render('forgot-password-reset', {
        layout: 'loginIndex',
        title: 'Reset Password',
        email: email,
        token: token,
        errMsg: canChangePassword.reason
      });
    }

    // Update yung password
    const success = await responder.updatePasswordWithHistory(email, newPassword);
    
    if (success) {
      // Clear ang reset session
      req.session.passwordReset = null;
      
      // Log the action
      await responder.addLogs(email, 'N/A', 'Password reset via forgot password', 'Success');
      
      res.render('login', {
        layout: 'loginIndex',
        title: 'Login',
        errMsg: 'Password reset successful. Please login with your new password.'
      });
    } else {
      throw new Error('Password update failed');
    }

    } catch (error) {
        errorPage(500, error, req, res);
    }
});

// CHANGE PASSWORD FLOW - For authenticated users
server.get('/change-password-flow', isAuth(), function(req, res) {
  res.render('change-password', {
    layout: 'loginIndex',
    title: 'Change Password',
    user: req.session.curUserData
  });
});

// Verify current password
server.post('/change-password-verify-current', isAuth(), async function(req, res) {
  const { email, currentPassword } = req.body;
  const userEmail = req.session.curUserData.email;

  // Security: Ensure user can only verify their own password
  if (email !== userEmail) {
    responder.addLogs(email, "N/A", `Forgot Password: Invalid request`, 'Fail');
    return res.render('change-password', {
      layout: 'loginIndex',
      title: 'Change Password',
      user: req.session.curUserData,
      errMsg: 'Invalid request.'
    });
  }

  try {
    // Verify current password
    const user = await responder.getUser(email, currentPassword);
    
    if (user && !user.locked) {
      // Generate token for password change session
      const token = require('crypto').randomBytes(32).toString('hex');
      
      // Store in session with expiry
      req.session.passwordChange = {
        email: email,
        token: token,
        verifiedAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
      };

      res.render('change-password-reset', {
        layout: 'loginIndex',
        title: 'Change Password',
        email: email,
        token: token
      });
    } else {
      // Generic error message - don't reveal which part was wrong
      responder.addLogs(email, req.session.curUserData.role, 'Current password verification failed', 'Fail');
      res.render('change-password', {
        layout: 'loginIndex',
        title: 'Change Password',
        user: req.session.curUserData,
        errMsg: 'Invalid current password.'
      });
    }
    } catch (error) {
        errorPage(500, error, req, res);
    }
});

// Final password change
server.post('/change-password-final', isAuth(), async function(req, res) {
  const { email, token, newPassword, confirmPassword } = req.body;
  const changeData = req.session.passwordChange;
  const userEmail = req.session.curUserData.email;

  // Validate session and ownership
  if (!changeData || changeData.email !== email || changeData.token !== token || email !== userEmail) {
    return res.redirect('/change-password-flow');
  }

  // Check session expiry
  if (Date.now() > changeData.expiresAt) {
    req.session.passwordChange = null;
    return res.render('change-password', {
      layout: 'loginIndex',
      title: 'Change Password',
      user: req.session.curUserData,
      errMsg: 'Password change session expired. Please start over.'
    });
  }

  try {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return res.render('change-password-reset', {
        layout: 'loginIndex',
        title: 'Change Password',
        email: email,
        token: token,
        errMsg: 'Passwords do not match.'
      });
    }

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.render('change-password-reset', {
        layout: 'loginIndex',
        title: 'Change Password',
        email: email,
        token: token,
        errMsg: 'Password does not meet strength requirements.'
      });
    }

    // Check password reuse and change frequency
    const canChangeResult = await responder.canChangePassword(email, newPassword);
    if (!canChangeResult.allowed) {
        responder.addLogs(email, "N/A", `Forgot Password: ${canChangeResult.reason}`, 'Fail');
      return res.render('change-password-reset', {
        layout: 'loginIndex',
        title: 'Change Password',
        email: email,
        token: token,
        errMsg: canChangeResult.reason
      });
    }

    // Update password
    const success = await responder.updatePasswordWithHistory(email, newPassword);
    
    if (success) {
      // Clear session data
      req.session.passwordChange = null;
      
      // Log the action
      await responder.addLogs(email, req.session.curUserData.role, 'Password changed successfully via profile', 'Success');
      
      // Destroy session and redirect to login
      req.session.destroy((err) => {
        if(err) {
          console.error('Session destruction error:', err);
          // Still proceed with redirect
        }
        res.render('login', {
          layout: 'loginIndex',
          title: 'Login',
          errMsg: 'Password changed successfully. Please login with your new password.'
        });
      });
    } else {
      throw new Error('Password update failed');
    }

    } catch (error) {
        errorPage(500, error, req, res);
    }
});

// Prevent back navigation after password change using middleware
server.use('/change-password-flow', function(req, res, next) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', 0);
  next();
});

server.use((req, resp) => {
    errorPage(404, `Page Not Found: ${req.url}`, req, resp);
});

server.use((err, req, resp, next) => {
    console.error("🔥 Global Error Caught:", err.stack);
    errorPage(500, err.stack, req, resp);
});




/************************no need to edit past this point********************************* */
}

module.exports.add = add;
