import { Events } from 'phaser';
import type { EventPayloads, GameEvent } from '@/events/EventTypes';

class TypedEventEmitter extends Events.EventEmitter {
    emit<K extends GameEvent>(event: K, ...args: EventPayloads[K] extends void ? [] : [EventPayloads[K]]): boolean {
        return super.emit(event, ...args);
    }

    on<K extends GameEvent>(event: K, fn: (payload: EventPayloads[K]) => void, context?: unknown): this {
        return super.on(event, fn, context) as this;
    }

    off<K extends GameEvent>(event: K, fn?: (payload: EventPayloads[K]) => void, context?: unknown): this {
        return super.off(event, fn, context) as this;
    }

    once<K extends GameEvent>(event: K, fn: (payload: EventPayloads[K]) => void, context?: unknown): this {
        return super.once(event, fn, context) as this;
    }
}

export const eventBus = new TypedEventEmitter();
