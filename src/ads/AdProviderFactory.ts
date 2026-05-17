import type { IAdProvider } from '@/ads/IAdProvider';
import { NoopAdProvider } from '@/ads/NoopAdProvider';

function createAdProvider(): IAdProvider {
    // TODO Fase 5: switch su import.meta.env.VITE_PLATFORM
    return new NoopAdProvider();
}

export const adProvider = createAdProvider();
