'use struct';

class adminPanel {
    constructor() {
        this.url = location.protocol + '//' + location.host;

        this.addUrlToHosts();
        this.setupPreview();
        this.addEventsToButton();
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
        document.querySelector("#add-visitation-box").classList.toggle("active");
        document.querySelector("#add-visitation-box input[name=\"hours\"]").value = date.getHours();
        document.querySelector("#add-visitation-box input[name=\"minutes\"]").value = date.getMinutes();
    }

    getVisitationListChange() {
        let visitationList = document.querySelectorAll("#visitation-list input[type=\"checkbox\"]:checked");
        if(visitationList.length == 0) {
            document.querySelector("#remove-visitations").disabled = true;
        }

        else {
            document.querySelector("#remove-visitations").disabled = false;
        }
    }
}