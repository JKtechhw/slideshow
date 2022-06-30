'use struct'

class slideshow {
    constructor(target, api, contentDir) {
        //Save parameters to var
        this.target = document.querySelector(target);
        this.api = api;
        this.dir = contentDir;
        this.videoEndedEvent = this.changeSite.bind(this);
        this.hash;

        if(window.location.search.substring(1) == "nostats") {
            this.api += "?nostats";
        }

        //Set event source
        var evtSource = new EventSource("/events/client");

        evtSource.addEventListener("message", (e) => {
            switch(e.data) {
                case "refresh":
                    let coverSide = document.createElement("div");
                    coverSide.classList.add("cover-side");
                    this.target.insertAdjacentElement("afterbegin", coverSide);
                    setTimeout(() => {
                        location.reload(true);
                    }, 1000);
                    break;
            }
        });

        //If target element exist fetch data from api
        if(this.target) {
            this.fetchFromApi();
        }

        else {
            console.error("Target elements doesnt exists!");
        }
    }

    async fetchFromApi() {
        //Fetch data from api and save to json
        try {
            let response = await fetch(this.api);
            response = await response.json();
            if(response.sites && response.sites.length != 0) {

                if(this.hash == response.hash) {
                    this.recoverSites();
                }

                else {
                    //Save response to variables
                    this.sites = response.sites;
                    this.transitionTime = response.transition_time;
                    this.timeLists = response.timelist;

                    //Remove prev style
                    if(document.head.querySelector("style.global-style")) {
                        document.head.querySelector("style.global-style").remove();
                    }

                    //Set default style
                    let css = `body { font-family: ${response.font_family}; background-color: ${response.background_color};} .side { transition: opacity ${response.transition_time}ms; color: ${response.text_color}; background-color: ${response.background_color};}`;
                    let style = document.createElement("style");
                    style.classList.add("global-style");
                    style.setAttribute("type", "text/css");
                    document.head.appendChild(style);
                    style.appendChild(document.createTextNode(css));
                    this.buildSlideshowBox();
                }

                //Save new hash
                if(this.hash !== "x") {
                    this.hash = response.hash;
                }
            }

            else {
                //if response is empty, try in 10 seconds
                console.warn("Response is empty, waiting 10 seconds");
                setTimeout(this.fetchFromApi.bind(this), 10000);
            }
        }
        
        catch(err) {  
            //if error, try in 10 seconds
            console.error(err);
            setTimeout(this.fetchFromApi.bind(this), 10000);
        }
    }

    async buildSlideshowBox() {
        //Order times in timelists
        if(this.timeLists.length > 0) {
            this.timeLists.forEach(timelist => {
                if(timelist.values.length > 0) {
                    timelist.values.sort((a, b) => {
                        return a.localeCompare(b);
                    });
                }
            });
        }

        //Create all sites from json
        this.target.innerHTML = "";
        this.sites.forEach(element => {
            this.addSite(element);
        });

        if(!this.target.querySelector(".side")) {
            this.hash = "x";
            setTimeout(() => {
                this.fetchFromApi();
            }, 10000);
            return;
        }

        //Set last child as active with animation effect
        this.target.querySelector(".side:last-child").style.animation = `fadeIn ${this.transitionTime}ms linear`;
        this.target.querySelector(".side:last-child").classList.add("active");
        //Set timeout on first screen
        if(this.sites[0].type === "video") {
            setTimeout(() => {
                this.target.querySelector("video:last-child").play();
            }, 100);

            this.target.querySelector("video:last-child").addEventListener("ended", this.videoEndedEvent);
        }

        else if (this.sites[0].type == "cooldown") {
            let timelist = this.timeLists.find(o => o.basename === this.sites[0].timelist);
            let interval = this.cooldown(this.target.querySelector(".side:last-child .cooldown-clock"), timelist.values);
            setTimeout(() => {
                //Stop when not active
                if (interval) {
                    clearInterval(interval);
                }
                this.changeSite();
            }, this.sites[0].timeout);
        }

        else {
            setTimeout(() => {
                this.changeSite();
            }, this.sites[0].timeout);
        }
    }

