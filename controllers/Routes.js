//Routes
const { timeEnd, info } = require('console');
const responder = require('../models/Responder');
const fs = require('fs');
const session = require('express-session');
const { resourceLimits } = require('worker_threads');
const { Timestamp } = require('mongodb');


const test = "blablabll";

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



server.use(session({
    secret: 'a secret fruit',
    saveUninitialized: false, 
    resave: false,
    cookie: {
        maxAge: 3 * 7 * 24 * 60 * 60 * 1000 // 3 weeks in milliseconds
    }
  }));

const isAuth = (req, res, next) => {
    if(req.session.isAuth){
        next();
    }else{
        res.redirect('/');  
    }
}

const isAuthLabs = (req, res, next) => {
    if(req.session.isLabs){
        next();
    }else{
        res.redirect('/mainpage');
    }
}

const isAuthLogin = (req, res, next) => {
    if(req.session.isAuth){
        res.redirect('/mainMenu');
    }else{
        next();
    }
}

// LOGIN load login page 
server.get('/', isAuthLogin, function(req, resp){
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
    })
    .catch(error => {
        console.error(error);
    });

 
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
    var isTechnician = req.body.isTechnician;
    var isRoleA = req.body.isRoleA;
    var role = "roleB";

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

    const questionSet = new Set(securityQuestions.map(q => q.question));
    if (questionSet.size !== 3) {
        return resp.render('register',{
            layout: 'registerIndex',
            title: 'Register Page',
            emailErrMsg: 'Please select 3 distinct security questions.'
        });
    }

    if(isTechnician === 'on'){
        role = "admin";
    } 

    if(isRoleA === 'on'){
        role = "roleA";
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
        console.error(error);
    });  
});


// johans - added lockout checker; if else lang yun
// CHECK-LOGIN check if login info is valid, success => redirects to main page, failure => rerender page
    server.post('/login-checker', function(req, resp) {
        let userEmail = req.body.email;
        let userPassword = req.body.password;
        req.session.curUserMail = req.body.email;

        responder.getUser(userEmail, userPassword)
        .then(user => {
            if (user && !user.locked){
                responder.addLogs(userEmail, user.role, `User Login succesfully`, "Success");
                req.session.isAuth = true;
                
                if(req.body.remember != 'on'){
                    req.session.cookie.expires = false; 
                }

                req.session.lastLoginTime = user.lastLogin;
                req.session.lastLoginStatus = user.lastLoginStatus;
                req.session.curUserData = user;
                resp.redirect('/mainMenu');
 
            } else if (user && user.locked){
                responder.addLogs(userEmail, "N/A", `Account locked due to too many failed attempts`, "Fail");
                resp.render('login', {
                    layout: 'loginIndex',
                    title: 'Login Page',
                    errMsg: 'Account locked. Please try again after 15 minutes.'
                });
            } else {
                responder.addLogs(userEmail, "N/A", `User Login Failed`, "Fail");
                resp.render('login',{
                    layout: 'loginIndex',
                    title: 'Login Page',
                    errMsg: 'Email and password don\'t match'
                });
            }             
        })
        .catch(error => {
            console.error(error);
        });

    });

// PROFILE 
server.get('/profile', isAuth, function(req, resp) {
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
        console.error(error);
    });
});

//ABOUT PAGE
server.get('/about', isAuth, function(req, resp) {
    resp.render('about', {
        layout: 'aboutIndex',
        title: 'About Page',
        user: req.session.curUserData
    });
})

