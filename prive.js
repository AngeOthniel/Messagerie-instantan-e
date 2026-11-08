const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const zoneMessages = document.querySelector("#messagesPrives");
const messageRetour = document.querySelector("#messageRetour");
const titreContact = document.querySelector("#nomContact");
const formulaire = document.querySelector("#formPrive");
const champMessage = document.querySelector("#messagePrive");
const boutonEnvoyer = formulaire.querySelector("button");
const params = new URLSearchParams(window.location.search);
const conversationId = params.get("conversation_id");
const emojis = ["❤️", "👍", "😂"];
let utilisateurConnecte = null;
let conversationAutorisee = false;
let canalPrive = null;
let messages = [];
let reactions = [];
let chargementNumero = 0;
let reactionEnCours = false;
// Afficher les messages et les réactions
function afficherMessages() {
    zoneMessages.innerHTML = "";
    messages.forEach(function(message) {
        const bloc = document.createElement("div");
        bloc.style.marginBottom = "20px";
        const bulle = document.createElement("p");
        if (message.user_id === utilisateurConnecte.id) {
            bulle.classList.add("envoye");
            bulle.textContent = "Moi : " + message.contenu;
        } else {
            bulle.classList.add("recu");
            bulle.textContent = message.contenu;
        }
        bloc.appendChild(bulle);
        // Afficher l'heure
        const heure = document.createElement("p");
        heure.classList.add("heure");
        const date = new Date(message.created_at);
        heure.textContent = date.toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit"
        });
        heure.style.textAlign = "center";
        bloc.appendChild(heure);
        // Conteneur des réactions
        const zoneReactions = document.createElement("div");
        zoneReactions.classList.add("reactions");
        zoneReactions.style.display = "flex";
        zoneReactions.style.justifyContent = "center";
        zoneReactions.style.alignItems = "center";
        zoneReactions.style.gap = "12px";
        zoneReactions.style.margin = "8px 0";
        emojis.forEach(function(emoji) {
            // Réactions de ce message et de cet emoji
            const liste = reactions.filter(function(reaction) {
                return reaction.message_id === message.id &&
                       reaction.emoji === emoji;
            });
            const maReaction = liste.find(function(reaction) {
                return reaction.user_id === utilisateurConnecte.id;
            });
            const bouton = document.createElement("button");
            bouton.type = "button";
            bouton.textContent = emoji + " " + liste.length;
            bouton.style.width = "auto";
            bouton.style.padding = "5px 9px";
            bouton.style.border = "none";
            bouton.style.borderRadius = "8px";
            bouton.style.cursor = "pointer";
            bouton.style.fontSize = "15px";
            bouton.style.color = "#222";
            bouton.style.backgroundColor = maReaction
                ? "#e9d5ff"
                : "#f3f4f6";
            bouton.setAttribute(
                "aria-pressed",
                maReaction ? "true" : "false"
            );
            bouton.addEventListener("click", function() {
                changerReaction(message.id, emoji, maReaction);
            });
            zoneReactions.appendChild(bouton);
        });
        bloc.appendChild(zoneReactions);
        zoneMessages.appendChild(bloc);
    });
}
// Charger les messages et leurs réactions
async function chargerMessages() {
    if (!conversationAutorisee) return;
    const numero = ++chargementNumero;
    const { data, error } = await supabaseClient
        .from("Messages")
        .select("id, contenu, user_id, created_at")
        .eq("conversation_id", Number(conversationId))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
    if (numero !== chargementNumero) return;
    if (error) {
        console.error("Erreur messages :", error);
        messageRetour.textContent =
            "Impossible de charger les messages.";
        return;
    }
    const nouveauxMessages = data || [];
    const ids = nouveauxMessages.map(function(message) {
        return message.id;
    });
    let nouvellesReactions = [];
    if (ids.length > 0) {
        const resultat = await supabaseClient
            .from("reactions")
            .select("id, message_id, user_id, emoji")
            .in("message_id", ids);
        if (numero !== chargementNumero) return;
        if (resultat.error) {
            console.error("Erreur réactions :", resultat.error);
            messageRetour.textContent =
                "Impossible de charger les réactions.";
            return;
        }
        nouvellesReactions = resultat.data || [];
    }
    messages = nouveauxMessages;
    reactions = nouvellesReactions;
    afficherMessages();
}
// Ajouter ou retirer une réaction
async function changerReaction(messageId, emoji, maReaction) {
    if (
        !conversationAutorisee ||
        !utilisateurConnecte ||
        reactionEnCours
    ) {
        return;
    }
    reactionEnCours = true;
    try {
        let erreur;
        if (maReaction) {
            // Retirer sa propre réaction
            const resultat = await supabaseClient
                .from("reactions")
                .delete()
                .eq("id", maReaction.id)
                .eq("user_id", utilisateurConnecte.id);
            erreur = resultat.error;
        } else {
            // Ajouter une nouvelle réaction
            const resultat = await supabaseClient
                .from("reactions")
                .insert({
                    message_id: messageId,
                    user_id: utilisateurConnecte.id,
                    emoji: emoji
                });
            erreur = resultat.error;
        }
        if (erreur) throw erreur;
        // Actualiser les compteurs
        await chargerMessages();
        messageRetour.textContent = "";
    } catch (error) {
        console.error("Erreur réaction :", error);
        messageRetour.textContent =
            "Impossible de modifier la réaction.";
        await chargerMessages();
    } finally {
        reactionEnCours = false;
    }
}
// Activer le temps réel
function activerRealtimePrive() {
    if (canalPrive) return;
    canalPrive = supabaseClient
        .channel("prive-" + conversationId)
        // Nouveaux messages privés
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: "conversation_id=eq." + conversationId
            },
            function() {
                chargerMessages();
            }
        )
        // Changements de réactions
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "reactions"
            },
            function() {
                chargerMessages();
            }
        )
        .subscribe(function(status) {
            console.log("Realtime privé :", status);

            if (status === "SUBSCRIBED") {
                chargerMessages();
            }
        });
}
// Vérifier et ouvrir la conversation
async function demarrer() {
    boutonEnvoyer.disabled = true;
    const { data, error } =
        await supabaseClient.auth.getUser();
    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }
    utilisateurConnecte = data.user;
    if (!conversationId || !/^[1-9]\d*$/.test(conversationId)) {
        messageRetour.textContent =
            "Identifiant de conversation invalide.";
        return;
    }
    // Vérifier la participation
    const { data: conversation, error: erreurConversation } =
        await supabaseClient
            .from("conversations")
            .select("user1_id, user2_id")
            .eq("id", Number(conversationId))
            .single();
    if (erreurConversation || !conversation) {
        messageRetour.textContent =
            "Conversation introuvable ou accès refusé.";
        return;
    }
    const monId = utilisateurConnecte.id;
    if (
        conversation.user1_id !== monId &&
        conversation.user2_id !== monId
    ) {
        messageRetour.textContent = "Accès refusé.";
        return;
    }
    conversationAutorisee = true;
    const autreId =
        conversation.user1_id === monId
            ? conversation.user2_id
            : conversation.user1_id;
    // Trouver le prénom du contact
    const { data: profil, error: erreurProfil } =
        await supabaseClient
            .from("profils")
            .select("prenom")
            .eq("id", autreId)
            .single();
    if (erreurProfil) {
        console.error("Erreur profil :", erreurProfil);
    }
    titreContact.textContent =
        "Conversation avec " +
        (profil?.prenom || "Utilisateur");
    // Charger les anciens messages
    await chargerMessages();
    // Activer la réception automatique
    activerRealtimePrive();
    boutonEnvoyer.disabled = false;
    messageRetour.textContent = "";
}
// Envoyer un message privé
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (
        !utilisateurConnecte ||
        !conversationAutorisee ||
        boutonEnvoyer.disabled
    ) {
        return;
    }
    const texte = champMessage.value.trim();
    if (!texte) return;
    boutonEnvoyer.disabled = true;
    const { error } = await supabaseClient
        .from("Messages")
        .insert({
            utilisateur:
                utilisateurConnecte.user_metadata?.prenom ||
                "Utilisateur",
            contenu: texte,
            user_id: utilisateurConnecte.id,
            conversation_id: Number(conversationId)
        });
    if (error) {
        console.error("Erreur envoi :", error);
        messageRetour.textContent =
            "Impossible d'envoyer le message.";
    } else {
        champMessage.value = "";
        messageRetour.textContent = "";
        await chargerMessages();
    }
    boutonEnvoyer.disabled = false;
});
// Nettoyer le canal en quittant la page
window.addEventListener("pagehide", function() {
    if (canalPrive) {
        supabaseClient.removeChannel(canalPrive);
    }
});
// Démarrer
demarrer();
