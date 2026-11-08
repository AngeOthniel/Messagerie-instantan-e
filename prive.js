const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const zoneMessages = document.querySelector("#messagesPrives");
const messageRetour = document.querySelector("#messageRetour");
const titreContact = document.querySelector("#nomContact");
const avatarPrive = document.querySelector("#avatarPrive");
const indicateurSaisie = document.querySelector("#indicateurSaisie");
const formulaire = document.querySelector("#formPrive");
const champMessage = document.querySelector("#messagePrive");
const boutonEnvoyer = formulaire.querySelector("button");

const params = new URLSearchParams(window.location.search);
const conversationId = params.get("conversation_id");
const emojis = ["❤️", "👍", "😂"];

let utilisateurConnecte = null;
let autreUtilisateurId = null;
let prenomContact = "Utilisateur";
let conversationAutorisee = false;

let messages = [];
let reactions = [];
let derniereLectureContact = null;
let chargementNumero = 0;
let reactionEnCours = false;

let canalPrive = null;
let canalSaisie = null;
let saisieConnectee = false;
let derniereEmissionSaisie = 0;
let minuterieSaisieLocale = null;
let minuterieSaisieDistante = null;
let intervalleLecture = null;

// Format de date locale
function cleJour(date) {
    const d = new Date(date);

    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
    ].join("-");
}

