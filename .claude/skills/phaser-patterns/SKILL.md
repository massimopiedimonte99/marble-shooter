---
name: phaser-patterns
description: Use when implementing Phaser 3 scenes, scene transitions, object pooling, path-following with Curves.Path, particle systems, scale manager configuration, or any core Phaser 3 architectural pattern in this project.
---

# Phaser 3 Patterns

## Scale Manager (responsive)
Configurato in `src/main.ts` con mode FIT + autoCenter. Target logico 720×1280 portrait. Mai cambiare scale mode senza aggiornare ARCHITECTURE.md.

```ts
scale: {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 720,
  height: 1280,
  parent: 'game-container'
}
```

## Scene Lifecycle
Tutte le scene estendono `BaseScene` (in `src/scenes/BaseScene.ts`) che fornisce: ref a `GameState`, ref a `AudioManager`, ref a `AdProvider`, helper per transizioni con fade.

Ordine: `init(data)` → `preload()` → `create()` → loop `update(time, delta)`. Mai logica pesante in `create()`; precarica in `PreloadScene`.

## Object Pooling (OBBLIGATORIO)
Mai `new Sprite` durante gameplay. Usa `Phaser.GameObjects.Group` con `maxSize` e `createCallback`. Per le marble: `MarblePool` in `src/pool/MarblePool.ts`.

```ts
const marble = this.marblePool.get(x, y, color);  // riusa sprite inattivo
marble.setActive(false).setVisible(false);  // ritorno al pool
```

## Path Following (per la catena di marble)
`Phaser.Curves.Path` definisce la traiettoria. Per ogni marble salva `t` (0..1) e calcola posizione con `path.getPoint(t, vec)`. La catena è una doubly linked list (`src/utils/LinkedList.ts`), non un array, per O(1) insert/split.

## Event Bus
Pattern publish/subscribe per disaccoppiare gameplay/audio/UI/ads. `src/events/EventBus.ts` (singleton). Eventi tipizzati via union type in `src/events/EventTypes.ts`.

```ts
EventBus.emit('match', { count: 5, position: {x, y} });
// AudioManager + ScoreManager + VFXManager listen separatamente
```

## Particles invece di sprite animati
Per esplosioni, scintille, trail: `scene.add.particles()` con 1-2 texture base + tinting. Non generare sprite sheet per VFX.

## Don't
- Mai `new GameObject` in `update()` — pool tutto
- Mai logica di gioco in `preload()` — solo asset loading
- Mai cross-scene reference diretta — usa EventBus o GameState