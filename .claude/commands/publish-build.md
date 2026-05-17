Genera build production per una piattaforma specifica.

Input arguments: $ARGUMENTS (es: "crazygames" | "poki" | "gamedistribution")

Steps:
1. Verifica che `VITE_PLATFORM={target}` sia gestito correttamente in `src/ads/AdProviderFactory.ts`
2. Esegui `VITE_PLATFORM={target} pnpm build`
3. Controlla la dimensione output: deve essere `<4 MB gzipped`, `<8 MB raw`
4. Se supera, suggerisci ottimizzazioni:
   - Asset compression (tinypng, audio bitrate)
   - Tree-shaking check su Phaser
   - Code splitting per scene
5. Verifica con Playwright che il build serve correttamente da `dist/`:
   - `pnpm preview` su porta 4173
   - Apri con Playwright MCP, screenshot, check console errors
6. Se tutto ok, report finale con: bundle size, file più pesanti, eventuali warning

Non submittare automaticamente alla piattaforma — l'utente fa upload manuale al portale.