function formaterJour(date) {
    const d = new Date(date);
    const aujourdHui = new Date();
    const hier = new Date();

    hier.setDate(hier.getDate() - 1);

    if (cleJour(d) === cleJour(aujourdHui)) {
        return "Aujourd'hui";
    }

    if (cleJour(d) === cleJour(hier)) {
        return "Hier";
    }

    return d.toLocaleDateString("fr-CA", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// Afficher l'avatar du contact
async function afficherAvatarContact(profil) {
    const initiale = prenomContact.charAt(0).toUpperCase();

    avatarPrive.textContent = initiale;

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
    image.alt = "Photo de " + prenomContact;
    image.referrerPolicy = "no-referrer";

    image.addEventListener("error", function() {
        avatarPrive.replaceChildren();
        avatarPrive.textContent = initiale;
    });

    avatarPrive.replaceChildren(image);
}

// Vérifier si le contact a lu mon message
function messageEstLu(message) {
    if (!derniereLectureContact) return false;

    return new Date(message.created_at).getTime() <=
        new Date(derniereLectureContact).getTime();
}

// Afficher les bulles et réactions
function afficherMessages() {
    zoneMessages.replaceChildren();

    let dernierJour = "";

    messages.forEach(function(message) {
        const jour = cleJour(message.created_at);

        if (jour !== dernierJour) {
            const separateur = document.createElement("div");
            separateur.className = "separateur-date";
            separateur.textContent = formaterJour(
                message.created_at
            );

            zoneMessages.appendChild(separateur);
            dernierJour = jour;
        }

        const estMoi =
            message.user_id === utilisateurConnecte.id;

        const bloc = document.createElement("div");
        bloc.className = estMoi
            ? "bloc-message-prive message-moi"
            : "bloc-message-prive message-autre";

        const bulle = document.createElement("div");
        bulle.className = estMoi ? "envoye" : "recu";
        bulle.textContent = message.contenu;

        bloc.appendChild(bulle);

        // Heure et confirmation de lecture
        const informations = document.createElement("div");
        informations.className = "info-message";

        const heure = document.createElement("span");
        heure.textContent = new Date(
            message.created_at
        ).toLocaleTimeString("fr-CA", {
            hour: "2-digit",
            minute: "2-digit"
        });

        informations.appendChild(heure);

        if (estMoi) {
            const statut = document.createElement("span");
            statut.className = "statut-message";

            const lu = messageEstLu(message);

            statut.textContent = lu
                ? "✓✓ Lu"
                : "✓ Envoyé";

            if (lu) {
                statut.classList.add("statut-lu");
            }

            informations.appendChild(statut);
        }

        bloc.appendChild(informations);

        // Boutons de réactions
        const zoneReactions = document.createElement("div");
        zoneReactions.className = "reactions reactions-privees";

        emojis.forEach(function(emoji) {
            const liste = reactions.filter(function(reaction) {
                return reaction.message_id === message.id &&
                       reaction.emoji === emoji;
            });

            const maReaction = liste.find(function(reaction) {
                return reaction.user_id === utilisateurConnecte.id;
            });

            const bouton = document.createElement("button");
            bouton.type = "button";
            bouton.className = "bouton-reaction-prive";

            if (maReaction) {
                bouton.classList.add("reaction-active");
            }

            bouton.textContent = emoji + " " + liste.length;

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

    zoneMessages.scrollTop = zoneMessages.scrollHeight;
}

// Charger les messages et leurs réactions
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
    const ids = nouveauxMessages.map(m => m.id);

    let nouvellesReactions = [];

    if (ids.length > 0) {
        const resultat = await supabaseClient
            .from("reactions")
            .select("id, message_id, user_id, emoji")
            .in("message_id", ids);

        if (numero !== chargementNumero) return false;

        if (resultat.error) {
            console.error("Erreur réactions :", resultat.error);
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

// Récupérer la dernière lecture du contact
async function chargerLectureContact() {
    if (!autreUtilisateurId || !conversationAutorisee) return;

    const { data, error } = await supabaseClient
        .from("conversation_reads")
        .select("last_read_at")
        .eq("conversation_id", Number(conversationId))
        .eq("user_id", autreUtilisateurId)
        .maybeSingle();

    if (error) {
        console.error("Erreur lecture du contact :", error);
        return;
    }

    derniereLectureContact = data?.last_read_at || null;

    // Actualiser les coches sans recharger les messages
    afficherMessages();
}

// Marquer la conversation comme lue
async function marquerCommeLu() {
    if (
        !utilisateurConnecte ||
        !conversationAutorisee ||
        document.visibilityState !== "visible"
    ) {
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

async function actualiserConversation() {
    const charge = await chargerMessages();

    if (charge && document.visibilityState === "visible") {
        await marquerCommeLu();
    }
}

// Ajouter ou retirer une réaction
async function changerReaction(messageId, emoji, maReaction) {
    if (
        !conversationAutorisee ||
        !utilisateurConnecte ||
        reactionEnCours
    ) return;

    reactionEnCours = true;

    try {
        let erreur = null;

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

// Réception des messages, réactions et lectures
function activerRealtimePrive() {
    if (canalPrive) return;

    canalPrive = supabaseClient
        .channel("messages-prives-" + conversationId)

        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: "conversation_id=eq." + conversationId
            },
            function() {
                if (document.visibilityState === "visible") {
                    actualiserConversation();
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

        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "conversation_reads",
                filter: "conversation_id=eq." + conversationId
            },
            function() {
                chargerLectureContact();
            }
        )

        .subscribe(function(status) {
            console.log("Realtime messages :", status);

            if (status === "SUBSCRIBED") {
                actualiserConversation();
                chargerLectureContact();
            }
        });
}

// Envoyer une indication de saisie
function envoyerEtatSaisie(estEnTrainDecrire) {
    if (
        !canalSaisie ||
        !saisieConnectee ||
        !utilisateurConnecte
    ) return;

    canalSaisie.send({
        type: "broadcast",
        event: "saisie",
        payload: {
            utilisateur: utilisateurConnecte.id,
            actif: estEnTrainDecrire
        }
    }).catch(function(error) {
        console.error("Erreur indicateur saisie :", error);
    });
}

// Recevoir "écrit..."
function activerSaisieRealtime() {
    if (canalSaisie) return;

    canalSaisie = supabaseClient.channel(
        "typing:" + conversationId,
        {
            config: {
                private: true
            }
        }
    );

    canalSaisie
        .on(
            "broadcast",
            { event: "saisie" },
            function(message) {
                const info = message.payload;

                if (
                    !info ||
                    info.utilisateur !== autreUtilisateurId
                ) return;

                clearTimeout(minuterieSaisieDistante);

                if (info.actif) {
                    indicateurSaisie.textContent =
                        prenomContact + " écrit...";

                    // Masquer automatiquement si le contact
                    // cesse d'envoyer des indications
                    minuterieSaisieDistante = setTimeout(
                        function() {
                            indicateurSaisie.textContent = "";
                        },
                        4000
                    );
                } else {
                    indicateurSaisie.textContent = "";
                }
            }
        )

        .subscribe(function(status, error) {
            console.log("Realtime saisie :", status);

            saisieConnectee = status === "SUBSCRIBED";

            if (error) {
                console.error("Erreur canal privé :", error);
            }
        });
}

// Lorsqu'on commence à écrire
champMessage.addEventListener("input", function() {
    if (!conversationAutorisee) return;

    clearTimeout(minuterieSaisieLocale);

    const texte = champMessage.value.trim();

    if (!texte) {
        envoyerEtatSaisie(false);
        return;
    }

    const maintenant = Date.now();

    // Éviter un événement à chaque caractère
    if (maintenant - derniereEmissionSaisie > 1500) {
        envoyerEtatSaisie(true);
        derniereEmissionSaisie = maintenant;
    }

    minuterieSaisieLocale = setTimeout(function() {
        envoyerEtatSaisie(false);
        derniereEmissionSaisie = 0;
    }, 1800);
});

// Quand on revient sur l'onglet
document.addEventListener("visibilitychange", function() {
    if (!conversationAutorisee) return;

    if (document.visibilityState === "visible") {
        actualiserConversation();
        chargerLectureContact();
    } else {
        clearTimeout(minuterieSaisieLocale);
        envoyerEtatSaisie(false);
    }
});

// Vérifier l'accès et ouvrir la conversation
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

    autreUtilisateurId =
        conversation.user1_id === monId
            ? conversation.user2_id
            : conversation.user1_id;

    const { data: profil, error: erreurProfil } =
        await supabaseClient
            .from("profils")
            .select("prenom, avatar_url")
            .eq("id", autreUtilisateurId)
            .single();

    if (erreurProfil) {
        console.error("Erreur profil :", erreurProfil);
    }

    prenomContact = profil?.prenom || "Utilisateur";

    titreContact.textContent =
        "Conversation avec " + prenomContact;

    await afficherAvatarContact(profil);

    // Charger les dates de lecture avant les messages
    await chargerLectureContact();
    await actualiserConversation();

    // Actualiser le statut Lu / Envoyé
    activerRealtimePrive();

    // Authentifier le canal privé d'indication de saisie
    const { data: sessionData } =
        await supabaseClient.auth.getSession();

    if (sessionData.session?.access_token) {
        supabaseClient.realtime.setAuth(
            sessionData.session.access_token
        );
    }

    activerSaisieRealtime();

    // Vérification périodique si une notification
    // Realtime est manquée
    intervalleLecture = setInterval(function() {
        if (document.visibilityState === "visible") {
            chargerLectureContact();
        }
    }, 12000);

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
    ) return;

    const texte = champMessage.value.trim();
    if (!texte) return;

    boutonEnvoyer.disabled = true;
    clearTimeout(minuterieSaisieLocale);
    envoyerEtatSaisie(false);

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
        await actualiserConversation();
    }

    boutonEnvoyer.disabled = false;
});

// Libérer les connexions
window.addEventListener("pagehide", function() {
    clearTimeout(minuterieSaisieLocale);
    clearTimeout(minuterieSaisieDistante);
    clearInterval(intervalleLecture);

    envoyerEtatSaisie(false);

    if (canalPrive) {
        supabaseClient.removeChannel(canalPrive);
    }

    if (canalSaisie) {
        supabaseClient.removeChannel(canalSaisie);
    }
});

demarrer();
