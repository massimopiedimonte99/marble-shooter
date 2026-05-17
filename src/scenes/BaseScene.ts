import { Scene } from 'phaser';
import { eventBus } from '@/events/EventBus';
import { gameState } from '@/state/GameState';

export abstract class BaseScene extends Scene {
    protected get eventBus() { return eventBus; }
    protected get gameState() { return gameState; }
}