// MAIN MENU 
server.get('/mainMenu', isAuth, function(req, resp) {
    req.session.isLabs = true;

    const showLoginStatus = req.session.showLoginStatus;
    const lastLoginInfo = req.session.lastLoginInfo;

    req.session.showLoginStatus = false;

    responder.getUserByEmail(req.session.curUserMail)
    .then(name => {
        if(req.query.labs != null){
            let labs = [];
            labs = JSON.parse(req.query.labs);
            resp.render('mainMenu', {
                layout: 'mainMenuIndex',
                title: 'Main Menu',
                labs: labs,
                user:  req.session.curUserData,
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

            if(name.role == "admin"){
                resp.render('mainMenuTech', {
                    layout: 'mainMenuIndexTech',
                    title: 'Main Menu Technician',
                    labs: seenLabs,
                    user:  req.session.curUserData
                });
            }else if(name.role == "roleA"){
                console.log("RoleA Main menu");
                resp.render('mainMenu-role-A', {
                    layout: 'mainMenuIndex-role-A',
                    title: 'Main Menu Role A',
                    labs: seenLabs,
                    user:  req.session.curUserData
                });
            }else{
                console.log("RoleB Main menu");
                resp.render('mainMenu', {
                    layout: 'mainMenuIndex',
                    title: 'Main Menu',
                    labs: seenLabs,
                    user:  req.session.curUserData
                });
            }     
        })
        .catch(error => {
            console.error(error);
        });
        }
    });
});

// delete profile
server.post('/deleteProfile', function(req, resp){
    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.addLogs(req.session.curUserMail, user.role, `User Deleted.`, "Success");
    });
    responder.deleteProfile(req.session.curUserMail).then(function(){
        console.log("Profile delete success");
        req.session.destroy((err) => {
            if(err) throw err;
            resp.redirect('/');
        });
    }).catch(error => {
        console.error(error);
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
        console.error(error);
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
        console.error(error);
    });
    
})

//** Please keep new codes below this line, so its easier to append changes in the future. */

// EDIT-PROFILE
server.get('/edit-profile', isAuth, function(req, resp) {
    resp.render('edit-profile',{
        layout: 'profileIndex',
        title: 'Edit Profile',
        user:  req.session.curUserData
    });
})

server.post('/deleteProfile', function(req, resp){
    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.addLogs(req.session.curUserMail, user.role, `User Deleted.`, "Success");
    });
    responder.deleteProfile( req.session.curUserMail).then(function(){
        console.log("Profile delete success");
        resp.redirect("/");
    }).catch(error => {
        console.error(error);
    });
});

// MAIN PAGE: SIDEBAR PEOPLE
server.post('/load-people', function(req, resp){
    if( req.session.searchQuery != null){
        responder.userSearch( req.session.searchQuery)
        .then(users => {
            resp.send({users:users,searchQuery :  req.session.searchQuery});
        }).catch (error =>{
            console.error(error);
        });
    } else{
        responder.getAllUsers()
        .then(users => {
            resp.send({users: users, searchQuery: "What are you looking for?"});
        })
        .catch(error => {
            console.error(error);
        });
    }
})

server.post('/load-labs', function(req, resp){
    if( req.session.searchQuery != null){
        responder.labSearch( req.session.searchQuery)
        .then(labs => {
            resp.send({labs:labs, searchQuery :  req.session.searchQuery});
        }).catch (error =>{
            console.error(error);
        });
    } else{
        responder.getLabs()
        .then(labs => {
            resp.send({labs: labs, searchQuery: "What are you looking for?"});
        })
        .catch(error => {
            console.error(error);
        });
    }
})


server.post('/load-labsbyTags', function(req, resp){
    if( req.session.searchQuery != null){
        responder.tagSearch( req.session.searchQuery)
        .then(labs => {
            resp.send({labs:labs, searchQuery : req.session.searchQuery});
        }).catch (error =>{
            console.error(error);
        });
    } else{
        responder.getLabs()
        .then(labs => {
            resp.send({labs: labs, searchQuery: "What are you looking for?"});
        })
        .catch(error => {
            console.error(error);
        });
    }
})


// PUBLIC PROFILE
server.get('/public-profile/:id/', isAuth, function(req, resp) {
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
    })
    .catch(error => {
        console.error(error);
    });
})

