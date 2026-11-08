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
const boutonEnvoyer = document.querySelector("#boutonEnvoyerPrive");
const fichierPrive = document.querySelector("#fichierPrive");
const fichierSelectionne = document.querySelector("#fichierSelectionne");
const nomFichierSelectionne =
    document.querySelector("#nomFichierSelectionne");
const retirerFichier = document.querySelector("#retirerFichier");

const params = new URLSearchParams(window.location.search);
const conversationId = params.get("conversation_id");

const emojis = ["❤️", "👍", "😂"];
const MAX_FICHIER = 5 * 1024 * 1024;

const formats = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf"
};

let utilisateurConnecte = null;
let autreUtilisateurId = null;
let prenomContact = "Utilisateur";
let conversationAutorisee = false;

let messages = [];
let reactions = [];
let piecesJointes = [];
let derniereLectureContact = null;

let canalPrive = null;
let canalSaisie = null;
let saisieConnectee = false;

let chargementNumero = 0;
let reactionEnCours = false;
let envoiEnCours = false;
let derniereEmissionSaisie = 0;

let minuterieSaisieLocale = null;
let minuterieSaisieDistante = null;
let intervalleLecture = null;

// URLs temporaires des fichiers
const cacheFichiers = new Map();

// --------------------------------------------------
// Dates et heures
// --------------------------------------------------

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

// --------------------------------------------------
// Photos de profil
// --------------------------------------------------

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

// --------------------------------------------------
// Pièces jointes privées
// --------------------------------------------------

async function obtenirLienFichier(chemin) {
    const entree = cacheFichiers.get(chemin);

    if (entree && entree.expiration > Date.now()) {
        return entree.url;
    }

    const { data, error } = await supabaseClient
        .storage
        .from("chat-files")
        .createSignedUrl(chemin, 3600);

    if (error || !data?.signedUrl) {
        console.error("Erreur lien fichier :", error);
        return null;
    }

    cacheFichiers.set(chemin, {
        url: data.signedUrl,
        expiration: Date.now() + 50 * 60 * 1000
    });

    return data.signedUrl;
}

function afficherPieceJointe(piece, conteneur) {
    const cadre = document.createElement("div");
    cadre.className = "piece-jointe-message";

    const texte = document.createElement("span");
    texte.textContent = "Chargement du fichier...";
    cadre.appendChild(texte);

    conteneur.appendChild(cadre);

    obtenirLienFichier(piece.file_path).then(function(url) {
        if (!cadre.isConnected) return;

        cadre.replaceChildren();

        if (!url) {
            cadre.textContent = "Fichier indisponible";
            return;
        }

        if (piece.file_type.startsWith("image/")) {
            const lien = document.createElement("a");
            lien.href = url;
            lien.target = "_blank";
            lien.rel = "noopener noreferrer";

            const image = document.createElement("img");
            image.src = url;
            image.alt = piece.file_name;
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";

            lien.appendChild(image);
            cadre.appendChild(lien);

            const nom = document.createElement("p");
            nom.textContent = piece.file_name;
            cadre.appendChild(nom);

        } else {
            const lien = document.createElement("a");
            lien.href = url;
            lien.target = "_blank";
            lien.rel = "noopener noreferrer";
            lien.textContent = "📄 " + piece.file_name;

            cadre.appendChild(lien);
        }
    });
}

// --------------------------------------------------
// Statut de lecture
// --------------------------------------------------

function messageEstLu(message) {
    if (!derniereLectureContact) return false;

    return new Date(message.created_at).getTime() <=
        new Date(derniereLectureContact).getTime();
}

async function chargerLectureContact() {
    if (!autreUtilisateurId || !conversationAutorisee) {
        return;
    }

    const { data, error } = await supabaseClient
        .from("conversation_reads")
        .select("last_read_at")
        .eq("conversation_id", Number(conversationId))
        .eq("user_id", autreUtilisateurId)
        .maybeSingle();

    if (error) {
        console.error("Erreur lecture contact :", error);
        return;
    }

    derniereLectureContact = data?.last_read_at || null;

    // Modifier seulement les confirmations de lecture
    document.querySelectorAll(
        ".statut-message[data-message-id]"
    ).forEach(function(statut) {
        const message = messages.find(function(m) {
            return String(m.id) === statut.dataset.messageId;
        });

        if (!message) return;

        const lu = messageEstLu(message);

        statut.textContent = lu ? "✓✓ Lu" : "✓ Envoyé";
        statut.classList.toggle("statut-lu", lu);
    });
}

