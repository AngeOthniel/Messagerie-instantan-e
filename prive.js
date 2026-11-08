const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const zoneMessages =
    document.querySelector("#messagesPrives");
const messageRetour =
    document.querySelector("#messageRetour");
const titreContact =
    document.querySelector("#nomContact");
const avatarPrive =
    document.querySelector("#avatarPrive");
const formulaire =
    document.querySelector("#formPrive");
const champMessage =
    document.querySelector("#messagePrive");
const boutonEnvoyer =
    formulaire.querySelector("button");
const params = new URLSearchParams(
    window.location.search
);
const conversationId = params.get("conversation_id");
const emojis = ["❤️", "👍", "😂"];
let utilisateurConnecte = null;
let conversationAutorisee = false;
let canalPrive = null;
let messages = [];
let reactions = [];
let chargementNumero = 0;
let reactionEnCours = false;
// Afficher l'avatar du contact
async function afficherAvatarContact(profil) {
    const prenom = profil?.prenom || "Utilisateur";
    avatarPrive.replaceChildren();
    avatarPrive.textContent =
        prenom.charAt(0).toUpperCase();
    if (!profil?.avatar_url) return;
    const { data, error } = await supabaseClient
        .storage
        .from("avatars")
        .createSignedUrl(profil.avatar_url, 3600);
    if (error || !data?.signedUrl) {
        console.error("Erreur avatar :", error);
        return;
    }
    const image = document.createElement("img");
    image.src = data.signedUrl;
    image.alt = "Photo de " + prenom;
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", function() {
        avatarPrive.replaceChildren();
        avatarPrive.textContent =
            prenom.charAt(0).toUpperCase();
    });
    avatarPrive.replaceChildren(image);
}
// Afficher les messages
function afficherMessages() {
    zoneMessages.innerHTML = "";
    messages.forEach(function(message) {
        const bloc = document.createElement("div");
        bloc.classList.add("bloc-message-prive");
        const bulle = document.createElement("p");
        const estMoi =
            message.user_id === utilisateurConnecte.id;
        if (estMoi) {
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
        heure.textContent =
            new Date(message.created_at)
                .toLocaleTimeString("fr-CA", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
        bloc.appendChild(heure);
        // Réactions sous le message
        const zoneReactions =
            document.createElement("div");
        zoneReactions.classList.add("reactions");
        zoneReactions.classList.add("reactions-privees");
        emojis.forEach(function(emoji) {
            const liste = reactions.filter(
                function(reaction) {
                    return (
                        reaction.message_id === message.id &&
                        reaction.emoji === emoji
                    );
                }
            );
            const maReaction = liste.find(
                function(reaction) {
                    return reaction.user_id ===
                        utilisateurConnecte.id;
                }
            );
            const bouton = document.createElement("button");
            bouton.type = "button";
            bouton.textContent = emoji + " " + liste.length;
            bouton.classList.add("bouton-reaction-prive");
            if (maReaction) {
                bouton.classList.add("reaction-active");
            }
            bouton.setAttribute(
                "aria-pressed",
                maReaction ? "true" : "false"
            );
            bouton.addEventListener("click", function() {
                changerReaction(
                    message.id,
                    emoji,
                    maReaction
                );
            });
            zoneReactions.appendChild(bouton);
        });
        bloc.appendChild(zoneReactions);
        zoneMessages.appendChild(bloc);
    });
    zoneMessages.scrollTop =
        zoneMessages.scrollHeight;
}
// Récupérer messages et réactions
async function chargerMessages() {
    if (!conversationAutorisee) return false;
    const numero = ++chargementNumero;
    const { data, error } = await supabaseClient
        .from("Messages")
        .select("id, contenu, user_id, created_at")
        .eq("conversation_id", Number(conversationId))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
    if (numero !== chargementNumero) return false;
    if (error) {
        console.error("Erreur messages :", error);
        messageRetour.textContent =
            "Impossible de charger les messages.";
        return false;
    }
    const nouveauxMessages = data || [];
    const ids = nouveauxMessages.map(
        function(message) {
            return message.id;
        }
    );
    let nouvellesReactions = [];
    if (ids.length > 0) {
        const resultat = await supabaseClient
            .from("reactions")
            .select("id, message_id, user_id, emoji")
            .in("message_id", ids);
        if (numero !== chargementNumero) return false;
        if (resultat.error) {
            console.error(
                "Erreur réactions :",
                resultat.error
            );
            messageRetour.textContent =
                "Impossible de charger les réactions.";
            return false;
        }
        nouvellesReactions = resultat.data || [];
    }
    messages = nouveauxMessages;
    reactions = nouvellesReactions;
    afficherMessages();
    return true;
}
// Enregistrer la lecture des messages
async function marquerCommeLu() {
    if (!utilisateurConnecte || !conversationAutorisee) {
        return;
    }
    if (document.visibilityState !== "visible") {
        return;
    }
    const { error } = await supabaseClient
        .from("conversation_reads")
        .upsert(
            {
                conversation_id: Number(conversationId),
                user_id: utilisateurConnecte.id,
                last_read_at: new Date().toISOString()
            },
            {
                onConflict: "conversation_id,user_id"
            }
        );
    if (error) {
        console.error("Erreur lecture :", error);
    }
}
// Mettre à jour la discussion
async function actualiserConversation() {
    const charge = await chargerMessages();
    if (
        charge &&
        document.visibilityState === "visible"
    ) {
        await marquerCommeLu();
    }
}
// Ajouter ou retirer une réaction
async function changerReaction(
    messageId,
    emoji,
    maReaction
) {
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
            const resultat = await supabaseClient
                .from("reactions")
                .delete()
                .eq("id", maReaction.id)
                .eq("user_id", utilisateurConnecte.id);
            erreur = resultat.error;
        } else {
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
// Écouter les nouveaux messages
function activerRealtimePrive() {
    if (canalPrive) return;
    canalPrive = supabaseClient
        .channel("prive-" + conversationId)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: "conversation_id=eq." +
                    conversationId
            },
            async function() {
                if (document.visibilityState === "visible") {
                    await actualiserConversation();
                }
            }
        )

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "reactions"
            },
            function() {
                if (document.visibilityState === "visible") {
                    chargerMessages();
                }
            }
        )
        .subscribe(function(status) {
            console.log("Realtime privé :", status);

            if (
                status === "SUBSCRIBED" &&
                document.visibilityState === "visible"
            ) {
                actualiserConversation();
            }
        });
}
// Actualiser au retour sur la page
document.addEventListener(
    "visibilitychange",
    function() {
        if (
            document.visibilityState === "visible" &&
            conversationAutorisee
        ) {
            actualiserConversation();
        }
    }
);
// Vérifier l'accès à la conversation
async function demarrer() {
    boutonEnvoyer.disabled = true;
    const { data, error } =
        await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }
    utilisateurConnecte = data.user;
    if (
        !conversationId ||
        !/^[1-9]\d*$/.test(conversationId)
    ) {
        messageRetour.textContent =
            "Identifiant de conversation invalide.";
        return;
    }
    const { data: conversation,
            error: erreurConversation } =
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
    // Identifier l'autre utilisateur
    const autreId =
        conversation.user1_id === monId
            ? conversation.user2_id
            : conversation.user1_id;
    const { data: profil, error: erreurProfil } =
        await supabaseClient
            .from("profils")
            .select("prenom, avatar_url")
            .eq("id", autreId)
            .single();
    if (erreurProfil) {
        console.error("Erreur profil :", erreurProfil);
    }
    const prenom = profil?.prenom || "Utilisateur";
    titreContact.textContent =
        "Conversation avec " + prenom;
    await afficherAvatarContact(profil);
    // Charger les messages
    await actualiserConversation();
    // Écouter les nouveaux messages
    activerRealtimePrive();
    boutonEnvoyer.disabled = false;
    messageRetour.textContent = "";
}
// Envoyer un message
formulaire.addEventListener(
    "submit",
    async function(event) {
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
                    utilisateurConnecte
                        .user_metadata?.prenom ||
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
            await actualiserConversation();
        }
        boutonEnvoyer.disabled = false;
    }
);
// Nettoyer le canal à la fermeture
window.addEventListener("pagehide", function() {
    if (canalPrive) {
        supabaseClient.removeChannel(canalPrive);
    }
});
demarrer();
