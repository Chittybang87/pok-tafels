# Pokétafels

Maaltafels oefenen door Pokémon te vangen. Voor thuisgebruik (familie-fanproject).

## Starten

```bash
npm install
npm run dev
```

## Functies

- Starter kiezen (Bulbasaur / Charmander / Squirtle)
- Maaltafels **0 t/m 10** één voor één aan/uit in Instellingen
- Gevecht: kies Pokémon op type (sterkte/zwakte); juiste som = schade; fout = schade aan jouw Pokémon
- Vangen met Pokébal-animatie
- Herstellen door extra maaltafels
- Pokédex met Gen 1 (151)
- Offline / tablet: PWA — eenmaal online openen (of installeren), daarna speelbaar zonder internet

## Live / installeren

- Vercel: https://poketafels.vercel.app
- GitHub Pages: https://chittybang87.github.io/pok-tafels/ (bij elke push naar `main`)

## Offline op tablet

1. Open de live site **een keer met wifi** (sprites en app worden gecached).
2. Tik op **App installeren** op het startscherm (Android), of op iPhone/iPad: knop → Delen → **Zet op beginscherm**.
3. Alternatief: browser-menu → App installeren / Toevoegen aan startscherm.
4. Daarna werkt de app zonder verbinding; voortgang blijft in de browser bewaard.
