window.onload = () => {
    //focus to input
    document.querySelector("input").focus();
    if(window.location.search.substr(1) == "wrong-password") {
        document.querySelector("#login-status").innerText = "Neplatné heslo"
    }
}