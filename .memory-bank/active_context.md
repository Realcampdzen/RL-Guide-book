# Active Context

## State of the Project (Deep Sync)
- **Production Mechanics:** Sprints M1 through M17 are **100% COMPLETE**.
- **Modernization (April 2026):** Project successfully migrated to **React 19, TypeScript 5.8**, and globally auto-formatted using **Biome.js**.
- **React Refactoring:** The Strangler Fig refactoring of monolithic React components (`ProfileView`, `PersonalCabinet`, `TeamDashboard`) is **COMPLETED up to Phase 7**. Countless containers (Bro, Workshop, Parents, Organizer) were extracted and merged to `main`. (Note: Biome formatting expanded line counts, but state logic is decentralized).

## State of the Architecture (Deep Sync)
- **Data Layer:** The "God Hook" (`useDataLoader.ts`) has been successfully decomposed into domain-specific hooks (`useCoreBadges`, `useCommunityBadges`, etc.) and the application is now wrapped in a Singleton `DataContext` eliminating duplicate API calls.
- **CSS Architecture:** The monolithic `profile-view-spaceship.css` has been successfully sliced into 14 independent domain CSS modules (Strangler Fig pattern complete). Stacking context bugs (`RoleSelectionModal` bleeding layers) have been resolved.

## Current Focus (Pending User Input)
The core React and State Management refactoring phases are complete. Our remaining technical debt points include:
- **Consolidating feature branches:** Merging the `feature/refactor-*` branches into `main` safely.
- **Backend Infrastructure:** Auditing Python apps (Tariff Calculator, etc.) and closing server-side technical debt.
