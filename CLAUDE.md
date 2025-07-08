# Studio X - Claude Code Project Standards

## Stack & Architecture

### Frontend (Web)
- **Framework:** React 18 with TypeScript (strict mode)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix UI)
- **Icons:** Lucide React
- **Routing:** React Router v6
- **State:** React Context API
- **Forms:** react-hook-form
- **Utilities:** clsx

### Backend
- **Primary:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Alternative:** Firebase (for legacy projects)
- **API Design:** REST/GraphQL with API-first principle

### Mobile Development
- **Cross-platform:** React Native with Expo (EAS Build, OTA updates)
- **iOS Native:** Swift 6+ with SwiftUI
- **Android Native:** Kotlin
- **Alternative:** Flutter with Material Design 3

## Project Standards

### Code Requirements
- TypeScript strict mode is always enabled
- Component-based architecture with hooks
- Modular folder structure
- Mobile-first responsive design
- PWA-ready where applicable

### Localization
- **Default:** English (en)
- **Secondary:** Norwegian Bokmål (nb)
- UTF-8 encoding throughout
- All strings externalised from day one

### Security & Privacy
- Environment variables for secrets (.env)
- Role-based access control
- GDPR compliance by design
- Never commit secrets to the repository

## Development Workflow

### Project Structure
```
src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── common/      # Shared components
├── pages/           # Route components
├── hooks/           # Custom hooks
├── contexts/        # Context providers
├── services/        # API/external services
├── utils/           # Helper functions
├── types/           # TypeScript types
├── locales/         # i18n files (en.json, nb.json)
└── assets/          # Images, fonts, etc.
```

### Always Maintain
- **Changelog.txt** - Update for every change with format:
  `[YYYY-MM-DD] - <description> (commit: <hash>)`

### Testing Strategy
- **Unit Tests:** Jest + React Testing Library
- **E2E Tests:** Playwright (web) / Detox (mobile)
- **Coverage:** 80%+ overall, 90%+ for business logic
- **Linting:** ESLint + Prettier

### Performance Targets
- **Web:** Lighthouse 90+, Core Web Vitals compliant
- **Mobile:** Cold start < 3 seconds
- **API:** Critical endpoints < 200ms

## CLI Commands & Setup

### New Project Checklist
1. Initialise with a proper package.json
2. Configure TypeScript strict mode
3. Set up ESLint + Prettier
4. Create folder structure
5. Initialise Git with .gitignore
6. Set up environment variables
7. Create localisation files
8. Configure build/deploy scripts

### Preferred Tools
- Use CLI over GUI for all operations
- Supabase CLI for backend operations
- EAS CLI for Expo builds
- Git CLI for version control

## Deployment

### Web
- **Hosting:** Vercel, Firebase Hosting, or AWS Amplify
- **CI/CD:** Automated testing and deployment on merge

### Mobile
- **iOS:** EAS Build or Xcode Cloud
- **Android:** EAS Build or Google Play Console
- **Updates:** OTA updates via Expo

## Communication Style
- Direct and actionable responses
- Complete, runnable code examples
- CLI commands for all operations
- Include error handling and loading states
- TypeScript types for all code

## Documentation & Context

### Context7 Integration
For up-to-date documentation access, use Context7:
- Visit https://context7.com to generate documentation contexts
- Add relevant libraries for this project's stack
- Include generated contexts in prompts for accurate API references

### Key Documentation Sources
- React 18: Latest hooks and features
- Supabase: Current API methods and best practices
- Expo SDK: Updated modules and APIs
- TypeScript: Recent type features
- Tailwind CSS 4: New utilities and features

## Project-Specific Notes
Add project-specific requirements, API endpoints, or special configurations here as needed.