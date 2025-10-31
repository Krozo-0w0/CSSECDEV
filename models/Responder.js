const { MongoClient, ObjectId } = require('mongodb');
const { emit } = require('process');

const dotenv = require('dotenv');
dotenv.config();
const databaseURL = process.env.MONGODB_URL;

const mongoClient = new MongoClient(databaseURL);
const bcrypt = require('bcrypt')
const saltRounds = 10;


// Database and collection names here...
const databaseName = "REServerDB";
const colUsers = "users";
const colLabs = "labs";
const colReservation = "reservation";
const colSchedule = "schedule";


function errorFn(err){
    console.log('Error found. Please trace!');
    console.error(err);
}

function successFn(res){
    console.log('Database query successful!');
}



mongoClient.connect().then(function(con){
  console.log("Attempt to create!");
  const dbo = mongoClient.db(databaseName);
  dbo.createCollection(colUsers)
    .then(successFn).catch(errorFn);
    dbo.createCollection(colLabs)
    .then(successFn).catch(errorFn);
    dbo.createCollection(colReservation)
    .then(successFn).catch(errorFn);
    dbo.createCollection(colSchedule)
    .then(successFn).catch(errorFn);
}).catch(errorFn);



/*****************misc functions****************** */

function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@dlsu\.edu\.ph$/;
    return emailRegex.test(email);
}


/******response functions to interact with database**********/


function getUser(userEmail, userPassword) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    let hashedPassword = null;
    searchQuery = {email: userEmail};
    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function(val){
            if(val != null){
                hashedPassword = val.password;
                bcrypt.compare(userPassword,hashedPassword,function(err,result){
                    if (result){
                        resolve(val)
                    } else{
                        resolve(null);
                    }
                })
            
            } else{
                resolve(null);
            }
        });
    });

}
module.exports.getUser = getUser;


function addUser(userEmail, userName, userPassword, userVPassword,isTechnician){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    searchQuery = {email: userEmail};
    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function(val){
            console.log(userPassword);
            console.log(userVPassword);
            if (val != null){
                resolve('Email already in use.');
            } else if (userPassword != userVPassword){
                resolve('Passwords do not match.');
            } else if (!isValidEmail(userEmail)){
                resolve('Invalid DLSU email format.');
            } else {
                bcrypt.hash(userPassword, saltRounds, function(err, hash) {
                    userPassword = hash;
                    if(isTechnician === 'on'){
                        isTechnician = true;
                    } else{
                        isTechnician = false;
                    }
                    const info = {
                        email: userEmail,
                        password: userPassword,
                        isTechnician: isTechnician,
                        pfp: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                        username: userName,
                        bio: ""
                    };
                    col.insertOne(info).then(function(res){
                    }).catch(errorFn);
                    resolve('Success!');
                });
            }
        }).catch(reject);
    });
}
module.exports.addUser = addUser;


function getLabs(){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLabs);

    return new Promise((resolve, reject) => {
        const cursor = col.find({});
        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
    
}
module.exports.getLabs = getLabs;


function getAllUsers() {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    return new Promise((resolve, reject) => {
        const cursor = col.find({});
        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}
module.exports.getAllUsers = getAllUsers;


function getUserbyId(userId) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    searchQuery = { _id: new ObjectId(userId) };

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
}
module.exports.getUserbyId = getUserbyId;

function isRegisteredUser(inputEmail){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    searchQuery = {email : inputEmail}
    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(reject);
    });
}
module.exports.isRegisteredUser = isRegisteredUser;


function changeUsername(email,username){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    const updateQuery = { email : email};
    const updateValues = { $set: {username : username}};

    return new Promise((resolve,reject) =>{
        col.updateOne(updateQuery,updateValues).then(function(res){
            if(res['modifiedCount'] > 0){
                resolve(true);
            } else{
                resolve(false);
            }

        });
    });
}
module.exports.changeUsername = changeUsername;

function getUserByEmail(userEmail) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    searchQuery = { email: userEmail };

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
}
module.exports.getUserByEmail = getUserByEmail;