async function marquerCommeLu() {
    if (
        !utilisateurConnecte ||
        !conversationAutorisee ||
        document.visibilityState !== "visible"
    ) return;

    const { error } = await supabaseClient
        .from("conversation_reads")
        .upsert({
            conversation_id: Number(conversationId),
            user_id: utilisateurConnecte.id,
            last_read_at: new Date().toISOString()
        }, {
            onConflict: "conversation_id,user_id"
        });

    if (error) {
        console.error("Erreur lecture :", error);
    }
}

// --------------------------------------------------
// Affichage des messages
// --------------------------------------------------

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

        // Afficher la pièce jointe éventuelle
        const piece = piecesJointes.find(function(p) {
            return p.message_id === message.id;
        });

        if (piece) {
            afficherPieceJointe(piece, bloc);
        }

        // Heure du message
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
            statut.dataset.messageId = String(message.id);

            const lu = messageEstLu(message);
            statut.textContent = lu ? "✓✓ Lu" : "✓ Envoyé";

            if (lu) statut.classList.add("statut-lu");

            informations.appendChild(statut);
        }

        bloc.appendChild(informations);

        // Réactions
        const zoneReactions = document.createElement("div");
        zoneReactions.className =
            "reactions reactions-privees";

        emojis.forEach(function(emoji) {
            const liste = reactions.filter(function(r) {
                return r.message_id === message.id &&
                       r.emoji === emoji;
            });

            const maReaction = liste.find(function(r) {
                return r.user_id === utilisateurConnecte.id;
            });

            const bouton = document.createElement("button");
            bouton.type = "button";
            bouton.className = "bouton-reaction-prive";

            if (maReaction) {
                bouton.classList.add("reaction-active");
            }

            bouton.textContent = emoji + " " + liste.length;

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

    zoneMessages.scrollTop = zoneMessages.scrollHeight;
}

// Charger les messages, réactions et fichiers
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
    let nouveauxFichiers = [];

    if (ids.length > 0) {
        const [resultatReactions, resultatFichiers] =
            await Promise.all([
                supabaseClient
                    .from("reactions")
                    .select("id, message_id, user_id, emoji")
                    .in("message_id", ids),

                supabaseClient
                    .from("chat_attachments")
                    .select(
                        "message_id, file_path, file_name, file_type"
                    )
                    .in("message_id", ids)
            ]);

        if (numero !== chargementNumero) return false;

        if (resultatReactions.error) {
            console.error(
                "Erreur réactions :",
                resultatReactions.error
            );
        } else {
            nouvellesReactions = resultatReactions.data || [];
        }

        if (resultatFichiers.error) {
            console.error(
                "Erreur pièces jointes :",
                resultatFichiers.error
            );

            messageRetour.textContent =
                "Impossible de charger les pièces jointes.";
            return false;
        }

        nouveauxFichiers = resultatFichiers.data || [];
    }

    messages = nouveauxMessages;
    reactions = nouvellesReactions;
    piecesJointes = nouveauxFichiers;

    afficherMessages();

    return true;
}

async function actualiserConversation() {
    const charge = await chargerMessages();

    if (charge && document.visibilityState === "visible") {
        await marquerCommeLu();
    }
}

// --------------------------------------------------
// Réactions
// --------------------------------------------------

async function changerReaction(messageId, emoji, maReaction) {
    if (
        !conversationAutorisee ||
        !utilisateurConnecte ||
        reactionEnCours
    ) return;

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
    } finally {
        reactionEnCours = false;
    }
}

// --------------------------------------------------
// Choix d'un fichier
// --------------------------------------------------

