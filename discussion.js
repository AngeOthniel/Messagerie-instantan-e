const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const listeDiscussions = document.querySelector("#listeDiscussions");
const messageRetour = document.querySelector("#messageRetour");
// Charger les conversations de l'utilisateur
async function chargerDiscussions() {
    messageRetour.textContent = "Chargement des discussions...";
    // Vérifier la connexion
    const { data: authData, error: authError } =
        await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
        window.location.href = "index.html";
        return;
    }
    const monId = authData.user.id;
    // Récupérer les conversations autorisées par Supabase
    const { data: conversations, error } =
        await supabaseClient
            .from("conversations")
            .select("id, user1_id, user2_id, created_at")
            .or(`user1_id.eq.${monId},user2_id.eq.${monId}`);
    if (error) {
        console.error("Erreur conversations :", error);
        messageRetour.textContent =
            "Impossible de charger les conversations.";
        return;
    }
    listeDiscussions.innerHTML = "";
    if (!conversations || conversations.length === 0) {
        messageRetour.textContent =
            "Vous n'avez pas encore de conversation privée.";
        return;
    }
    // Préparer les discussions avec leurs derniers messages
    const discussions = await Promise.all(
        conversations.map(async function(conversation) {
            const autreId =
                conversation.user1_id === monId
                    ? conversation.user2_id
                    : conversation.user1_id;
            // Récupérer le prénom du contact
            const { data: profil, error: erreurProfil } =
                await supabaseClient
                    .from("profils")
                    .select("prenom")
                    .eq("id", autreId)
                    .single();
            if (erreurProfil) {
                console.error("Erreur profil :", erreurProfil);
            }
            // Récupérer le dernier message
            const { data: messages, error: erreurMessage } =
                await supabaseClient
                    .from("Messages")
                    .select("contenu, created_at")
                    .eq("conversation_id", conversation.id)
                    .order("created_at", { ascending: false })
                    .limit(1);
            if (erreurMessage) {
                throw erreurMessage;
            }
            return {
                id: conversation.id,
                prenom: profil?.prenom || "Utilisateur",
                dernierMessage:
                    messages.length > 0
                        ? messages[0].contenu
                        : "Aucun message pour le moment",
                date:
                    messages.length > 0
                        ? messages[0].created_at
                        : conversation.created_at
            };
        })
    ).catch(function(erreur) {
        console.error("Erreur chargement discussions :", erreur);
        return null;
    });
    if (!discussions) {
        messageRetour.textContent =
            "Impossible de charger les derniers messages.";
        return;
    }
    // Afficher les conversations les plus récentes d'abord
    discussions.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
    discussions.forEach(function(discussion) {
        const carte = document.createElement("div");
        carte.classList.add("carte-discussion");
        const nom = document.createElement("h3");
        nom.textContent = discussion.prenom;
        const dernierMessage = document.createElement("p");
        dernierMessage.textContent = discussion.dernierMessage;
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.textContent = "Ouvrir la discussion";
        bouton.addEventListener("click", function() {
            window.location.href =
                "prive.html?conversation_id=" +
                encodeURIComponent(discussion.id);
        });
        carte.appendChild(nom);
        carte.appendChild(dernierMessage);
        carte.appendChild(bouton);
        listeDiscussions.appendChild(carte);
    });
    messageRetour.textContent = "";
}
// Démarrer le chargement
chargerDiscussions();
