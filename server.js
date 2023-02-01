require("dotenv").config();
//Import config
const defaults = require("./config/default").defaults;
//Router
const express = require("express");
//For login session and statistics
const session = require('express-session');
//For data about client
const sniffr = require("sniffr");
//For forms
const formidable = require('formidable');
//Moving uploaded files
const fs = require('fs');
//Server stats detection
const os = require("os");
//Get server ip address
const ip = require("ip");
//Working with files
const path = require('path');
//Mongodb
const { MongoClient, ObjectId } = require("mongodb");
const mongo  = new MongoClient(process.env.CONNECTION_STRING || "mongodb://localhost:27017/");
//Hash for api and login
const sha1 = require("sha1");

//Variables for analytics
let clients = [];
let admins = [];
let messages = [];
let requestCount = 0;
let requestClients = 0;

const app = express();
app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use('/favicon.ico', express.static('public/images/favicon.ico'));
app.use(session({
    secret: process.env.SECRET_KEY || (Math.random() + 1).toString(36).substring(2),
    resave: false,
    saveUninitialized: false
}));

app.get("/", (req, res) => {
    let reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    //Valudate source address
    if(defaults.trustedClientDomains.includes(req.hostname)) {
        if(!req.session.listed && req.query.nostats === undefined) {
            req.session.listed = true;
            requestClients++;
            console.log(`New client from ${reqIp}`);
            sendMessage("Nový klient", req.headers['x-forwarded-for'] || req.socket.remoteAddress, "success");
        }
    
        const s = new sniffr();
        s.sniff(req.headers['user-agent']);
        if(s.browser.name == "ie") {
            res.render(__dirname + "/views/error/not-supported-browser");
        }
    
        else {
            res.render(__dirname + "/views/client/slideshow");
        }
    }

    else {
        res.setHeader('content-type', 'application/json');
        res.status(403).send('{"status": 403, "error": "Forbidden", "message": "Untrusted domain"}');
        console.warn(`Request from untrusted domain ${req.hostname} from ip ${reqIp}`);
    }
});

app.get("/api/sites", (req, res) => {
    if(defaults.trustedClientDomains.includes(req.hostname)) {
        let dbo = mongo.db(defaults.DB_name);
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

                dbo.collection("timelists").find({}, {projection: {_id: 0}}).toArray(async (err, resultTimelists) => {
                    if(err) {
                        console.error(err);
                        return;
                    }

                    if(req.query.nostats === undefined) {
                        requestCount++;
                    }

                    //Get used gallery images
                    const galleryImages = {};
                    for await (const site of resultSites) {
                        if(site.type == "gallery") {
                            galleryImages[site.gallery] = await getImagesFromGallery(site.gallery);
                        }
                    }
                    let response = `${JSON.stringify(resultConfig).slice(1, -1)}, "sites": ${JSON.stringify(resultSites)}, "timelist": ${JSON.stringify(resultTimelists)}, "galleries": ${JSON.stringify(galleryImages)}`;
                    let hash = sha1(response); 
                    res.send(`{"hash": "${hash}", ${response}}`);
                });
            });
        });
    }

    else {
        res.setHeader('content-type', 'application/json');
        res.status(403).send('{"status": 403, "error": "Forbidden", "message": "Untrusted domain"}');
        console.warn(`Request from untrusted domain ${req.hostname} from ip ${reqIp}`);
    }
});

app.get("/api/admin", (req, res) => {
    let reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    res.setHeader('content-type', 'application/json');
    if(req.session.user) {
        let dbo = mongo.db(defaults.DB_name);
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

                    dbo.collection("timelists").find({}).toArray( async (err, resultTimelists) => {
                        if(err) {
                            console.error(err);
                            return;
                        }

                        const osStatus = {
                            "ip": ip.address(),
                            "uptime": os.uptime(),
                            "hostname": os.hostname(),
                            "mem_load": Number((os.totalmem() / (os.totalmem() - os.freemem()))).toFixed(2),
                            "cpu_load": os.loadavg()[0]
                        }

                        const galleries = await getGalleries();

                        const response = JSON.parse(`
                            {
                                "request_count": ${requestCount}, 
                                "request_clients": ${requestClients}, 
                                "clients": ${JSON.stringify(clients, ["ip", "os", "browser"])}, 
                                "server_status": ${JSON.stringify(osStatus)}, 
                                ${JSON.stringify(resultConfig).slice(1, -1)}, 
                                ${JSON.stringify(resultFonts).slice(1, -1)},
                                "sites": ${JSON.stringify(resultSites)}, 
                                "timelists": ${JSON.stringify(resultTimelists)}, 
                                "messages": ${JSON.stringify(messages)},
                                "galleries": ${JSON.stringify(galleries)}
                            }
                        `);

                        res.send(JSON.stringify(response));
                    });
                });
            });
        });
    }

    else {
        res.status(401).send('{"status": 401, "error": "Unauthorized"}');
        console.warn(`Unauthorized request to /api/admin from ip ${reqIp}`);
    }
});

