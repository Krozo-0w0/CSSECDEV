//Routes
const { timeEnd, info } = require('console');
const responder = require('../models/Responder');
const fs = require('fs');
const session = require('express-session');



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


// CHECK-REGISTER check if register info is valid, success => redirects to login, failure => rerender page
server.post('/register-checker', function(req, resp){
    var userEmail  = String(req.body.email);
    var userName  = String(req.body.username);
    var userPassword = String(req.body.password);
    var userVPassword = String(req.body.vpassword);
    var isTechnician = String(req.body.isTechnician);

    responder.addUser(userEmail, userName, userPassword, userVPassword,isTechnician)
    .then(result => {
        if (result == "Success!"){
            resp.redirect('/');
        } else {

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



// CHECK-LOGIN check if login info is valid, success => redirects to main page, failure => rerender page
    server.post('/login-checker', function(req, resp) {
        let userEmail = req.body.email;
        let userPassword = req.body.password;
         req.session.curUserMail = req.body.email;

        responder.getUser(userEmail, userPassword)
        .then(user => {
            if (user != null){
                req.session.isAuth = true;
                
                if(req.body.remember != 'on'){
                    req.session.cookie.expires = false; 
                }

                req.session.curUserData = user;
                resp.redirect('/mainMenu');
 
            } else {
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
    if(req.query.labs != null){
        let labs = [];
        labs = JSON.parse(req.query.labs);
        resp.render('mainMenu', {
            layout: 'mainMenuIndex',
            title: 'Main Menu',
            labs: labs,
            user:  req.session.curUserData
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

        // render main menu
        resp.render('mainMenu',{
            layout: 'mainMenuIndex',
            title: 'Main Menu',
            labs: seenLabs,
            user:  req.session.curUserData
        });         
    })
    .catch(error => {
        console.error(error);
    });
    }
});

// delete profile
server.post('/deleteProfile', function(req, resp){
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
        }
    })
});

// CHANGE PASSWORD
server.post('/change_password', function(req, resp){

    var password = String(req.body.password);
    var vpassword = String(req.body.vpassword);

    responder.changePassword( req.session.curUserData.email,req.body.password,req.body.vpassword)
    .then(booleanValue =>{
        if(booleanValue == true){
            console.log("PasswordChangeSuccess");
            resp.send({message : "Password Change Success!"});
        } else{
            console.log("PasswordChangeFail");
            resp.send({message : "Password Change Failed!"});
        }
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

                                if(name.isTechnician){
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
    
    var seat  = String(req.body.seat);
    var room  = String(req.body.room);
    var timeFrame  = String(req.body.timeFrame);
    var anon = req.body.anon == 'true';
    var resDate = req.body.date;
    var walkin = user.isTechnician;

    if(walkin){
        responder.addReservation(date+ "|" +time, req.body.name, req.body.email, resDate, seat, room, timeFrame, anon, walkin)
    }else{
        responder.addReservation(date+ "|" +time, user.username, user.email, resDate, seat, room, timeFrame, anon, walkin)
    }

        let obj = {
            dateTime: date+ "|" +time,
            name: req.body.name,
            email: req.body.email,
            bookDate: resDate,
            seat: seat,
            room: room,
            timeFrame: timeFrame,
            anon: anon,
            status: "active",
            isWalkin: walkin,
        };

        resp.send({status: "reserved", reserve: obj});
                
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
                                

                                if(name.isTechnician){
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
        console.log('success update reservation');
        resp.send({stats: 'success'});
    })
    .catch(error => {
        console.error(error);
    });
});

server.get('/logout', function (req, resp) {
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
                responder.addSchedule(timeStart, timeEnd, date, curLab.roomNum, curLab.seats * curLab.numCols)
                resp.send({stat: "success"});
            }else{
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

/************************no need to edit past this point********************************* */
}

module.exports.add = add;