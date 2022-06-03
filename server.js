const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const app = express();
const port = 3000;
require("dotenv").config();

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/sites", (req, res) => {
    MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
        if(err) {
            console.error(err);
            return;
        }
        let dbo = database.db("slideshow");
        dbo.collection("slides").find({hidden: false}, { projection: {_id: 0, position: 0, hidden: 0} }).sort({ "position": 1 }).toArray((err, resultSites) => {
            if(err) {
                console.error(err);
                return;
            }
    
            res.send("{\"sites\": " + JSON.stringify(resultSites) + "}");
        });
    });
});

app.get("*", (req, res) => {
    res.status(404).send("Error 404");
});

app.listen(port, () => { console.log(`Server is running on port ${port}...`) });