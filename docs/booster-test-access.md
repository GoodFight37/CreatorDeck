# Boosters temporaires pour les tests

Le serveur limite la réserve normale à quatre boosters (cinq avec le bonus
sablier). Il n'existe pas de mode illimité sur un compte de production. Pour
tester plusieurs ouvertures sans réinitialiser la collection, créer des codes
privés à usage unique dans le SQL Editor Supabase :

```sql
insert into public.promo_codes (code, packs, max_uses, note)
select 'CD-TEST-' || upper(replace(gen_random_uuid()::text, '-', '')),
       4, 1, 'Boosters de test privés'
from generate_series(1, 25)
returning code, packs;
```

Cette commande crée 25 codes imprévisibles, chacun accordant quatre boosters
une seule fois, soit jusqu'à 100 ouvertures au total. Les codes sont des clés
au porteur : ne pas les publier ni les envoyer à quelqu'un d'autre, car la
première personne qui en réclame un le consomme. Ils n'accordent pas de cartes
directement. Chaque ouverture utilise les règles habituelles et ajoute les
cartes et récompenses réelles au compte.

Dans CreatorDeck, ouvrir **Toi → Fonctionnalités en ligne → J'ai un code
booster**, saisir un code puis valider. Réclamer le code suivant quand la
réserve a assez de place ; comme chaque code donne quatre boosters, vider la
réserve avant de réclamer le prochain. Une panne réseau ne doit pas être
contournée en réinitialisant la progression.

Ce procédé ne donne pas un solde illimité, ne change aucun tirage ou réglage
d'économie et n'écrit pas de données d'un autre compte. Il suppose un accès
administrateur au SQL Editor du projet Supabase déjà utilisé par CreatorDeck.
