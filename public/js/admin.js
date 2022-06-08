'use struct';

class adminPanel {
    constructor() {
        this.url = location.protocol + '//' + location.host;
        this.api = "/api/admin/";
        this.dataFromApi
        this.buildAdminPanel();
    }

    async fetchDataFromApi() {
        //Fetch data from api and save to json
        await fetch(this.api)
        .then(response => response.json()) //Convert to JSON
        .then(data => { 
            this.dataFromApi = data; 
        })
        .catch( (err) => { 
            console.error("Can't fatch data from api or api return wrong format"); 
            console.error(err);
            return;
        });
    }

    async buildAdminPanel() {
        await this.fetchDataFromApi();
        this.buildSlidesTable("#slides-table tbody");
        this.setStatistics();
        this.setupGlobalForm();
        this.addUrlToHosts();
        this.setupPreview();
        this.addEventsToButton();
        this.updateVisitations("#visitation-list", this.dataFromApi.visitation_times);
        this.setEventToForms();
        this.hideLoadingBox();
    }

    async setStatistics() {
        let connectedClientsBox = document.querySelector("#query-devices");
        connectedClientsBox.innerText = this.dataFromApi.request_clients;

        let queryCountBox = document.querySelector("#query-count");
        queryCountBox.innerText = this.dataFromApi.request_count;

        let slidesCloutBox = document.querySelector("#slides-count");
        slidesCloutBox.innerText = this.dataFromApi.sites.length || 0;  
    }

