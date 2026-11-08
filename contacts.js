const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const listeContacts = document.querySelector("#listeContacts");
const messageRetour = document.querySelector("#messageRetour");
async function chargerContacts() {
    // Vérifier l'utilisateur connecté
    const { data: authData, error: authError } =
        await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
        window.location.href = "index.html";
        return;
    }
    const monId = authData.user.id;
    console.log("Utilisateur connecté :", monId);
    // Récupérer les profils
    const { data: profils, error } = await supabaseClient
        .from("profils")
        .select("id, prenom")
        .neq("id", monId)
        .order("prenom");
    console.log("Profils récupérés :", profils);
console.log("Erreur Supabase :", error);
    if (error) {
        console.error(error);
        messageRetour.textContent =
            "Impossible de charger les contacts.";
        return;
    }
    listeContacts.innerHTML = "";
    if (profils.length === 0) {
        messageRetour.textContent =
            "Aucun autre utilisateur disponible.";
        return;
    }
    profils.forEach(function(profil) {
        const contact = document.createElement("li");
        const nom = document.createElement("span");
        nom.textContent = profil.prenom + " ";
        const bouton = document.createElement("button");
        bouton.textContent = "Discuter";
       bouton.addEventListener("click", async function() {
    bouton.disabled = true;
    messageRetour.textContent = "Ouverture de la conversation...";

    try {
        // Chercher une conversation existante
        const { data: existantes, error: rechercheErreur } =
            await supabaseClient
                .from("conversations")
                .select("id")
                .or(
                    `and(user1_id.eq.${monId},user2_id.eq.${profil.id}),` +
                    `and(user1_id.eq.${profil.id},user2_id.eq.${monId})`
                )
                .limit(1);
        if (rechercheErreur) throw rechercheErreur;
        let conversationId;
        if (existantes.length > 0) {
            conversationId = existantes[0].id;
        } else {
            // Créer une nouvelle conversation
            const { data, error } = await supabaseClient
                .from("conversations")
                .insert({
                    user1_id: monId,
                    user2_id: profil.id
                })
                .select("id")
                .single();
            if (error) throw error;
            conversationId = data.id;
        }
        // Ouvrir la conversation choisie
        window.location.href =
            "conversation.html?conversation_id=" +
            encodeURIComponent(conversationId);
    } catch (error) {
        console.error("Erreur conversation :", error);
        messageRetour.textContent =
            "Impossible d'ouvrir la conversation.";
        bouton.disabled = false;
    }
});
        contact.appendChild(nom);
        contact.appendChild(bouton);
        listeContacts.appendChild(contact);
    });
}
chargerContacts();
