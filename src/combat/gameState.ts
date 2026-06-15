// État de jeu partagé hors arbre React (même pattern que playerState /
// playerCombat). `paused` est vrai quand un menu bloquant est ouvert
// (inventaire). Les useFrame de gameplay (IA ennemie) le lisent pour se figer :
// geler le timestep Rapier stoppe l'intégration physique, mais PAS les boucles
// useFrame qui décomptent des cooldowns ou infligent des dégâts.

export const gameState = {
  paused: false,
};
