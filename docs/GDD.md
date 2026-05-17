# Game Design Document — Marble Shooter

## Concept
[Placeholder] Marble shooter casual mobile-friendly. Tema: TBD (jungle / underwater / space / gems).

## Core loop
1. Catena di marble colorate scorre lungo un path
2. Giocatore tap → sparatore lancia una marble del colore preview
3. Match 3+ stesso colore → esplodono, score, chain reaction possibile
4. Catena raggiunge il drain → game over

## Win condition
Tutta la catena svuotata prima del drain.

## Difficoltà
- Numero colori (3-7)
- Lunghezza catena (40-80 marble)
- Speed curve catena
- Path complexity

## Power-ups
- Slow motion
- Color bomb
- Reverse
- Aim laser
- Color converter
- Backtrack

## Economy
- Coin: drop da match, completion bonus, daily login, rewarded ad
- Gem: rare drop, IAP, daily wheel
- Spend: power-up consumabili, cosmetici (skin marble, skin shooter)

## Monetization placements
- Interstitial midgame: tra livelli (gestito da SDK)
- Rewarded: continue, pre-level power-up, 2x rewards, daily wheel reroll
- Banner: menu, world map, level select
- IAP: Remove Ads + starter pack (€3.99)

## World structure
3-5 world, 20-30 livelli per world. World 1 free, world successivi sbloccati per progressione (stelle).

## Meta features
- Daily login bonus (7 giorni ciclici)
- Daily wheel (1 spin gratis + 1 via rewarded)
- Daily challenge (livello speciale con reward)