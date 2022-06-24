window.onload = () => {
    //focus to input
    document.querySelector("input").focus();
    if(window.location.search.substring(1) == "wrong-password") {
        document.querySelector("#login-status").innerText = "Neplatné heslo"
    }
}

const darkThemeMq = window.matchMedia("(prefers-color-scheme: light)");
if (darkThemeMq.matches) {
    document.body.classList.add("light-theme");
}