// CHANGE USERNAME
server.post('/change_username', function(req, resp){
    var username  = String(req.body.username);
    var email =  req.session.curUserData.email;

    responder.getUserByEmail(req.session.curUserMail).then(user=> {
        responder.addLogs(req.session.curUserMail, user.role,
             `Username Changed from ${user.username} to ${username}`, "Success");
    });

    responder.changeUsername( req.session.curUserData.email,req.body.username)
    .then(booleanValue=>{
        if(booleanValue == true){
            console.log("UsernameChangeSuccess");
            responder.getUserByEmail(email)
            .then(user=>{
                 req.session.curUserData = user;
            })
            resp.send({username : username});
        } else{
            console.log("UsernameChangeFail");
            responder.addLogs(req.session.curUserMail, user.role,`Username Changed failed.`, "Fail");
        }
    })
});

// CHANGE PASSWORD
server.post('/change_password', function(req, resp){

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
        });
    });
});

// LAB VIEW
server.get('/labs/:id/', isAuth, function(req, resp) {
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
                            })
                            
                        })
                    })
                })

            })
            .catch(error => {
                // Handle errors if the promise is rejected
                console.error("Error occurred:", error);
            });


    })
    .catch(error => {
        console.error(error);
    });

})

server.post('/labdetails', function(req, resp){

    responder.getLabByName(req.body.roomNum)
    .then(curLab => {
        resp.send({lab: curLab});

    })
    .catch(error => {
        console.error(error);
    });
});


server.post("/modal", function(req, resp){
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

                })
                .catch(error => {
                    console.error(error);
                });
            })
            .catch(error => {
                console.error(error);
            });
        })
        .catch(error => {
            console.error(error);
        });
    })
    .catch(error => {
        console.error(error);
    });
});


server.post("/modalTech", function(req, resp){
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
                .catch(error => {
                    console.error(error);
                });
            })
            .catch(error => {
                console.error(error);
            });
        })
        .catch(error => {
            console.error(error);
        });
    })
    .catch(error => {
        console.error(error);
    });
});

server.post('/reserve', function(req, resp){
    const currentDate = new Date();
    const date = getCurrentDate();

    //time
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    const time = `${hours}:${minutes}:${seconds}`;

    responder.getUserByEmail( req.session.curUserMail)
    .then(user=>{
        responder.getUserByEmail( req.body.email)
        .then(reserving => {
            var seat  = String(req.body.seat);
            var room  = String(req.body.room);
            var timeFrame  = String(req.body.timeFrame);
            var anon = req.body.anon == 'true';
            var resDate = req.body.date;
            var walkin = user.role == "admin" || user.role == "roleA";
            var name;

            if(walkin){
                if(reserving == null){
                    responder.addLogs(req.session.curUserMail, user.role,`User reserve failed unkown email used`, "Fail");
                    resp.send({status: "failed", reserve: null});
                    return;
                }
                name = reserving.username;
                responder.addLogs(req.session.curUserMail, user.role,`User reserved for ${reserving.email} seat:${seat} room:${room} anon:${anon} walkin:${walkin}`, "Success");
                responder.addReservation(date+ "|" +time, name, req.body.email, resDate, seat, room, timeFrame, anon, walkin)
            }else{
                responder.addLogs(req.session.curUserMail, user.role,`User reserved for ${user.email} seat:${seat} room:${room} anon:${anon} walkin:${walkin}`, "Success");
                name = user.username;
                responder.addReservation(date+ "|" +time, name, user.email, resDate, seat, room, timeFrame, anon, walkin)
            }

                let obj = {
                    dateTime: date+ "|" +time,
                    name: name,
                    email: req.body.email,
                    bookDate: resDate,
                    seat: seat,
                    room: room,
                    timeFrame: timeFrame,
                    anon: anon,
                    status: "active",
                    isWalkin: walkin,
                };
                console.log(obj);

                resp.send({status: "reserved", reserve: obj});
              
        });                
    })
    .catch(error => {
        console.error(error);
    });
});

