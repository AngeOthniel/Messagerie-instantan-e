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
let reactionsEnregistrees = [];
// Afficher un message
function afficherMessage(message) {
    // Éviter les messages en double
    if (document.getElementById("msg-" + message.id)) {
        return;
    }
    const bloc = document.createElement("div");
    bloc.id = "msg-" + message.id;
    const nouveauMessage = document.createElement("p");
    if (
        utilisateurConnecte &&
        message.user_id === utilisateurConnecte.id
    ) {
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent = "Moi : " + message.contenu;
    } else if (
        message.user_id === null &&
        message.utilisateur === "Moi"
    ) {
        // Compatibilité avec les anciens messages
        nouveauMessage.classList.add("envoye");
        nouveauMessage.textContent = "Moi : " + message.contenu;
    } else {
        nouveauMessage.classList.add("recu");
        nouveauMessage.textContent =
            message.utilisateur + " : " + message.contenu;
    }
    bloc.appendChild(nouveauMessage);
    // Afficher l'heure
    const heure = document.createElement("p");
    heure.classList.add("heure");
    const date = new Date(message.created_at);
    heure.textContent = date.toLocaleTimeString("fr-CA", {
        hour: "2-digit",
        minute: "2-digit"
    });
    bloc.appendChild(heure);
    // Zone des réactions
    const zoneReactions = document.createElement("p");
    zoneReactions.classList.add("reactions");
    const emojis = ["❤️", "👍", "😂"];
    emojis.forEach(function(emoji) {
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.dataset.emoji = emoji;
        bouton.style.marginRight = "10px";
        bouton.style.cursor = "pointer";
        bouton.style.background = "transparent";
        bouton.style.border = "none";
        bouton.style.fontSize = "16px";
        bouton.textContent = emoji + " 0";
        bouton.addEventListener("click", async function() {
            bouton.disabled = true;
            try {
                await gererReaction(message.id, emoji);
            } finally {
                bouton.disabled = false;
            }
        });
        zoneReactions.appendChild(bouton);
    });
    bloc.appendChild(zoneReactions);
    zoneMessages.appendChild(bloc);
    actualiserReactionsDuMessage(message.id);
}
// Charger les réactions depuis Supabase
async function chargerReactions() {
    const { data, error } = await supabaseClient
        .from("reactions")
        .select("id, message_id, user_id, emoji");
    if (error) {
        console.error("Erreur chargement réactions :", error);
        return;
    }
    reactionsEnregistrees = data || [];
    // Actualiser les réactions de tous les messages
    document.querySelectorAll("[id^='msg-']").forEach(function(bloc) {
        const id = Number(bloc.id.substring(4));
        actualiserReactionsDuMessage(id);
    });
}
// Actualiser les compteurs d'un message
function actualiserReactionsDuMessage(messageId) {
    const bloc = document.getElementById("msg-" + messageId);
    if (!bloc) {
        return;
    }
    const boutons = bloc.querySelectorAll(
        ".reactions button"
    );
    boutons.forEach(function(bouton) {
        const emoji = bouton.dataset.emoji;
        const reactions = reactionsEnregistrees.filter(
            function(reaction) {
                return (
                    reaction.message_id === messageId &&
                    reaction.emoji === emoji
                );
            }
        );
        const dejaReagi = reactions.some(function(reaction) {
            return (
                utilisateurConnecte &&
                reaction.user_id === utilisateurConnecte.id
            );
        });
        bouton.textContent = emoji + " " + reactions.length;
        bouton.style.fontWeight =
            dejaReagi ? "bold" : "normal";
    });
}
// Ajouter ou supprimer sa propre réaction
async function gererReaction(messageId, emoji) {
    if (!utilisateurConnecte) {
        alert("Vous devez être connecté.");
        return;
    }
    const reactionExistante = reactionsEnregistrees.find(
        function(reaction) {
            return (
                reaction.message_id === messageId &&
                reaction.emoji === emoji &&
                reaction.user_id === utilisateurConnecte.id
            );
        }
    );
    let error;
    if (reactionExistante) {
        // Retirer sa réaction
        const resultat = await supabaseClient
            .from("reactions")
            .delete()
            .eq("id", reactionExistante.id)
            .eq("user_id", utilisateurConnecte.id);
        error = resultat.error;
    } else {
        // Ajouter sa réaction
        const resultat = await supabaseClient
            .from("reactions")
            .insert({
                message_id: messageId,
                user_id: utilisateurConnecte.id,
                emoji: emoji
            });
        error = resultat.error;
    }
    if (error) {
        console.error("Erreur réaction :", error);
        alert("Impossible d'enregistrer la réaction.");
        return;
    }
    // Mettre à jour immédiatement notre écran
    await chargerReactions();
}
// Charger les anciens messages
async function chargerMessages() {
    const { data, error } = await supabaseClient
        .from("Messages")
        .select("*")
        .order("created_at", { ascending: true });
    if (error) {
        console.error("Erreur chargement messages :", error);
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
    const prenom =
        utilisateurConnecte.user_metadata?.prenom ||
        utilisateurConnecte.email;
    const { error } = await supabaseClient
        .from("Messages")
        .insert([{
            utilisateur: prenom,
            contenu: texte,
            user_id: utilisateurConnecte.id
        }]);
    if (error) {
        console.error("Erreur Supabase :", error);
        alert("Impossible d'envoyer le message.");
        return;
    }
    champMessage.value = "";
});
// Activer les mises à jour en temps réel
function activerRealtime() {
    supabaseClient
        .channel("messagerie-realtime")
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
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "reactions"
            },
            async function() {
                await chargerReactions();
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
        utilisateurConnecte.user_metadata?.prenom
    );
    await chargerReactions();
    await chargerMessages();
    activerRealtime();
}
// Démarrer
demarrerMessagerie();
// Déconnexion
const boutonDeconnexion =
    document.querySelector("#deconnexion");
if (boutonDeconnexion) {
    boutonDeconnexion.addEventListener(
        "click",
        async function(event) {
            event.preventDefault();
            const { error } =
                await supabaseClient.auth.signOut();
            if (error) {
                console.error("Erreur déconnexion :", error);
                alert("Impossible de se déconnecter.");
                return;
            }
            window.location.href = "index.html";
        }
    );
}
