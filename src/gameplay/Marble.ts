import { GameObjects } from 'phaser';
import { MARBLE_RADIUS } from '@/constants/Config';
import { AssetKeys } from '@/constants/AssetKeys';
import { MarbleColor, MARBLE_COLOR_HEX } from '@/gameplay/MarbleColor';
import type { LinkedListNode } from '@/utils/LinkedList';

export class Marble extends GameObjects.Sprite {
    public marbleColor: MarbleColor = MarbleColor.RED;
    public node: LinkedListNode<Marble> | null = null;

    // Posizione logica sulla path (usata dalle collisioni). Lo sprite x/y può
    // discostarsene durante il "settle" d'inserimento, ma trueX/trueY no.
    public trueX = 0;
    public trueY = 0;

    // settleT: 1 = pieno offset verso il punto d'impatto, 0 = fermo nello slot.
    public settleT = 0;
    private _settleFromX = 0;
    private _settleFromY = 0;

    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0, AssetKeys.MARBLE_MASTER);
        this.setDisplaySize(MARBLE_RADIUS * 2, MARBLE_RADIUS * 2);
    }

    beginSettle(fromX: number, fromY: number): void {
        this._settleFromX = fromX;
        this._settleFromY = fromY;
        this.settleT = 1;
    }

    setColor(color: MarbleColor): this {
        this.marbleColor = color;
        this.setTint(MARBLE_COLOR_HEX[color]);
        return this;
    }

    getColor(): MarbleColor {
        return this.marbleColor;
    }

    setPathT(t: number, path: Phaser.Curves.Path, out: Phaser.Math.Vector2): this {
        path.getPoint(t, out);
        this.trueX = out.x;
        this.trueY = out.y;
        if (this.settleT > 0) {
            this.setPosition(
                out.x + (this._settleFromX - out.x) * this.settleT,
                out.y + (this._settleFromY - out.y) * this.settleT,
            );
        } else {
            this.setPosition(out.x, out.y);
        }
        return this;
    }
}