fichierPrive.addEventListener("change", function() {
    const fichier = fichierPrive.files[0];

    if (!fichier) {
        fichierSelectionne.hidden = true;
        return;
    }

    if (!formats[fichier.type]) {
        messageRetour.textContent =
            "Format accepté : JPG, PNG, WEBP ou PDF.";
        fichierPrive.value = "";
        fichierSelectionne.hidden = true;
        return;
    }

    if (fichier.size === 0 || fichier.size > MAX_FICHIER) {
        messageRetour.textContent =
            "Le fichier doit avoir une taille de 5 Mo maximum.";
        fichierPrive.value = "";
        fichierSelectionne.hidden = true;
        return;
    }

    nomFichierSelectionne.textContent = fichier.name;
    fichierSelectionne.hidden = false;
    messageRetour.textContent = "";
});

retirerFichier.addEventListener("click", function() {
    fichierPrive.value = "";
    fichierSelectionne.hidden = true;
});

// --------------------------------------------------
// Envoyer un message ou un fichier
// --------------------------------------------------

formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (
        !utilisateurConnecte ||
        !conversationAutorisee ||
        envoiEnCours
    ) return;

    const texte = champMessage.value.trim();
    const fichier = fichierPrive.files[0] || null;

    if (!texte && !fichier) return;

    if (fichier && (
        !formats[fichier.type] ||
        fichier.size === 0 ||
        fichier.size > MAX_FICHIER
    )) {
        messageRetour.textContent =
            "Fichier non autorisé ou trop volumineux.";
        return;
    }

    envoiEnCours = true;
    boutonEnvoyer.disabled = true;

    clearTimeout(minuterieSaisieLocale);
    envoyerEtatSaisie(false);

    let cheminFichier = null;
    let fichierEnregistre = false;

    try {
        messageRetour.textContent = fichier
            ? "Envoi du fichier..."
            : "Envoi du message...";

        // 1. Transférer le fichier si nécessaire
        if (fichier) {
            const extension = formats[fichier.type];

            cheminFichier =
                conversationId + "/" +
                utilisateurConnecte.id + "/" +
                crypto.randomUUID() + "." + extension;

            const { error: erreurUpload } =
                await supabaseClient
                    .storage
                    .from("chat-files")
                    .upload(cheminFichier, fichier, {
                        contentType: fichier.type,
                        upsert: false
                    });

            if (erreurUpload) throw erreurUpload;

            fichierEnregistre = true;
        }

        // 2. Enregistrer le message
        const contenu = texte ||
            ("📎 " + fichier.name);

        const { data: messageCree, error: erreurMessage } =
            await supabaseClient
                .from("Messages")
                .insert({
                    utilisateur:
                        utilisateurConnecte.user_metadata?.prenom ||
                        "Utilisateur",
                    contenu: contenu,
                    user_id: utilisateurConnecte.id,
                    conversation_id: Number(conversationId)
                })
                .select("id")
                .single();

        if (erreurMessage || !messageCree) {
            throw erreurMessage ||
                new Error("Message non créé");
        }

        // 3. Associer le fichier au message
        if (fichier) {
            const { error: erreurPiece } =
                await supabaseClient
                    .from("chat_attachments")
                    .insert({
                        message_id: messageCree.id,
                        conversation_id: Number(conversationId),
                        uploader_id: utilisateurConnecte.id,
                        file_path: cheminFichier,
                        file_name: fichier.name,
                        file_type: fichier.type,
                        file_size: fichier.size
                    });

            if (erreurPiece) throw erreurPiece;
        }

        // 4. Réinitialiser le formulaire
        champMessage.value = "";
        fichierPrive.value = "";
        fichierSelectionne.hidden = true;

        messageRetour.textContent = "";
        fichierEnregistre = false;

        await actualiserConversation();

    } catch (error) {
        console.error("Erreur envoi :", error);

        messageRetour.textContent =
            "L'envoi n'a pas été entièrement terminé.";

        // Nettoyer le fichier si une étape a échoué
        if (cheminFichier && fichierEnregistre) {
            const { error: erreurNettoyage } =
                await supabaseClient
                    .storage
                    .from("chat-files")
                    .remove([cheminFichier]);

            if (erreurNettoyage) {
                console.error(
                    "Nettoyage impossible :",
                    erreurNettoyage
                );
            }
        }

    } finally {
        envoiEnCours = false;
        boutonEnvoyer.disabled = false;
    }
});

