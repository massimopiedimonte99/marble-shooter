Aggiunge un nuovo power-up al gioco.

Input arguments: $ARGUMENTS (es: "freeze" — il nome del power-up da implementare)

Steps:
1. Leggi `docs/GDD.md` sezione "Power-ups" per assicurarti che il power-up sia stato concepito
2. Leggi `src/powerups/SlowMotion.ts` come reference implementation
3. Crea `src/powerups/{Name}.ts` che estende `BasePowerup`
4. Registra in `src/powerups/PowerupRegistry.ts`
5. Aggiungi entry in `src/constants/AssetKeys.ts` per l'icona
6. Aggiungi sound trigger in `docs/AUDIO.md` (chiedi all'utente la categoria sound)
7. Mostra un piano sintetico all'utente PRIMA di scrivere codice
8. Aspetta conferma

Non implementare l'icona grafica — solo logica e wiring. L'asset visivo verrà generato separatamente.