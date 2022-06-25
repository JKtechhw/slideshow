'use struct';

class adminPanel {
    constructor() {
        this.url = location.protocol + '//' + location.host;
        this.api = "/api/admin/";
        this.dataFromApi
        this.buildAdminPanel();
        this.acceptedVideo = ".mp4,.m4v,.webm,.ogv";
        this.acceptedImage = ".jpg, .JPG, .jpeg, .png";
    }

    async fetchDataFromApi() {
        try {
            let response = await fetch(this.api);
            response = await response.json();
            this.dataFromApi = response;
        }

        catch(err) {
            console.error(err);
            return;
        }   
    }

    async buildAdminPanel() {
        this.setTheme();
        await this.fetchDataFromApi();
        this.buildSlidesTable("#slides-table tbody");
        this.setStatistics();
        this.setServerStats();
        this.setClients("#clients-table tbody");
        this.setupGlobalForm();
        this.setMessages();
        this.setTimelistBox("#timelist-box");
        this.addUrlToHosts();
        this.setupPreview();
        this.addEventsToButton();
        this.setEventToForms();
        this.addSlideEvents("#add-slide-form");
        this.clientBoxEvents();
        this.hideLoadingBox();
        setInterval(this.updateData.bind(this), 60000);
    }

    async updateData() {
        await this.fetchDataFromApi();
        this.setTimelistBox("#timelist-box")
        this.setServerStats();
        this.setClients("#clients-table tbody");
        this.setStatistics();
    }

    setTheme() {
        const darkThemeMq = window.matchMedia("(prefers-color-scheme: light)");
        if (darkThemeMq.matches) {
            document.body.classList.add("light-theme");
        }
    }

    async setStatistics() {
        let connectedClientsBox = document.querySelector("#query-devices");
        connectedClientsBox.innerText = this.dataFromApi.request_clients;

        let queryCountBox = document.querySelector("#query-count");
        queryCountBox.innerText = this.dataFromApi.request_count;

        let slidesCloutBox = document.querySelector("#slides-count");
        slidesCloutBox.innerText = this.dataFromApi.sites.length || 0;  
    }

    setClients(targetId) {
        let target = document.querySelector(targetId);
        target.innerHTML = "";
        if(this.dataFromApi.clients && this.dataFromApi.clients.length > 0) {
            this.dataFromApi.clients.forEach(client => {
                let tr = document.createElement("tr");
                let ip = document.createElement("td");
                ip.innerText = client.ip;
                let os = document.createElement("td");
                os.innerText = client.os;
                let browser = document.createElement("td");
                browser.innerText = client.browser;
                tr.appendChild(ip);
                tr.appendChild(os);
                tr.appendChild(browser);
                target.appendChild(tr);
            });
        }

        else {
            let tr = document.createElement("tr");
            let td = document.createElement("td");
            td.innerText = "Žádný aktivní klient";
            td.colSpan = 3;
            td.classList.add("description");
            tr.appendChild(td);
            target.appendChild(tr);
        }
    }

