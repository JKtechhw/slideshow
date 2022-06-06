'use struct';

class adminPanel {
    constructor() {
        this.url = location.protocol + '//' + location.host;
        this.api = "/api/admin/";
        this.dataFromApi

        this.fetchDataFromApi();
    }

    async fetchDataFromApi() {
        //Fetch data from api and save to json
        await fetch(this.api)
        .then(response => response.json()) //Convert to JSON
        .then(data => { 
            this.dataFromApi = data; 
            this.buildAdminPanel();
        })
        .catch( (err) => { 
            console.error("Can't fatch data from api or api return wrong format"); 
            console.error(err);
            return;
        });
    }

    async buildAdminPanel() {
        this.setupGlobalForm();
        this.addUrlToHosts();
        this.setupPreview();
        this.addEventsToButton();
        this.createVisitations("#visitation-list");
        this.hideLoadingBox();
    }

    setupGlobalForm() {
        //Setup global background color
        document.querySelector("#global-background-color input").value = this.dataFromApi.background_color;

        //Setup global text color
        document.querySelector("#global-text-color input").value = this.dataFromApi.text_color;

        //Setup transition text color
        document.querySelector("#global-transition-time input").value = this.dataFromApi.transition_time;

        this.createFontDropDown("#global-font-selection", this.dataFromApi.font_family);
    }

    createFontDropDown(target, active) {
        let targetElement = document.querySelector(target); 
        this.dataFromApi.fonts.forEach(element => {
            let option = document.createElement("option");
            option.value = element.value;
            option.innerText = element.name;
            option.classList.add(element.class);
            
            if(option.value == active) {
                option.selected = true;
            }
            targetElement.appendChild(option);
        });
    }

    createVisitations(target) {
        let targetBox = document.querySelector(target);
        let visitations = this.dataFromApi.visitation_times;

        if(visitations) {
            visitations.sort(function (a, b) {
                return a.localeCompare(b);
            });
        }

        if(visitations) {
            for (let i = 0; i < visitations.length; i++) {
                let time = document.createElement("li");
                let timeLabel = document.createElement("label");
                timeLabel.innerText = " " + visitations[i];
                let timeInput = document.createElement("input");
                timeInput.type = "checkbox";
                timeInput.value = visitations[i];
                timeInput.checked = true;
                timeInput.name = "visitationtimes[]";
                timeLabel.insertAdjacentElement("afterbegin",timeInput);
                time.appendChild(timeLabel);
                targetBox.appendChild(time);
            }
        }

        else {
            document.querySelector("#remove-visitations").remove();
            let message = document.createElement("p");
            message.classList.add("description");
            message.classList.add("center");
            message.innerText = "Nejsou nastavené žádné prohlídky";
            targetBox.appendChild(message);
        }
    }

    addUrlToHosts() {
        document.querySelectorAll(".host-url").forEach(element => {
            element.href = this.url;
            element.innerText = this.url;
        });
    }

    setupPreview() {
        document.querySelectorAll(".preview-iframe").forEach(element => {
            element.src = this.url;
        });

        document.querySelector("#refresh-iframe-btn").addEventListener("click", () => {
            document.querySelectorAll(".preview-iframe").forEach(element => {
                element.src = this.url;
            });
        });
    }

    addEventsToButton() {
        document.querySelector("#add-visitation-btn").addEventListener("click", this.toggleAddVisitation.bind(this));
        document.querySelector("#add-visitation-box .close-btn").addEventListener("click", this.toggleAddVisitation.bind(this));
        document.querySelector("#visitation-list").addEventListener("change", this.getVisitationListChange.bind(this));
    }

    toggleAddVisitation() {
        let date = new Date();
        if (document.querySelector("#add-visitation-box").classList.contains("active")) {
            document.body.style.overflow = null;
            document.querySelector("#add-visitation-box").classList.remove("active");
        }

        else {
            document.body.style.overflow = "hidden";
            document.querySelector("#add-visitation-box").classList.add("active");
            document.querySelector("#add-visitation-box input[name=\"hours\"]").value = date.getHours();
            document.querySelector("#add-visitation-box input[name=\"minutes\"]").value = date.getMinutes();
        }
    }

    getVisitationListChange() {
        let visitationListChecked = document.querySelectorAll("#visitation-list input[type=\"checkbox\"]:checked").length;
        let visitationList = document.querySelectorAll("#visitation-list input[type=\"checkbox\"]").length;
        console.log(visitationList, visitationListChecked)
        if(visitationListChecked - visitationList == 0) {
            document.querySelector("#remove-visitations").disabled = true;
        }

        else {
            document.querySelector("#remove-visitations").disabled = false;
        }
    }

    hideLoadingBox() {
        document.querySelector("#loading-box").classList.add("hidden");
        setTimeout(() => {
            document.querySelector("#loading-box").remove();
        }, 5000);
    }
}