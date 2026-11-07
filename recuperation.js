const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("#formRecuperation");
const messageRetour = document.querySelector("#messageRetour");
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    const email = document.querySelector("#email").value.trim();
    if (email === "") {
        messageRetour.textContent = "Veuillez entrer votre courriel.";
        return;
    }
    const urlRedirection = new URL(
        "nouveau-mot-de-passe.html",
        window.location.href
    ).href;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
            redirectTo: urlRedirection
        }
    );
    if (error) {
        console.error("Erreur récupération :", error);
        messageRetour.textContent =
            "Impossible d'envoyer le courriel : " + error.message;
        return;
    }
    messageRetour.textContent =
        "Si un compte existe avec ce courriel, vous recevrez un lien de récupération.";
});
