import Phaser from 'phaser';
import { AssetKeys } from '@/constants/AssetKeys';
import { diag } from '@/utils/DiagLogger';

export interface ButtonOptions {
    width?: number;
    height?: number;
    fontSize?: string;
    color?: string;
    diagId?: string;
}

export interface ButtonHandle {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Image;
    text: Phaser.GameObjects.Text;
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
    const width    = opts.width    ?? 280;
    const height   = opts.height   ?? 80;
    const fontSize = opts.fontSize ?? '28px';
    const color    = opts.color    ?? '#ffffff';
    const diagId   = opts.diagId   ?? label.toLowerCase().replace(/\s+/g, '_');

    const bg = scene.add.image(0, 0, AssetKeys.BUTTON_MASTER).setDisplaySize(width, height);
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

    container.on('pointerover', () => { bg.setAlpha(0.85); });
    container.on('pointerout',  () => { bg.setAlpha(1.0);  });
    container.on('pointerdown', () => {
        diag.log('button_pressed', { id: diagId });
        onClick();
    });

    return {
        container, bg, text,
        setLabel: (s: string) => text.setText(s),
        setEnabled(en: boolean) {
            container.alpha = en ? 1 : 0.5;
            if (en) container.setInteractive({ useHandCursor: true });
            else container.disableInteractive();
        },
    };
}
