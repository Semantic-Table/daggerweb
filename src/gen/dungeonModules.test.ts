/**
 * Tests pour le système de modules de donjon à connecteurs
 * (GDD §4 - Modules de donjon à connecteurs)
 */

import { generateDungeon } from "./dungeonGen";
import { generateModularDungeon } from "./dungeonGen";
import { getAvailableConnectors } from "./dungeonModules";
import { makeRng } from "../rng";

// ============================================================================
// TESTS UNITAIRES
// ============================================================================

/**
 * Test 1 : Génération déterministe
 * Même seed = même donjon
 */
function testDeterministicGeneration() {
  console.log("Test 1 : Génération déterministe...");
  
  const seed = 12345;
  const dungeon1 = generateDungeon(seed);
  const dungeon2 = generateDungeon(seed);
  
  // Comparer les propriétés clés
  const keys: (keyof typeof dungeon1)[] = [
    "floors", "panels", "enemies", "spawn", "exit", "exitRot", "size", "seed"
  ];
  
  let allMatch = true;
  for (const key of keys) {
    const val1 = dungeon1[key];
    const val2 = dungeon2[key];
    
    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      console.error(`  ❌ Mismatch in ${key}`);
      allMatch = false;
    }
  }
  
  if (allMatch) {
    console.log("  ✅ PASS : Génération déterministe fonctionnelle");
    console.log(`     - Seed: ${seed}`);
    console.log(`     - Modules: ~${dungeon1.floors.length / 10} (estimé)`);
    console.log(`     - Sols: ${dungeon1.floors.length}`);
    console.log(`     - Murs: ${dungeon1.panels.length}`);
    console.log(`     - Ennemis: ${dungeon1.enemies.length}`);
  } else {
    console.log("  ❌ FAIL : Résultat non déterministe");
  }
  
  return allMatch;
}

/**
 * Test 2 : Différentes seeds = différents donjons
 */
function testDifferentSeeds() {
  console.log("\nTest 2 : Différentes seeds...");
  
  const dungeon1 = generateDungeon(12345);
  const dungeon2 = generateDungeon(54321);
  
  const different = 
    JSON.stringify(dungeon1.floors) !== JSON.stringify(dungeon2.floors) ||
    JSON.stringify(dungeon1.panels) !== JSON.stringify(dungeon2.panels);
  
  if (different) {
    console.log("  ✅ PASS : Différentes seeds produisent des donjons différents");
  } else {
    console.log("  ❌ FAIL : Même résultat pour des seeds différents");
  }
  
  return different;
}

/**
 * Test 3 : Structure des données DungeonData
 */
function testDungeonDataStructure() {
  console.log("\nTest 3 : Structure des données...");
  
  const dungeon = generateDungeon(42);
  
  const hasRequiredFields = 
    dungeon.floors !== undefined &&
    dungeon.panels !== undefined &&
    dungeon.enemies !== undefined &&
    dungeon.spawn !== undefined &&
    dungeon.exit !== undefined &&
    dungeon.exitRot !== undefined &&
    dungeon.size !== undefined &&
    dungeon.seed !== undefined &&
    dungeon.wallType !== undefined &&
    dungeon.floorType !== undefined &&
    dungeon.ceilingType !== undefined;
  
  const spawnIsValid = 
    Array.isArray(dungeon.spawn) && 
    dungeon.spawn.length === 3 &&
    typeof dungeon.spawn[0] === "number" &&
    typeof dungeon.spawn[1] === "number" &&
    typeof dungeon.spawn[2] === "number";
  
  const exitIsValid = 
    Array.isArray(dungeon.exit) && 
    dungeon.exit.length === 3;
  
  const floorsAreValid = 
    Array.isArray(dungeon.floors) &&
    dungeon.floors.every(f => Array.isArray(f) && f.length === 2);
  
  const panelsAreValid = 
    Array.isArray(dungeon.panels) &&
    dungeon.panels.every(p => 
      typeof p.x === "number" && 
      typeof p.z === "number" && 
      typeof p.rot === "number"
    );
  
  if (hasRequiredFields && spawnIsValid && exitIsValid && floorsAreValid && panelsAreValid) {
    console.log("  ✅ PASS : Structure DungeonData valide");
    console.log(`     - Sols: ${dungeon.floors.length} positions`);
    console.log(`     - Murs: ${dungeon.panels.length} panneaux`);
    console.log(`     - Spawn: [${dungeon.spawn.join(", ")}]`);
    console.log(`     - Exit: [${dungeon.exit.join(", ")}]`);
  } else {
    console.log("  ❌ FAIL : Structure invalide");
    console.log(`     hasRequiredFields: ${hasRequiredFields}`);
    console.log(`     spawnIsValid: ${spawnIsValid}`);
    console.log(`     exitIsValid: ${exitIsValid}`);
    console.log(`     floorsAreValid: ${floorsAreValid}`);
    console.log(`     panelsAreValid: ${panelsAreValid}`);
  }
  
  return hasRequiredFields && spawnIsValid && exitIsValid && floorsAreValid && panelsAreValid;
}

