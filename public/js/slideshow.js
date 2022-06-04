'use struct'

class slideshow {
    constructor(target, api, contentDir) {
        //Save parameters to var
        this.target = document.querySelector(target);
        this.api = api;
        this.dir = contentDir;
        this.videoEndedEvent = this.changeSite.bind(this);
        this.hash;

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
        await fetch(this.api)
        .then(response => response.json()) //Convert to JSON
        .then(data => {
            if(data.sites && data.sites.length != 0) {
                this.sites = data.sites;

                if(this.hash == data.hash) {
                    this.recoverSites();
                }
    
                else {
                    //Apply default style
                    let css = `body { font-family: ${data.font_family}; } .side { transition: opacity ${data.transition_time}ms; }`;
                    let style = document.createElement("style");
                    style.type = "text/css";
                    document.head.appendChild(style);
                    style.appendChild(document.createTextNode(css));

                    this.visitationTimes = data.visitation_times;

                    this.buildSlideshowBox();
                }
    
                this.hash = data.hash;
            }

            else {
                console.error("Response is empty, waiting 10 seconds");

                setTimeout(this.fetchFromApi.bind(this), 10000)
                return;
            }
        })
        .catch( (err) => { 
            console.error("Can't fatch data from api or api return wrong format"); 
            console.error(err);
            return;
        });
    }

    async buildSlideshowBox() {
        console.log("Api changed or building new state");
        //Create all sites from json
        this.target.innerHTML = "";
        this.sites.forEach(element => {
            this.addSite(element);
        });

        //Set last child as active with animation effect
        this.target.querySelector(".side:last-child").style.animation = "fadeIn .3s linear";
        this.target.querySelector(".side:last-child").classList.add("active");
        //Set timeout on first screen
        setTimeout(this.changeSite.bind(this),this.sites[0].timeout);
    }

    async recoverSites() {
        console.log("Recovering old state, api doesn't changed");
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
        setTimeout(this.changeSite.bind(this), this.sites[0].timeout);
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
            //Source for video 
            let videoSrc = document.createElement("source");
            videoSrc.src = this.dir + element.filename;
            videoSrc.type = element.video_type;

            //Track for subtitles
            if(element.subtitles) {
                let subtitlesTrack = document.createElement("track");
                subtitlesTrack.src = this.dir + element.subtitles;
                subtitlesTrack.default = true;
                side.insertAdjacentElement("beforeend", subtitlesTrack);
            }

            //Mute video
            if(element.muted) {
                side.muted = true;
            }

            side.appendChild(videoSrc);
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
            side.style.backgroundColor = element.background_color;
            side.appendChild(sideH);
        }

        else if (element.type == "visitationtime") {    
            //div
            side = document.createElement("div");
            side.className = "visitation-cooldown";
            side.style.backgroundColor = element.background_color;
            side.style.color = element.color;
            side.dataset.timeout = element.timeout;
    
            //title
            let title = document.createElement("h1");
            title.className = "cooldown-title";
            title.innerHTML = "KOMENTOVANÉ PROHLÍDKY KOSTELA";
    
            //description
            let description = document.createElement("p");
            description.className = "cooldown-desc";
            description.innerHTML = "V rámci každé komentované prohlídky se rozezní varhany, navštívíte unikátní církevní muzeum, seznámíte se s ornáty a významem jejich barev v závislosti na liturgickém období.";
    
            //label1
            let label1 = document.createElement("p");
            label1.className = "cooldown-label1";
            label1.innerHTML = "Časy prohlídek:"
    
            //times
            let times = document.createElement("p");
            times.className = "cooldown-times";
            times.innerHTML = this.visitationTimes.join(" ");
    
            //label2
            let label2 = document.createElement("p");
            label2.className = "cooldown-label2";
            label2.innerHTML = "Nejbližší prohlídka začíná za:"
    
            //clock
            let clock = document.createElement("p");
            clock.className = "cooldown-clock";
            clock.innerHTML = ""
    
            let backgroundImage = document.createElement("img");
            backgroundImage.src = this.dir + element.filename;
    
            side.appendChild(backgroundImage);
            side.appendChild(title);
            side.appendChild(description);
            side.appendChild(label1);
            side.appendChild(times);
            side.appendChild(label2);
            side.appendChild(clock);
    
            document.getElementById("slideshow-box").appendChild(side);
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
        if(childToRemove) {
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
                }, 100);

                newSite.addEventListener("ended", this.videoEndedEvent);
            }

            else if (newSite.dataset.type == "visitationtime") {
                let interval = this.cooldown(document.querySelector(".cooldown-clock"), this.visitationTimes);
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
            if(date < new Date(Date.parse(`${Number(date.getMonth() + 1)}/${date.getDate()}/${date.getFullYear()} ${time}:00`))) {
                nextVisitation = time;
                break;
            }
        }

        //If next visitation exist, start cooldown
        if(nextVisitation) {
            let interval;
            interval = setInterval(() => {
                const currentDate = new Date();
                const visitation = new Date(Date.parse(`${Number(currentDate.getMonth() + 1)}.${currentDate.getDate()}.${currentDate.getFullYear()} ${nextVisitation}:00`));
                
                //Get time diff and convert ti hh:mm:ss
                let diff = (visitation - currentDate) / 1000;
                const sec = parseInt(diff, 10);
                let hours   = Math.floor(sec / 3600);
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
            target.innerHTML = 'Dnes již není naplánovaná žádná prohlídka';
        }
    }
}