    async recoverSites() {
        let sites = this.target.querySelectorAll(".side");
        //reset status for sites
        sites.forEach(element => {
            element.classList.remove("remove");
            element.classList.remove("active");
            //Remove event for video
            if(element.dataset.type == "video") {
                element.removeEventListener("ended", this.videoEndedEvent);
            }
        });
        
        this.target.querySelector(".side:last-child").classList.add("active");
        if(this.sites[0].type == "video") {
            setTimeout(() => {
                this.target.querySelector("video:last-child").play();
            }, 100);

            this.target.querySelector("video:last-child").addEventListener("ended", this.videoEndedEvent);
        }

        else if (this.sites[0].type == "cooldown") {
            let timelist = this.timeLists.find(o => o.basename === this.sites[0].timelist);
            let interval = this.cooldown(this.target.querySelector(".side:last-child .cooldown-clock"), timelist.values);
            setTimeout(() => {
                //Stop when not active
                if (interval) {
                    clearInterval(interval);
                }
                this.changeSite();
            }, this.sites[0].timeout);
        }

        else {
            setTimeout(() => {
                this.changeSite();
            }, this.sites[0].timeout);
        }
    }

    addSite(element) {
        let side;
        if(element.type == "image") {
            side = document.createElement("img");
            if(element.background_color) {
                side.style.backgroundColor = element.background_color;
            }
            side.dataset.timeout = element.timeout;
            side.src = this.dir + element.filename;
        }

        else if (element.type == "video") {
            side = document.createElement("video");

            side.style.backgroundColor = element.background_color;
            side.muted = true;
            //Source for video 
            let videoSrc = document.createElement("source");
            videoSrc.src = this.dir + element.filename;

            //Track for subtitles
            if(element.subtitles) {
                let subtitlesTrack = document.createElement("track");
                subtitlesTrack.src = this.dir + element.subtitles;
                subtitlesTrack.default = true;
                side.insertAdjacentElement("beforeend", subtitlesTrack);
            }

            side.appendChild(videoSrc);
        }

        else if (element.type == "iframe") {
            side = document.createElement("iframe");
            side.setAttribute("scrolling", "no");
            side.dataset.timeout = element.timeout;
            side.src = element.url;
        }

        else if (element.type == "text") {
            //Create box for text
            side = document.createElement("div");
            side.classList.add("text");
            side.dataset.timeout = element.timeout;
            //Create H1 for text
            let sideH = document.createElement("h1");
            sideH.innerText = element.text
            sideH.style.color = element.color;
            if(element.font_family) {
                sideH.style.fontFamily = element.font_family;
            }
            //create background image
            if(element.filename) {
                side.style.backgroundImage = `url(${this.dir}/${element.filename})`; 
            }
            side.style.backgroundColor = element.background_color;
            side.appendChild(sideH);
        }

        else if (element.type == "cooldown") {
            let timelist = this.timeLists.find(o => o.basename === element.timelist);
            //div
            if(timelist) {
                side = document.createElement("div");
                side.className = "cooldown";
                side.style.backgroundColor = element.background_color;
                side.style.color = element.color;
                side.dataset.timeout = element.timeout;
                side.dataset.cooldown_list = element.timelist;

                if(element.font_family) {
                    side.style.fontFamily = element.font_family;
                }

                //title
                let title = document.createElement("h1");
                title.className = "cooldown-title";
                title.innerHTML = timelist.heading;

                //description
                let description = document.createElement("p");
                description.className = "cooldown-desc";
                description.innerHTML = timelist.description;

                //label1
                let label1 = document.createElement("p");
                label1.className = "cooldown-label1";
                label1.innerHTML = "Časový harmonogram:"

                //times
                let times = document.createElement("p");
                times.className = "cooldown-times";
                times.innerHTML = timelist.values.join(" ");

                //label2
                let label2 = document.createElement("p");
                label2.className = "cooldown-label2";
                label2.innerHTML = "Další program začíná za:"

                //clock
                let clock = document.createElement("p");
                clock.className = "cooldown-clock";
                clock.innerHTML = ""
                
                if(element.filename) {
                    let backgroundImage = document.createElement("img");
                    backgroundImage.src = this.dir + element.filename;
                    side.appendChild(backgroundImage);
                }

                side.appendChild(title);
                side.appendChild(description);
                side.appendChild(label1);
                side.appendChild(times);
                side.appendChild(label2);
                side.appendChild(clock);

                document.getElementById("slideshow-box").appendChild(side);   
            }

            else {
                console.error("Invalid time list");
                return;
            }
        }

        else {
            return;
        }
        
        side.dataset.type = element.type;
        side.classList.add("side");
        this.target.insertAdjacentElement("afterbegin", side);
    }

