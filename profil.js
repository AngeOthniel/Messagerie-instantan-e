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
const boutonDeconnexion =
    document.querySelector("#boutonDeconnexion");
const photoProfil = document.querySelector("#photoProfil");
const boutonPhoto = document.querySelector("#boutonPhoto");
let utilisateurConnecte = null;
let cheminAvatar = null;
// Afficher l'initiale de l'utilisateur
function afficherInitiale(prenom) {
    avatarInitiale.style.backgroundImage = "none";
    avatarInitiale.textContent =
        prenom.charAt(0).toUpperCase() || "?";
}
// Afficher une photo privée avec une URL temporaire
async function afficherPhoto(chemin) {
    if (!chemin) return;
    const { data, error } = await supabaseClient
        .storage
        .from("avatars")
        .createSignedUrl(chemin, 3600);
    if (error || !data?.signedUrl) {
        console.error("Erreur affichage photo :", error);
        messageProfil.textContent =
            "Impossible d'afficher la photo.";
        return;
    }
    avatarInitiale.textContent = "";
    avatarInitiale.style.backgroundImage =
        `url("${data.signedUrl}")`;
    avatarInitiale.style.backgroundSize = "cover";
    avatarInitiale.style.backgroundPosition = "center";
}
// Charger les informations du compte
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
    const resultat = await supabaseClient
        .from("profils")
        .select("prenom, avatar_url")
        .eq("id", utilisateurConnecte.id)
        .single();
    if (resultat.error || !resultat.data) {
        console.error("Erreur profil :", resultat.error);
        messageProfil.textContent =
            "Impossible de charger votre profil.";
        boutonSauver.disabled = true;
        boutonPhoto.disabled = true;
        return;
    }
    const profil = resultat.data;
    const prenom = profil.prenom || "";
    nomAffiche.textContent = prenom || "Utilisateur";
    prenomProfil.value = prenom;
    afficherInitiale(prenom);
    cheminAvatar = profil.avatar_url;
    if (cheminAvatar) {
        await afficherPhoto(cheminAvatar);
    }
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
        .update({ prenom: nouveauPrenom })
        .eq("id", utilisateurConnecte.id);
    if (error) {
        console.error("Erreur prénom :", error);
        messageProfil.textContent =
            "Impossible de modifier le prénom.";
    } else {
        nomAffiche.textContent = nouveauPrenom;
        if (!cheminAvatar) {
            afficherInitiale(nouveauPrenom);
        }
        messageProfil.textContent =
            "Prénom modifié avec succès !";
    }
    boutonSauver.disabled = false;
});
// Enregistrer une nouvelle photo
boutonPhoto.addEventListener("click", async function() {
    if (!utilisateurConnecte) return;
    const fichier = photoProfil.files[0];
    if (!fichier) {
        messageProfil.textContent =
            "Choisissez d'abord une photo.";
        return;
    }
    const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    };
    const extension = extensions[fichier.type];
    if (!extension) {
        messageProfil.textContent =
            "Format accepté : JPG, PNG ou WEBP.";
        return;
    }
    // Limite de 2 Mo
    if (fichier.size > 2 * 1024 * 1024) {
        messageProfil.textContent =
            "La photo ne doit pas dépasser 2 Mo.";
        return;
    }
    if (fichier.size === 0) {
        messageProfil.textContent =
            "Le fichier sélectionné est vide.";
        return;
    }
    boutonPhoto.disabled = true;
    messageProfil.textContent = "Envoi de la photo...";
    // Chaque utilisateur utilise son propre dossier
    const nouveauChemin =
        utilisateurConnecte.id +
        "/avatar-" +
        crypto.randomUUID() +
        "." + extension;
    const ancienChemin = cheminAvatar;
    try {
        // Envoyer la photo dans Supabase Storage
        const { error: erreurUpload } =
            await supabaseClient
                .storage
                .from("avatars")
                .upload(nouveauChemin, fichier, {
                    contentType: fichier.type,
                    upsert: false
                });
        if (erreurUpload) throw erreurUpload;
        // Enregistrer le chemin dans la table profils
        const { data: profilModifie, error: erreurProfil } =
            await supabaseClient
                .from("profils")
                .update({
                    avatar_url: nouveauChemin
                })
                .eq("id", utilisateurConnecte.id)
                .select("avatar_url")
                .single();
        if (erreurProfil || !profilModifie) {
            // Nettoyer le nouvel objet si la mise à jour échoue
            await supabaseClient
                .storage
                .from("avatars")
                .remove([nouveauChemin]);
            throw erreurProfil ||
                new Error("Profil non mis à jour");
        }
        cheminAvatar = nouveauChemin;
        await afficherPhoto(cheminAvatar);
        // Supprimer l'ancienne photo de ce compte
        if (
            ancienChemin &&
            ancienChemin !== nouveauChemin &&
            ancienChemin.startsWith(utilisateurConnecte.id + "/")
        ) {
            const { error: erreurSuppression } =
                await supabaseClient
                    .storage
                    .from("avatars")
                    .remove([ancienChemin]);
            if (erreurSuppression) {
                console.warn(
                    "Ancienne photo non supprimée :",
                    erreurSuppression
                );
            }
        }
        photoProfil.value = "";
        messageProfil.textContent =
            "Photo de profil enregistrée avec succès !";
    } catch (error) {
        console.error("Erreur photo :", error);
        messageProfil.textContent =
            "Impossible d'enregistrer la photo.";
    } finally {
        boutonPhoto.disabled = false;
    }
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
// Démarrer
chargerProfil();
