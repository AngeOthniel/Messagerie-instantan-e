const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("#formNouveauMotDePasse");
const messageRetour = document.querySelector("#messageRetour");
const bouton = formulaire.querySelector("button");
let recuperationAutorisee = false;
// Désactiver le bouton au départ
bouton.disabled = true;
messageRetour.textContent = "Vérification du lien de récupération...";
// Vérifier le lien avec Supabase
supabaseClient.auth.onAuthStateChange(function(event, session) {
    console.log("Événement Supabase :", event);
    if (event === "PASSWORD_RECOVERY" && session) {
        recuperationAutorisee = true;
        bouton.disabled = false;
        messageRetour.textContent =
            "Lien vérifié ! Vous pouvez choisir votre nouveau mot de passe.";
    }
});
// Enregistrer le nouveau mot de passe
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!recuperationAutorisee) {
        messageRetour.textContent =
            "Veuillez ouvrir un nouveau lien de récupération reçu par courriel.";
        return;
    }
    const password = document.querySelector("#password").value;
    const confirmation = document.querySelector("#confirmation").value;

    if (password !== confirmation) {
        messageRetour.textContent =
            "Les mots de passe ne correspondent pas.";
        return;
    }
    if (password.length < 6) {
        messageRetour.textContent =
            "Le mot de passe doit contenir au moins 6 caractères.";
        return;
    }
    bouton.disabled = true;
    messageRetour.textContent = "Modification en cours...";
    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: password
        });
        if (error) {
            throw error;
        }
        recuperationAutorisee = false;
        const { error: erreurDeconnexion } =
            await supabaseClient.auth.signOut();
        if (erreurDeconnexion) {
            console.error("Erreur déconnexion :", erreurDeconnexion);
        }
        messageRetour.textContent =
            "Mot de passe modifié avec succès ! Retournez à la connexion.";
        formulaire.reset();
    } catch (error) {
        console.error("Erreur Supabase :", error);
        messageRetour.textContent =
            "Erreur : " + error.message;
        bouton.disabled = !recuperationAutorisee;
    }

});
