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
// Vérifier que l'utilisateur a ouvert un lien de récupération
supabaseClient.auth.onAuthStateChange(function(event, session) {
    if (event === "PASSWORD_RECOVERY" && session) {
        recuperationAutorisee = true;
        messageRetour.textContent =
            "Lien vérifié. Vous pouvez choisir un nouveau mot de passe.";
    }
});
// Empêcher l'utilisation avant la vérification du lien
bouton.disabled = true;
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    if (!recuperationAutorisee) {
        messageRetour.textContent =
            "Veuillez ouvrir le lien reçu par courriel.";
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
    const { error } = await supabaseClient.auth.updateUser({
        password: password
    });
    if (error) {
        messageRetour.textContent = "Erreur : " + error.message;
        return;
    }
    recuperationAutorisee = false;
    messageRetour.textContent =
        "Mot de passe modifié avec succès !";
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
});
// Activer le formulaire seulement après vérification
supabaseClient.auth.onAuthStateChange(function(event, session) {
    if (event === "PASSWORD_RECOVERY" && session) {
        bouton.disabled = false;
    }
});
