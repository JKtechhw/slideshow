require("dotenv").config();
const express = require("express");
const session = require('express-session');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require("mongodb");
const sha1 = require("sha1");
const config = require("config");
let requestCount = 0;
let requestClients = 0;

const app = express();
app.use(express.static("public"));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false
}));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/sites/index.html");
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

                requestCount++;
                if(!req.session.listed) {
                    req.session.listed = true;
                    requestClients++;
                    console.log("New client from " + req.socket.remoteAddress);
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
                        res.send(`{"request_count": ${requestCount}, "request_clients": ${requestClients}, ${JSON.stringify(resultConfig).slice(1, -1)}, ${JSON.stringify(resultFonts).slice(1, -1)},"sites": ${JSON.stringify(resultSites)}}`);
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
        res.sendFile(__dirname + "/sites/admin.html");
    }

    else {
        res.sendFile(__dirname + "/sites/login.html");
    }
});

app.post("/login", (req, res) => {
    let form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
            if(err) {
                console.error(err);
                return;
            }
            let dbo = database.db("slideshow");
            dbo.collection("config").findOne({name: "password"}, {projection: {_id: 0, name: 0}}, (err, password) => {
                if(sha1(fields.password).localeCompare(password.value) == 0) {
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
});

app.post("/admin/logout", (req, res) => {
    console.log("Logged out from " + req.socket.remoteAddress);
    req.session.user = null;
    res.redirect("/admin");
});

app.post("/admin/global", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                if(err) {
                    console.error(err);
                    return;
                }
    
                let dbo = database.db("slideshow");
                let newValues = { $set: {transition_time: fields.transition_time, font_family: fields.font_family, background_color: fields.background_color, text_color: fields.text_color}};
    
                dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                    if(err) {
                        res.send("Aktualizace se nezdařila");
                        console.error(err);
                        return;
                    }
    
                    res.send("Aktualizace byla úspěšná");
                });
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/remove-visitations", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm({multiples: true});
        form.parse(req, (err, fields, files) => {
            MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                if(err) {
                    console.error(err);
                    return;
                }

                if(!Array.isArray(fields.visitationtimes) && fields.visitationtimes) {
                    fields.visitationtimes = [ fields.visitationtimes ];
                }

                else {
                    fields.visitationtimes ? fields.visitationtimes : [];
                }

                let newValues = { $set: { visitation_times: fields.visitationtimes } };
                let dbo = database.db("slideshow");
                dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                    if(err) {
                        res.send("Časy se nepodařilo odebrat");
                        console.error(err);
                        return;
                    }

                    res.send("Časy byly úspěšně odebrány");
                });
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/remove-degustation", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm({multiples: true});
        form.parse(req, (err, fields, files) => {
            MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                if(err) {
                    console.error(err);
                    return;
                }

                if(!Array.isArray(fields.degustationtimes) && fields.degustationtimes) {
                    fields.degustationtimes = [ fields.degustationtimes ];
                }

                else {
                    fields.degustationtimes ? fields.degustationtimes : [];
                }

                let newValues = { $set: { degustation_times: fields.degustationtimes } };
                let dbo = database.db("slideshow");
                dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                    if(err) {
                        res.send("Časy se nepodařilo odebrat");
                        console.error(err);
                        return;
                    }

                    res.send("Časy byly úspěšně odebrány");
                });
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-visitations", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                if(err) {
                    console.error(err);
                    return;
                }
                
                let dbo = database.db("slideshow");
                dbo.collection("config").findOne({name: "config"}, (err, getTime) => {
                    if(err) {
                        console.error(err);
                        return;
                    }
    
                    getTime.visitation_times ? getTime.visitation_times = getTime.visitation_times : getTime.visitation_times = [];
    
                    if(getTime.visitation_times.includes(fields.hours + ":" + fields.minutes)) {
                        res.send("Prohlídka na tento čas je již nastavena");
                    }
    
                    else {
                        getTime.visitation_times.push(fields.hours + ":" + fields.minutes);
                        let newValues = { $set: { visitation_times: getTime.visitation_times} };
                        dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                            if(err) {
                            res.send("Aktualizace se nezdařila");
                                console.error(err);
                                return;
                            }
    
                            res.send("Aktualizace byla úspěšná");
                        });
                    }
                });
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-degustation", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                if(err) {
                    console.error(err);
                    return;
                }
                
                let dbo = database.db("slideshow");
                dbo.collection("config").findOne({name: "config"}, (err, getTime) => {
                    if(err) {
                        console.error(err);
                        return;
                    }
    
                    getTime.degustation_times ? getTime.degustation_times = getTime.degustation_times : getTime.degustation_times = [];
    
                    if(getTime.degustation_times.includes(fields.hours + ":" + fields.minutes)) {
                        res.send("Prohlídka na tento čas je již nastavena");
                    }
    
                    else {
                        getTime.degustation_times.push(fields.hours + ":" + fields.minutes);
                        let newValues = { $set: { degustation_times: getTime.degustation_times} };
                        dbo.collection("config").updateOne({name: "config"}, newValues, (err, dbres) => {
                            if(err) {
                            res.send("Aktualizace se nezdařila");
                                console.error(err);
                                return;
                            }
    
                            res.send("Aktualizace byla úspěšná");
                        });
                    }
                });
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-slide/", (req, res) => {
    if(req.session.user) {
       let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            let hidden = fields.add_slide_hidden ? true : false;
            uploadFiles(files.add_slide_file, files.add_slide_subtitles)
            .then(files => {
                let newValues = {  
                    name: fields.add_slide_name,  
                    type: fields.add_slide_type,
                    color: fields.add_slide_color,
                    font_family: fields.add_slide_font_family,
                    background_color: fields.add_slide_background_color,
                    filename: files[0],
                    subtitles: files[1],
                    timeout: Number(fields.add_slide_timeout * 1000),
                    text: fields.add_slide_text,
                    position: 8,
                    hidden: hidden
                }
    
                MongoClient.connect(process.env.CONNECTION_STRING, (err, db) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
    
                    let dbo = db.db("slideshow");
                    dbo.collection("slides").insertOne(newValues, (err, dbRes) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        db.close();
                    });
            });
            res.redirect("/admin");
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/remove-slide", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm();

        form.parse(req, (err, fields, files) => {
            if(fields.id) {
                MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                    if(err) {
                        console.error(err);
                        return
                    }
                    let dbo = database.db("slideshow");

                    dbo.collection("slides").deleteOne({_id: ObjectId(fields.id)}, (err, dbRmRes) => {
                        if(err) {
                            res.send("Slide se nepodařilo odebrat");
                            return;
                        }

                        res.send("Slide byl úspěšně odebrán");
                    });
                });
            }
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/hide-slide", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            if(fields.id) {
                MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                    if(err) {
                        console.error(err);
                        return;
                    }
                    let newValues = { $set: {hidden: fields.status == "true" ? true : false}}
                    let dbo = database.db("slideshow");
                    dbo.collection("slides").updateOne({_id: ObjectId(fields.id)}, newValues, (err, dbRmRes) => {
                        if(err) {
                            console.error(err);
                            res.send("Záznam nebyl aktualizován");
                            return;
                        }
                        res.send("Záznam byl aktualizován");
                    });
                });
            }
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/edit-slide", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            if(fields.edit_slide_id) {
                uploadFiles(files.edit_slide_file, files.edit_slide_subtitles)
                .then (files => {
                    let newValues = { 
                        $set: {
                            name: fields.edit_slide_name,
                            timeout: fields.edit_slide_timeout ? Number(fields.edit_slide_timeout * 1000) : null,
                            font_family: fields.edit_slide_box_font_family,
                            background_color: fields.edit_slide_background_color,
                            color: fields.edit_slide_color,
                            text: fields.edit_slide_text
                        }
                    }

                    if(files[0]) {
                        newValues.$set.filename = files[0];
                    }

                    if(files[1]) {
                        newValues.$set.subtitles = files[1];
                    }
    
                    MongoClient.connect(process.env.CONNECTION_STRING, (err, database) => {
                        if(err) {
                            console.error(err);
                            return;
                        }
    
                        let dbo = database.db("slideshow");
                        dbo.collection("slides").updateOne({_id: ObjectId(fields.edit_slide_id)}, newValues, (err, dbRmRes) => {
                            if(err) {
                                console.error(err);
                                res.send("Záznam nebyl upraven");
                                return;
                            }
                            res.redirect("/admin/");
                        });
                    });
                });
            }
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

