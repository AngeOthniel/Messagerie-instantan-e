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
        const heure = document.createElement("p");
heure.classList.add("heure");
const maintenant = new Date();
heure.textContent =
    maintenant.getHours().toString().padStart(2, "0") +
    ":" +
    maintenant.getMinutes().toString().padStart(2, "0");
zoneMessages.appendChild(heure);
        const reactions = document.createElement("p");
reactions.classList.add("reactions");
reactions.textContent = "❤️ 0 👍 0 😂 0";
zoneMessages.appendChild(reactions);
        champMessage.value = "";
    }
});
