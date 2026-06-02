import { GameObjects } from 'phaser';
import { diag } from '@/utils/DiagLogger';
import { eventBus } from '@/events/EventBus';
import { GameEvent } from '@/events/EventTypes';
import { saveManager } from '@/state/SaveManager';
import type { Shooter } from '@/gameplay/Shooter';

/**
 * Manages the bomb power-up "loaded marble" state for a single Game scene.
 * Responsibilities:
 *   load()       – arms the bomb into the cannon (no inventory consume yet).
 *   unload()     – disarms without consuming (user cancel / scene end).
 *   commitFire() – consumes inventory, emits BombFired, then unloads.
 */
export class BombController {
    private _loaded = false;
    private _iconGlowTween?: Phaser.Tweens.Tween;

    constructor(
        private readonly _scene: Phaser.Scene,
        private readonly _shooter: Shooter,
        private readonly _icon: GameObjects.Image,
    ) {}

    get isLoaded(): boolean { return this._loaded; }

    load(): void {
        if (this._loaded) return;
        // if (saveManager.getInventory('bomb') <= 0) return;
        this._loaded = true;
        this._shooter.setBombMode(true);
        this._startIconGlow();
        eventBus.emit(GameEvent.BombLoaded, {});
        diag.log('powerup_bomb_loaded', {});
    }

    unload(reason: 'user_toggle' | 'scene_end' | 'fired'): void {
        if (!this._loaded && reason !== 'scene_end') return;
        this._loaded = false;
        this._shooter.setBombMode(false);
        this._stopIconGlow();
        if (reason !== 'fired') {
            eventBus.emit(GameEvent.BombUnloaded, { reason });
        }
        diag.log('powerup_bomb_unloaded', { reason });
    }

    commitFire(): void {
        saveManager.consumePowerUp('bomb');
        eventBus.emit(GameEvent.BombFired, {});
        diag.log('powerup_bomb_fired', {});
        this.unload('fired');
    }

    private _startIconGlow(): void {
        this._iconGlowTween?.stop();
        this._icon.setTint(0xe87363);
        this._iconGlowTween = this._scene.tweens.add({
            targets: this._icon,
            alpha: { from: 1.0, to: 0.6 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    private _stopIconGlow(): void {
        this._iconGlowTween?.stop();
        this._iconGlowTween = undefined;
        this._icon.clearTint();
        this._icon.setAlpha(1);
    }
}