function getUserByName(name) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    searchQuery = { username: name };

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
}
module.exports.getUserByName = getUserByName;

function changePassword(userEmail,password,vpassword){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    const updateQuery = { email: userEmail };
    const updateValues = { $set: {password : password}};

    return new Promise((resolve, reject) => {
        if(password === vpassword){
            col.updateOne(updateQuery,updateValues).then(function(res){
                if(res['modifiedCount'] > 0){
                    resolve(true);
                } else{
                    resolve(false);
                }
            });
        } else{
            resolve(false);
        }
    })
}
module.exports.changePassword = changePassword;


function getLabById(labId){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLabs);
    searchQuery = { _id: new ObjectId(labId) };

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
}
module.exports.getLabById = getLabById;

/*************************************************************/
/**RESERVATION RELATED FUNCTIONS AND LABORATORY */
function getLabByName(labName){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLabs);

    searchQuery = { roomNum: labName };

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
}
module.exports.getLabByName = getLabByName;

        //save name of the one who reserved
        //save the time
        //save the seat
        //save the room
        //save the time frame
        //anon
function addReservation(date, name, email, bookDate, seat, room, timeFrame, anon, walkin){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    getLabByName(room)
    .then(lab =>{

        getSchedule(room, bookDate, timeFrame)
        .then(schedule => {

            updateReservationSched(room, bookDate, timeFrame, schedule.available, schedule.reserved)
            .then(result => {
                
                
            const info = {
                dateTime: date,
                name: name,
                email: email,
                bookDate: bookDate,
                seat: seat,
                room: room,
                timeFrame: timeFrame,
                anon: anon,
                status: "active",
                isWalkin: walkin
            };
            
            col.insertOne(info).then(function(res){
                console.log('reservation created');
            }).catch(errorFn);


            })
            .catch(error => {
                console.error(error);
            });
        })
        .catch(error => {
            console.error(error);
        });
    }).catch(error => {
        console.error(error);
    });


}
module.exports.addReservation = addReservation;


function getSchedule(room, date, timeFrame) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);

    const [startTime, endTime] = timeFrame.split('-');

    searchQuery = {roomNum: room, date: date, timeStart: startTime, timeEnd: endTime};

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
}
module.exports.getUserbyId = getUserbyId;

function deleteProfile(myEmail) {
    const dbo = mongoClient.db(databaseName);
    const colU = dbo.collection(colUsers);
    const colR = dbo.collection(colReservation)

    const searchQuery = { email: myEmail };

    return new Promise((resolve, reject) => {
        colU.deleteOne(searchQuery).then(function(){
            colR.deleteMany(searchQuery).then(function(){
                resolve();
            }).catch(errorFn);
        }).catch(errorFn);
    });
}
module.exports.deleteProfile = deleteProfile;

