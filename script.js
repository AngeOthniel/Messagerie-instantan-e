const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("form");
const champMessage = document.querySelector("#message");
const zoneMessages = document.querySelector(".messages");
let utilisateurConnecte = null;
// Afficher un message
function afficherMessage(message) {
    const nouveauMessage = document.createElement("p");
    // Si le message appartient à l'utilisateur connecté
    if (
        utilisateurConnecte &&
        message.user_id === utilisateurConnecte.id
    ) {
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent = "Moi : " + message.contenu;
    }
    // Ancien message sans user_id
    else if (message.user_id === null && message.utilisateur === "Moi") {
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent = "Moi : " + message.contenu;
    }
    // Message envoyé par une autre personne
    else {
        nouveauMessage.classList.add("recu");
        nouveauMessage.textContent =
            message.utilisateur + " : " + message.contenu;
    }
    zoneMessages.appendChild(nouveauMessage);
    // Heure du message
    const heure = document.createElement("p");
    heure.classList.add("heure");
    const date = new Date(message.created_at);
    heure.textContent =
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0");
    zoneMessages.appendChild(heure);
    // Réactions
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
}
// Charger les anciens messages
async function chargerMessages() {
    const { data, error } = await supabaseClient
        .from("Messages")
        .select("*")
        .order("created_at", { ascending: true });
    if (error) {
        console.log("Erreur chargement :", error);
        return;
    }
    zoneMessages.innerHTML = "";
    data.forEach(function(message) {
        afficherMessage(message);
    });
}
// Envoyer un message
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    const texte = champMessage.value.trim();
    if (texte === "") {
        return;
    }
    if (!utilisateurConnecte) {
        alert("Vous devez être connecté.");
        window.location.href = "index.html";
        return;
    }
    // Récupérer le prénom enregistré lors de l'inscription
    const prenom =
        utilisateurConnecte.user_metadata.prenom ||
        utilisateurConnecte.email;
    const { error } = await supabaseClient
        .from("Messages")
        .insert([
            {
                utilisateur: prenom,
                contenu: texte,
                user_id: utilisateurConnecte.id
            }
        ]);
    if (error) {
        console.log("Erreur Supabase :", error);
        return;
    }
    // Realtime affichera le message
    champMessage.value = "";
});
// Realtime
function activerRealtime() {
    supabaseClient
        .channel("messages-realtime")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "Messages"
            },
            function(payload) {
                afficherMessage(payload.new);
            }
        )
        .subscribe(function(status) {
            console.log("Realtime :", status);
        });
}
// Vérifier l'utilisateur connecté
async function demarrerMessagerie() {
    const { data, error } =
        await supabaseClient.auth.getUser();
    if (error || !data.user) {
        alert("Vous devez vous connecter.");
        window.location.href = "index.html";
        return;
    }
    utilisateurConnecte = data.user;
    console.log(
        "Utilisateur connecté :",
        utilisateurConnecte.user_metadata.prenom
    );
    await chargerMessages();
    activerRealtime();
}
// Démarrer
demarrerMessagerie();
