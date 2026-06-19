import type { RefObject } from "react";
import * as THREE from "three";
import type { EnemyMotion } from "./useEnemyAI";

// Helpers de RIG partagés (refonte ennemis Phase 3, cf. docs/refonte-ennemis-plan.md).
//
// Convention : un ennemi humanoïde est un arbre de GROUPES qui pivotent à leur
// articulation (épaule, hanche), pas des meshes qui tournent sur leur centre. Les
// composants exposent ces groupes par ref ; `animateBiped` y applique l'animation
// partagée pilotée par EnemyMotion (marche, anticipation de windup, frappe, flinch).
// Ainsi un nouvel ennemi biped (Phase 4) n'a qu'à câbler ses refs — zéro math
// d'animation dupliquée, et le combat télégraphié reste lisible de la même façon.

/** Refs des articulations d'un biped (toutes optionnelles sauf le tronc). */
export interface BipedRefs {
  bodyRig: RefObject<THREE.Group | null>;
  leftArm?: RefObject<THREE.Object3D | null>;
  rightArm?: RefObject<THREE.Object3D | null>;
  leftLeg?: RefObject<THREE.Object3D | null>;
  rightLeg?: RefObject<THREE.Object3D | null>;
  head?: RefObject<THREE.Object3D | null>;
}

/** Réglages d'anim par ennemi (tous avec des défauts raisonnables). */
export interface BipedCfg {
  /** Inclinaison de repos du tronc (rad) — ex: gobelin voûté. Défaut 0. */
  restLean?: number;
  /** Amplitude du bob vertical de marche. Défaut 0.06. */
  walkAmp?: number;
  /** Bascule avant à la frappe. Défaut 0.6. */
  lunge?: number;
  /** Balancement des bras à la marche. Défaut 0.5. */
  armSwing?: number;
  /** Lever des bras pendant le windup (anticipation). Défaut 1.3. */
  armRaise?: number;
  /** Abattage des bras à la frappe. Défaut 1.4. */
  armSlam?: number;
  /** Foulée des jambes. Défaut 0.35. */
  legStride?: number;
  /** Rotation Z de repos des bras (écartement). Défaut 0.48. */
  armRestZ?: number;
  /** Rotation X de repos des bras. Défaut 0.1. */
  armRestX?: number;
}

/**
 * Applique l'animation biped partagée à un rig. À appeler dans `onAnimate`.
 * `wind` arme (recule + bras hauts), `aa` frappe (bascule + bras abattus),
 * `flinch` fait broncher (sursaut arrière) — sans interrompre quoi que ce soit.
 */
export function animateBiped(refs: BipedRefs, m: EnemyMotion, cfg: BipedCfg = {}): void {
  const { ws, aa, wind, flinch } = m;
  const walkAmp = cfg.walkAmp ?? 0.06;
  const lunge = cfg.lunge ?? 0.6;
  const armSwing = cfg.armSwing ?? 0.5;
  const armRaise = cfg.armRaise ?? 1.3;
  const armSlam = cfg.armSlam ?? 1.4;
  const stride = cfg.legStride ?? 0.35;
  const restZ = cfg.armRestZ ?? 0.48;
  const restX = cfg.armRestX ?? 0.1;
  const restLean = cfg.restLean ?? 0;

  const rig = refs.bodyRig.current;
  if (rig) {
    rig.position.y = ws * walkAmp - flinch * 0.05;
    rig.rotation.x = restLean + aa * lunge - wind * 0.4 + flinch * 0.5;
  }
  // Bras : repos → armés haut au windup → abattus à la frappe, + balancement marche.
  // `restZ` ÉCARTE les bras du corps : épaule gauche vers −X (z négatif), droite
  // vers +X (z positif). (Inverser ces signes les ferait se croiser à l'intérieur.)
  const armX = restX - wind * armRaise - aa * armSlam;
  if (refs.leftArm?.current) refs.leftArm.current.rotation.set(armX + ws * armSwing, 0, -restZ);
  if (refs.rightArm?.current) refs.rightArm.current.rotation.set(armX - ws * armSwing, 0, restZ);
  // Jambes : foulée alternée (pivot à la hanche).
  if (refs.leftLeg?.current) refs.leftLeg.current.rotation.set(-ws * stride, 0, 0);
  if (refs.rightLeg?.current) refs.rightLeg.current.rotation.set(ws * stride, 0, 0);
  // Tête : léger ballant de marche, baisse à la frappe, se relève au windup.
  if (refs.head?.current) refs.head.current.rotation.x = ws * 0.05 - aa * 0.15 + wind * 0.12;
}

/**
 * Télégraphe émissif « teinte » (humanoïdes) : lueur ROUGE qui monte pendant le
 * windup + flash BLANC au coup encaissé, encodés dans la couleur émissive
 * (intensité laissée à 1). `flash` = valeur reçue dans onFlash (0..1).
 */
export function telegraphTint(
  mat: THREE.MeshStandardMaterial | null,
  flash: number,
  wind: number,
  flashMul = 0.9,
): void {
  if (!mat) return;
  mat.emissive.setRGB(flash * flashMul + wind * 0.75, flash * flashMul, flash * flashMul);
}

/**
 * Télégraphe émissif « lueur » (corps qui a déjà une couleur émissive : loup,
 * slime). Pendant le windup → rouge intense ; sinon → couleur de base + flash.
 */
export function telegraphGlow(
  mat: THREE.MeshStandardMaterial | null,
  flash: number,
  wind: number,
  baseColor: THREE.Color,
  baseIntensity: number,
  flashMul = 1,
): void {
  if (!mat) return;
  if (wind > 0.01) {
    mat.emissive.setRGB(0.95, 0.14, 0.1);
    mat.emissiveIntensity = wind * 1.0 + flash * flashMul;
  } else {
    mat.emissive.copy(baseColor);
    mat.emissiveIntensity = flash * flashMul + baseIntensity;
  }
}
