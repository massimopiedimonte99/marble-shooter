Crea un nuovo livello per il marble shooter.

Input arguments: $ARGUMENTS (es: "5 spiral medium" significa level 5, path a spirale, difficoltà media)

Steps:
1. Leggi `docs/level-format.md` per lo schema JSON corrente (se non esiste, chiedi all'utente di definirlo prima di procedere)
2. Leggi un livello esistente in `src/levels/` come reference
3. Crea `src/levels/level-{N}.json` con:
   - Path (formato Phaser.Curves.Path serializzato)
   - Sequenza marble (lunghezza in base a difficoltà: easy 40, medium 60, hard 80)
   - Distribuzione colori (3 colori per easy, 5 per medium, 7 per hard)
   - Speed curve della catena (accelera nel tempo)
   - Spawn timing
4. Registra in `src/levels/index.ts` (array di livelli)
5. Se esiste `pnpm test:level`, esegui `pnpm test:level {N}` per validare lo schema

Non commitare automaticamente. Lascia che l'utente verifichi visivamente con Playwright MCP prima.