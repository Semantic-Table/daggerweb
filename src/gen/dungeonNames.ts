import { type EntranceKind } from "./overworldGen";

// Noms de donjons générés aléatoirement basés sur le type et le seed
// Chaque type a plusieurs préfixes et suffixes pour créer des noms variés

const KEEP_PREFIXES = [
  "Forteresse", "Donjon", "Bastion", "Citadelle", "Tour", 
  "Château", "Rempart", "Fort", "Poste", "Garnison"
];

const KEEP_SUFFIXES = [
  "de l'Ombre", "des Ténèbres", "Maudit", "Oublié", "des Morts",
  "du Sang", "de la Cendre", "Brisé", "Noir", "des Larmes",
  "du Corbeau", "du Loup", "du Dragon", "de la Pierre", "Sombre",
  "des Esprits", "du Silence", "de la Lune", "des Étoiles", "Ancien"
];

const CRYPT_PREFIXES = [
  "Crypte", "Tombeau", "Sépulture", "Nécropole", "Mausolée",
  "Catacombe", "Tumulus", "Ossuaire", "Chambre", "Sanctuaire"
];

const CRYPT_SUFFIXES = [
  "des Âmes", "du Néant", "de l'Éternel", "des Ombres", "des Morts-Vivants",
  "du Chagrin", "de la Peur", "des Secrets", "du Souvenir", "des Larmes",
  "du Sang", "de la Cendre", "du Silence", "de la Lune", "Oubliée",
  "des Esprits", "Maudite", "Ancienne", "Sacrée", "Profonde"
];

const CAVE_PREFIXES = [
  "Grotte", "Caverne", "Antre", "Abîme", "Gouffre",
  "Faille", "Galerie", "Tunnel", "Puits", "Crevasse"
];

const CAVE_SUFFIXES = [
  "du Dragon", "des Ténèbres", "des Cristaux", "du Vent", "des Échos",
  "des Ombres", "du Tonnerre", "de la Pluie", "des Vers", "du Serpent",
  "du Loup", "de la Chauve-Souris", "des Champignons", "de la Pierre", "Profonde",
  "Sombre", "Humide", "Glacée", "Brumante", "Oubliée"
];

// Noms spécifiques pour les lieux de l'overworld (pour la carte)
export const OVERWORLD_LOCATION_NAMES: Record<string, string> = {
  "cendrebois": "Cendrebois",
  "pont_aux_loups": "Pont-aux-Loups", 
  "tour_brisee": "Tour Brisée",
  "gue_de_saule": "Gué de Saule",
};

// Génère un nom de donjon basé sur le type et le seed
// Le seed permet d'avoir toujours le même nom pour un donjon donné
export function generateDungeonName(kind: EntranceKind, seed: number): string {
  // Simple hash based sur le seed pour choisir des index
  const hash = (seed: number) => {
    let h = seed;
    h = ((h << 5) - h) + (h << 4);
    h = h + (h << 7);
    return Math.abs(h);
  };

  const h = hash(seed);
  
  switch (kind) {
    case "keep":
      const keepPrefixIdx = h % KEEP_PREFIXES.length;
      const keepSuffixIdx = Math.floor(h / 7) % KEEP_SUFFIXES.length;
      return `${KEEP_PREFIXES[keepPrefixIdx]} ${KEEP_SUFFIXES[keepSuffixIdx]}`;
    
    case "crypt":
      const cryptPrefixIdx = h % CRYPT_PREFIXES.length;
      const cryptSuffixIdx = Math.floor(h / 11) % CRYPT_SUFFIXES.length;
      return `${CRYPT_PREFIXES[cryptPrefixIdx]} ${CRYPT_SUFFIXES[cryptSuffixIdx]}`;
    
    case "cave":
      const cavePrefixIdx = h % CAVE_PREFIXES.length;
      const caveSuffixIdx = Math.floor(h / 13) % CAVE_SUFFIXES.length;
      return `${CAVE_PREFIXES[cavePrefixIdx]} ${CAVE_SUFFIXES[caveSuffixIdx]}`;
    
    default:
      return "Donjon Inconnu";
  }
}

// Génère un nom court pour l'affichage dans la carte
export function generateDungeonShortName(kind: EntranceKind, seed: number): string {
  const fullName = generateDungeonName(kind, seed);
  // Prendre les initiales ou raccourcir
  const words = fullName.split(" ");
  if (words.length >= 2) {
    return `${words[0]} ${words[words.length - 1]}`;
  }
  return fullName;
}

// Génère une description pour le donjon
export function generateDungeonDescription(kind: EntranceKind, seed: number): string {
  const descriptions = {
    keep: [
      "Une ancienne forteresse abandonnée aux murs couverts de lierre noir.",
      "Les échos des batailles passées résonnent encore dans ces couloirs.",
      "Une citadelle oubliée où le temps semble s'être arrêté.",
      "Les ombres des anciens gardiens errent encore entre ces pierres."
    ],
    crypt: [
      "Un lieu de repos éternel perturbé par une présence maléfique.",
      "Les murmures des défunts résonnent dans les couloirs sombres.",
      "Une crypte ancienne où les morts ne trouvent pas la paix.",
      "L'air est lourd de mystère et de secrets bien gardés."
    ],
    cave: [
      "Un réseau de grottes sombres et humides, éclairé seulement par des cristaux lumineux.",
      "Les parois suintent une eau froide, et l'écho de gouttes résonne dans le silence.",
      "Une caverne profonde où des créatures anciennes se sont réfugées.",
      "L'obscurité est presque totale, seulement rompue par la lueur de champignons bioluminescents."
    ]
  };

  const h = Math.abs(seed);
  const descs = descriptions[kind] ?? descriptions.keep;
  return descs[h % descs.length];
}
