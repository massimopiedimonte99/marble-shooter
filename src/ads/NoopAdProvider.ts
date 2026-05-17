import type { IAdProvider } from '@/ads/IAdProvider';

export class NoopAdProvider implements IAdProvider {
    showInterstitial(): Promise<void> {
        return Promise.resolve();
    }

    showRewarded(): Promise<boolean> {
        return Promise.resolve(true);
    }

    showBanner(): void {}

    hideBanner(): void {}
}
