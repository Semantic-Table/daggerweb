# Bugs connus

Problèmes identifiés, non encore corrigés.

## Slimes

- ~~**Projectiles traversent les murs**~~ — **Corrigé** : `AcidProjectile` utilise désormais
  un `RigidBody` Rapier (`type="dynamic"`, `gravityScale={0}`) + `BallCollider`, avec vitesse
  initiale via `setLinvel`. Les murs arrêtent naturellement les projectiles.

- ~~**Slimes trop hauts**~~ — **Corrigé** : `corpseGroup.position.y` était assigné à
  `t.y + bounce` (position monde en espace local → hauteur doublée). Fixé à `bounce` seul.
  `colliderOffsetY` corrigé de 0.3 à 0.95 (= halfHeight + radius du CapsuleCollider).
