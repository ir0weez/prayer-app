# PrayerCircle Mobile Interface Design

This design plan is based on inspection of the provided APK. The source app identifies itself as **PrayerCircle**, uses a purple praying-hands launcher icon, and contains strings and state keys that point to a local prayer relationship tracker. The rebuilt app should therefore feel like a calm, first-party iOS companion for remembering people, logging prayers, and acting on gentle reminders.

## Screen List

| Screen | Primary Content and Functionality | Layout Direction |
|---|---|---|
| Home | A daily overview, prayer streak, “Time to reach out!” prompt, and highlighted people to pray for. | A scrollable portrait dashboard with a soft purple header, rounded cards, and lower-screen quick actions for one-handed use. |
| People | A list of people in the user’s prayer circle, including name, relationship, birthday badge, last prayed date, and reminder status. | iOS-style grouped list cards with initials avatars, relationship chips, and swipe-free visible actions. |
| Person Profile | A selected person’s name, relationship, birthday, last prayed status, prayer prompt, reminder settings, and journal preview. | Large profile header, prayer action button, reminder rows, and journal card stacked vertically. |
| Journal | Prayer journal entries, recent notes, empty state, and add-entry affordance. | Readable card list with dates, short excerpts, and a bottom-friendly add button. |
| Reminders | Personal prayer reminders, frequency, reminder time rows, and completion state. | Compact settings-like rows with status pills and clear toggles where appropriate. |
| Settings | App information, theme palette preview, notification preferences, and version information. | Native grouped settings rows; no user account or cloud sync unless explicitly requested. |

## Primary Content and Functionality

The APK’s bundle strings include **“Pray for the people you love,” “Time to reach out!,” “View thread,”** and **“Birthday today!”**. Internal state names also reference prayer people, person reminders, journal entries, daily streaks, profile relationship, profile birthday, profile last-prayed state, reminder frequency, and reminder time rows. The rebuild should implement these concepts with local deterministic sample data so the app feels complete without requiring account setup.

| Content Area | Data and UI Elements | Required Behavior |
|---|---|---|
| Daily prompt | Greeting, daily streak count, and “Time to reach out!” message. | The primary prompt should be visually prominent and tappable. |
| People cards | Initials, name, relationship, birthday or due badge, last-prayed text, and short prayer intention. | Tapping a card opens the person profile. |
| Quick check | A “Prayed today” or quick-check button that updates visible status locally. | Button press should provide immediate feedback and update the card state. |
| Journal preview | Recent prayer notes and “View thread” affordance. | The journal screen should show entries and a clear empty state when no entries exist. |
| Reminder rows | Frequency, reminder time, and notification-style state. | Local UI should make reminder intent clear even if real scheduling is not enabled yet. |
| Settings | Version row, theme row, and notification row. | Rows should be informational and avoid dead-end actions. |

## Key User Flows

| Flow | Step-by-Step Path |
|---|---|
| Pray for someone today | User opens Home → sees “Time to reach out!” prompt → taps a highlighted person → Person Profile opens → user taps quick prayer action → last-prayed and streak state update locally. |
| Review someone’s prayer history | User opens People → selects a person → reads journal preview → taps “View thread” → Journal opens filtered around that person’s entries. |
| Add a prayer note | User opens Journal → taps Add Entry → enters a short note in an inline composer or modal-like card → note appears at the top of the journal list. |
| Handle birthday prompt | User opens Home or People → sees “Birthday today!” badge → taps the person → profile suggests reaching out and praying for them. |
| Adjust reminders | User opens Reminders or a Person Profile → reviews reminder frequency and time → toggles or edits local reminder settings. |

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
