const SUPABASE_URL = "https://jgrkstljspxdtlzjpctl.supabase.co";
const SUPABASE_KEY = "sb_publishable_nf94UzHaEObI95un5Pjp0g_01HPTysa";
const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const listeContacts = document.querySelector("#listeContacts");
const messageRetour = document.querySelector("#messageRetour");
const rechercheContact = document.querySelector("#rechercheContact");
let utilisateurConnecte = null;
let contacts = [];
let ouvertureEnCours = false;
// Créer une URL temporaire pour une photo privée
async function obtenirPhoto(chemin) {
    if (!chemin) return null;
    const { data, error } = await supabaseClient
        .storage
        .from("avatars")
        .createSignedUrl(chemin, 3600);
    if (error) {
        console.error("Erreur photo :", error);
        return null;
    }
    return data?.signedUrl || null;
}
// Créer un avatar : photo ou initiale
function creerAvatar(contact) {
    const avatar = document.createElement("div");
    avatar.classList.add("avatar-contact");
    const initiale = (contact.prenom || "U")
        .charAt(0)
        .toUpperCase();
    if (contact.photo) {
        const image = document.createElement("img");
        image.src = contact.photo;
        image.alt = "Photo de " + contact.prenom;
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", function() {
            avatar.replaceChildren();
            avatar.textContent = initiale;
        });
        avatar.appendChild(image);
    } else {
        avatar.textContent = initiale;
    }
    return avatar;
}
// Afficher les contacts
function afficherContacts() {
    listeContacts.innerHTML = "";
    const recherche = rechercheContact.value
        .trim()
        .toLocaleLowerCase("fr");
    const resultats = contacts.filter(function(contact) {
        return contact.prenom
            .toLocaleLowerCase("fr")
            .includes(recherche);
    });
    if (resultats.length === 0) {
        messageRetour.textContent =
            "Aucun contact trouvé.";
        return;
    }
    messageRetour.textContent = "";
    resultats.forEach(function(contact) {
        const carte = document.createElement("div");
        carte.classList.add("carte-contact");
        const entete = document.createElement("div");
        entete.classList.add("entete-contact");
        const avatar = creerAvatar(contact);
        const nom = document.createElement("h3");
        nom.textContent = contact.prenom;
        entete.appendChild(avatar);
        entete.appendChild(nom);
        const bouton = document.createElement("button");
        bouton.type = "button";
        bouton.textContent = "Discuter";
        bouton.addEventListener("click", function() {
            ouvrirDiscussion(contact.id, bouton);
        });
        carte.appendChild(entete);
        carte.appendChild(bouton);
        listeContacts.appendChild(carte);
    });
}
// Retrouver ou créer une discussion privée
async function ouvrirDiscussion(autreId, bouton) {
    if (!utilisateurConnecte || ouvertureEnCours) return;
    ouvertureEnCours = true;
    bouton.disabled = true;
    messageRetour.textContent =
        "Ouverture de la discussion...";
    try {
        const monId = utilisateurConnecte.id;
        // Chercher une conversation entre les deux comptes
        const { data: conversations, error: erreurRecherche } =
            await supabaseClient
                .from("conversations")
                .select("id, user1_id, user2_id")
                .or(
                    `user1_id.eq.${monId},user2_id.eq.${monId}`
                );
        if (erreurRecherche) throw erreurRecherche;
        let conversation = (conversations || []).find(
            function(c) {
                return (
                    c.user1_id === monId &&
                    c.user2_id === autreId
                ) || (
                    c.user1_id === autreId &&
                    c.user2_id === monId
                );
            }
        );
        if (!conversation) {
            // Création d'une conversation
            const { data: nouvelle, error: erreurCreation } =
                await supabaseClient
                    .from("conversations")
                    .insert({
                        user1_id: monId,
                        user2_id: autreId
                    })
                    .select("id")
                    .single();
            if (erreurCreation) {
                // Une autre requête a pu créer la
                // conversation au même moment.
                const { data: existantes } =
                    await supabaseClient
                        .from("conversations")
                        .select("id, user1_id, user2_id")
                        .or(
                            `user1_id.eq.${monId},user2_id.eq.${monId}`
                        );
                conversation = (existantes || []).find(
                    function(c) {
                        return (
                            c.user1_id === monId &&
                            c.user2_id === autreId
                        ) || (
                            c.user1_id === autreId &&
                            c.user2_id === monId
                        );
                    }
                );

                if (!conversation) throw erreurCreation;
            } else {
                conversation = nouvelle;
            }
        }
        window.location.href =
            "prive.html?conversation_id=" +
            encodeURIComponent(conversation.id);
    } catch (error) {
        console.error("Erreur discussion :", error);
        messageRetour.textContent =
            "Impossible d'ouvrir cette discussion.";
        ouvertureEnCours = false;
        bouton.disabled = false;
    }
}
// Charger les profils depuis Supabase
async function chargerContacts() {
    messageRetour.textContent =
        "Chargement des contacts...";
    const { data, error } =
        await supabaseClient.auth.getUser();
    if (error || !data.user) {
        window.location.href = "index.html";
        return;
    }
    utilisateurConnecte = data.user;
    const { data: profils, error: erreurProfils } =
        await supabaseClient
            .from("profils")
            .select("id, prenom, avatar_url")
            .neq("id", utilisateurConnecte.id)
            .order("prenom", { ascending: true });
    if (erreurProfils) {
        console.error("Erreur contacts :", erreurProfils);
        messageRetour.textContent =
            "Impossible de charger les contacts.";
        return;
    }
    contacts = await Promise.all(
        (profils || []).map(async function(profil) {
            return {
                id: profil.id,
                prenom: profil.prenom || "Utilisateur",
                photo: await obtenirPhoto(profil.avatar_url)
            };
        })
    );
    afficherContacts();
}
rechercheContact.addEventListener(
    "input",
    afficherContacts
);
chargerContacts();
