const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const listeDiscussions = document.querySelector("#listeDiscussions");
const messageRetour = document.querySelector("#messageRetour");
let monId = null;
let canalDiscussions = null;
let numeroChargement = 0;
// Charger une photo privée depuis Supabase Storage
async function obtenirPhoto(chemin) {
    if (!chemin) return null;
    const { data, error } = await supabaseClient
        .storage
        .from("avatars")
        .createSignedUrl(chemin, 3600);
    if (error) {
        console.error("Erreur avatar :", error);
        return null;
    }
    return data?.signedUrl || null;
}
// Charger les conversations
async function chargerDiscussions() {
    if (!monId) return;
    const numero = ++numeroChargement;
    const { data: conversations, error } =
        await supabaseClient
            .from("conversations")
            .select("id, user1_id, user2_id, created_at")
            .or(`user1_id.eq.${monId},user2_id.eq.${monId}`);
    if (numero !== numeroChargement) return;
    if (error) {
        console.error("Erreur conversations :", error);
        messageRetour.textContent =
            "Impossible de charger les conversations.";
        return;
    }
    if (!conversations || conversations.length === 0) {
        listeDiscussions.innerHTML = "";
        messageRetour.textContent =
            "Vous n'avez pas encore de conversation privée.";
        return;
    }
    const discussions = await Promise.all(
        conversations.map(async function(conversation) {
            const autreId =
                conversation.user1_id === monId
                    ? conversation.user2_id
                    : conversation.user1_id;
            // Récupérer le prénom et la photo du contact
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
            const photo = await obtenirPhoto(profil?.avatar_url);
            // Dernier message de la conversation
            const { data: messages, error: erreurMessage } =
                await supabaseClient
                    .from("Messages")
                    .select("id, contenu, created_at")
                    .eq("conversation_id", conversation.id)
                    .order("created_at", { ascending: false })
                    .order("id", { ascending: false })
                    .limit(1);
            if (erreurMessage) throw erreurMessage;
            // Dernière date de lecture
            const { data: lecture, error: erreurLecture } =
                await supabaseClient
                    .from("conversation_reads")
                    .select("last_read_at")
                    .eq("conversation_id", conversation.id)
                    .eq("user_id", monId)
                    .maybeSingle();
            if (erreurLecture) throw erreurLecture;
            // Compter les messages reçus non lus
            let requeteCompteur = supabaseClient
                .from("Messages")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("conversation_id", conversation.id)
                .neq("user_id", monId);
            if (lecture) {
                requeteCompteur = requeteCompteur.gt(
                    "created_at",
                    lecture.last_read_at
                );
            }
            const { count, error: erreurCompteur } =
                await requeteCompteur;
            if (erreurCompteur) throw erreurCompteur;
            const dernierMessage =
                messages && messages.length > 0
                    ? messages[0].contenu
                    : "Aucun message pour le moment";
            const date =
                messages && messages.length > 0
                    ? messages[0].created_at
                    : conversation.created_at;
            return {
                id: conversation.id,
                prenom: prenom,
                photo: photo,
                dernierMessage: dernierMessage,
                date: date,
                nonLus: count || 0
            };
        })
    ).catch(function(erreur) {
        console.error("Erreur chargement :", erreur);
        return null;
    });
    if (numero !== numeroChargement) return;
    if (!discussions) {
        messageRetour.textContent =
            "Impossible de charger les discussions.";
        return;
    }
    // Conversations les plus récentes en premier
    discussions.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    listeDiscussions.innerHTML = "";
    discussions.forEach(function(discussion) {
        const carte = document.createElement("div");
        carte.classList.add("carte-discussion");
        // Zone contenant la photo et le prénom
        const entete = document.createElement("div");
        entete.classList.add("entete-discussion");
        const avatar = document.createElement("div");
        avatar.classList.add("avatar-discussion");
        if (discussion.photo) {
            const image = document.createElement("img");
            image.src = discussion.photo;
            image.alt = "Photo de " + discussion.prenom;
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer";
            image.addEventListener("error", function() {
                avatar.textContent =
                    discussion.prenom.charAt(0).toUpperCase();
            });
            avatar.appendChild(image);
        } else {
            avatar.textContent =
                discussion.prenom.charAt(0).toUpperCase();
        }
        const nom = document.createElement("h3");
        nom.textContent = discussion.prenom;
        entete.appendChild(avatar);
        entete.appendChild(nom);
        carte.appendChild(entete);
        // Aperçu du dernier message
        const dernierMessage = document.createElement("p");
        dernierMessage.textContent = discussion.dernierMessage;
        carte.appendChild(dernierMessage);
        // Compteur de messages non lus
        if (discussion.nonLus > 0) {
            const compteur = document.createElement("span");
            compteur.classList.add("compteur-non-lus");
            compteur.textContent =
                discussion.nonLus === 1
                    ? "1 non lu"
                    : discussion.nonLus + " non lus";
            carte.appendChild(compteur);
        }
        // Bouton pour ouvrir le chat privé
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.textContent = "Ouvrir la discussion";
        bouton.addEventListener("click", function() {
            window.location.href =
                "prive.html?conversation_id=" +
                encodeURIComponent(discussion.id);
        });
        carte.appendChild(bouton);
        listeDiscussions.appendChild(carte);
    });
    messageRetour.textContent = "";
}
// Temps réel
function activerRealtimeDiscussions() {
    if (canalDiscussions) return;
    canalDiscussions = supabaseClient
        .channel("liste-discussions-realtime")

        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "Messages"
            },
            function() {
                chargerDiscussions();
            }
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "conversation_reads"
            },
            function() {
                chargerDiscussions();
            }
        )
        .subscribe(function(status) {
            console.log("Realtime discussions :", status);
        });
}
// Actualisation au retour sur l'onglet
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        chargerDiscussions();
    }
});
// Vérifier l'utilisateur connecté
async function demarrerDiscussions() {
    messageRetour.textContent =
        "Chargement des discussions...";
    const { data, error } =
        await supabaseClient.auth.getUser();
    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }
    monId = data.user.id;
    await chargerDiscussions();
    activerRealtimeDiscussions();
}
// Fermer le canal en quittant la page
window.addEventListener("pagehide", function() {
    if (canalDiscussions) {
        supabaseClient.removeChannel(canalDiscussions);
    }
});
demarrerDiscussions();
