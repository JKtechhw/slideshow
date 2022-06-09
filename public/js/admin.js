'use struct';

class adminPanel {
    constructor() {
        this.url = location.protocol + '//' + location.host;
        this.api = "/api/admin/";
        this.dataFromApi
        this.buildAdminPanel();
        this.acceptedVideo = ".mp4,.m4v,.webm,.avi";
        this.acceptedImage = ".jpg, .JPG, .jpeg, .png";
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
        this.updateDegustations("#degustation-list", this.dataFromApi.degustation_times);
        this.setEventToForms();
        this.addSlideEvents("#add-slide-form");
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

    addSlideEvents(form) {
        let target = document.querySelector(form);
        let typeSelect = target.querySelector("#add-slide-type");

        let timeoutBox = target.querySelector("#add-slide-timeout");
        let fontFamilyBox = target.querySelector("#font-family-box");
        let backgroundColorBox = target.querySelector("#background-color-box");
        let textColorBox = target.querySelector("#color-box");
        let fileBox = target.querySelector("#file-box");
        let fileBoxInput = target.querySelector("#file-box input");
        let subtitlesBox = target.querySelector("#subtitles-box");
        let textBox = target.querySelector("#text-box");

        typeSelect.addEventListener("change", (e) => {
            document.querySelector("#add-slide-form button[type=\"submit\"]").disabled = false;
            switch (e.currentTarget.value) {
                case "image":
                    timeoutBox.style.display = "flex";
                    fontFamilyBox.style.display = "none";
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "none";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    fileBoxInput.required = true;
                    subtitlesBox.style.display = "none";
                    textBox.style.display = "none";
                    break;

                case "video":
                    timeoutBox.style.display = "none";
                    fontFamilyBox.style.display = "none";
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "none";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedVideo);
                    fileBoxInput.required = true;
                    subtitlesBox.style.display = "flex";
                    textBox.style.display = "none";
                    break;

                case "text":
                    timeoutBox.style.display = "flex";
                    fontFamilyBox.style.display = "flex";
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "flex";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    subtitlesBox.style.display = "none";
                    textBox.style.display = "flex";
                    break;

                case "visitationtime":
                case "degustationtime":
                    timeoutBox.style.display = "flex";
                    fontFamilyBox.style.display = "flex";
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "flex";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    subtitlesBox.style.display = "none";
                    textBox.style.display = "none";
                    break;
            }
        });
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
                dragArea.addEventListener("mouseup" ,(e) => {
                    console.log(e)
                });

                let spendTime = document.createElement("td");
                spendTime.innerText = slides[i].timeout / 1000;
                slide.appendChild(spendTime);

                let typeTd = document.createElement("td");
                typeTd.innerText = slides[i].name;
                slide.appendChild(typeTd);
                typeTd.classList.add("title");
                typeTd.title = slides[i].name;

                let text = document.createElement("td");
                text.innerText = slides[i].text || "-";
                text.title = slides[i].text;
                text.classList.add("text");
                slide.appendChild(text);

                let previewTd = document.createElement("td");
                previewTd.classList.add("preview-btn");
                let previewBtn = document.createElement("button");
                previewBtn.classList.add("preview");
                previewBtn.type = "button";
                previewBtn.addEventListener("click", () => {
                    window.open("", "", "width=640,height=360");
                });
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
                    const XHR = new XMLHttpRequest();
                    let hidden = false;
                    if(e.currentTarget.checked) {
                        hidden = true;
                    }
                    let hiddenElement = e.currentTarget.parentNode.parentNode;
                    let id = "id=" + hiddenElement.dataset.id + "&status=" + hidden;

                    XHR.onload = () => {
                        this.alertUser(XHR.responseText);
                        hiddenElement.classList.toggle("hidden");
                    }

                    XHR.open("POST", "/admin/hide-slide");
                    XHR.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    XHR.send(id);
                });

                hideTd.appendChild(hideCheckbox);
                slide.appendChild(hideTd);

                let editTd = document.createElement("td");
                editTd.classList.add("edit-btn");
                let editBtn = document.createElement("button");
                editBtn.type = "button";
                editBtn.classList.add("edit");
                editTd.appendChild(editBtn);
                editBtn.addEventListener("click", () => {
                    document.querySelector("#edit-slide-box").classList.add("active");
                    document.querySelector("#edit-slide-name input").value = slides[i].name;
                    document.querySelector("#edit-slide-id").value = slides[i]._id;
                    document.querySelector("#edit_slide_type").value = slides[i].type;
                    document.querySelector("#edit-slide-timeout input").value = slides[i].timeout;

                    let target = document.querySelector("#edit-slide-box");
            
                    let timeoutBox = target.querySelector("#edit-slide-timeout");
                    let fontFamilyBox = target.querySelector("#font-family-box");
                    let backgroundColorBox = target.querySelector("#edit-background-color-box");
                    let textColorBox = target.querySelector("#edit-color-box");
                    let fileBox = target.querySelector("#file-box");
                    let fileBoxInput = target.querySelector("#file-box input");
                    let subtitlesBox = target.querySelector("#subtitles-box");
                    let textBox = target.querySelector("#text-box");
            
                    switch (slides[i].type) {
                        case "image":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "none";
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "none";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedImage);
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "none";
                            break;
        
                        case "video":
                            timeoutBox.style.display = "none";
                            fontFamilyBox.style.display = "none";
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "none";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedVideo);
                            subtitlesBox.style.display = "flex";
                            textBox.style.display = "none";
                            break;
        
                        case "text":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "flex";
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "flex";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedImage);
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "flex";
                            break;
        
                        case "visitationtime":
                        case "degustationtime":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "flex";
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "flex";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedImage);
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "none";
                            break;
                    }
                });
                slide.appendChild(editTd);

                let removeTd = document.createElement("td");
                removeTd.classList.add("remove-btn");
                let removeBtn = document.createElement("button");
                removeBtn.addEventListener("click", (e) => {
                    let slideToRemove = e.currentTarget.parentNode.parentNode;
                    let id = "id=" + slideToRemove.dataset.id;
                    const XHR = new XMLHttpRequest();
                    XHR.onload = () => {
                        this.alertUser(XHR.responseText);
                        slideToRemove.remove();

                        if(target.children.length == 0) {
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
                    };
                    XHR.open("POST", "/admin/remove-slide", true);
                    XHR.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    XHR.send(id);
                    
                });
                removeBtn.type = "button";
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
        targetElement.innerHTML = "";
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
            if(document.querySelector("#remove-visitations")) {
                document.querySelector("#remove-visitations").remove();
            }
            targetBox.innerHTML = '<p class="center description">Nejsou nastavené žádné prohlídky</p>';
        }
    }

    async updateDegustations(target, degustations) {
        let targetBox = document.querySelector(target);
        targetBox.innerHTML = "";

        if(degustations) {
            degustations.sort(function (a, b) {
                return a.localeCompare(b);
            });
        }

        if(degustations) {
            for (let i = 0; i < degustations.length; i++) {
                let time = document.createElement("li");
                let timeLabel = document.createElement("label");
                timeLabel.innerText = " " + degustations[i];
                let timeInput = document.createElement("input");
                timeInput.type = "checkbox";
                timeInput.value = degustations[i];
                timeInput.checked = true;
                timeInput.name = "degustationtimes[]";
                timeLabel.insertAdjacentElement("afterbegin",timeInput);
                time.appendChild(timeLabel);
                targetBox.appendChild(time);
            }
        }

        else {
            if(document.querySelector("#remove-degustations")) {
                document.querySelector("#remove-degustations").remove();
            }
            targetBox.innerHTML = '<p class="center description">Nejsou nastavené žádné degustace</p>';
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
            document.querySelector("#toggle-iframe-btn").className = "play";
        });

        document.querySelector("#refresh-iframe-btn").addEventListener("click", () => {
            document.querySelectorAll(".preview-iframe").forEach(element => {
                element.src = this.url;
            });
        });

        document.querySelector("#toggle-iframe-btn").addEventListener("click", () => {
            if(document.querySelector(".preview-iframe").src) {
                document.querySelectorAll(".preview-iframe").forEach(element => {
                    element.removeAttribute("src");
                    document.querySelector("#toggle-iframe-btn").title = "Pokračovat";
                    document.querySelector("#toggle-iframe-btn").className = "play";
                });
            }

            else {
                document.querySelectorAll(".preview-iframe").forEach(element => {
                    element.src = this.url;
                    document.querySelector("#toggle-iframe-btn").className = "pause";
                    document.querySelector("#toggle-iframe-btn").title = "Pozastavit";
                });
            }
        });
    }

    addEventsToButton() {
        //Visitation
        document.querySelector("#add-visitation-btn").addEventListener("click", this.toggleAddVisitation.bind(this));
        document.querySelector("#add-visitation-box .close-btn").addEventListener("click", this.toggleAddVisitation.bind(this));
        document.querySelector("#visitation-list").addEventListener("change", this.getVisitationListChange.bind(this));
        //Degustation
        document.querySelector("#add-degustation-btn").addEventListener("click", this.toggleAddDegustation.bind(this));
        document.querySelector("#add-degustation-box .close-btn").addEventListener("click", this.toggleAddDegustation.bind(this));
        document.querySelector("#degustation-list").addEventListener("change", this.getDegustationListChange.bind(this));
        //Add slide
        document.querySelector("#add-slide").addEventListener("click", this.toggleAddSlide.bind(this));
        document.querySelector("#add-slide-box .close-btn").addEventListener("click", this.toggleAddSlide.bind(this));
        //Edit slide
        document.querySelector("#edit-slide-box .close-btn").addEventListener("click", () => {
            document.querySelector("#edit-slide-box").classList.remove("active");
        });

        document.querySelector("#change-slides-sq-btn").addEventListener("click", () => {
            const XHR = new XMLHttpRequest();
            let slides = document.querySelectorAll("#slides-table tbody tr");
            let i = 1;
            let sendObject = [];
            slides.forEach(element => {
                sendObject.push({"id": element.dataset.id, "position": i});
                i++;
            });

            XHR.onload = () => {
                this.alertUser(XHR.responseText, false)
            }

            XHR.open("POST", "/admin/change-sequence");
            XHR.setRequestHeader("Content-Type", "application/json");
            XHR.send(JSON.stringify(sendObject));
        });

        this.createFontDropDown("#add_slide_box_font_family", this.dataFromApi.font_family);

        document.querySelector("#add-visitations-form").addEventListener("submit", async () => {
            await this.fetchDataFromApi();
            await this.updateVisitations("#visitation-list", this.dataFromApi.visitation_times);
            document.querySelector("#add-visitation-box").classList.remove("active");
        });

        document.querySelector("#add-degustation-form").addEventListener("submit", async () => {
            await this.fetchDataFromApi();
            await this.updateDegustations("#degustation-list", this.dataFromApi.degustation_times);
            document.querySelector("#add-degustation-box").classList.remove("active");
        });

        document.querySelector("#remove-visitations-form").addEventListener("submit", async () => {
            await this.fetchDataFromApi();
            await this.updateVisitations("#visitation-list", this.dataFromApi.visitation_times);
        });
    }

    toggleAddSlide() {
        let addSlideBox = document.querySelector("#add-slide-box");
        if(addSlideBox.classList.contains("active")) {
            addSlideBox.classList.remove("active");
        }

        else {
            addSlideBox.classList.add("active");
            addSlideBox.querySelector("input[name=\"add_slide_background_color\"]").value = this.dataFromApi.background_color;
            addSlideBox.querySelector("input[name=\"add_slide_color\"]").value = this.dataFromApi.text_color;
        }
    }

    toggleAddVisitation() {
        let date = new Date();
        if (document.querySelector("#add-visitation-box").classList.contains("active")) {
            document.querySelector("#add-visitation-box").classList.remove("active");
        }

        else {
            document.querySelector("#add-visitation-box").classList.add("active");
            document.querySelector("#add-visitation-box input[name=\"hours\"]").value = date.getHours();
            document.querySelector("#add-visitation-box input[name=\"minutes\"]").value = "00";
            document.querySelector("#add-visitation-box input[name=\'hours\']").focus();
        }
    }

    toggleAddDegustation() {
        let date = new Date();
        if (document.querySelector("#add-degustation-box").classList.contains("active")) {
            document.querySelector("#add-degustation-box").classList.remove("active");
        }

        else {
            document.querySelector("#add-degustation-box").classList.add("active");
            document.querySelector("#add-degustation-box input[name=\"hours\"]").value = date.getHours();
            document.querySelector("#add-degustation-box input[name=\"minutes\"]").value = "00";
            document.querySelector("#add-degustation-box input[name=\'hours\']").focus();
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

    getDegustationListChange() {
        let visitationListChecked = document.querySelectorAll("#degustation-list input[type=\"checkbox\"]:checked").length;
        let visitationList = document.querySelectorAll("#degustation-list input[type=\"checkbox\"]").length;
        if(visitationListChecked - visitationList == 0) {
            document.querySelector("#remove-degustation").disabled = true;
        }

        else {
            document.querySelector("#remove-degustation").disabled = false;
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
        }, 5100);
    }
}