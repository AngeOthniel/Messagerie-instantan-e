💬 Messagerie instantanée

Présentation du projet

Messagerie instantanée est une application web permettant aux utilisateurs de communiquer en temps réel à travers des conversations générales et privées.

Le projet a été développé avec HTML, CSS, JavaScript et Supabase.

🚀 Fonctionnalités

* Création de compte et authentification
* Connexion et déconnexion
* Réinitialisation du mot de passe
* Conversation générale
* Discussions privées entre utilisateurs
* Envoi et réception de messages en temps réel
* Réactions aux messages ❤️ 👍 😂
* Compteurs de messages non lus
* Confirmations de lecture
* Indicateur de saisie « écrit… »
* Recherche de contacts
* Modification du profil utilisateur
* Photos de profil
* Envoi et réception de photos et de PDF
* Interface responsive pour ordinateur et téléphone

🛠️ Technologies utilisées

Technologie	Utilisation
HTML5	Structure des pages
CSS3	Design et adaptation aux écrans
JavaScript	Interactions et logique de l’application
Supabase Auth	Authentification
Supabase Database	Stockage des messages et conversations
Supabase Realtime	Communication en temps réel
Supabase Storage	Photos et pièces jointes
GitHub Pages	Hébergement du site

🔒 Sécurité

L’application utilise Row Level Security (RLS) dans Supabase pour contrôler l’accès aux données.

Les conversations privées sont destinées à être accessibles uniquement à leurs participants. Les fichiers sont stockés dans des buckets privés.

État : les principales politiques et l’activation RLS ont été vérifiées. Les tests approfondis d’autorisation restent à finaliser avant un déploiement public.

📂 Organisation du projet

* index.html : page de connexion
* inscription.html : inscription des utilisateurs
* contact.html : liste et recherche des contacts
* contacts.js : gestion des contacts
* conversation.html : conversation générale
* discussions.html : liste des discussions privées
* discussions.js : chargement des discussions et messages non lus
* prive.html : interface de discussion privée
* prive.js : messages, réactions, pièces jointes et temps réel
* profil.html : profil utilisateur
* profil.js : gestion du profil
* style.css : styles de base
* design.css : design moderne de l’application
* connexion.js : gestion de la connexion
* inscription.js : gestion de l'inscription
* script.js : gestion de la conversation générale
* recuperation.js : récupération du mot de passe
* parametre.html : page des paramètres
  
⚙️ Configuration

Pour utiliser le projet avec son propre environnement :

1. Créer un projet Supabase.
2. Configurer l’authentification et les tables nécessaires.
3. Configurer les politiques RLS.
4. Configurer Supabase Realtime et Storage.
5. Renseigner l’URL du projet et la clé publique Supabase dans les fichiers JavaScript concernés.
6. Déployer le site avec GitHub Pages.
