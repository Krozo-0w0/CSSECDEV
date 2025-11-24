const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { emit } = require('process');

const dotenv = require('dotenv');
dotenv.config();
const databaseURL = process.env.MONGODB_URL;

const mongoClient = new MongoClient(databaseURL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const bcrypt = require('bcrypt')
const saltRounds = 10;


// Database and collection names here...
const databaseName = "REServerDB";
const colUsers = "users";
const colLabs = "labs";
const colReservation = "reservation";
const colSchedule = "schedule";
const colLogs = "logs";


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
    dbo.createCollection(colLogs)
    .then(successFn).catch(errorFn);
}).catch(errorFn);



/*****************misc functions****************** */

function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@dlsu\.edu\.ph$/;
    return emailRegex.test(email);
}


/******response functions to interact with database**********/

//johans - get user function (added lockouts, tracking the number of attempts, and lastlogin) 
function getUser(userEmail, userPassword) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes yan

    return new Promise((resolve, reject) => {
        col.findOne({ email: userEmail }).then(function (user) {
            if (!user) {
                resolve(null);
                return;
            }

            // this checks if lock or nah
            if (user.lockUntil && user.lockUntil > Date.now()) {
                console.log(`Account ${userEmail} is locked until ${user.lockUntil}`);
                resolve({ locked: true });
                return;
            }

            if (user.lockUntil && user.lockUntil <= Date.now()) {
                col.updateOne(
                    { email: userEmail },
                    { $set: { lockUntil: null, failedAttempts: 0 } }
                );
            }

            bcrypt.compare(userPassword, user.password, function (err, result) {
                if (result) {
                    // if successful = failed attempts resets and unlocked while also updating last login
                    col.updateOne(
                        { email: userEmail },
                        { $set: { failedAttempts: 0, lockUntil: null, lastLogin: new Date(), lastLoginStatus: "Success"} }
                    );
                    resolve(user);
                } else {
                    let attempts = (user.failedAttempts || 0) + 1;
                    let update = { failedAttempts: attempts, lastLogin: new Date(), lastLoginStatus: "Fail" };
                    
                    // If max attempts = goodbye! lock the account lol
                    if (attempts >= MAX_ATTEMPTS) {
                        update.lockUntil = new Date(Date.now() + LOCK_DURATION);
                        console.log(`Account ${userEmail} locked for 15 minutes.`);
                    }

                    col.updateOne({ email: userEmail }, { $set: update });
                    resolve(null);
                }
            });
        }).catch(reject);
    });
}
module.exports.getUser = getUser;

function verifyCredentials(userEmail, userPassword) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION = 15 * 60 * 1000;

    return new Promise((resolve, reject) => {
        col.findOne({ email: userEmail }).then(function (user) {
            if (!user) {
                resolve(null);
                return;
            }

            if (user.lockUntil && user.lockUntil > Date.now()) {
                console.log(`Account ${userEmail} is locked until ${user.lockUntil}`);
                resolve({ locked: true });
                return;
            }

            if (user.lockUntil && user.lockUntil <= Date.now()) {
                col.updateOne(
                    { email: userEmail },
                    { $set: { lockUntil: null, failedAttempts: 0 } }
                );
            }

            bcrypt.compare(userPassword, user.password, function (err, result) {
                if (result) {
                    // if successful = failed attempts resets and unlocked while also updating last login
                    resolve({ 
                        valid: true, 
                        user: user,
                        needsUnlock: user.failedAttempts > 0 || user.lockUntil !== null
                    });
                } else {
                    // If max attempts = goodbye! lock the account lol
                    let attempts = (user.failedAttempts || 0) + 1;
                    let update = { failedAttempts: attempts, lastLoginStatus: "Fail" };
                    
                    if (attempts >= MAX_ATTEMPTS) {
                        update.lockUntil = new Date(Date.now() + LOCK_DURATION);
                        console.log(`Account ${userEmail} locked for 15 minutes.`);
                    }

                    col.updateOne({ email: userEmail }, { $set: update });
                    resolve({ valid: false, locked: attempts >= MAX_ATTEMPTS });
                }
            });
        }).catch(reject);
    });
}
module.exports.verifyCredentials = verifyCredentials;

function updateLastLogin(userEmail) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    return new Promise((resolve, reject) => {
        col.updateOne(
            { email: userEmail },
            { 
                $set: { 
                    lastLogin: new Date(), 
                    lastLoginStatus: "Success",
                    failedAttempts: 0,
                    lockUntil: null
                } 
            }
        ).then(res => resolve(res.modifiedCount > 0))
         .catch(reject);
    });
}
module.exports.updateLastLogin = updateLastLogin;