    setServerStats() {
        let cpuUsageChart = document.querySelector("#cpu-usage-chart");
        let cpuUsageChartBefore = cpuUsageChart.querySelector(".before");
        cpuUsageChartBefore.style.background = `radial-gradient(farthest-side,var(--theme_color) 98%,#0000) top/12px 12px no-repeat, conic-gradient(var(--theme_color) calc(${this.dataFromApi.server_status.cpu_load}*1%),#0000 0)`;
        let cpuUsageChartAfter = cpuUsageChart.querySelector(".after");
        cpuUsageChartAfter.style.transform = `rotate(calc(${this.dataFromApi.server_status.cpu_load}*3.6deg)) translateY(calc(50% - 110px/2))`;
        let cpuUsageChartPercentage = cpuUsageChart.querySelector(".percentage");
        cpuUsageChartPercentage.innerText = this.dataFromApi.server_status.cpu_load + "%";

        let ramUsageChart = document.querySelector("#ram-usage-chart");
        let ramUsageChartBefore = ramUsageChart.querySelector(".before");
        ramUsageChartBefore.style.background = `radial-gradient(farthest-side,var(--theme_color) 98%,#0000) top/12px 12px no-repeat, conic-gradient(var(--theme_color) calc(${this.dataFromApi.server_status.mem_load}*1%),#0000 0)`;
        let ramUsageChartAfter = ramUsageChart.querySelector(".after");
        ramUsageChartAfter.style.transform = `rotate(calc(${this.dataFromApi.server_status.mem_load}*3.6deg)) translateY(calc(50% - 110px/2))`;
        let ramUsageChartPercentage = ramUsageChart.querySelector(".percentage");
        ramUsageChartPercentage.innerText = this.dataFromApi.server_status.mem_load + "%";

        document.querySelector("#uptime-chart .value").innerText = Number(this.dataFromApi.server_status.uptime / 3600).toFixed(2) + "h";
        document.querySelector("#uptime-chart .value").title = Number(this.dataFromApi.server_status.uptime / 3600).toFixed(2) + "h";
        document.querySelector("#hostname-chart .value").innerText = this.dataFromApi.server_status.hostname;
        document.querySelector("#hostname-chart .value").title = this.dataFromApi.server_status.hostname;
    
        document.querySelector("#ip-chart .value").innerText = this.dataFromApi.server_status.ip;
        document.querySelector("#ip-chart .value").title = this.dataFromApi.server_status.ip;
    }

