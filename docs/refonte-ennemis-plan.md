# Refonte des ennemis — Plan de développement

> Statut : plan validé en conversation (2026-06-19). À exécuter par phases.
> Décisions : télégraphe + fenêtres · procédural amélioré · les 9 du catalogue ·
> projectiles unifiés · contre-jeu = garde/parade · flinch seul (stagger réservé à la parade).

## 1. Vision & Objectif

Sortir le combat du **bashing** (colle-l'ennemi-et-spam-clic) pour un combat **lisible et
rythmé** : chaque attaque ennemie est télégraphiée, le joueur la lit et y répond (garde/parade),
puis punit. En parallèle, donner aux ennemis de **vraies silhouettes animées** (rig procédural,
zéro asset externe) et un **système de projectiles propre** réutilisable par tout le bestiaire.

## 2. Stack technique

Inchangée (R3F 8, drei, Rapier, leva, Vite/TS). Tout reste **procédural + pixelisé**, aucun
asset 3D externe. On prolonge les patterns existants du projet :
- **State machine d'attaque** ajoutée dans `useEnemyAI` (le moteur partagé), pas dans chaque ennemi.
- **Projectiles** via un **registre de module** hors arbre React (`combat/projectileRegistry.ts`),
  comme `enemyRegistry` / `corpseRegistry` — collisions Rapier réelles, pas de distance manuelle.
- **Garde/parade** : état dans `combat/` (canal lu par `damagePlayer`), input dans `Player.tsx`.
- **Mutations Rapier toujours en phase `useFrame`** (file `pendingHits` existante étendue au stagger),
  pour éviter l'aliasing wasm signalé dans le code actuel.

## 3. Périmètre (Scope)

### In scope
- Refonte du **cœur combat** : windup → frappe → recovery, côté ennemi.
- **Garde + parade** joueur (clic droit), parade serrée → **stagger** l'ennemi.
- **Flinch** ennemi sur coup encaissé (visuel, sans interruption — sauf parade).
- **Système de projectiles unifié** (murs + joueur en Rapier, pooling, impact FX).
- **Re-modélisation + rig animable** des ennemis, et **les 9 types** du catalogue jouables
  (les 4 manquants : archer squelette, troll, araignée, nécromancien).
- Rééquilibrage des cadences/dégâts pour le nouveau rythme.

### Out of scope (cette version)
- Assets GLTF / skinning externe.
- Action economy systémique complète (poise global, i-frames joueur génériques) — on se limite
  au couple **parade↔stagger**.
- Boss à patterns scriptés (le `necromancer` aura une invocation simplifiée, pas un fight scénarisé).
- Pathfinding (les ennemis poursuivent toujours en ligne XZ ; A*/navmesh = autre chantier).

## 4. Roadmap phasée

### Phase 1 — Cœur du combat (priorité : haute)
**Objectif :** tuer le bashing. C'est le pivot dont tout dépend.
**Livrables :**
- [ ] State machine d'attaque dans `useEnemyAI` : `APPROACH → WINDUP(télégraphe) → STRIKE → RECOVERY`.
      Les dégâts ne s'appliquent qu'à la frame **STRIKE**, et seulement si le joueur est encore à portée
      (donc reculer/contourner pendant le windup = esquive réelle).
- [ ] Nouveaux champs catalogue : `windup`, `recovery`, `telegraph` (intensité visuelle) par type.
- [ ] Télégraphe visuel générique (pose d'anticipation + flash/scale) exposé via `EnemyMotion`.
- [ ] Garde joueur (clic droit, maintenu) : réduit/annule les dégâts mêlée ; coûte de la vigueur.
- [ ] **Fenêtre de parade** (début de garde) : si une frappe ennemie tombe dedans → **stagger**
      l'ennemi (interruption + recovery long + vulnérable), zéro dégât joueur.
- [ ] **Flinch** ennemi sur coup normal (anim de broncher), **sans** interrompre le comportement.
- [ ] Feedback joueur : viewmodel garde/parade (lever épée ou bouclier) + indicateur de réussite.
- [ ] Rééquilibrage cooldowns/dégâts/portées pour le rythme télégraphié.
**Estimation :** 4-6 jours

### Phase 2 — Système de projectiles unifié (priorité : haute)
**Objectif :** projectiles fiables et réutilisables (remplace l'`AcidProjectile` bancal du Slime).
**Livrables :**
- [ ] `combat/projectileRegistry.ts` + composant unique `<Projectiles>` monté une fois (hors state local).
- [ ] Collisions **Rapier réelles** : murs (disparition/impact) + joueur (dégâts), en 3D (Y compris).
- [ ] API `spawnProjectile({ pos, dir, dmg, kind })`, pooling, durée de vie propre (plus de `setTimeout`/`Date.now`).
- [ ] Types initiaux : `acid` (slime), `arrow` (archer) + FX d'impact.
- [ ] Brancher le Slime dessus, **supprimer** l'implémentation locale.
**Estimation :** 2-3 jours

### Phase 3 — Modèles & rig procédural (priorité : moyenne)
**Objectif :** silhouettes fortes + vraies animations (marche/attaque/windup/flinch/mort).
**Livrables :**
- [ ] Convention de **rig hiérarchique** partagée (corps → membres en groupes pivotables) + helper d'anim
      piloté par `EnemyMotion` (marche, enveloppe d'attaque, phase de windup).
- [ ] Re-modélisation des 5 ennemis live (goblin, skeleton, slime, orc, wolf) : meilleures formes,
      matériaux, lecture du télégraphe dans la pose.
**Estimation :** 4-6 jours

### Phase 4 — Compléter le bestiaire (priorité : moyenne)
**Objectif :** rendre jouables les 4 types restants du catalogue.
**Livrables :**
- [ ] `skeletonArcher` (ranged → branché Phase 2).
- [ ] `troll` (tank, régen PV).
- [ ] `spider` (fast, poison/DoT léger).
- [ ] `necromancer` (invocation de squelettes — version simplifiée).
- [ ] Intégration `dungeonGen` (pools par niveau) + `getEnemyForBiome` (le `scorpion` reste TODO).
**Estimation :** 4-5 jours

### Phase 5 — Variété & polish (priorité : basse / nice-to-have)
**Objectif :** profondeur et finition une fois la base solide.
**Livrables :**
- [ ] 2ᵉ attaque / patterns par ennemi (charge, combo, repositionnement).
- [ ] Variantes **élite** (visuel + stats), déjà prévues par le flag `elite`.
- [ ] FX/sons d'attaque, de parade, d'impact.
**Estimation :** ouvert

## 5. Risques & Points bloquants

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Scope (combat + projectiles + 9 modèles) trop large | Élevé | Phases **livrables indépendamment** ; Phase 1 d'abord, jouable seule |
| Aliasing wasm Rapier (mutation hors frame) sur stagger/parade | Moyen | Réutiliser la file `pendingHits` ; toute mutation en `useFrame` |
| Rééquilibrage : le windup casse la balance actuelle | Moyen | Régler sur 1 ennemi (gobelin) banc d'essai avant de propager |
| Garde au clic droit vs pointer-lock / menu | Moyen | Capter dans `Player.tsx` sous pointer-lock, ignorer si `gameState.paused` |
| Perf (projectiles + 9 types animés) | Moyen | Pooling, instancing, `dpr` bas déjà en place |
| `necromancer` (invocation) déborde en mini-boss | Faible | Version simplifiée explicitement dans le scope |

## 6. Prochaine action immédiate

Implémenter la **state machine `WINDUP → STRIKE → RECOVERY` dans `useEnemyAI`** en l'éprouvant
sur le **gobelin seul** : les dégâts ne partent qu'à la frame STRIKE et seulement si le joueur est
encore à portée. C'est le pivot — une fois ça en place et lisible, garde/parade et le reste s'y branchent.