function updateFailedLogin(userEmail) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION = 15 * 60 * 1000;

    return new Promise((resolve, reject) => {
        col.findOne({ email: userEmail }).then(function(user) {
            if (!user) {
                resolve(false);
                return;
            }

            let attempts = (user.failedAttempts || 0) + 1;
            let update = { 
                failedAttempts: attempts, 
                lastLogin: new Date(),
                lastLoginStatus: "Fail" 
            };
            
            if (attempts >= MAX_ATTEMPTS) {
                update.lockUntil = new Date(Date.now() + LOCK_DURATION);
            }

            col.updateOne({ email: userEmail }, { $set: update })
                .then(res => resolve(res.modifiedCount > 0))
                .catch(reject);
        }).catch(reject);
    });
}
module.exports.updateFailedLogin = updateFailedLogin;


function getLogs() {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLogs);
    return new Promise((resolve, reject) => {
        const cursor = col.find({});
        cursor.toArray().then(function(vals){
            resolve(vals);
        }).catch(errorFn);
        
    });
}
module.exports.getLogs = getLogs;


function filterLogs(email, action, role, status, fromDate, toDate) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLogs);

    const filter = {};

    // Dynamic filters
    if (email) filter.email = { $regex: email, $options: "i" };
    if (action) filter.action = { $regex: action, $options: "i" };
    if (role) filter.role = role;
    if (status) filter.status = status;

    // Date range
    if (fromDate || toDate) {
        filter.date = {};
        if (fromDate) filter.date.$gte = fromDate + " 00:00:00";
        if (toDate) filter.date.$lte = toDate + " 23:59:59";
    }

    return new Promise((resolve, reject) => {
        col.find(filter)
            .sort({ date: -1 })
            .toArray()
            .then(resolve)
            .catch(reject);
    });
}

module.exports.filterLogs = filterLogs;

//johans - strong password function
function isStrongPassword(password) {
    const policyRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return policyRegex.test(password);
}