server.post('/getTimeFrames', function(req, resp){

    if(req.session.isAuth){
        responder.getLabById( req.session.curLabId)
        .then(curLab => {
            responder.getTimeslots(curLab, req.body.date)
            .then(dateData => { 
                resp.send({dateData : dateData});
                    
            })
            .catch(error => {
                console.error(error);
            });
    
        })
        .catch(error => {
            console.error(error);
        });
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
                            .catch(error => {
                                console.error(error);
                            });
                        })
                        .catch(error => {
                            console.error(error);
                        });
                })
                .catch(error => {
                    console.error(error);
                });

            })
            .catch(error => {
                console.error(error);
            });

        })
        .catch(error => {
            // Handle errors if the promise is rejected
            console.error("Error occurred:", error);
        });


    })
    .catch(error => {
        console.error(error);
    });
});

server.get('/modifyLab', isAuth, function(req, resp){
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
        .catch(error => {
            console.error(error);
        });
    })
    .catch(error => {
        console.error(error);
    });
});

server.get('/manageRoles', isAuth, function(req, resp){
    responder.getUserByEmail(req.session.curUserMail)
    .then(user => {
        if(user.role == "admin"){
            responder.getAdmin_roleA()
            .then(nonAdmin => {
                resp.render('manageRolesTech', {
                layout: 'manageRolesIndexTech',
                title: 'Manage Technician',
                date: getCurrentDate(),
                resData: nonAdmin
            });
        });
        }else{

        }
            
    });
});

server.get('/viewLogs', isAuth, function(req, resp){
    responder.getUserByEmail(req.session.curUserMail)
    .then(user => {
            if(user.role == "admin"){
                responder.getLogs()
                .then(logs => {
                    resp.render('viewLogs', {
                    layout: 'viewLogs',
                    title: 'View Logs',
                    resData: logs
                });
            })  
        }
    });
});

server.post('/filterLogs', isAuth, function (req, resp) {

    const { email, action, status, fromDate, toDate, role } = req.body;

    responder.getUserByEmail(req.session.curUserMail)
        .then(user => {
            if (user.role === "admin") {
                responder.filterLogs(email, action, role, status, fromDate, toDate)
                    .then(logs => {
                        resp.send({ log: logs });
                    })
                    .catch(err => {
                        console.error("Error filtering logs:", err);
                        resp.status(500).send({ error: "Server error" });
                    });

            } else {
                resp.status(403).send({ error: "Not authorized" });
            }
        });
});