function getReservedYours(rooms, name, timeFrame){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    return new Promise((resolve, reject) => {
        const cursor = col.find({ email: name.email, room: rooms.roomNum, timeFrame: timeFrame}); // Filter by roomNum

        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}
module.exports.getReservedYours = getReservedYours;

function getReservedAll(rooms, date, timeFrame){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);


    return new Promise((resolve, reject) => {
        const cursor = col.find({ room: rooms.roomNum, $or: [{status: "active"}, {status: "completed"}], bookDate: date, timeFrame: timeFrame}); 

        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}
module.exports.getReservedAll = getReservedAll;


function getReservedAll2(rooms, date){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);


    return new Promise((resolve, reject) => {
        const cursor = col.find({ room: rooms.roomNum, bookDate: date}); 

        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}
module.exports.getReservedAll2 = getReservedAll2;


/**Time slots or Schedule functions */

//Date
// time frame
// reserved
// free

function getTimeslots(lab, date, timeFrame){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);

    return new Promise((resolve, reject) => {
        const cursor = col.find({roomNum: lab.roomNum, date: date, timeFrame: timeFrame}); //get all timeslots in a specific room and date

        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
    });
}
module.exports.getTimeslots = getTimeslots;

function getAllTimeSlots(roomNum, date){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);

    return new Promise((resolve, reject) => {
        const cursor = col.find({roomNum, date}); //get all timeslots in a specific room and date

        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
    });
}
module.exports.getAllTimeSlots = getAllTimeSlots;

function updateReservationSched(room, date, timeFrame, available, reserved){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);

    const [startTime, endTime] = timeFrame.split('-');

    const updateQuery = {roomNum: room, date: date, timeStart: startTime, timeEnd: endTime};
    const updateValues = { $set: {available : available-1, reserved: reserved+1}};


    return new Promise((resolve,reject) =>{
        col.updateOne(updateQuery,updateValues).then(function(res){
            if(res['modifiedCount'] > 0){
                resolve(true);
            } else{
                resolve(false);
            }

        });
    });
}

module.exports.updateReservationSched = updateReservationSched;

function getReservedOfPerson (personEmail) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    return new Promise((resolve, reject) => {
        const cursor = col.find({ email: personEmail, status: 'active'}); 

        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}
module.exports.getReservedOfPerson = getReservedOfPerson;

function updateProfile(userEmail, userName, passWord, userPfp, userBio) {
    return new Promise((resolve, reject) => {
        const dbo = mongoClient.db(databaseName);
        const colUser = dbo.collection(colUsers);
        const colReserve = dbo.collection(colReservation);
        const updateQuery = { email: userEmail };
        const updateValuesReserves = { $set: { name: userName } };

        const emailSearch = { email: userEmail };
        colUser.findOne(emailSearch).then(function (val) {
            if (val != null) {
                if (passWord == ""){
                    passWord = val.password;
                    console.log("password after: " +passWord);
                }

                if (val.password != passWord) {
                    bcrypt.hash(passWord, saltRounds, function (err, hash) {
                        if (err) {
                            reject(err);
                        } else {
                            const updateValues = { $set: { username: userName, password: hash, pfp: userPfp, bio: userBio } };
                            colUser.updateOne(updateQuery, updateValues).then(function (res) {
                                colReserve.updateMany(updateQuery, updateValuesReserves).then(function (res) {
                                    console.log('Update successful');
                                    console.log('Inside: ' + JSON.stringify(res));
                                    resolve();
                                }).catch(error => reject(error));
                            }).catch(error => reject(error));
                        }
                    });
                } else {
                    const updateValues = { $set: { username: userName, password: passWord, pfp: userPfp, bio: userBio } };
                    colUser.updateOne(updateQuery, updateValues).then(function (res) {
                        colReserve.updateMany(updateQuery, updateValuesReserves).then(function (res) {
                            console.log('Update successful');
                            console.log('Inside: ' + JSON.stringify(res));
                            resolve();
                        }).catch(error => reject(error));
                    }).catch(error => reject(error));
                }
            }
        }).catch(error => reject(error));
    });
}
module.exports.updateProfile = updateProfile;

function roomSearch(searchString){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLabs);
    const searchQuery = { "roomNum" : {$regex: searchString, $options:'i'}};

    return new Promise((resolve, reject) => {
        const cursor = col.find(searchQuery); 
        cursor.toArray().then(function(vals) {
            resolve(vals);
        }).catch(errorFn);
    });
}
module.exports.roomSearch = roomSearch;

function userSearch(searchString) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const searchQuery = { "username": { $regex: searchString, $options: 'i' } };

    return new Promise((resolve, reject) => {
        const cursor = col.find(searchQuery);
        cursor.toArray()
            .then(function (vals) {
                resolve(vals);
            })
            .catch(errorFn);
    });
}

module.exports.userSearch = userSearch;

function labSearch(searchString) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLabs);
    const searchQuery = { "roomNum": { $regex: searchString, $options: 'i' } };

    return new Promise((resolve, reject) => {
        const cursor = col.find(searchQuery);
        cursor.toArray()
            .then(function (vals) {
                resolve(vals);
            })
            .catch(errorFn);
    });
}