//johans - add user function (edited for strong password, lockout mechanism, and lastLogin)
function addUser(userEmail, userName, userPassword, userVPassword, role, securityQuestions){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    searchQuery = {email: userEmail};
    return new Promise((resolve, reject) => {
        col.findOne(searchQuery).then(function(val){
            console.log(userPassword);
            console.log(userVPassword);
            if (val != null){
                resolve('Email already in use.');
            } else if (userPassword !== userVPassword) {
                resolve('Passwords do not match.');
            } else if (!isValidEmail(userEmail)) {
                resolve('Invalid DLSU email format.');
            } else if (!isStrongPassword(userPassword)) {
                resolve('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.');
            } else {
                bcrypt.hash(userPassword, saltRounds, function(err, hash) {
                    userPassword = hash;
                
                    const hashedSecurityQuestions = [];
                    let questionsProcessed = 0;

                    securityQuestions.forEach((qa, index) => {
                        bcrypt.hash(qa.answer.toLowerCase().trim(), saltRounds, function(err, answerHash) {
                            hashedSecurityQuestions.push({
                                question: qa.question,
                                answer: answerHash
                            });
                            
                            questionsProcessed++;

                            if (questionsProcessed === securityQuestions.length) {
                                const info = {
                                    email: userEmail,
                                    password: userPassword,
                                    role: role,
                                    pfp: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                                    username: userName,
                                    bio: "",
                                    failedAttempts: 0,
                                    lockUntil: null,
                                    lastPasswordChange: new Date(),
                                    lastLogin: null,
                                    lastLoginStatus: null,
                                    securityQuestions: hashedSecurityQuestions,
                                    passwordHistory: [],
                                    passwordResetAttempts: 0,
                                    passwordResetLockUntil: null,
                                };
                                col.insertOne(info).then(function(res){
                                }).catch(errorFn);
                                resolve('Success!');
                            }
                        });
                    });
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

function getAllRoleA() {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const searchQuery = { isRoleA: true };

    return new Promise((resolve, reject) => {
        col.find(searchQuery).toArray()
            .then(vals => resolve(vals))
            .catch(err => reject(err));
    });
}
module.exports.getAllRoleA = getAllRoleA;

function getAllRoleAdmin() {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const searchQuery = { role: "admin" };

    return new Promise((resolve, reject) => {
        col.find(searchQuery).toArray()
            .then(vals => resolve(vals))
            .catch(err => reject(err));
    });
}
module.exports.getAllRoleAdmin = getAllRoleAdmin;

function getAllRoleB() {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const searchQuery = { role: "roleB" };

    return new Promise((resolve, reject) => {
        col.find(searchQuery).toArray()
            .then(vals => resolve(vals))
            .catch(err => reject(err));
    });
}
module.exports.getAllRoleB = getAllRoleB;

function getAdmin_roleA() {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    const searchQuery = { role: { $in: ["admin", "roleA"] } };

    return new Promise((resolve, reject) => {
        col.find(searchQuery).toArray()
            .then(vals => resolve(vals))
            .catch(err => reject(err));
    });
}
module.exports.getAdmin_roleA = getAdmin_roleA;

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

//johans - change password function (edited for strong password)
function changePassword(userEmail, password, vpassword) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    const updateQuery = { email: userEmail };

    return new Promise((resolve, reject) => {
        if (password !== vpassword) {
            resolve(false);
            return;
        }
        if (!isStrongPassword(password)) {
            resolve(false);
            return;
        }

        bcrypt.hash(password, saltRounds, function(err, hash) {
            if (err) {
                reject(err);
            } else {
                const updateValues = { $set: { password: hash } };
                col.updateOne(updateQuery, updateValues)
                   .then(res => resolve(res.modifiedCount > 0))
                   .catch(reject);
            }
        });
    });
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
                resolve(true);
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

function updateProfile(userEmail, userName, userPfp, userBio) {
    return new Promise((resolve, reject) => {
        const dbo = mongoClient.db(databaseName);
        const colUser = dbo.collection(colUsers);
        const colReserve = dbo.collection(colReservation);
        const updateQuery = { email: userEmail };
        const updateValuesReserves = { $set: { name: userName } };

        const emailSearch = { email: userEmail };
        colUser.findOne(emailSearch).then(function (val) {
            if (val != null) {
                const updateValues = { $set: { username: userName, pfp: userPfp, bio: userBio } };
                colUser.updateOne(updateQuery, updateValues).then(function (res) {
                    colReserve.updateMany(updateQuery, updateValuesReserves).then(function (res) {
                        console.log('Update successful');
                        console.log('Inside: ' + JSON.stringify(res));
                        resolve();
                    }).catch(error => reject(error));
                }).catch(error => reject(error));
                
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

function updateRole(email,role){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    const updateQuery = { email : email};
    const updateValues = { $set: {role : role}};

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
module.exports.updateRole = updateRole;


function addLogs(email, role, action, status){
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colLogs);
    var mail = email;
    if(!email){
        mail = "N/A";
    }
    
    console.log(mail);
    console.log(action);

    const info = {
        email: mail,
        role: role,
        date: getCurrentDate(),
        action: action,
        status: status
    }

    col.insertOne(info).then(function(res){
    }).catch(errorFn);

}
module.exports.addLogs = addLogs;


function getCurrentDate() {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');

    const dateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return dateTime;
}

function verifySecurityQuestions(email, providedAnswers) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    return new Promise((resolve, reject) => {
        col.findOne({ email: email }).then(function(user) {
            if (!user || !user.securityQuestions) {
                resolve(false);
                return;
            }

            let correctAnswers = 0;
            let questionsVerified = 0;

            user.securityQuestions.forEach((storedQA, index) => {
                const providedAnswer = providedAnswers[index];
                if (!providedAnswer) {
                    questionsVerified++;
                    if (questionsVerified === user.securityQuestions.length) {
                        resolve(correctAnswers === user.securityQuestions.length);
                    }
                    return;
                }

                bcrypt.compare(providedAnswer.answer.toLowerCase().trim(), storedQA.answer, function(err, result) {
                    if (result && providedAnswer.question === storedQA.question) {
                        correctAnswers++;
                    }
                    
                    questionsVerified++;
                    if (questionsVerified === user.securityQuestions.length) {
                        resolve(correctAnswers === user.securityQuestions.length);
                    }
                });
            });
        }).catch(reject);
    });
}
module.exports.verifySecurityQuestions = verifySecurityQuestions;

// Verify security questions for password reset
function verifySecurityQuestionsForReset(email, expectedQuestions, providedAnswers) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    return new Promise((resolve, reject) => {
        col.findOne({ email: email }).then(function(user) {
            if (!user || !user.securityQuestions) {
                resolve(false);
                return;
            }

            let correctAnswers = 0;
            let questionsVerified = 0;

            expectedQuestions.forEach((expectedQA, index) => {
                const providedAnswer = providedAnswers[index];
                if (!providedAnswer) {
                    questionsVerified++;
                    if (questionsVerified === expectedQuestions.length) {
                        resolve(correctAnswers === expectedQuestions.length);
                    }
                    return;
                }

                // Find the corresponding stored question
                const storedQA = user.securityQuestions.find(qa => qa.question === expectedQA.question);
                if (!storedQA) {
                    questionsVerified++;
                    if (questionsVerified === expectedQuestions.length) {
                        resolve(correctAnswers === expectedQuestions.length);
                    }
                    return;
                }

                bcrypt.compare(providedAnswer.toLowerCase().trim(), storedQA.answer, function(err, result) {
                    if (result) {
                        correctAnswers++;
                    }
                    
                    questionsVerified++;
                    if (questionsVerified === expectedQuestions.length) {
                        resolve(correctAnswers === expectedQuestions.length);
                    }
                });
            });
        }).catch(reject);
    });
}
module.exports.verifySecurityQuestionsForReset = verifySecurityQuestionsForReset;

// Lock password reset attempts
function lockPasswordReset(email, duration) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);
    
    const lockUntil = Date.now() + duration;
    
    return new Promise((resolve, reject) => {
        col.updateOne(
            { email: email },
            { $set: { passwordResetLockUntil: lockUntil, passwordResetAttempts: 0 } }
        ).then(res => resolve(res.modifiedCount > 0))
         .catch(reject);
    });
}
module.exports.lockPasswordReset = lockPasswordReset;

// Check if password can be changed (reuse and timing checks)
function canChangePassword(email, newPassword) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    return new Promise(async (resolve, reject) => {
        try {
            const user = await col.findOne({ email: email });
            if (!user) {
                resolve({ allowed: false, reason: 'User not found.' });
                return;
            }

            // Check if password is at least 1 day old
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (user.lastPasswordChange && user.lastPasswordChange > oneDayAgo) {
                resolve({ 
                    allowed: false, 
                    reason: 'Password was recently changed. Please wait at least 24 hours before changing again.' 
                });
                return;
            }

            // Check password history (last 5 passwords)
            if (user.passwordHistory && user.passwordHistory.length > 0) {
                // Check against all historical passwords
                for (let oldHash of user.passwordHistory) {
                    const isMatch = await new Promise((resolveMatch) => {
                        bcrypt.compare(newPassword, oldHash, function(err, result) {
                            resolveMatch(result);
                        });
                    });
                    
                    if (isMatch) {
                        resolve({ 
                            allowed: false, 
                            reason: 'Cannot reuse previous passwords. Please choose a different password.' 
                        });
                        return;
                    }
                }
            }

            const isCurrentMatch = await new Promise((resolveMatch) => {
                bcrypt.compare(newPassword, user.password, function(err, result) {
                    resolveMatch(result);
                });
            });

            if (isCurrentMatch) {
                resolve({ 
                    allowed: false, 
                    reason: 'New password cannot be the same as current password.' 
                });
                return;
            }

            resolve({ allowed: true });
        } catch (error) {
            reject(error);
        }
    });
}
module.exports.canChangePassword = canChangePassword;

// johans - Update password with history tracking
function updatePasswordWithHistory(email, newPassword) {
    const dbo = mongoClient.db(databaseName);
    const col = dbo.collection(colUsers);

    return new Promise((resolve, reject) => {
        bcrypt.hash(newPassword, saltRounds, function(err, newHash) {
            if (err) {
                reject(err);
                return;
            }

            col.findOne({ email: email }).then(function(user) {
                if (!user) {
                    reject(new Error('User not found'));
                    return;
                }

                const updateData = {
                    password: newHash,
                    lastPasswordChange: new Date(),
                    passwordResetLockUntil: null,
                    passwordResetAttempts: 0,
                    failedAttempts: 0,
                    lockUntil: null
                };

                let passwordHistory = user.passwordHistory || [];

                passwordHistory.unshift(user.password);
                
                if (passwordHistory.length > 5) {
                    passwordHistory = passwordHistory.slice(0, 5);
                }
                
                updateData.passwordHistory = passwordHistory;

                col.updateOne(
                    { email: email },
                    { $set: updateData }
                ).then(res => resolve(res.modifiedCount > 0))
                 .catch(reject);
            }).catch(reject);
        });
    });
}
module.exports.updatePasswordWithHistory = updatePasswordWithHistory;

function finalClose(){
    console.log('Close connection at the end!');
    mongoClient.close();
    process.exit();
}

process.on('SIGTERM',finalClose);  //general termination signal
process.on('SIGINT',finalClose);   //catches when ctrl + c is used
process.on('SIGQUIT', finalClose); //catches other termination commands


    