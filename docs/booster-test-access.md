# Boosters de test

Les codes promo ajoutent maintenant des ouvertures dans un **solde bonus séparé**
de la réserve normale. La recharge de 30 minutes et son plafond de quatre ne
changent pas. Les crédits bonus sont dépensés après la réserve normale, restent
liés au compte et ne modifient ni les taux ni les cartes directement.

## Créer le code personnel `MALIK` (50 boosters, une seule fois)

La migration `0051_boosters_promo_personnels.sql` est déjà appliquée en
production. Ouvre le SQL Editor du projet Supabase CreatorDeck et exécute cette
commande en remplaçant `EMAIL_DU_COMPTE_SUPABASE` par l'adresse exacte utilisée
pour te connecter dans CreatorDeck :

```sql
insert into public.promo_codes (code, packs, max_uses, recipient_id, note)
select 'MALIK', 50, 1, id, '50 boosters de test pour Malik'
from auth.users
where lower(email) = lower('EMAIL_DU_COMPTE_SUPABASE')
returning code, packs, max_uses, recipient_id;
```

Une ligne retournée confirme que le code est lié au bon compte. Si aucune ligne
n'est retournée, l'adresse ne correspond à aucun compte Supabase : vérifie
l'adresse sans créer de code non lié. Le code ne peut être réclamé que par ce
compte, une fois. Il n'expire pas. Dans CreatorDeck, ouvre **Toi →
Fonctionnalités en ligne → J'ai un code booster**, saisis `MALIK`, puis valide.
Le Drop affichera séparément les crédits « boosters de test » ; ils restent
utilisables même quand la réserve normale est vide. Le code accorde des tirages
normaux (cinq cartes chacun), pas des cartes choisies.

Ne recrée pas le code après sa consommation : la contrainte d'un usage est
volontaire. Pour une nouvelle série de tests, crée un autre code avec un nom
différent et garde `recipient_id` lié au même compte.

## Créer d'autres codes

Le helper serveur `create_promo_code` accepte désormais de 1 à 50 boosters :

```sql
select public.create_promo_code('EVENEMENT-2026', 5, 1, null, 'test privé');
```

Ce helper crée un code au porteur. Pour le réserver à une personne, insère la
ligne directement avec `recipient_id` comme dans l'exemple `MALIK`. Les codes au
porteur peuvent être utilisés par toute personne qui les connaît ; ne les
publie donc pas. Les tables restent fermées aux clients et la rédemption passe
par le RPC authentifié.

La pile SQL de vérification teste l'attribution à 50 boosters, le refus pour un
autre compte, l'ouverture effective d'un booster bonus, le décrément atomique et
la conservation de la réserve normale. La vérification Postgres reste une
simulation jetable ; le workflow de déploiement Supabase contrôle la migration
de production après la CI verte.
