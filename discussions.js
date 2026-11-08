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
// Charger les discussions et compter les messages non lus
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
    // Récupérer les informations de chaque conversation
    const discussions = await Promise.all(
        conversations.map(async function(conversation) {
            const autreId =
                conversation.user1_id === monId
                    ? conversation.user2_id
                    : conversation.user1_id;
            // Prénom du contact
            const { data: profil, error: erreurProfil } =
                await supabaseClient
                    .from("profils")
                    .select("prenom")
                    .eq("id", autreId)
                    .single();
            if (erreurProfil) {
                console.error("Erreur profil :", erreurProfil);
            }
            // Dernier message
            const { data: messages, error: erreurMessage } =
                await supabaseClient
                    .from("Messages")
                    .select("contenu, created_at")
                    .eq("conversation_id", conversation.id)
                    .order("created_at", { ascending: false })
                    .order("id", { ascending: false })
                    .limit(1);
            if (erreurMessage) throw erreurMessage;
            // Dernière date de lecture de mon compte
            const { data: lecture, error: erreurLecture } =
                await supabaseClient
                    .from("conversation_reads")
                    .select("last_read_at")
                    .eq("conversation_id", conversation.id)
                    .eq("user_id", monId)
                    .maybeSingle();
            if (erreurLecture) throw erreurLecture;
            // Compter uniquement les messages des autres
            let requeteCompteur = supabaseClient
                .from("Messages")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("conversation_id", conversation.id)
                .neq("user_id", monId);
            // Si déjà lu : compter les messages plus récents
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
                prenom: profil?.prenom || "Utilisateur",
                dernierMessage: dernierMessage,
                date: date,
                nonLus: count || 0
            };
        })
    ).catch(function(erreur) {
        console.error("Erreur discussions :", erreur);
        return null;
    });
    if (numero !== numeroChargement) return;
    if (!discussions) {
        messageRetour.textContent =
            "Impossible de charger les discussions.";
        return;
    }
    // Trier les conversations par activité récente
    discussions.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    listeDiscussions.innerHTML = "";
    discussions.forEach(function(discussion) {
        const carte = document.createElement("div");
        carte.classList.add("carte-discussion");
        const nom = document.createElement("h3");
        nom.textContent = discussion.prenom;
        const dernierMessage = document.createElement("p");
        dernierMessage.textContent = discussion.dernierMessage;
        carte.appendChild(nom);
        carte.appendChild(dernierMessage);
        // Afficher le compteur s'il y a des messages non lus
        if (discussion.nonLus > 0) {
            const compteur = document.createElement("span");
            compteur.classList.add("compteur-non-lus");
            compteur.textContent =
                discussion.nonLus === 1
                    ? "1 non lu"
                    : discussion.nonLus + " non lus";
            carte.appendChild(compteur);
        }
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
// Recevoir les nouveaux messages en temps réel
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
// Actualiser quand l'utilisateur revient sur la page
document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") {
        chargerDiscussions();
    }
});
// Vérifier la connexion puis démarrer
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
// Nettoyer le canal lorsque la page est quittée
window.addEventListener("pagehide", function() {
    if (canalDiscussions) {
        supabaseClient.removeChannel(canalDiscussions);
    }
});

demarrerDiscussions();