// --------------------------------------------------
// Indicateur "écrit..."
// --------------------------------------------------

function envoyerEtatSaisie(actif) {
    if (!canalSaisie || !saisieConnectee) return;

    canalSaisie.send({
        type: "broadcast",
        event: "saisie",
        payload: {
            utilisateur: utilisateurConnecte.id,
            actif: actif
        }
    }).catch(function(error) {
        console.error("Erreur saisie :", error);
    });
}

function activerSaisieRealtime() {
    canalSaisie = supabaseClient.channel(
        "typing:" + conversationId,
        {
            config: { private: true }
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
        .subscribe(function(status) {
            saisieConnectee = status === "SUBSCRIBED";
            console.log("Realtime saisie :", status);
        });
}

champMessage.addEventListener("input", function() {
    if (!conversationAutorisee) return;

    clearTimeout(minuterieSaisieLocale);

    if (!champMessage.value.trim()) {
        envoyerEtatSaisie(false);
        return;
    }

    const maintenant = Date.now();

    if (maintenant - derniereEmissionSaisie > 1500) {
        envoyerEtatSaisie(true);
        derniereEmissionSaisie = maintenant;
    }

    minuterieSaisieLocale = setTimeout(function() {
        envoyerEtatSaisie(false);
        derniereEmissionSaisie = 0;
    }, 1800);
});

// --------------------------------------------------
// Realtime : messages, réactions, lectures
// --------------------------------------------------

function activerRealtimePrive() {
    canalPrive = supabaseClient
        .channel("messages-prives-" + conversationId)

        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "Messages",
                filter: "conversation_id=eq." +
                    conversationId
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
                event: "INSERT",
                schema: "public",
                table: "chat_attachments",
                filter: "conversation_id=eq." +
                    conversationId
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
                filter: "conversation_id=eq." +
                    conversationId
            },
            function() {
                chargerLectureContact();
            }
        )

        .subscribe(function(status) {
            console.log("Realtime messages :", status);
        });
}

document.addEventListener("visibilitychange", function() {
    if (!conversationAutorisee) return;

    if (document.visibilityState === "visible") {
        actualiserConversation();
        chargerLectureContact();
    } else {
        envoyerEtatSaisie(false);
        clearTimeout(minuterieSaisieLocale);
    }
});

// --------------------------------------------------
// Démarrage et contrôle d'accès
// --------------------------------------------------

async function demarrer() {
    boutonEnvoyer.disabled = true;

    const { data, error } =
        await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }

    utilisateurConnecte = data.user;

    if (!conversationId ||
        !/^[1-9]\d*$/.test(conversationId)) {
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

    if (conversation.user1_id !== monId &&
        conversation.user2_id !== monId) {
        messageRetour.textContent = "Accès refusé.";
        return;
    }

    conversationAutorisee = true;

    autreUtilisateurId =
        conversation.user1_id === monId
            ? conversation.user2_id
            : conversation.user1_id;

    const { data: profil } = await supabaseClient
        .from("profils")
        .select("prenom, avatar_url")
        .eq("id", autreUtilisateurId)
        .single();

    prenomContact = profil?.prenom || "Utilisateur";

    titreContact.textContent =
        "Conversation avec " + prenomContact;

    await afficherAvatarContact(profil);
    await chargerLectureContact();
    await actualiserConversation();

    activerRealtimePrive();

    const { data: sessionData } =
        await supabaseClient.auth.getSession();

    if (sessionData.session?.access_token) {
        supabaseClient.realtime.setAuth(
            sessionData.session.access_token
        );
    }

    activerSaisieRealtime();

    intervalleLecture = setInterval(function() {
        if (document.visibilityState === "visible") {
            chargerLectureContact();
        }
    }, 12000);

    boutonEnvoyer.disabled = false;
    messageRetour.textContent = "";
}

// Nettoyer les connexions
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
