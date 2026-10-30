const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const formulaire = document.querySelector("form");
formulaire.addEventListener("submit", async function(event) {
    event.preventDefault();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    if (email === "" || password === "") {
        alert("Veuillez remplir tous les champs.");
        return;
    }
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) {
        console.log("Erreur connexion :", error);
        alert("Courriel ou mot de passe incorrect.");
        return;
    }
    alert("Connexion réussie !");
    window.location.href = "conversation.html";
});
