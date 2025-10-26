# Lønberegning - Mobilapp

Flutter mobilapp til tidsregistrering for chauffører under Transport- og Logistikoverenskomsten.

## Features

### ✅ Implementeret

**Core Features:**
- **Start/Stop Arbejde**: Store intuitive knapper til at starte og afslutte arbejdsdagen
- **Pause & Hvil**: Quick actions til at registrere pause og hvileperioder
- **Live Timer**: Real-time opdatering af arbejdstid og pause
- **Smart Validering**: Automatisk tjek for påkrævet pause baseret på overenskomsten
  - 30 min pause ved 6+ timers arbejde
  - 45 min pause ved 9+ timers arbejde
- **End Day Wizard**: Intelligent wizard ved dagens afslutning der:
  - Advarer hvis pause mangler
  - Tillader manuel tilføjelse af glemte pauser
  - Viser oversigt før bekræftelse
- **Break Tracking**: Fuld historik over pauser med start/slut tidspunkter
- **Status Indicators**: Farvekodet status (Grøn=I gang, Orange=Pause, Grå=Ikke startet)
- **Navigation Drawer**: Sekundære features pakket væk (historik, lønkvitteringer, indstillinger)

**Advanced Features:**
- **GPS Location Service**: Automatisk detection af work type baseret på lokation
  - Terminal, Lager, eller Kørsel
  - Foruddefinerede arbejdsplaceringer
  - Distance-based detection (200m radius)
- **Offline Database**: SQLite lokal database for offline support
  - Gem tidsregistreringer lokalt
  - Sync når internet er tilgængeligt
  - Unsynced entries tracking
- **History Screen**: Komplet historik med kalender
  - Måneds kalender visning
  - Event markers på dage med registreringer
  - Detaljeret liste pr. dag
  - Status badges (Godkendt/Afventer/Afvist)
- **Push Notifications**: Basic notification support
  - Påmindelser om manglende registreringer
  - Status opdateringer

### 🚧 Næste Features

- Fuld offline sync manager med conflict resolution
- PDF lønkvitteringer med export/share
- Biometri authentication (Face ID/Fingerprint)
- Dark mode
- Multi-language support
- Background location tracking for automatisk start/stop

## Arkitektur

### State Management
- **Provider**: Til reaktiv state management
- **WorkSessionProvider**: Håndterer dagens arbejdssession med real-time updates
- **AuthService**: Authentication flow

### Services
- **TimeEntryService**: API integration til tidsregistreringer
  - Start/stop arbejde
  - Start/stop pause
  - Manuel pause tilføjelse
  - Hent dagens registreringer

### Models
- **TimeEntry**: Data model for tidsregistreringer med:
  - Start/slut tidspunkt
  - Break periods array
  - Automatisk beregning af arbejdstid og pause
  - Validering af påkrævet pause
- **BreakPeriod**: Model for pauser med type (BREAK/REST)

## UX Principper

### Primær Flow
1. **Stor "Start Arbejde" knap** - Første ting chaufføren ser
2. **Live timer** - Viser hvor længe de har arbejdet
3. **Quick actions** - Pause og Hvil knapper let tilgængelige
4. **"Slut Arbejde" knap** - Trigger wizard hvis noget mangler

### Smart Assistance
- **Automatisk validering**: Systemet advarer hvis pause mangler
- **Wizard flow**: Guider brugeren gennem manglende data
- **Visual feedback**: Farver og ikoner viser status tydeligt
- **Minimal indtastning**: Så lidt som muligt skal indtastes manuelt

## Installation

```bash
# Install dependencies
cd mobile
flutter pub get

# Run app
flutter run
```

## Konfiguration

API endpoint er sat i `lib/services/time_entry_service.dart`:
```dart
static const String baseUrl = 'https://lonberegner-62a2db4ebd03.herokuapp.com/api/v1';
```

## Overenskomst Implementering

Appen følger reglerne fra Transport- og Logistikoverenskomsten:

- **Pause krav**:
  - 30 min ved 6-9 timers arbejde
  - 45 min ved 9+ timers arbejde
- **Hvileperioder**: Tracking af hvil mellem vagter
- **Arbejdstyper**: Kørsel, Terminal, Lager

## Kommende Features

### Næste Sprint
- GPS integration for automatisk lokation
- Offline mode med lokal SQLite database
- Push notifikationer for manglende registreringer
- Detaljeret historik med kalender

### Fremtidige Features
- Lønkvitteringer direkte i appen
- Export til PDF
- Multi-language support
- Dark mode
- Biometri login (Face ID / Fingerprint)

## Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1         # State management
  http: ^1.1.2            # HTTP client
  dio: ^5.4.0             # Advanced HTTP client
  shared_preferences: ^2.2.2  # Local storage
  intl: ^0.18.1           # Date/time formatting
  go_router: ^13.0.0      # Navigation
```

## Development Notes

### Adding New Features
1. Update models in `lib/models/`
2. Add service methods in `lib/services/`
3. Update provider in `lib/providers/`
4. Create/update UI in `lib/screens/`

### Testing
```bash
flutter test
```

### Building
```bash
# Android
flutter build apk --release

# iOS
flutter build ios --release
```
