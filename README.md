# CCAPDEV
 This repository is For a web application project. This project is a reservation management system used to reserve slots from a computer labratory.

Instructions:
1. Open terminal in and go to the same terminal.
2. Type "npm init" to initialize the code.
3. Type "npm i express express-handlebars body-parser mongodb bcrypt dotenv nodedemon" or "npm install" to install the necessary modules.
4. Type "node app.js" to run the server then go to localhost:3000 on the browser.

Sample Data
1. SampleData are located in the sampleData Folder
2. Run the app.js first to load the names of the collections
3. Import each of the files to their respective collections based on their filenames.
4. Refresh the page to show the updated values.
5. Structure of the database should look something like this:
     - REServerDB
        - labs
        - reservation
        - schedule
        - users

Sample data locations
1. All sample datas are located in the date 2024-03-15 of each lab
2. Each lab contains the reservation of a different user
3. 5 user and 5 labs were generated with 1 reservation per lab