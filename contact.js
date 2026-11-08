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
        // Activation à la prochaine étape
        bouton.disabled = true;
        bouton.title = "Bientôt disponible";
        contact.appendChild(nom);
        contact.appendChild(bouton);
        listeContacts.appendChild(contact);
    });
}

chargerContacts();
