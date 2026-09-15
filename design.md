# PrayerCircle Mobile Interface Design

This design plan is based on inspection of the provided APK. The source app identifies itself as **PrayerCircle**, uses a purple praying-hands launcher icon, and contains strings and state keys that point to a local prayer relationship tracker. The rebuilt app should therefore feel like a calm, first-party iOS companion for remembering people, logging prayers, and acting on gentle reminders.

## Screen List

| Screen | Primary Content and Functionality | Layout Direction |
|---|---|---|
| Home | A daily overview, prayer streak, “Time to reach out!” prompt, and highlighted people to pray for. | A scrollable portrait dashboard with a soft purple header, rounded cards, and lower-screen quick actions for one-handed use. |
| People | A list of people in the user’s prayer circle, including name, relationship, birthday badge, last prayed date, and reminder status. | iOS-style grouped list cards with initials avatars, relationship chips, and swipe-free visible actions. |
| Person Profile | A selected person’s name, relationship, birthday, last prayed status, prayer prompt, reminder settings, and journal preview. | Large profile header, prayer action button, reminder rows, and journal card stacked vertically. |
| Journal | Dated prayer entries with optional tagged contacts, bookmarks, chronological replies, deletion, bookmark filtering, and entry/reply composers. | Entries are grouped under readable date headings in rounded cards. A paired bookmark filter and add button remain in the top-right, while modal sheets provide focused writing flows. |
| Reminders | Personal prayer reminders, frequency, reminder time rows, and completion state. | Compact settings-like rows with status pills and clear toggles where appropriate. |
| Settings | App information, theme palette preview, notification preferences, and version information. | Native grouped settings rows; no user account or cloud sync unless explicitly requested. |

## Primary Content and Functionality

The APK’s bundle strings include **“Pray for the people you love,” “Time to reach out!,” “View thread,”** and **“Birthday today!”**. Internal state names also reference prayer people, person reminders, journal entries, daily streaks, profile relationship, profile birthday, profile last-prayed state, reminder frequency, and reminder time rows. The rebuild should implement these concepts with local deterministic sample data so the app feels complete without requiring account setup.

| Content Area | Data and UI Elements | Required Behavior |
|---|---|---|
| Daily prompt | Greeting, daily streak count, and “Time to reach out!” message. | The primary prompt should be visually prominent and tappable. |
| People cards | Initials, name, relationship, birthday or due badge, last-prayed text, and short prayer intention. | Tapping a card opens the person profile. |
| Quick check | A “Prayed today” or quick-check button that updates visible status locally. | Button press should provide immediate feedback and update the card state. |
| Prayer Journal | Prayer text, entry date, tagged-contact avatar snapshots, bookmark state, dated reply updates, and delete controls. | New entries persist locally, newest dates appear first, bookmark filtering never alters stored entries, and replies remain attached to their parent prayer. |
| Reminder rows | Frequency, reminder time, and notification-style state. | Local UI should make reminder intent clear even if real scheduling is not enabled yet. |
| Settings | Version row, theme row, and notification row. | Rows should be informational and avoid dead-end actions. |
| Schedule Worship | A selected worship album, saved album library, cover art, artist, and optional Spotify link. | One canonical local album library drives the displayed card. Users can import public Spotify metadata, enter details manually, select, edit, open, or delete saved albums without losing newly created data during hydration. |
| Completed grouped todos | Finished grouped tasks summarized by title and completed-step count. | Completing the parent or final subtask collapses the group into a compact finished row placed below active schedule items; marking it incomplete restores it to the active timeline. |

## Key User Flows

| Flow | Step-by-Step Path |
|---|---|
| Pray for someone today | User opens Home → sees “Time to reach out!” prompt → taps a highlighted person → Person Profile opens → user taps quick prayer action → last-prayed and streak state update locally. |
| Review someone’s prayer history | User opens People → selects a person → reads journal preview → taps “View thread” → Journal opens filtered around that person’s entries. |
| Add a prayer note | User opens Journal → taps Add Entry → writes a prayer → chooses its date → optionally selects multiple people → saves → the dated card appears in the correct group. |
| Track a prayer over time | User taps Reply on a journal card → writes an update or answered-prayer note → posts it → the dated reply appears beneath the original prayer. |
| Review important prayers | User bookmarks meaningful entries → taps the bookmark filter in the Journal header → sees only bookmarked entries → taps again to restore the full journal. |
| Handle birthday prompt | User opens Home or People → sees “Birthday today!” badge → taps the person → profile suggests reaching out and praying for them. |
| Adjust reminders | User opens Reminders or a Person Profile → reviews reminder frequency and time → toggles or edits local reminder settings. |
| Manage Worship albums | User opens Schedule → scrolls to Worship → adds an album manually or imports a Spotify link → saves → the album appears immediately → uses the library to switch, edit, or delete albums → optionally opens the saved link. |
| Finish a grouped todo | User checks the group or completes its final subtask → the group collapses → it moves below active schedule items as a compact finished row → tapping the finished row marks it incomplete and returns it to the active timeline. |

## Color Choices

The APK launcher foreground uses a vivid purple praying-hands icon on a white background. The rebuilt palette should preserve that brand memory while using softer surfaces and readable iOS-style contrast.

| Role | Color | Rationale |
|---|---:|---|
| Background | `#F7F2FF` | Very light lavender echoes the APK icon while staying calm for daily use. |
| Primary | `#7C5CFF` | Main purple matches the praying-hands brand direction. |
| Secondary Purple | `#9B7BFF` | Supports gradients, chips, and selected states without overpowering text. |
| Surface | `#FFFFFF` | White cards mirror mainstream iOS grouped surfaces. |
| Foreground | `#241B38` | Deep violet-charcoal keeps text legible and brand-aligned. |
| Muted Text | `#7E748F` | Softer secondary text for dates, relationships, and helper copy. |
| Accent Gold | `#E3B341` | Used sparingly for birthdays, streaks, and warm encouragement. |
| Success | `#3DAA78` | Indicates completed prayer actions and positive status. |

## Mobile Portrait and One-Handed Usage Notes

The app will be designed for **mobile portrait orientation (9:16)** and **one-handed usage**. Primary actions such as quick prayer, add journal entry, and view reminders should sit in the lower half of the screen when possible. Cards should use at least 44-point touch targets, visible press feedback, safe-area spacing, and readable text sizes. Navigation will use simple bottom tabs and visible in-screen actions rather than relying on hidden gestures.

## Implementation Notes

The recreation should use local sample data and in-app state. It should not introduce cloud storage, user authentication, or server-only features because the APK findings do not require them for a faithful first pass. Exact binary decompilation of every React component is not necessary; the deliverable should reproduce the observed product concept, brand, navigation, and interface behavior in a maintainable Expo project.

## Native Splash Screen Direction

The native launch screen uses a single emblem on a deep violet background (`#201334`) so the hand-off from launch into PrayerCircle feels purposeful. The bundled emblem must remain clean at the center, use a true transparent background, and contain no unintended horizontal marks or surrounding artwork; this keeps the splash legible across Android screen sizes.