server.post('/changeModifyLab', function(req, resp){
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getTimeslots(curLab, req.body.date)
        .then(dateData => {
            resp.send({dateData: dateData});
        })
        .catch(error => {
            console.error(error);
        });
    })
    .catch(error => {
        console.error(error);
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

server.post('/save-profile', function(req, resp){
    responder.updateProfile( req.session.curUserData.email, req.body.username, req.body.password, req.body['prof-pic'], req.body.bio)
    .then(whatever => {
        responder.getUserByEmail( req.session.curUserData.email)
        .then(user => {
            responder.addLogs(req.session.curUserMail, user.role,`Profile Saved`, "Success");
             req.session.curUserData = user;
            resp.redirect('/profile')
        })
        .catch(error => {
            console.error(error);
        });

    })
    .catch(error => {
        console.error(error);
    });

});

server.post('/searchFunction', function (req, resp) {
    const searchString = req.body.stringInput;
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
        .catch(error => {
            // Handle errors if needed
            console.error(error);
            resp.status(500).send('Internal Server Error');
        });
});

server.get('/editReservation', isAuth, function (req, resp) {
    responder.getLabByName(req.query.roomNum)
    .then(lab => {
        resp.redirect('/labs/' + lab._id);            
    })
    .catch(error => {
        console.error(error);
    });
});

server.post('/removeReservation', function (req, resp) {
    responder.removeReservation(req.body.date, req.body.timeFrame, req.body.seat, req.body.room)
    .then(result =>{
        responder.getUserByEmail(req.session.curUserMail).then(user=> {
            responder.addLogs(req.session.curUserMail, user.role,`Reservation Removed successfully seat:${req.body.seat} room:${req.body.room}`, "Success");
        });
        
        console.log('success update reservation');
        resp.send({stats: 'success'});
    })
    .catch(error => {
        responder.getUserByEmail(req.session.curUserMail).then(user=> {
            responder.addLogs(req.session.curUserMail, user.role,`Reservation Removed Failed seat:${req.body.seat} room:${req.body.room}`, "Fail");
        });
        console.error(error);
    });
});

server.get('/logout', function (req, resp) {
    const userEmail = req.session.curUserMail;
    responder.getUserByEmail(userEmail).then(user=> {
        responder.addLogs(userEmail, user.role,`User logout`, "Success");
    });
     req.session.curUserData = null;
    req.session.destroy((err) => {
        if(err) throw err;
        resp.redirect('/');
    });
});

server.post('/addTimeFrame', function(req, resp){
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
                });
                responder.addSchedule(timeStart, timeEnd, date, curLab.roomNum, curLab.seats * curLab.numCols)
                resp.send({stat: "success"});
            }else{
                responder.getUserByEmail(req.session.curUserMail).then(user=> {
                    responder.addLogs(req.session.curUserMail, user.role,`User failed adding new time frame room:${curLab.roomNum} timestart:${timeStart} timeend:${timeEnd} date${date}`, "Fail");
                });
                resp.send({stat: "fail"});
            }
        })
    })


});

server.post("/deleteTimeFrame", function(req, resp){
    const date = req.body.date;
    const timeStart = req.body.timeStart;
    const timeEnd = req.body.timeEnd;
    
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getUserByEmail(req.session.curUserMail).then(user=> {
            responder.addLogs(req.session.curUserMail, user.role,`Lab ${curLab.roomNum} timesFrame ${timeStart}-${timeEnd} Deleted`, "Success");
        });
        responder.removeTimeFrame(timeStart, timeEnd, date, curLab.roomNum);
        resp.send({stat: "success"});
    })

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
    })
    
}
setInterval(completeReservation, 10000);


server.post('/checkReserve', function(req, resp){
    responder.getLabById( req.session.curLabId)
    .then(curLab => {
        responder.getStatusSeat(curLab.roomNum, req.body.seat, req.body.timeFrame, req.body.date).then(function(result){
            if(result == null){
                resp.send({status: 'avail'});
            }else{
                resp.send({status: 'unavail'})
            }
        })
    })
});

server.post('/loadReserve', function(req, resp){

    if(req.session.isAuth){
        const time = req.body.time;
        const date = req.body.date;

        responder.getLabById(req.session.curLabId).then(function(lab){

            responder.getReservedAll(lab, date, time).then(function(reservation){
                responder.getReservedAll2(lab, date).then(function(resData){
                    resp.send({reservation, resData, lab});
                });

            })

        })
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

                    })
                }

            }
        }
    })
    
}
setInterval(completeReservation, 10000);