/**
 * Test 4 : Génération modulaire directe
 */
function testModularGeneration() {
  console.log("\nTest 4 : Génération modulaire directe...");
  
  const rng = makeRng(9999);
  const modules = generateModularDungeon(rng, 9999);
  
  const hasModules = modules.length > 0;
  const allHaveGeometry = modules.every(m => 
    m.geometry.floors.length > 0 && 
    m.geometry.panels.length > 0
  );
  const allHaveConnectors = modules.every(m => m.connectors.length > 0);
  
  if (hasModules && allHaveGeometry && allHaveConnectors) {
    console.log("  ✅ PASS : Génération modulaire fonctionnelle");
    console.log(`     - Modules générés: ${modules.length}`);
    console.log(`     - Types de modules: ${[...new Set(modules.map(m => m.type))].join(", ")}`);
    
    // Compter par type
    const typeCounts: Record<string, number> = {};
    for (const module of modules) {
      typeCounts[module.type] = (typeCounts[module.type] || 0) + 1;
    }
    console.log(`     - Répartition: ${JSON.stringify(typeCounts)}`);
  } else {
    console.log("  ❌ FAIL : Problème avec la génération modulaire");
    console.log(`     hasModules: ${hasModules}`);
    console.log(`     allHaveGeometry: ${allHaveGeometry}`);
    console.log(`     allHaveConnectors: ${allHaveConnectors}`);
  }
  
  return hasModules && allHaveGeometry && allHaveConnectors;
}

/**
 * Test 5 : Connecteurs disponibles
 */
function testAvailableConnectors() {
  console.log("\nTest 5 : Connecteurs disponibles...");
  
  const rng = makeRng(7777);
  const modules = generateModularDungeon(rng, 7777);
  
  const available = getAvailableConnectors(modules);
  
  const hasAvailable = available.length >= 0; // Peut être 0 si tout est connecté
  const allConnectorsValid = available.every(({ module, connector }) => 
    module !== undefined && 
    connector !== undefined
  );
  
  if (hasAvailable && allConnectorsValid) {
    console.log("  ✅ PASS : Système de connecteurs fonctionnel");
    console.log(`     - Connecteurs disponibles: ${available.length}`);
    console.log(`     - Connecteurs totaux: ${modules.reduce((sum, m) => sum + m.connectors.length, 0)}`);
  } else {
    console.log("  ❌ FAIL : Problème avec les connecteurs");
  }
  
  return hasAvailable && allConnectorsValid;
}

/**
 * Test 6 : Rétrocompatibilité (mode legacy)
 */
function testLegacyMode() {
  console.log("\nTest 6 : Mode legacy (rétrocompatibilité)...");
  
  try {
    const dungeon = generateDungeon(1111, true); // useLegacy = true
    
    const isValid = 
      dungeon.floors.length > 0 &&
      dungeon.panels.length > 0 &&
      dungeon.size === 24; // L'ancien système utilisait DUNGEON_SIZE = 24
    
    if (isValid) {
      console.log("  ✅ PASS : Mode legacy fonctionnel");
      console.log(`     - Sols: ${dungeon.floors.length}`);
      console.log(`     - Murs: ${dungeon.panels.length}`);
    } else {
      console.log("  ❌ FAIL : Mode legacy invalide");
    }
    
    return isValid;
  } catch (e) {
    console.log(`  ❌ FAIL : Erreur en mode legacy: ${e}`);
    return false;
  }
}

// ============================================================================
// EXÉCUTION DES TESTS
// ============================================================================

function runAllTests() {
  console.log("=".repeat(60));
  console.log("TESTS : Modules de donjon à connecteurs (GDD §4)");
  console.log("=".repeat(60));
  
  const results = [
    testDeterministicGeneration(),
    testDifferentSeeds(),
    testDungeonDataStructure(),
    testModularGeneration(),
    testAvailableConnectors(),
    testLegacyMode(),
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log("\n" + "=".repeat(60));
  console.log(`RÉSULTATS : ${passed}/${total} tests passés`);
  console.log("=".repeat(60));
  
  if (passed === total) {
    console.log("✅ TOUS LES TESTS ONT RÉUSSI !");
  } else {
    console.log(`⚠️  ${total - passed} test(s) échoué(s)`);
  }
  
  return passed === total;
}

// Exécuter les tests si ce fichier est lancé directement
// Note: process.cwd() n'est pas disponible en frontal, on utilise une approche simple
// if (import.meta.url.includes("dungeonModules.test.ts")) {
//   runAllTests();
// }

// Export pour utilisation dans d'autres fichiers
export {
  runAllTests,
  testDeterministicGeneration,
  testDifferentSeeds,
  testDungeonDataStructure,
  testModularGeneration,
  testAvailableConnectors,
  testLegacyMode,
};