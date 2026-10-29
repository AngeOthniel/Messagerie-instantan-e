const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("form");
const champMessage = document.querySelector("#message");
const zoneMessages = document.querySelector(".messages");
// Pour charger les messages déjà enregistrés dans Supabase
async function chargerMessages() {
    const { data, error } = await supabaseClient
        .from("Messages")
        .select("*")
        .order("created_at", { ascending: true });
    if (error) {
        console.log("Erreur chargement :", error);
        return;
    }
    data.forEach(function(message) {
        const nouveauMessage = document.createElement("p");
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent =
            message.utilisateur + " : " + message.contenu;
        zoneMessages.appendChild(nouveauMessage);
        const heure = document.createElement("p");
        heure.classList.add("heure");
        const date = new Date(message.created_at);
        heure.textContent =
            date.getHours().toString().padStart(2, "0") +
            ":" +
            date.getMinutes().toString().padStart(2, "0");
        zoneMessages.appendChild(heure);
    });
}
// Pour envoyer un nouveau message
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    const texte = champMessage.value;
    if (texte !== "") {
        // Pour enregistrer dans Supabase
        const { error } = await supabaseClient
            .from("Messages")
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
        // Pour afficher le message dans la page
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
        coeur.addEventListener("click", function() {
            if (coeur.textContent === "❤️ 0") {
                coeur.textContent = "❤️ 1";
            } else {
                coeur.textContent = "❤️ 0";
            }
        });
        pouce.addEventListener("click", function() {
            if (pouce.textContent === " 👍 0") {
                pouce.textContent = " 👍 1";
            } else {
                pouce.textContent = " 👍 0";
            }
        });
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
        // Pour vider le champ
        champMessage.value = "";
    }
});
// Pour charger les messages au démarrage de la page
chargerMessages();