    addSlideEvents(form) {
        let target = document.querySelector(form);
        let typeSelect = target.querySelector("#add-slide-type");

        let timeoutBox = target.querySelector("#add-slide-timeout");
        timeoutBox.style.display = "none";
        let fontFamilyBox = target.querySelector("#font-family-box");
        fontFamilyBox.style.display = "none";
        let timelistBox = target.querySelector("#cooldown-list-box");
        let timelistSelect = target.querySelector("#cooldown-list-box select");
        timelistBox.style.display = "none";
        let backgroundColorBox = target.querySelector("#background-color-box");
        backgroundColorBox.style.display = "none";
        let textColorBox = target.querySelector("#color-box");
        textColorBox.style.display = "none";
        let fileBox = target.querySelector("#file-box");
        fileBox.style.display = "none";
        let fileBoxInput = target.querySelector("#file-box input");
        let urlBox = target.querySelector("#url-box");
        urlBox.style.display = "none";
        let subtitlesBox = target.querySelector("#subtitles-box");
        subtitlesBox.style.display = "none";
        let textBox = target.querySelector("#text-box");
        textBox.style.display = "none";
        let hiddenBox = target.querySelector("#hidden-box");
        hiddenBox.style.display = "none";

        typeSelect.addEventListener("change", (e) => {
            document.querySelector("#add-slide-form button[type=\"submit\"]").disabled = false;
            hiddenBox.style.display = "flex";
            switch (e.currentTarget.value) {
                case "image":
                    timeoutBox.style.display = "flex";
                    fontFamilyBox.style.display = "none";
                    timelistBox.style.display = "none";
                    timelistSelect.innerHTML = "";
                    timelistSelect.required = false;
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "none";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    fileBoxInput.required = true;
                    urlBox.style.display = "none";
                    subtitlesBox.style.display = "none";
                    textBox.style.display = "none";
                    break;

                case "video":
                    timeoutBox.style.display = "none";
                    fontFamilyBox.style.display = "none";
                    timelistBox.style.display = "none";
                    timelistSelect.innerHTML = "";
                    timelistSelect.required = false;
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "none";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedVideo);
                    fileBoxInput.required = true;
                    urlBox.style.display = "none";
                    subtitlesBox.style.display = "flex";
                    textBox.style.display = "none";
                    break;

                case "iframe":
                    timeoutBox.style.display = "flex";
                    fontFamilyBox.style.display = "none";
                    timelistBox.style.display = "none";
                    timelistSelect.innerHTML = "";
                    timelistSelect.required = false;
                    backgroundColorBox.style.display = "none";
                    textColorBox.style.display = "none";
                    fileBox.style.display = "none";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    fileBoxInput.required = false;
                    subtitlesBox.style.display = "none";
                    urlBox.style.display = "flex";
                    textBox.style.display = "none";
                    break;

                case "text":
                    timeoutBox.style.display = "flex";
                    timelistBox.style.display = "none";
                    timelistSelect.innerHTML = "";
                    timelistSelect.required = false;
                    fontFamilyBox.style.display = "flex";
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "flex";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    fileBoxInput.required = false;
                    subtitlesBox.style.display = "none";
                    urlBox.style.display = "none";
                    textBox.style.display = "flex";
                    break;

                case "cooldown":
                    timeoutBox.style.display = "flex";
                    fontFamilyBox.style.display = "flex";
                    timelistBox.style.display = "block";
                    this.createTimelistDropDown("#add-slide-timelist");
                    timelistSelect.required = true;
                    backgroundColorBox.style.display = "flex";
                    textColorBox.style.display = "flex";
                    fileBox.style.display = "flex";
                    fileBoxInput.setAttribute("accept", this.acceptedImage);
                    fileBoxInput.required = false;
                    subtitlesBox.style.display = "none";
                    urlBox.style.display = "none";
                    textBox.style.display = "none";
                    break;
            }
        });
    }

    buildSlidesTable(targetId) {
        let target = document.querySelector(targetId);
        let slides = this.dataFromApi.sites;

        if(slides.length > 0) {
            slides.forEach(element => {
                let slide = document.createElement("tr");
                slide.dataset.id = element._id;
                slide.dataset.type = element.type;

                if(element.hidden) {
                    slide.classList.add("hidden");
                }

                let dragArea = document.createElement("td");
                dragArea.classList.add("drag-slides");
                dragArea.classList.add("icon");
                slide.appendChild(dragArea);

                let spendType = document.createElement("td");
                spendType.classList.add("type");
                spendType.classList.add("icon");
                spendType.classList.add(element.type);
                spendType.title = element.type.charAt(0).toUpperCase() + element.type.slice(1);
                slide.appendChild(spendType);

                let typeTd = document.createElement("td");
                typeTd.innerText = element.name;
                slide.appendChild(typeTd);
                typeTd.classList.add("title");
                typeTd.title = element.name;

                let hideTd = document.createElement("td");
                hideTd.classList.add("hidden-checkbox");
                let hideCheckbox= document.createElement("input");
                hideCheckbox.classList.add("icon");
                hideCheckbox.type = "checkbox";
                if(element.hidden) {
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
                editBtn.classList.add("icon");
                editTd.appendChild(editBtn);
                editBtn.addEventListener("click", () => {
                    document.body.style.overflow = "hidden";
                    document.querySelector("#edit-slide-box").classList.add("active");
                    document.querySelector("#edit-slide-name input").value = element.name;
                    document.querySelector("#edit-slide-id").value = element._id;
                    document.querySelector("#edit-slide-timeout input").value = Number(element.timeout / 1000);
                    document.querySelector("#edit-background-color-box input").value = element.background_color;
                    document.querySelector("#edit-color-box input").value = element.color;
                    document.querySelector("#edit-slide-box #text-box textarea").innerText = element.text;
                    document.querySelector("#edit-slide-box #url-box input").value = element.url;

                    let target = document.querySelector("#edit-slide-box");
            
                    let timeoutBox = target.querySelector("#edit-slide-timeout");
                    let fontFamilyBox = target.querySelector("#font-family-box");
                    let timelistBox = target.querySelector("#timelist-box")
                    let backgroundColorBox = target.querySelector("#edit-background-color-box");
                    let textColorBox = target.querySelector("#edit-color-box");
                    let fileBox = target.querySelector("#file-box");
                    let fileBoxInput = target.querySelector("#file-box input");
                    let subtitlesBox = target.querySelector("#subtitles-box");
                    let textBox = target.querySelector("#text-box");
                    let urlBox = target.querySelector("#url-box");
            
                    switch (element.type) {
                        case "image":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "none";
                            fontFamilyBox.querySelector("select").innerHTML = "";
                            timelistBox.style.display = "none";
                            timelistBox.querySelector("select").innerHTML = "";
                            timelistBox.querySelector("select").required = false;
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "none";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedImage);
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "none";
                            urlBox.style.display = "none";
                            break;
        
                        case "video":
                            timeoutBox.style.display = "none";
                            fontFamilyBox.style.display = "none";
                            fontFamilyBox.querySelector("select").innerHTML = "";
                            timelistBox.style.display = "none";
                            timelistBox.querySelector("select").innerHTML = "";
                            timelistBox.querySelector("select").required = false;
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "none";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedVideo);
                            subtitlesBox.style.display = "flex";
                            textBox.style.display = "none";
                            urlBox.style.display = "none";urlBox.style.display = "none";
                            break;
        
                        case "text":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "flex";
                            this.createFontDropDown("#edit-slide-form #font-family-box select", element.font_family);
                            timelistBox.style.display = "none";
                            timelistBox.querySelector("select").innerHTML = "";
                            timelistBox.querySelector("select").required = false;
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "flex";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedImage);
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "flex";
                            urlBox.style.display = "none";
                            break;

                        case "iframe":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "none";
                            fontFamilyBox.querySelector("select").innerHTML = "";
                            timelistBox.style.display = "none";
                            timelistBox.querySelector("select").innerHTML = "";
                            timelistBox.querySelector("select").required = false;
                            backgroundColorBox.style.display = "none";
                            textColorBox.style.display = "none";
                            fileBox.style.display = "none";
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "none";
                            urlBox.style.display = "flex";
                            break;
        
                        case "cooldown":
                            timeoutBox.style.display = "flex";
                            fontFamilyBox.style.display = "flex";
                            this.createFontDropDown("#edit-slide-form #font-family-box select", element.font_family);
                            timelistBox.style.display = "block";
                            this.createTimelistDropDown("#edit-slide-box-timelist", element.timelist);
                            timelistBox.querySelector("select").required = true;
                            backgroundColorBox.style.display = "flex";
                            textColorBox.style.display = "flex";
                            fileBox.style.display = "flex";
                            fileBoxInput.setAttribute("accept", this.acceptedImage);
                            subtitlesBox.style.display = "none";
                            textBox.style.display = "none";
                            urlBox.style.display = "none";
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
                    XHR.open("DELETE", "/admin/remove-slide", true);
                    XHR.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    XHR.send(id);
                    
                });
                removeBtn.type = "button";
                removeBtn.classList.add("icon");
                removeBtn.classList.add("remove");
                removeTd.appendChild(removeBtn);
                slide.appendChild(removeTd);

                target.appendChild(slide);
            });
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

    setTimelistBox(targetId) {
        let target = document.querySelector(targetId);
        target.innerHTML = "";

        if(this.dataFromApi.timelists.length > 0) {
            this.dataFromApi.timelists.forEach(element => {
                let heading = document.createElement("h4");
                heading.innerText = element.name;
                let editTimesBox = document.createElement("span");
                editTimesBox.classList.add("edit-times-box")
                let addButton = document.createElement("button");
                addButton.classList.add("blue-btn");
                addButton.innerText = "+";
                addButton.addEventListener("click", () => {
                    document.body.style.overflow = "hidden";
                    let addTimeBox = document.querySelector("#add-time-box");
                    addTimeBox.querySelector("#add-time-list").value = element.basename;
                    addTimeBox.querySelector("#add-time-time").value = "";
                    addTimeBox.classList.add("active");
                    addTimeBox.querySelector("#add-time-time").focus();
                });
                editTimesBox.appendChild(addButton);

                let removeButton = document.createElement("button");
                removeButton.disabled = true;
                removeButton.classList.add("gray-btn");
                removeButton.innerText = "-";
                removeButton.addEventListener("click", () => {
                    let newValuesNodes = document.querySelectorAll(`#timelist-box ul[data-id="${element._id}"] input[type="checkbox"]:not(:checked)`);
                    let newValues = "";
                    newValuesNodes.forEach(node => {
                        newValues += `values[]=${node.dataset.value}&`
                    });
                    newValues += `id=${element._id}`;

                    const XHR = new XMLHttpRequest();
                    XHR.open("PUT", "/admin/remove-time");

                    XHR.onload = async () => {
                        await this.fetchDataFromApi();
                        this.setTimelistBox("#timelist-box");
                        this.alertUser(XHR.responseText, false);
                    }

                    XHR.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    XHR.send(newValues);
                });


                editTimesBox.appendChild(removeButton);
                heading.appendChild(editTimesBox);

                let removeListButton = document.createElement("button");
                removeListButton.classList.add("remove-list-button");
                removeListButton.classList.add("gray-btn");
                removeListButton.innerText = "Odebrat seznam";
                removeListButton.addEventListener("click", (e) => {
                    e.currentTarget.disabled = true;
                    let values = "basename=" + element.basename;
                    const XHR = new XMLHttpRequest();

                    XHR.onload = async () => {
                        await this.fetchDataFromApi();
                        this.alertUser(XHR.responseText);
                        this.setTimelistBox("#timelist-box");
                        document.querySelector("#timelist-box").classList.remove("removing-list");
                    }

                    XHR.open("DELETE", "/admin/remove-timelist", true);
                    XHR.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                    XHR.send(values);
                });
                heading.appendChild(removeListButton);

                target.appendChild(heading);
                if(element.values.length > 0) {
                    element.values.sort((a, b) => {
                        return a.localeCompare(b);
                    });
                    let ul = document.createElement("ul");
                    ul.dataset.id = element._id;
                    element.values.forEach(times => {
                        let li = document.createElement("li");
                        let checkbox = document.createElement("input");
                        checkbox.dataset.value = times;
                        checkbox.type = "checkbox";
                        checkbox.classList.add("icon");
                        checkbox.addEventListener("change", () => {
                            let checkedCount = ul.querySelectorAll("input:checked").length;
                            if(checkedCount == 0) {
                                removeButton.disabled = true;
                            }

                            else {
                                removeButton.disabled = false;
                            }
                        });
                        let label = document.createElement("label");
                        label.innerText = times;
                        label.insertAdjacentElement("afterbegin", checkbox);
                        li.appendChild(label);
                        ul.appendChild(li);
                        target.appendChild(ul);
                    });
                }

                else {
                    let p = document.createElement("p");
                    p.classList.add("description");
                    p.classList.add("center");
                    p.innerText = "Nebyl přidán žádný čas";
                    target.appendChild(p);
                }
            });
        }

        else {
            let p = document.createElement("p");
            p.classList.add("description");
            p.classList.add("center");
            p.innerText = "Nebyl přidán žádný odpočet";
            target.appendChild(p);
        }
    }

    setupGlobalForm() {
        document.querySelector("#global-background-color input").value = this.dataFromApi.background_color;
        document.querySelector("#global-text-color input").value = this.dataFromApi.text_color;
        document.querySelector("#global-transition-time input").value = this.dataFromApi.transition_time;
        this.createFontDropDown("#global-font-selection", this.dataFromApi.font_family);
    }

    setMessages() {
        if(this.dataFromApi.messages && this.dataFromApi.messages.length > 0) {
            this.dataFromApi.messages.forEach(message => {
                this.addMessage("#messages-list", message);
            });
        }

        else {
            document.querySelector("nav #messages-list").innerHTML = `<p class="description center empty">Žádná oznámení</p>`
        }

        const evtSource = new EventSource("/events/messages");

        evtSource.addEventListener("message", (e) => {
            let data = JSON.parse(e.data);
            this.addMessage("#messages-list", data);

            document.querySelector("#messages-btn span").classList.add("active");
        });
    }

    addMessage(targetId, message) {
        let messagesBox = document.querySelector(targetId);
        if(messagesBox.querySelector(".empty")) {
            messagesBox.querySelector(".empty").remove();
        }
        let newMessage = document.createElement("div");
        newMessage.classList.add("message");
        newMessage.classList.add(message.type);
        let textBox = document.createElement("div");
        textBox.classList.add("text");
        let headling = document.createElement("p");
        headling.classList.add("title");
        headling.innerText = message.headling;
        let comment = document.createElement("p");
        comment.classList.add("comment");
        comment.innerText = message.message;
        let time = document.createElement("span");
        time.classList.add("description");
        time.classList.add("time");
        time.innerText = message.time;

        textBox.appendChild(headling);
        textBox.appendChild(comment);
        newMessage.appendChild(textBox);
        newMessage.appendChild(time);
        messagesBox.insertAdjacentElement("afterbegin", newMessage);
    }

    setEventToForms() {
        document.querySelectorAll("form:not(.default)").forEach(element => {
            element.addEventListener("submit", (e) => {
                e.preventDefault();
                this.sendForm(e.currentTarget.id, e.currentTarget.action, e.submitter, e.currentTarget.dataset.onclose || null);
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

    createTimelistDropDown(target, active = null) {
        let targetElement = document.querySelector(target); 
        targetElement.innerHTML = "";
        if(this.dataFromApi.timelists && this.dataFromApi.timelists.length !== 0) {
            this.dataFromApi.timelists.forEach(element => {
                let option = document.createElement("option");
                option.value = element.basename;
                option.innerText = element.name;
                if(active === element.basename) {
                    option.selected = true;
                }
                targetElement.appendChild(option);
            });
        }

        else {
            let option = document.createElement("option");
            option.disabled = true;
            option.selected = true;
            option.innerText = "Není přidán žádný seznam"
            targetElement.appendChild(option);
        }
    }

    addUrlToHosts() {
        document.querySelectorAll(".host-url").forEach(element => {
            element.href = this.url;
            element.innerText = this.url;
        });
    }

    setupPreview() {
        document.querySelector(".preview-iframe").src = this.url + "?nostats";
        document.querySelector("#toggle-iframe-btn").addEventListener("click", () => {
            if(document.querySelector(".preview-iframe").src) {
                document.querySelector("#toggle-iframe-btn").title = "Pokračovat";
                document.querySelector("#toggle-iframe-btn").classList.add("play");
                document.querySelector("#toggle-iframe-btn").classList.remove("pause");
                document.querySelector(".preview-iframe").removeAttribute("src");
                document.querySelector("#fullscreen-iframe-btn").disabled = true;
                document.querySelector("#fullscreen-reload-btn").disabled = true;
            }

            else {
                document.querySelector(".preview-iframe").src = this.url + "?nostats";
                document.querySelector("#toggle-iframe-btn").classList.remove("play");
                document.querySelector("#toggle-iframe-btn").classList.add("pause");
                document.querySelector("#toggle-iframe-btn").title = "Pozastavit";
                document.querySelector("#fullscreen-iframe-btn").disabled = false;
                document.querySelector("#fullscreen-reload-btn").disabled = false;
            }
        });

        document.querySelector("#fullscreen-iframe-btn").addEventListener("click", () => {
            let fullscreenBox = document.querySelector("#prewiew-box iframe");

            try {
                fullscreenBox.requestFullscreen();
            }

            catch(err) {
                console.error(err);
            }
        });

        document.querySelector("#fullscreen-reload-btn").addEventListener("click", () => {
            document.querySelector(".preview-iframe").src = this.url + "?nostats";
        });
    }

    addEventsToButton() {
        document.querySelector("nav #messages-box").addEventListener("mouseenter", () => {
            document.querySelector("#messages-btn span").classList.remove("active");
            document.querySelector("nav #messages-list").classList.add("active");
        });

        document.querySelector("nav #messages-box").addEventListener("mouseleave", () => {
            document.querySelector("nav #messages-list").classList.remove("active");
        });
        document.querySelector("#add-slide").addEventListener("click", this.toggleAddSlide.bind(this));
        document.querySelector("#add-slide-box").addEventListener("mousedown", (e) => {
            if(e.currentTarget == e.target) {
                document.body.style.overflow = null;
                document.querySelector("#add-slide-box").classList.remove("active");
            }
        });
        document.querySelector('#add-slide-box form').addEventListener("submit", () => {
            document.querySelector('#add-slide-box form button[type="submit"]').disabled = true;
            document.querySelector('#add-slide-box form button[type="submit"]').innerText = "Přidávání...";
        });

        document.querySelector("#edit-slide-box").addEventListener("mousedown", (e) => {
            if(e.currentTarget == e.target) {
                document.body.style.overflow = null;
                document.querySelector("#edit-slide-box").classList.remove("active");
            }
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

        this.createFontDropDown("#add-slide-box-font-family", this.dataFromApi.font_family);

        let toggleAddTimeList = document.querySelector("#add-timelist-btn");
        toggleAddTimeList.addEventListener("click", () => {
            document.body.style.overflow = "hidden";
            document.querySelector("#add-timelists-form").classList.add("active");    
        });

        document.querySelector("#remove-timelist-btn").addEventListener("click", () => {
            document.querySelector("#timelist-box").classList.toggle("removing-list");
        });

        document.querySelector("#add-timelists-form").addEventListener("mousedown", (e) => {
            if(e.target == e.currentTarget) {
                document.body.style.overflow = null
                document.querySelector("#add-timelists-form").classList.remove("active");
            }
        });

        document.querySelector("#switch-theme").addEventListener("click", () => {
            document.body.classList.toggle("light-theme");
        });

        document.querySelector("#add-time-box").addEventListener("mousedown", (e) => {
            if(e.currentTarget == e.target) {
                document.body.style.overflow = null;
                e.currentTarget.classList.remove("active");
            }
        });
    }

    toggleAddSlide() {
        let addSlideBox = document.querySelector("#add-slide-box");
        if(addSlideBox.classList.contains("active")) {
            document.body.style.overflow = null;
            addSlideBox.classList.remove("active");
        }

        else {
            document.body.style.overflow = "hidden";
            addSlideBox.classList.add("active");
            addSlideBox.querySelector("input[name=\"add_slide_background_color\"]").value = this.dataFromApi.background_color;
            addSlideBox.querySelector("input[name=\"add_slide_color\"]").value = this.dataFromApi.text_color;
        }
    }

    hideLoadingBox() {
        document.querySelector("#loading-box").classList.add("hidden");
        document.body.style = null;
        setTimeout(() => {
            document.querySelector("#loading-box").remove();
        }, 1000);
    }

    async sendForm(formId, url, submitter, onclose) {
        submitter.disabled = true;
        let form = document.getElementById(formId);
        let method = form.getAttribute("method") || "POST";
        const XHR = new XMLHttpRequest();
        const FD = new FormData(form);

        XHR.addEventListener("load", () => {
            if(onclose) {
                document.querySelector(onclose).classList.remove("active");
            }
            this.alertUser(XHR.responseText, false);
            submitter.disabled = false;
            document.body.style.overflow = null;
            this.updateData();
        });

        XHR.addEventListener("error", () => {
            if(onclose) {
                document.querySelector(onclose).classList.remove("active");
            }
            this.alertUser("Data se nepodařilo odeslat", true);
            submitter.disabled = false;
            document.body.style.overflow = null;
        });

        XHR.open(method, url);
        XHR.send(FD);
    }

    alertUser(message, error) {
        let alertBox = document.createElement("div");
        alertBox.innerText = message;
        alertBox.id = "alert-box"

        if(error) {
            alertBox.classList.add("error");
        }

        let timeout = setTimeout(() => {
            alertBox.remove();
        }, 5100);

        alertBox.addEventListener("click", (e) => {
            e.currentTarget.remove();
            clearTimeout(timeout);
        });

        document.querySelector("#alerts").insertAdjacentElement("beforeend", alertBox);
    }
 
    clientBoxEvents() {
        let refreshBox = document.querySelector("#refresh-client-btn");
        refreshBox.addEventListener("click", () => {
            const XHR = new XMLHttpRequest();
            XHR.onload = () => {
                this.alertUser(XHR.responseText);
            }

            XHR.onerror = () => {
                this.alertUser("Klienty se nepodařilo refreshnout", true);
            }

            XHR.open("POST", "/admin/refresh");
            XHR.send();
        });
    }
}