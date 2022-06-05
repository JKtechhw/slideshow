
const express = require("express");
const session = require('express-session');
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const sha1 = require("sha1");
const config = require("config");
const res = require("express/lib/response");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

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

            dbo.collection("config").findOne({name: "config"}, {projection: {_id: 0, name: 0}}, (err, resultConfig) => {
                if(err) {
                    console.error(err);
                    return;
                }
                let response = ` ${JSON.stringify(resultConfig).slice(1, -1)}, "sites": ${JSON.stringify(resultSites)}`;


                let hash = sha1(response); 
                res.send(`{"hash": "${hash}", ${response}}`);
            });
        });
    });
});

app.get("/admin", (req, res) => {
    if(req.session.user) {
        res.sendFile(__dirname + "/admin.html");
    }

    else {
        res.sendFile(__dirname + "/login.html");
    }
});

app.post("/admin", (req, res) => {
    if(req.body.password == "pepa") {
        req.session.user = "user";
        res.redirect("/admin");
    }

    else {
        res.redirect("/admin?wrong-password");
    }
});

app.post("/admin/logout", (req, res) => {
    req.session.user = null;
    res.redirect("/admin");
});

app.get("*", (req, res) => {
    res.status(404).send("Error 404");
});

app.listen(config.get("port"), () => { console.log(`Server is running on port ${config.get("port")}...`) });