const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("form");
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    const prenom = document.querySelector("#prenom").value.trim();
    const nom = document.querySelector("#nom").value.trim();
    const email = document.querySelector("#email").value.trim();
    const motDePasse = document.querySelector("#motdepasse").value;
    const confirmation = document.querySelector("#confirmation").value;
    if (motDePasse !== confirmation) {
        alert("Les mots de passe ne correspondent pas.");
        return;
    }
    if (motDePasse.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }
    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: motDePasse,
        options: {
            data: {
                prenom: prenom,
                nom: nom
            }
        }
    });
    if (error) {
        console.log("Erreur inscription :", error);
        alert("Erreur : " + error.message);
        return;
    }
    alert("Compte créé avec succès !");
    window.location.href = "index.html";
});
