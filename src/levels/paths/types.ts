export interface PathTemplate {
    id: string;
    name: string;
    build: () => Phaser.Curves.Path;
}
