
const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");
const sha1 = require("sha1");
const config = require("config");
const os = require("os");
const app = express();
require("dotenv").config();

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/api/sites", (req, res) => {
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

            dbo.collection("visitations").findOne({}, (err, resultTimes) => {
                if(err) {
                    console.error(err);
                    return;
                }
                let response;
                response = `"transition_time": ${config.get("transition_timeout")},`;
                response += `"font_family": "${config.get("default_font_family")}",`;
                response += `"background_color": "${config.get("default_background_color")}",`;
                response += `"text_color": "${config.get("default_text_color")}",`;
                response += `"sites": ${JSON.stringify(resultSites)},`
                response += `"visitation_times": ${JSON.stringify(resultTimes.times)}`


                let hash = sha1(response); 
                res.send(`{"hash": "${hash}", ${response}}`);
            });
        });
    });
});

app.get("/api/admin", (req, res) => {
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

            dbo.collection("visitations").findOne({}, (err, resultTimes) => {
                if(err) {
                    console.error(err);
                    return;
                }
                let response;
                response = `"transition_time": ${config.get("transition_timeout")},`;
                response += `"font_family": "${config.get("default_font_family")}",`;
                response += `"background_color": "${config.get("default_background_color")}",`;
                response += `"text_color": "${config.get("default_text_color")}",`;
                response += `"sites": ${JSON.stringify(resultSites)},`
                response += `"visitation_times": ${JSON.stringify(resultTimes.times)}`


                let hash = sha1(response); 
                res.send(`{"hash": "${hash}", ${response}}`);
            });
        });
    });
});

app.get("/admin", (req, res) => {
    res.sendFile(__dirname + "/admin.html");
});

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});

app.get("*", (req, res) => {
    res.status(404).send("Error 404");
});

app.listen(config.get("port"), () => { console.log(`Server is running on port ${config.get("port")}...`) });