    buildSlidesTable(targetId) {
        let target = document.querySelector(targetId);
        let slides = this.dataFromApi.sites;

        if(slides.length > 0) {
            for (let i = 0; i < slides.length; i++) {
                let slide = document.createElement("tr");
                slide.dataset.id = slides[i]._id;
                slide.dataset.type = slides[i].type;

                if(slides[i].hidden) {
                    slide.classList.add("hidden");
                }

                let dragArea = document.createElement("td");
                dragArea.classList.add("drag-slides");
                slide.appendChild(dragArea);

                let typeTd = document.createElement("td");
                typeTd.innerText = slides[i].name;
                slide.appendChild(typeTd);

                let spendTime = document.createElement("td");
                spendTime.innerText = slides[i].timeout / 1000;
                slide.appendChild(spendTime);

                let bgColor = document.createElement("td");
                if(slides[i].background_color) {
                    let bgColorInput = document.createElement("input");
                    bgColorInput.type = "color";
                    bgColorInput.value = slides[i].background_color;
                    bgColor.appendChild(bgColorInput);
                }

                else {
                    bgColor.innerText =  "-";
                }

                slide.appendChild(bgColor);

                let textColor = document.createElement("td");
                if(slides[i].color) {
                    let textColorInput = document.createElement("input");
                    textColorInput.type = "color";
                    textColorInput.value = slides[i].color;
                    textColor.appendChild(textColorInput);
                }

                else {
                    textColor.innerText = "-";
                }

                slide.appendChild(textColor);

                let fontFamily = document.createElement("td");
                fontFamily.innerText = slides[i].font_family || "-";
                slide.appendChild(fontFamily);

                let file = document.createElement("td");
                file.innerText = slides[i].filename || "-";
                slide.appendChild(file);

                let text = document.createElement("td");
                text.innerText = slides[i].text || "-";
                slide.appendChild(text);

                let subtitles = document.createElement("td");
                subtitles.innerText = slides[i].subtitles || "-";
                slide.appendChild(subtitles);

                let previewTd = document.createElement("td");
                previewTd.classList.add("preview-btn");
                let previewBtn = document.createElement("button");
                previewBtn.classList.add("preview");
                previewTd.appendChild(previewBtn);
                slide.appendChild(previewTd);

                let hideTd = document.createElement("td");
                hideTd.classList.add("hidden-checkbox");
                let hideCheckbox= document.createElement("input");
                hideCheckbox.type = "checkbox";
                if(slides[i].hidden) {
                    hideCheckbox.checked = true;
                }

                hideCheckbox.addEventListener("change", (e) => {
                    e.currentTarget.parentNode.parentNode.classList.toggle("hidden");
                });

                hideTd.appendChild(hideCheckbox);
                slide.appendChild(hideTd);

                let removeTd = document.createElement("td");
                removeTd.classList.add("remove-btn");
                let removeBtn = document.createElement("button");
                removeBtn.addEventListener("click", (e) => {
                    e.currentTarget.parentNode.parentNode.remove();
                })
                removeBtn.classList.add("remove");
                removeTd.appendChild(removeBtn);
                slide.appendChild(removeTd);

                target.appendChild(slide);
            }
        }

        else {
            let columns = target.parentNode.querySelector("tr").children.length;
            let emptyLineRow = document.createElement("tr");
            let emptyLine = document.createElement("td");
            emptyLine.colSpan = columns;
            emptyLine.classList.add("empty");
            emptyLine.classList.add("description");
            emptyLine.innerText = "Nebyly přidány žádné slidy";
            emptyLineRow.appendChild(emptyLine);
            target.appendChild(emptyLineRow);
        }
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

    setEventToForms() {
        document.querySelectorAll("form:not(.default)").forEach(element => {
            element.addEventListener("submit", (e) => {
                e.preventDefault();
                this.sendForm(e.currentTarget.id, e.currentTarget.action);
            });
        });
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

    async updateVisitations(target, visitations) {
        let targetBox = document.querySelector(target);
        targetBox.innerHTML = "";

        if(visitations) {
            console.log(visitations)
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
            targetBox.parentNode.innerHTML = '<p class="center description">Nejsou nastavené žádné prohlídky</p>';
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
        document.querySelector("#add-slide").addEventListener("click", this.toggleAddSlide.bind(this));
        document.querySelector("#add-slide-box .close-btn").addEventListener("click", this.toggleAddSlide.bind(this));

        this.createFontDropDown("#add_slide_box_font_family", this.dataFromApi.font_family);

        document.querySelector("#add-visitations-form").addEventListener("submit", async () => {
            await this.fetchDataFromApi();
            await this.updateVisitations("#visitation-list", this.dataFromApi.visitation_times);
            document.querySelector("#add-visitation-box").classList.remove("active");
        });

        document.querySelector("#remove-visitations-form").addEventListener("submit", async () => {
            await this.fetchDataFromApi();
            await this.updateVisitations("#visitation-list", this.dataFromApi.visitation_times);
        });
    }

    toggleAddSlide() {
        document.querySelector("#add-slide-box").classList.toggle("active");
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
            document.querySelector("#add-visitation-box input[name=\"minutes\"]").value = "00";
        }
    }

    getVisitationListChange() {
        let visitationListChecked = document.querySelectorAll("#visitation-list input[type=\"checkbox\"]:checked").length;
        let visitationList = document.querySelectorAll("#visitation-list input[type=\"checkbox\"]").length;
        if(visitationListChecked - visitationList == 0) {
            document.querySelector("#remove-visitations").disabled = true;
        }

        else {
            document.querySelector("#remove-visitations").disabled = false;
        }
    }

    hideLoadingBox() {
        document.querySelector("#loading-box").classList.add("hidden");
        document.body.style = null;
        setTimeout(() => {
            document.querySelector("#loading-box").remove();
        }, 1000);
    }

    async sendForm(formId, url) {
        let form = document.getElementById(formId);
        const XHR = new XMLHttpRequest();
        const FD = new FormData(form);

        XHR.addEventListener("load", (e) => {
            this.alertUser(e.currentTarget.responseText, false);
        });

        XHR.addEventListener("error", (e) => {
            console.log(error)
            this.alertUser(e.currentTarget.responseText, true);
        });

        XHR.open("POST", url);
        XHR.send(FD);
    }

    alertUser(message, error) {
        let alertBox = document.createElement("div");
        alertBox.innerText = message;
        alertBox.id = "alert-box"

        if(error) {
            alertBox.classList.add("error");
        }

        document.body.insertAdjacentElement("afterbegin", alertBox);

        setTimeout(() => {
            alertBox.remove();
        }, 7100);
    }
}