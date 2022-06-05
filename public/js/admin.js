'use struct';

class adminPanel {
    constructor() {
        this.url = location.protocol + '//' + location.host;

        this.addUrlToHosts();
        this.setupPreview();
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
}