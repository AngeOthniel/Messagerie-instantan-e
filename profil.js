const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const nomAffiche = document.querySelector("#nomAffiche");
const emailAffiche = document.querySelector("#emailAffiche");
const avatarInitiale = document.querySelector("#avatarInitiale");
const formProfil = document.querySelector("#formProfil");
const prenomProfil = document.querySelector("#prenomProfil");
const boutonSauver = document.querySelector("#boutonSauver");
const messageProfil = document.querySelector("#messageProfil");
const boutonDeconnexion = document.querySelector("#boutonDeconnexion");
let utilisateurConnecte = null;
// Charger le profil de l'utilisateur
async function chargerProfil() {
    const { data, error } =
        await supabaseClient.auth.getUser();
    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }
    utilisateurConnecte = data.user;
    emailAffiche.textContent =
        utilisateurConnecte.email || "";
    const { data: profil, error: erreurProfil } =
        await supabaseClient
            .from("profils")
            .select("prenom, avatar_url")
            .eq("id", utilisateurConnecte.id)
            .single();
    if (erreurProfil || !profil) {
        console.error("Erreur profil :", erreurProfil);
        messageProfil.textContent =
            "Impossible de charger votre profil.";
        boutonSauver.disabled = true;
        return;
    }
    const prenom = profil.prenom || "";
    nomAffiche.textContent = prenom || "Utilisateur";
    prenomProfil.value = prenom;
    avatarInitiale.textContent =
        prenom.charAt(0).toUpperCase() || "?";
}
// Modifier le prénom
formProfil.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!utilisateurConnecte) return;
    const nouveauPrenom = prenomProfil.value.trim();
    if (!nouveauPrenom) {
        messageProfil.textContent =
            "Veuillez entrer un prénom.";
        return;
    }
    boutonSauver.disabled = true;
    messageProfil.textContent = "Enregistrement...";
    const { error } = await supabaseClient
        .from("profils")
        .update({
            prenom: nouveauPrenom
        })
        .eq("id", utilisateurConnecte.id);
    if (error) {
        console.error("Erreur modification :", error);
        messageProfil.textContent =
            "Impossible de modifier le prénom.";
    } else {
        nomAffiche.textContent = nouveauPrenom;
        avatarInitiale.textContent =
            nouveauPrenom.charAt(0).toUpperCase();
        messageProfil.textContent =
            "Prénom modifié avec succès !";
    }
    boutonSauver.disabled = false;
});
// Se déconnecter
boutonDeconnexion.addEventListener("click", async function() {
    boutonDeconnexion.disabled = true;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Erreur déconnexion :", error);
        messageProfil.textContent =
            "Impossible de se déconnecter.";
        boutonDeconnexion.disabled = false;
        return;
    }
    window.location.href = "index.html";
});
chargerProfil();