app.get("/admin", (req, res) => {
    const s = new sniffr();
    s.sniff(req.headers['user-agent']);
    if(s.browser.name == "ie") {
        res.render(__dirname + "/views/error/not-supported-browser");
    }

    else {
        if(req.session.user) {
            res.render(__dirname + "/views/admin/index", {
                galleryPath: `${__dirname}/public/galleries`,
                clientUrl: `http://${ip.address()}:${defaults.port}`
            });
        }
    
        else {
            res.render(__dirname + "/views/login/index");
        }
    }
});

app.post("/login", (req, res) => {
    let form = new formidable.IncomingForm();
    let reqIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    form.parse(req, (err, fields, files) => {
        let dbo = mongo.db(defaults.DB_name);
        dbo.collection("config").findOne({name: "password"}, {projection: {_id: 0, name: 0}}, (err, password) => {
            if(sha1(fields.password).localeCompare(password.value) == 0) {
                req.session.user = true;
                res.redirect("/admin");
                console.log("New admin login from " + reqIp);
                sendMessage("Nové přihlášení", reqIp, "success");
            }

            else {
                console.warn("Wrong admin password from " + reqIp);
                res.redirect("/admin?wrong-password");
                sendMessage("Neplatné heslo", reqIp, "error");
            }
        });
    });
});

app.get("/events/client", (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    }

    const s = new sniffr();
    s.sniff(req.headers['user-agent']);
    let newClient = {
        "ip": req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        "os": `${s.os.name.charAt(0).toUpperCase() + s.os.name.slice(1)} ${s.os.versionString}`,
        "browser": `${s.browser.name.charAt(0).toUpperCase() + s.browser.name.slice(1)} ${s.browser.version[0]}`,
        "res": res
    }

    res.writeHead(200, headers);
    clients.push(newClient);

    req.on('close', () => {
        const index = clients.indexOf(newClient);
        if (index > -1) {
            clients.splice(index, 1);
        }
    });
});