async function uploadFiles(file, subtitles) {
    return new Promise((resolve, reject) => {
        let uploadFilename = null;
        let uploadSubtitles = null;

        if(file.size != 0) {
            let oldPath = file.filepath;
            let newPath = __dirname + "/public/content/" + file.originalFilename;
    
            if(fs.existsSync(newPath)) {
                let i = 1;

                while(fs.existsSync(newPath)) {
                    let filename = file.originalFilename;
                    newPath = __dirname + "/public/content/" + path.parse(filename).name + "-" + i + path.parse(filename).ext;
                    i++;
                }
            }
    
            fs.rename(oldPath, newPath, (err) => {

                if (err) {
                    console.error(err);
                    return;
                };

                uploadFilename = path.parse(newPath).base;
                console.log("New uploaded file " + uploadFilename);

                if(subtitles.size != 0) {
                    let oldPath = subtitles.filepath;
                    let newPath = __dirname + "/public/content/" + subtitles.originalFilename;
                    uploadSubtitles = subtitles.originalFilename;
            
                    if(fs.existsSync(newPath)) {
                        let i = 1;
                        while(fs.existsSync(newPath)) {
                            let filename = subtitles.originalFilename;
                            newPath = __dirname + "/public/content/" + path.parse(filename).name + "-" + i + path.parse(filename).ext;
                            i++;
                        }
                    }

                    fs.rename(oldPath, newPath, (err) => {
                        if (err) {
                            console.error(err);
                            return;
                        };

                        uploadSubtitles = path.parse(newPath).base;
                        console.log("New uploaded file " + uploadSubtitles);
                        resolve([uploadFilename, uploadSubtitles]);
                    });
                }

                else {
                    resolve([uploadFilename, uploadSubtitles]);
                }
            });
        }

        else {
            resolve([null, null]);
        }
    });
}