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
let utilisateurConnecte = null;
// Afficher un message privé
function afficherMessage(message) {
    const element = document.createElement("p");
    if (message.user_id === utilisateurConnecte.id) {
        element.classList.add("envoye");
        element.textContent = "Moi : " + message.contenu;
    } else {
        element.classList.add("recu");
        element.textContent = message.contenu;
    }
    zoneMessages.appendChild(element);
}
// Charger les messages de cette conversation
async function chargerMessages() {
    const { data, error } = await supabaseClient
        .from("Messages")
        .select("id, contenu, user_id, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
    if (error) {
        console.error(error);
        messageRetour.textContent =
            "Impossible de charger les messages.";
        return;
    }
    zoneMessages.innerHTML = "";
    data.forEach(function(message) {
        afficherMessage(message);
    });
}
// Démarrer la conversation
async function demarrer() {
    const { data, error } =
        await supabaseClient.auth.getUser();
    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }
    utilisateurConnecte = data.user;
    if (!conversationId || !/^\d+$/.test(conversationId)) {
        messageRetour.textContent =
            "Identifiant de conversation invalide.";
        return;
    }
    // Vérifier que l'utilisateur participe
    const { data: conversation, error: erreurConversation } =
        await supabaseClient
            .from("conversations")
            .select("user1_id, user2_id")
            .eq("id", conversationId)
            .single();
    if (erreurConversation || !conversation) {
        messageRetour.textContent =
            "Conversation introuvable ou accès refusé.";
        return;
    }
    const autreId =
        conversation.user1_id === utilisateurConnecte.id
            ? conversation.user2_id
            : conversation.user1_id;
    // Récupérer le prénom du contact
    const { data: profil } = await supabaseClient
        .from("profils")
        .select("prenom")
        .eq("id", autreId)
        .single();
    titreContact.textContent =
        "Conversation avec " +
        (profil?.prenom || "Utilisateur");
    await chargerMessages();
    boutonEnvoyer.disabled = false;
    messageRetour.textContent = "";
}
// Envoyer un message privé
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!utilisateurConnecte || boutonEnvoyer.disabled) return;
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
        console.error(error);
        messageRetour.textContent =
            "Erreur lors de l'envoi.";
    } else {
        champMessage.value = "";
        messageRetour.textContent = "";
        await chargerMessages();
    }
    boutonEnvoyer.disabled = false;
});

demarrer();