server.post('/checkReserve', function(req, resp){
    responder.getLabById(req.session.curLabId)
    .then(curLab => {
        responder.getStatusSeat(curLab.roomNum, req.body.seat, req.body.timeFrame, req.body.date).then(function(result){
            if(result == null){
                resp.send({status: 'avail'});
            }else{
                resp.send({status: 'unavail'})
            }
        })
    })
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

server.post('/assign_role', function(req, resp){
    const email = req.body.email;
    const newRole = req.body.role;

    console.log(email);
    console.log(newRole);

    responder.getUserByEmail( req.session.curUserMail)
    .then(user=>{

    responder.getUserByEmail(req.session.curUserMail)
    .then(curuser => {
        if(curuser.role == "admin"){
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
        }else if (curuser.role == "roleA"){
            //only can modify specific roles
        }else{
            //error
        }
    });

    })
    .catch(error => {
        console.error(error);
    });
});

server.post('/deleteUser', function(req, resp){
    responder.deleteProfile( req.body.email)
    .then(result => {
        if(result){
            responder.getUserByEmail(req.session.curUserMail).then(user=> {
                responder.addLogs(req.session.curUserMail, user.role,`User deleted user ${req.body.email}`, "Success");
            });
            resp.send({status: "success"});
        }else{
            responder.getUserByEmail(req.session.curUserMail).then(user=> {
                responder.addLogs(req.session.curUserMail, user.role,`User failed to deleted user ${req.body.email}`, "Fail");
            });
            resp.send({status: "error"});
        }
    });
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
      return res.render('forgot-password', {
        layout: 'loginIndex',
        title: 'Forgot Password',
        errMsg: 'Email not found. Please check your email address.'
      });
    }

    if (!user.securityQuestions || user.securityQuestions.length < 2) {
      return res.render('forgot-password', {
        layout: 'loginIndex',
        title: 'Forgot Password',
        errMsg: 'No security questions set for this account. Please contact administrator.'
      });
    }

    // Check if account is locked due to too many attempts
    if (user.passwordResetLockUntil && user.passwordResetLockUntil > Date.now()) {
      const lockTime = Math.ceil((user.passwordResetLockUntil - Date.now()) / (1000 * 60));
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
    console.error('Forgot password error:', error);
    res.render('forgot-password', {
      layout: 'loginIndex',
      title: 'Forgot Password',
      errMsg: 'An error occurred. Please try again.'
    });
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
    console.error('Security questions verification error:', error);
    res.render('forgot-password', {
      layout: 'loginIndex',
      title: 'Forgot Password',
      errMsg: 'An error occurred. Please try again.'
    });
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
      await responder.addLogs(email, 'user', 'Password reset via forgot password', 'Success');
      
      res.render('login', {
        layout: 'loginIndex',
        title: 'Login',
        errMsg: 'Password reset successful. Please login with your new password.'
      });
    } else {
      throw new Error('Password update failed');
    }

  } catch (error) {
    console.error('Password reset error:', error);
    res.render('forgot-password-reset', {
      layout: 'loginIndex',
      title: 'Reset Password',
      email: email,
      token: token,
      errMsg: 'An error occurred during password reset. Please try again.'
    });
  }
});

// CHANGE PASSWORD FLOW - For authenticated users
server.get('/change-password-flow', isAuth, function(req, res) {
  res.render('change-password', {
    layout: 'loginIndex',
    title: 'Change Password',
    user: req.session.curUserData
  });
});

// Verify current password
server.post('/change-password-verify-current', isAuth, async function(req, res) {
  const { email, currentPassword } = req.body;
  const userEmail = req.session.curUserData.email;

  // Security: Ensure user can only verify their own password
  if (email !== userEmail) {
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
    console.error('Password verification error:', error);
    res.render('change-password', {
      layout: 'loginIndex',
      title: 'Change Password',
      user: req.session.curUserData,
      errMsg: 'An error occurred. Please try again.'
    });
  }
});

// Final password change
server.post('/change-password-final', isAuth, async function(req, res) {
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
    console.error('Password change error:', error);
    res.render('change-password-reset', {
      layout: 'loginIndex',
      title: 'Change Password',
      email: email,
      token: token,
      errMsg: 'An error occurred during password change. Please try again.'
    });
  }
});

// Prevent back navigation after password change using middleware
server.use('/change-password-flow', function(req, res, next) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', 0);
  next();
});

/************************no need to edit past this point********************************* */
}

module.exports.add = add;