module.exports.labSearch = labSearch;


function removeReservation(date, timeFrame, seat, room){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    const searchQuery = {seat, bookDate: date, room, timeFrame, status: "active"}
    const updateValues = { $set: { status: "cancelled" } };

    getSchedule(room, date, timeFrame)
    .then(schedule => {

        removeReservationSched(room, date, timeFrame, schedule.available, schedule.reserved)
        .then(result => {

        })
    })

    return new Promise((resolve, reject) => {
        col.updateOne(searchQuery, updateValues).then(function(res){
            resolve(res);
        }).catch(errorFn);
    });


}
module.exports.removeReservation = removeReservation;

function completeReservation(date, timeFrame, seat, room){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    const searchQuery = {seat, bookDate: date, room, timeFrame, status: "active"}
    const updateValues = { $set: { status: "completed" } };

    return new Promise((resolve, reject) => {
        col.updateOne(searchQuery, updateValues).then(function(res){
            resolve(res);
        }).catch(errorFn);
    });


}
module.exports.completeReservation = completeReservation;

function removeReservationSched(room, date, timeFrame, available, reserved){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);

    const [startTime, endTime] = timeFrame.split('-');

    const updateQuery = {roomNum: room, date: date, timeStart: startTime, timeEnd: endTime};
    const updateValues = { $set: {available : available+1, reserved: reserved-1}};


    return new Promise((resolve,reject) =>{
        col.updateOne(updateQuery,updateValues).then(function(res){
            if(res['modifiedCount'] > 0){
                resolve(true);
            } else{
                resolve(false);
            }

        });
    });
}

module.exports.removeReservationSched = removeReservationSched;

function addSchedule(timeStart, timeEnd, date, roomNum, available){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);

    const info = {
        roomNum,
        date,
        timeStart,
        timeEnd,
        available,
        reserved: 0
    }

    col.insertOne(info).then(function(res){
        console.log('Schedule created');
    }).catch(errorFn);
}
module.exports.addSchedule = addSchedule;

function removeTimeFrame(timeStart, timeEnd, date, roomNum){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colSchedule);
    const col2 = dbo.collection(colReservation);
    const searchQuery = {timeStart, timeEnd, roomNum, date};
    const searchQuery2 = {timeFrame: timeStart + "-" + timeEnd, room:roomNum, bookDate: date};

    const updateVal = {$set: { status: "cancelled" }};

    col.deleteMany(searchQuery).then(function(res){
        console.log("successfully Deleted TimeFrame");
        col2.updateMany(searchQuery2, updateVal).then(function(upRes){
            console.log("successfully updated TimeFrame");
        });

    }).catch(errorFn);
}
module.exports.removeTimeFrame = removeTimeFrame;

function getReservationDB(){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    return new Promise((resolve, reject) => {
        const cursor = col.find({status: 'active'});
        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}

module.exports.getReservationDB = getReservationDB;

function getStatusSeat(room, seat, timeFrame, date){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colReservation);

    const searchQuery = {room, timeFrame, seat, bookDate: date, status: 'active'};

    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function (val) {
            if (val != null) {
                resolve(val);
            } else {
                resolve(null);
            }
        }).catch(reject);
    });
    
}
module.exports.getStatusSeat = getStatusSeat;

function tagSearch(searchString) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLabs);
    const searchQuery = { "tags": { $regex: searchString, $options: 'i' } };

    return new Promise((resolve, reject) => {
        const cursor = col.find(searchQuery);
        cursor.toArray()
            .then(function (vals) {
                resolve(vals);
            })
            .catch(errorFn);
    });
}

module.exports.tagSearch = tagSearch;




function finalClose(){
    console.log('Close connection at the end!');
    mongoClient.close();
    process.exit();
}

process.on('SIGTERM',finalClose);  //general termination signal
process.on('SIGINT',finalClose);   //catches when ctrl + c is used
process.on('SIGQUIT', finalClose); //catches other termination commands


