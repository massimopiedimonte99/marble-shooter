export interface IAdProvider {
    showInterstitial(): Promise<void>;
    showRewarded(): Promise<boolean>;
    showBanner(): void;
    hideBanner(): void;
}
