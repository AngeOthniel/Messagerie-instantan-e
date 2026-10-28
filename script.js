const formulaire = document.querySelector("form");
const champMessage = document.querySelector("#message");
const zoneMessages = document.querySelector(".messages");
formulaire.addEventListener("submit", function(event) {
    event.preventDefault();
    const texte = champMessage.value;
    if (texte !== "") {
        const nouveauMessage = document.createElement("p");
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent = "Moi : " + texte;
        zoneMessages.appendChild(nouveauMessage);
        champMessage.value = "";
    }
});