    changeSite() {
        //All not removed sites
        let childs = this.target.querySelectorAll(".side:not(.remove)");
        //Site for remove
        let childToRemove = childs[childs.length - 1];
        //New active site
        let newSite = childs[childs.length - 2];
        //FadeOut
        if(childToRemove && newSite) {
            childToRemove.classList.remove("active");
            childToRemove.classList.add("remove");
        }

        setTimeout(() => {
            //For fadeIn efect
            if(newSite) {
                newSite.classList.add("active");
            }
        }, this.transitionTime);

        if(newSite) {
            //If next site is video, set event when ends
            if(newSite.dataset.type == "video") {
                setTimeout(() => {
                    newSite.play();
                }, 300);
                newSite.addEventListener("ended", this.videoEndedEvent);
            }

            else if (newSite.dataset.type == "cooldown") {
                let timelist = this.timeLists.find(o => o.basename === newSite.dataset.cooldown_list);
                let interval = this.cooldown(newSite.querySelector(".cooldown-clock"), timelist.values);
                setTimeout(() => {
                    //Stop when not active
                    if (interval) {
                        clearInterval(interval);
                    }
                    this.changeSite();
                }, newSite.dataset.timeout);
            }

            else {
                setTimeout(this.changeSite.bind(this), newSite.dataset.timeout);
            }
        }

        //If loop ends, fetch data from api
        else {
            setTimeout(() => {
                this.fetchFromApi();
            }, this.transitionTime);
        }
    }

    cooldown(target, times) {
        let nextVisitation;
        //Get next visitation time
        const date = new Date();
        for (let time of times) {
            if(date < new Date(`${Number(date.getFullYear())}/${date.getMonth() + 1}/${date.getDate()} ${time}`)) {
                nextVisitation = time;
                break;
            }
        }

        //If next visitation exist, start cooldown
        if(nextVisitation) {
            let interval;
            interval = setInterval(() => {
                const currentDate = new Date();
                const visitation = new Date(`${Number(currentDate.getFullYear())}/${currentDate.getMonth() + 1}/${currentDate.getDate()} ${nextVisitation}`);
                
                //Get time diff and convert ti hh:mm:ss
                let diff = (visitation - currentDate) / 1000;
                const sec = parseInt(diff, 10);
                let hours = Math.floor(sec / 3600);
                let minutes = Math.floor((sec - (hours * 3600)) / 60);
                let seconds = sec - (hours * 3600) - (minutes * 60);
        
                //If cooldown ends, stop interval
                if(seconds == 0 && minutes == 0 && hours == 0) {
                    clearInterval(interval);
                }

                //Fix single digit number format 
                if (hours < 10) {hours = "0" + hours;}
                if (minutes < 10) {minutes = "0" + minutes;}
                if (seconds < 10) {seconds = "0" + seconds;}
                target.innerHTML = `${hours}:${minutes}:${seconds}`;
            }, 1000);

            return interval;
        }

        else {
            target.innerHTML = 'Dnes již není naplánovaná žádná ';
        }
    }
}
