# ForgeFit — Zaawansowany dziennik treningowy

Nowoczesna, w pełni funkcjonalna aplikacja webowa do zarządzania treningami siłowymi.

**Repozytorium:** https://github.com/daymonqy/trainforge

## Funkcje (zaimplementowane)

### Rdzeń (Priorytet 1–6)
- **Onboarding** + profil użytkownika (imię, wiek, płeć, wzrost, masa, poziom, cel, częstotliwość, sprzęt)
- **Dashboard** z powitaniem, szybkim startem, statusem regeneracji, ostatnim treningiem, kafelkami
- **Baza ćwiczeń** — 20+ realistycznych ćwiczeń z opisem, instrukcją, błędami, wskazówkami, partiami, sprzętem
- **Własne ćwiczenia** — dodawanie
- **Kreator planów** — tworzenie, edycja, usuwanie, duplikowanie, dni + ćwiczenia + serie + powtórzenia
- **Live Workout** — pełny przepływ:
  - wybór planu / pusty trening / szybkie splity (Push/Pull/Legs/Full)
  - zapis serii: ciężar, powtórzenia, RIR, RPE, RIP, typ serii
  - timer przerwy z +/−30 s i pominięciem
  - dodawanie/usuwanie serii i ćwiczeń
  - anulowanie / zakończenie
- **Historia treningów** + podsumowanie (czas, serie, powtórzenia, tonnage, zaangażowanie mięśni, rekordy)
- **Automatyczne rekordy osobiste** (ciężar / powtórzenia)

### Dodatkowe (Priorytet 7–10)
- **Kalkulator obciążenia** — rozkład talerzy na stronę + szacowane 1RM (Epley)
- **Zaangażowanie mięśni** — serie bezpośrednie + pośrednie po treningu
- **Regeneracja** — estymata % na partię (na podstawie objętości, czasu, modelu half-life)
- **„Czy mogę dziś trenować?”** — dane pomocnicze bez automatycznej decyzji
- **Postęp** — statystyki łączne, rekordy, objętość tygodniowa
- **Sugestie ciężaru** na podstawie historii + RIR

### UX
- Ciemny, nowoczesny interfejs (własny system kolorów — teal/forge)
- Responsywny, zoptymalizowany pod telefon
- Dolna nawigacja mobilna
- Puste stany z zachętą do działania
- Dane zapisywane w `localStorage` (działa offline)

## Uruchomienie

```bash
git clone https://github.com/daymonqy/trainforge.git
cd trainforge
npx serve .
# lub python -m http.server 3000
```

Otwórz http://localhost:3000

### GitHub Pages
Settings → Pages → Source: branch `main` → folder `/ (root)`

## Struktura

```
├── index.html
├── css/styles.css
├── js/
│   ├── app.js      # Routing, views, events
│   ├── store.js    # Stan + localStorage + logika
│   └── data.js     # Seed ćwiczeń, mięśnie, stałe
└── README.md
```

## Model danych

```
Profil → Sprzęt → Plan → Start treningu
       ↓
Live Workout → Serie (ciężar, powt, RIR, RPE, RIP, typ)
       ↓
Historia → Tonnage → Zaangażowanie mięśni → Regeneracja
       ↓
Rekordy + Sugestie ciężaru → Kolejny trening
```

## Ważne uwagi

- Status regeneracji to **estymata treningowa**, nie pomiar medyczny.
- 1RM to **przybliżenie** (wzór Epleya).
- Sugestie ciężaru nie są poradą medyczną.
- Wszystkie dane są lokalne w przeglądarce.

---

**ForgeFit** — PLAN → TRENING → SERIE → RIR/RPE → OBJĘTOŚĆ → REGENERACJA → PROGRES → KOLEJNY TRENING
