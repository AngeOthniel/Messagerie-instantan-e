const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("form");
const champMessage = document.querySelector("#message");
const zoneMessages = document.querySelector(".messages");
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    const texte = champMessage.value;
    if (texte !== "") {
        // Pour enregistrer le message dans Supabase
        const { error } = await supabaseClient
            .from("message")
            .insert([
                {
                    utilisateur: "Moi",
                    contenu: texte
                }
            ]);
        if (error) {
            console.log("Erreur Supabase :", error);
            return;
        }
        // Pour créer le message dans la page
        const nouveauMessage = document.createElement("p");
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent = "Moi : " + texte;
        zoneMessages.appendChild(nouveauMessage);
        // Pour ajouter l'heure
        const heure = document.createElement("p");
        heure.classList.add("heure");
        const maintenant = new Date();
        heure.textContent =
            maintenant.getHours().toString().padStart(2, "0") +
            ":" +
            maintenant.getMinutes().toString().padStart(2, "0");
        zoneMessages.appendChild(heure);
        // Pour créer les réactions
        const reactions = document.createElement("p");
        reactions.classList.add("reactions");
        const coeur = document.createElement("span");
        coeur.textContent = "❤️ 0";
        const pouce = document.createElement("span");
        pouce.textContent = " 👍 0";
        const rire = document.createElement("span");
        rire.textContent = " 😂 0";
        // Pour les réactions coeur
        coeur.addEventListener("click", function() {
            if (coeur.textContent === "❤️ 0") {
                coeur.textContent = "❤️ 1";
            } else {
                coeur.textContent = "❤️ 0";
            }
        });
        // Pour les réactions pouce
        pouce.addEventListener("click", function() {
            if (pouce.textContent === " 👍 0") {
                pouce.textContent = " 👍 1";
            } else {
                pouce.textContent = " 👍 0";
            }
        });
        // Pour les réactions rire
        rire.addEventListener("click", function() {
            if (rire.textContent === " 😂 0") {
                rire.textContent = " 😂 1";
            } else {
                rire.textContent = " 😂 0";
            }
        });
        reactions.appendChild(coeur);
        reactions.appendChild(pouce);
        reactions.appendChild(rire);
        zoneMessages.appendChild(reactions);
        // Pour vider le champ après l'envoi
        champMessage.value = "";
    }

});
