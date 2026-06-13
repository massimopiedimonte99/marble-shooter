import Phaser from 'phaser';
import { AssetKeys } from '@/constants/AssetKeys';
import { diag } from '@/utils/DiagLogger';

const BUTTON_NATIVE_PILL_W = 835;
const BUTTON_NATIVE_PILL_H = 360;
const BUTTON_PILL_RATIO = BUTTON_NATIVE_PILL_H / BUTTON_NATIVE_PILL_W;

export interface ButtonOptions {
    width?: number;
    fontSize?: string;
    color?: string;
    diagId?: string;
}

export interface ButtonHandle {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Image;
    text: Phaser.GameObjects.Text;
    width: number;
    height: number;
    setLabel(s: string): void;
    setEnabled(en: boolean): void;
}

export function createButton(
    scene: Phaser.Scene,
    x: number, y: number,
    label: string,
    onClick: () => void,
    opts: ButtonOptions = {},
): ButtonHandle {
    const width  = opts.width ?? 280;
    const height = width * BUTTON_PILL_RATIO;
    const scale  = width / BUTTON_NATIVE_PILL_W;
    const fontSize = opts.fontSize ?? `${Math.round(height * 0.35)}px`;
    const color  = opts.color ?? '#ffffff';
    const diagId = opts.diagId ?? label.toLowerCase().replace(/\s+/g, '_');

    const bg = scene.add.image(0, 0, AssetKeys.BUTTON_MASTER).setScale(scale);
    const text = scene.add.text(0, 0, label, {
        fontFamily: 'Arial Black',
        fontSize,
        color,
        stroke: '#3a1a0e',
        strokeThickness: 4,
    }).setOrigin(0.5);

    const container = scene.add.container(x, y, [bg, text])
        .setSize(width, height)
        .setInteractive({ useHandCursor: true });

    const tweenScale = (scale: number, duration: number, ease = 'Quad.easeOut') => {
        scene.tweens.killTweensOf(container);
        scene.tweens.add({ targets: container, scale, duration, ease });
    };

    container.on('pointerover', () => tweenScale(1.04, 120));
    container.on('pointerout',  () => tweenScale(1.0, 120));
    container.on('pointerdown', () => {
        tweenScale(0.96, 80);
        bg.setTint(0xd0d0d0);
        diag.log('button_pressed', { id: diagId });
        onClick();
    });
    const release = () => {
        tweenScale(1.0, 120);
        bg.clearTint();
    };
    container.on('pointerup', release);
    container.on('pointerupoutside', release);

    return {
        container, bg, text, width, height,
        setLabel: (s: string) => text.setText(s),
        setEnabled(en: boolean) {
            container.alpha = en ? 1 : 0.5;
            if (en) container.setInteractive({ useHandCursor: true });
            else container.disableInteractive();
        },
    };
}