app.post("/admin/refresh", (req, res) => {
    if(req.session.user) {
        if(clients.length > 0) {
            let oldClients = clients;
            clients = [];
            oldClients.forEach(client => client.res.write('data: refresh\n\n'));
            res.send("Klienti byli refreshnuti");
        }

        else {
            res.send("Nebyl nalezen žádný klient")
        }
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get("/events/messages", (req, res) => {
    if(req.session.user) {
        const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
        };
        res.writeHead(200, headers);
        admins.push(res);
        req.on('close', () => {
            const index = admins.indexOf(res);
            if (index > -1) {
                admins.splice(index, 1);
            }
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/logout", (req, res) => {
    sendMessage("Uživatel odhlášen", req.headers['x-forwarded-for'] || req.socket.remoteAddress, "warning");
    console.log("Logged out from " + req.headers['x-forwarded-for'] || req.socket.remoteAddress);
    req.session.user = null;
    res.redirect("/admin");
});

app.post("/admin/global", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            let dbo = mongo.db(defaults.DB_name);
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
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-timelist", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            let basename = fields.add_timelist_name.toLowerCase().replaceAll(" ", "").normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            let newObject = {
                "name": fields.add_timelist_name,
                "basename": basename,
                "heading": fields.add_timelist_heading,
                "description": fields.add_timelist_description,
                "values": []
            }

            let dbo = mongo.db(defaults.DB_name);
            dbo.collection("timelists").findOne({basename: basename}, (err, existingList) => {
                if(err) {
                    console.error(err);
                    return;
                }

                if(existingList) {
                    res.send("Seznam s tímto názvem již existuje");
                }

                else {
                    dbo.collection("timelists").insertOne(newObject, (err, dbRes) => {
                        if(err) {
                            console.error(err);
                            return;
                        }
    
                        res.send("Seznam byl přidán");
                    });
                }
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.delete("/admin/remove-timelist", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            let dbo = mongo.db(defaults.DB_name);
            dbo.collection("slides").findOne({timelist: fields.basename}, (err, usedList) => {
                if (usedList) {
                    res.send(`Tento seznam se používá u slidu "${usedList.name}"`);
                }

                else {
                    dbo.collection("timelists").deleteOne({basename: fields.basename}, (err, dbRem) => {
                        if(dbRem.deletedCount == 1) {
                            res.send("Seznam byl smazán");
                        }

                        else {
                            res.send("Seznam se nepodařilo smazat");
                        }
                    });
                }
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-time", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            let dbo = mongo.db(defaults.DB_name);
            dbo.collection("timelists").findOne({basename: fields.add_time_list}, (err, resList) => {
                if(err) {
                    console.error(err);
                    return;
                }

                if(resList) {
                    if(!resList.values.includes(fields.add_time_time)) {
                        let newTimes = resList.values;
                        newTimes.push(fields.add_time_time);
                        let newValues = { $set: {values: newTimes}};
                        dbo.collection("timelists").updateOne({basename: fields.add_time_list}, newValues, (err, resUpdate) => {
                            res.send("Čas byl přidán");
                        });
                    }

                    else {
                        res.send("Na tento čas již záznam existuje")
                    }
                }

                else {
                    res.send("Seznam nebyl nalezen");
                }
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-time", (req, res) => {
    if(req.session.user) {
        let form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            let dbo = mongo.db(defaults.DB_name);
            dbo.collection("timelists").findOne({basename: fields.add_time_list}, (err, resList) => {
                if(err) {
                    console.error(err);
                    return;
                }

                if(resList) {
                    if(!resList.values.includes(fields.add_time_time)) {
                        let newTimes = resList.values;
                        newTimes.push(fields.add_time_time);
                        let newValues = { $set: {values: newTimes}};
                        dbo.collection("timelists").updateOne({basename: fields.add_time_list}, newValues, (err, resUpdate) => {
                            res.send("Čas byl přidán");
                        });
                    }

                    else {
                        res.send("Na tento čas již záznam existuje");
                    }
                }

                else {
                    res.send("Seznam nebyl nalezen");
                }
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.put("/admin/remove-time", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm({ multiples: true});
        form.parse(req, (err, fields, files) => {
            let newTimes = Array.isArray(fields.values) ? fields.values : [];
            let newValues = {$set: {"values": newTimes}}

            let dbo = mongo.db(defaults.DB_name);
            dbo.collection("timelists").updateOne({_id: ObjectId(fields.id)}, newValues, (err, updated) => {
                if(updated.modifiedCount == 1) {
                    res.send("Časy byly upraveny");
                }

                else {
                    res.send("Seznam nebyl nalezen");
                }
            });
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/add-slide/", (req, res) => {
    if(req.session.user) {
       let form = new formidable.IncomingForm({ maxFileSize: 5 * 1024 * 1024 * 1024});
        form.parse(req, async (err, fields, files) => {
            let hidden = fields.add_slide_hidden ? true : false;
            let uploadedFile = await uploadFile(files.add_slide_file);
            let uploadedSubtitles = await uploadFile(files.add_slide_subtitles);

            let newValues = {  
                name: fields.add_slide_name,  
                type: fields.add_slide_type,
                color: fields.add_slide_color,
                font_family: fields.add_slide_font_family,
                background_color: fields.add_slide_background_color,
                filename: uploadedFile,
                subtitles: uploadedSubtitles,
                timeout: Number(fields.add_slide_timeout * 1000),
                text: fields.add_slide_text,
                url: fields.add_slide_url,
                timelist: fields.add_slide_timelist,
                gallery: fields.add_slide_gallery,
                hidden: hidden
            }

            let dbo = mongo.db(defaults.DB_name);
            dbo.collection("slides").find({}).toArray((err, res) => {
                if (err) {
                    console.error(err);
                    return;
                }

                newValues.position = Number(res.length + 1);
                dbo.collection("slides").insertOne(newValues, (err, dbRes) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                });
            });
            res.redirect("/admin");
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.delete("/admin/remove-slide", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            if(fields.id) {
                let dbo = mongo.db(defaults.DB_name);
                dbo.collection("slides").findOneAndDelete({}, (err, dbRemRes) => {
                    if (err) {
                        console.error(err);
                        return;
                    }

                    else if(dbRemRes.value) {
                        if(dbRemRes.value.filename || dbRemRes.value.subtitles) {
                            try {
                                if(dbRemRes.value.filename && fs.existsSync(__dirname + "/public/content/" + dbRemRes.value.filename)) {
                                    fs.unlinkSync(__dirname + "/public/content/" + dbRemRes.value.filename);
                                    console.log("Removing file " + dbRemRes.value.filename);
                                }
    
                                if(dbRemRes.value.subtitles && fs.existsSync(__dirname + "/public/content/" + dbRemRes.value.subtitles)) {
                                    fs.unlinkSync(__dirname + "/public/content/" + dbRemRes.value.subtitles);
                                    console.log("Removing file " + dbRemRes.value.subtitles);
                                }
                            }
    
                            catch(err) {
                                console.error(err);
                            }
                        }

                        if(clients) {
                            let oldClients = clients;
                            clients = [];
                            oldClients.forEach(client => client.res.write('data: refresh\n\n'));
                        }

                        res.send("Slide byl odebrán");
                    }

                    else {
                        res.send("Slide nebyl nalezen");
                    }
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
                let dbo = mongo.db(defaults.DB_name);
                let newValues = { $set: {hidden: fields.status == "true" ? true : false}}
                dbo.collection("slides").updateOne({_id: ObjectId(fields.id)}, newValues, (err, dbRmRes) => {
                    if(err) {
                        console.error(err);
                        res.send("Záznam nebyl aktualizován");
                        return;
                    }
                    res.send("Záznam byl aktualizován");
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
        form.parse(req, async (err, fields, files) => {
            if(fields.edit_slide_id) {
                let uploadedFiles = await uploadFile(files.edit_slide_file);
                let uploadedSubtitles = await uploadFile(files.edit_slide_subtitles);
                let newValues = { 
                    $set: {
                        name: fields.edit_slide_name,
                        timeout: fields.edit_slide_timeout ? Number(fields.edit_slide_timeout * 1000) : null,
                        font_family: fields.edit_slide_box_font_family,
                        background_color: fields.edit_slide_background_color,
                        color: fields.edit_slide_color,
                        text: fields.edit_slide_text,
                        url: fields.edit_slide_url,
                        gallery: fields.edit_slide_gallery,
                        timelist: fields.edit_slide_timelist
                    }
                }

                if(uploadedFiles) {
                    newValues.$set.filename = uploadedFiles;
                }

                if(uploadedSubtitles) {
                    newValues.$set.subtitles = uploadedSubtitles;
                }


                let dbo = mongo.db(defaults.DB_name);
                dbo.collection("slides").updateOne({_id: ObjectId(fields.edit_slide_id)}, newValues, (err, dbRmRes) => {
                    if(err) {
                        console.error(err);
                        res.send("Záznam nebyl upraven");
                        return;
                    }
                    res.redirect("/admin/");
                });
            }
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.post("/admin/change-sequence", (req, res) => {
    if(req.session.user) {
        const form = new formidable.IncomingForm();
        form.parse(req, (err, fields, files) => {
            for (let key in fields) {
                let newValues = { 
                    $set: {
                        position: fields[key].position
                    }
                }

                let dbo = mongo.db(defaults.DB_name);
                dbo.collection("slides").updateOne({_id: ObjectId(fields[key].id)}, newValues, (err, dbRmRes) => {
                    if(err) {
                        console.error(err);
                        return;
                    }
                });
            }
            res.send("Pořadí bylo aktualizováno");
        });
    }

    else {
        res.status(401).send("401 Unauthorized");
    }
});

app.get("*", (req, res) => {
    sendMessage("Error 404", req.originalUrl, "error")
    res.status(404).send("404 Not Found");
});

app.post("*", (req, res) => {
    sendMessage("Error 405", req.originalUrl, "error")
    res.status(405).send("405 Method Not Allowed");
});

app.delete("*", (req, res) => {
    sendMessage("Error 405", req.originalUrl, "error")
    res.status(405).send("405 Method Not Allowed");
});

app.put("*", (req, res) => {
    sendMessage("Error 405", req.originalUrl, "error")
    res.status(405).send("405 Method Not Allowed");
});

async function setupServer() {
    try {
        if(!fs.existsSync(".env")) {
            console.warn(".env file doesn't exists, using default values!");
        }

        await connectDB();
        await runServer();
    }

    catch(err) {
        console.error(err);
    }

    finally {
        process.on('SIGINT', async () => {
            sendMessage("Vypínání serveru", "Proces byl přerušen", "error");
            console.log("\nStopping server...");
            try {
                await mongo.close();
            }

            catch(err) {
                console.error(err);
            }

            finally {
                console.log("Disconnected from database");
            }

            process.exit(0);
        });
    }
}

async function getGalleries() {
    return new Promise((resolve, reject) => {
        if(fs.existsSync(path.resolve(__dirname, "public", "galleries")) == false) {
            fs.mkdirSync(path.resolve(__dirname, "public", "galleries"), {recursive: true});
            resolve({});
        }

        const galleries = {};
        fs.readdir(path.resolve(__dirname, "public", "galleries"), { withFileTypes: true }, async (err, files) => {
            if(err) {
                reject(err);
            }

            for await (const file of files) {
                if(file.isDirectory()) {
                    galleries[file.name] = [];
                    const imagesInGallery = await fs.promises.readdir(path.resolve(__dirname, "public", "galleries", file.name), { withFileTypes: true });

                    for await (const image of imagesInGallery) {
                        if(image.isFile) {
                            galleries[file.name].push(image.name);
                        }

                        else {
                            console.warn("Don't place directory inside gallery directory");
                        }
                    }
                }
    
                else {
                    console.warn("Don't place files inside gallery directory");
                }
            }

            resolve(galleries);
        });
    });
}

async function getImagesFromGallery(galleryName) {
    return new Promise((resolve, reject) => {

        if(fs.existsSync(path.resolve(__dirname, "public", "galleries", galleryName)) == false) {
            console.error("Target gallery doesn't exists");
            reject();
        }

        const galleryImages = [];
        fs.readdir(path.resolve(__dirname, "public", "galleries", galleryName), { withFileTypes: true }, async (err, images) => {
            if(err) {
                reject(err);
            }

            for await (const image of images) {
                if(image.isFile()) {
                    galleryImages.push(image.name);
                }
                
                else {
                    console.warn("Don't place directory inside gallery directory");
                }
            }

            //Sort files by date
            galleryImages.sort((a, b) => {
                return fs.statSync(path.resolve(__dirname, "public", "galleries", galleryName, a)).mtime.getTime() - fs.statSync(path.resolve(__dirname, "public", "galleries", galleryName, b)).mtime.getTime();
            });
            resolve(galleryImages);
        });
    });
}

async function connectDB() {
    try {
        console.log("Attempt to connect to database...");
        await mongo.connect();
        await mongo.db(defaults.DB_name).command({ ping: 1 });
    }

    catch(err) {
        console.error(err);
    }

    finally {
        console.log("Successfully connected to database");
    }
}

async function runServer() {
    app.listen(defaults.port, (err) => { 
        if(err) {
            console.error(err);
            return;
        }
    
        console.log(`Server is running on port ${defaults.port}...`);
    });
}

function uploadFile(file) {
    return new Promise((resolve, reject) => {
        let newFilename = null;
        if(file && file.size != 0) {
            if(fs.existsSync(__dirname + "/public/content/") === false) {
                fs.mkdirSync(__dirname + "/public/content/", { recursive: true });
                console.log("Creating directory for public content");
            }

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

            fs.copyFile(oldPath, newPath, (err) => {
                if (err) {
                    console.error(err);
                    reject();
                }
    
                newFilename = path.parse(newPath).base;
                console.log("New uploaded file " + newFilename);
                resolve(newFilename);
            });
        }

        else {
            resolve(null);
        }
    });
}

function sendMessage(headling, message, type) {
    const time = new Date();
    let hour = time.getHours() > 9 ? time.getHours() : "0" + time.getHours();
    let minutes = time.getMinutes() > 9 ? time.getMinutes() : "0" + time.getMinutes();

    let newMessage = {
        "type": type,
        "headling": headling,
        "message": message,
        "time": `${hour}:${minutes}` 
    }

    messages.push(newMessage);
    if(admins) {
        admins.forEach(admin => admin.write(`data: ${JSON.stringify(newMessage)}\n\n`));
    }
}

setupServer();
