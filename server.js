require("dotenv").config();
const express = require("express");
const session = require('express-session');
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.CONNECTION_STRING);
const sha1 = require("sha1");
const config = require("config");

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

app.get("/api/admin", (req, res) => {
    if(req.session.user) {
        MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
            if(err) {
                console.error(err);
                return;
            }
            let dbo = database.db("slideshow");
            dbo.collection("slides").find({}).sort({ "position": 1 }).toArray((err, resultSites) => {
                if(err) {
                    console.error(err);
                    return;
                }
    
                dbo.collection("config").findOne({name: "config"}, {projection: {_id: 0, name: 0}}, (err, resultConfig) => {
                    if(err) {
                        console.error(err);
                        return;
                    }

                    dbo.collection("config").findOne({name: "fonts"}, {projection: {_id: 0, name: 0}}, (err, resultFonts) => {
                        if(err) {
                            console.error(err);
                            return;
                        }
                        res.send(`{${JSON.stringify(resultConfig).slice(1, -1)}, ${JSON.stringify(resultFonts).slice(1, -1)},"sites": ${JSON.stringify(resultSites)}}`);
                    });
                });
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get("/admin", (req, res) => {
    if(req.session.user) {
        res.sendFile(__dirname + "/admin.html");
    }

    else {
        res.sendFile(__dirname + "/login.html");
    }
});

app.post("/login", (req, res) => {
    MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
        if(err) {
            console.error(err);
            return;
        }
        let dbo = database.db("slideshow");
        dbo.collection("config").findOne({name: "password"}, {projection: {_id: 0, name: 0}}, (err, password) => {
            if(sha1(req.body.password).localeCompare(password.value) == 0) {
                req.session.user = "user";
                res.redirect("/admin");
            }

            else {
                console.warn("Wrong password from " + req.socket.remoteAddress);
                res.redirect("/admin?wrong-password");
            }
        });
    });
});

app.post("/admin/logout", (req, res) => {
    console.warn("Logged out from " + req.socket.remoteAddress);
    req.session.user = null;
    res.redirect("/admin");
});

app.post("/admin/global", (req, res) => {
    if(req.session.user) {
        MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
            if(err) {
                console.error(err);
                return;
            }

            let dbo = database.db("slideshow");
            let newValues = { $set: {transition_time: req.body.transition_time, font_family: req.body.font_family, background_color: req.body.background_color, text_color: req.body.text_color}};

            dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                if(err) {
                    res.send("Aktualizace se nezdařila");
                    console.log(err);
                    return;
                }

                res.send("Aktualizace byla úspěšná");
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/remove-visitations", (req, res) => {
    if(req.session.user) {
        MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
            if(err) {
                console.error(err);
                return;
            }

            if(!Array.isArray(req.body['visitationtimes[]']) && req.body['visitationtimes[]']) {
                console.log(req.body['visitationtimes[]'])
                req.body['visitationtimes[]'] = [ req.body['visitationtimes[]'] ];
                console.log(req.body['visitationtimes[]'])
            }

            else {
                req.body['visitationtimes[]'] ? req.body['visitationtimes[]']: [];
            }

            let newValues = { $set: { visitation_times: req.body['visitationtimes[]']} };
            let dbo = database.db("slideshow");
            dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                if(err) {
                    res.send("Aktualizace se nezdařila");
                    console.log(err);
                    return;
                }

                res.send("Aktualizace byla úspěšná");
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-visitations", (req, res) => {
    if(req.session.user) {
        MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
            if(err) {
                console.error(err);
                return;
            }
            
            let dbo = database.db("slideshow");
            dbo.collection("config").findOne({name: "config"}, (err, getTime) => {
                if(err) {
                    console.log(err);
                    return;
                }

                getTime.visitation_times ? getTime.visitation_times = getTime.visitation_times : getTime.visitation_times = [];

                if(getTime.visitation_times.includes(req.body.hours + ":" + req.body.minutes)) {
                    res.send("Prohlídka na tento čas je již nastavena");
                }

                else {
                    getTime.visitation_times.push(req.body.hours + ":" + req.body.minutes);
                    let newValues = { $set: { visitation_times: getTime.visitation_times} };
                    dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                        if(err) {
                        res.send("Aktualizace se nezdařila");
                            console.log(err);
                            return;
                        }

                        res.send("Aktualizace byla úspěšná");
                    });
                }
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get("*", (req, res) => {
    res.status(404).send("Error 404");
});

app.listen(config.get("port"), () => { console.log(`Server is running on port ${config.get("port")}...`) });