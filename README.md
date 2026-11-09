# Moj proračun

Tim DELTA · Datathon Portala otvorenih podataka · Izazov C — Gospodarstvo i učinkovito upravljanje

Moj proračun građanima, udrugama i novinarima olakšava pronalaženje promjena u gradskim proračunima Zagreba, Splita, Rijeke i Osijeka. Usporedba vodi od početnog plana i rebalansa do pojedine stavke i njezina službenog izvora.

## Isprobajte

- [Otvori zagrebački rebalans](https://moj-proracun-delta.vercel.app/?grad=zagreb&godina=2025&verzija=zagreb-2025-1)
- [Paket s videom i uputama](https://github.com/barebucan/dataton-moj-proracun-demo/releases/tag/predaja)

Odaberite grad, godinu i proračunski dokument. Otvorite stavku Zagrebačkog električnog tramvaja i pogledajte promjenu i izvor. **Zanimljivosti** daju kontekst, a **Za mene** izdvaja stavke povezane s odabranom skupinom građana.

## Struktura i objava

| Mjesto | Sadržaj |
|---|---|
| `index.html` | Ulaz u statičko sučelje |
| [wp-content](wp-content) | Aplikacijski JavaScript, CSS i pripremljeni proračunski podaci |
| `build.mjs` | Priprema statičkih datoteka za objavu |
| `vercel.json` | Postavke javne objave |

Službeni planovi i rebalansi pretvoreni su u usporedive zapise. Registar povezuje grad, godinu i dokument. Sučelje učitava sažetak i detaljne stavke te zadržava poveznicu na službeni dokument ili pripadajući redak. Za pripremu objave pokrenite `node build.mjs` uz Node.js s ugrađenim `fetch`, `tar` i internetsku vezu.

[Izvori i struktura podataka](docs/PODACI.md) · [Licenca koda](LICENSE.txt)
