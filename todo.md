# Project TODO

- [x] Initial project setup
- [x] Inspect provided APK package metadata, resources, strings, and assets
- [x] Extract or recreate visual assets from the APK where legally and technically feasible
- [x] Identify source app screens, navigation structure, colors, typography, and labels
- [x] Update design.md with APK-specific screen and visual findings
- [x] Recreate home screen look and feel
- [x] Recreate prayer schedule or daily prayer view if present in APK
- [x] Recreate prayer reading/detail view if present in APK
- [x] Recreate settings or supporting screens if present in APK
- [x] Add local data/state needed for recreated flows
- [x] Generate custom app icon and copy it to required asset locations
- [x] Update app.config.ts branding fields
- [x] Run type checks and deterministic validation
- [x] Resolve current TypeScript diagnostics if they affect delivery
- [x] Save checkpoint for updated social media feed design
- [x] Fix tab bar styling to match original design
- [x] Filter "Pray Today" section by reminder day of week
- [x] Add helper to determine if person should be prayed for today
- [x] Test and validate reminder-based filtering
- [x] Save checkpoint for tab bar and reminder filtering fixes
- [x] Create person detail screen with prayer items and notes
- [x] Add prayer item data model with urgent flag
- [x] Implement urgent lightning bolt toggle for prayer items
- [x] Show urgent prayer items as speech bubbles on avatars in "Pray Today"
- [x] Update color scheme to match cyan/turquoise aesthetic
- [x] Implement liquid glass tab bar with blur effect
- [x] Test person detail screen navigation and interactions
- [x] Save checkpoint for person detail screen and aesthetic updates
- [x] Start with blank initial data (no pre-filled names)
- [x] Implement proper reminders system with day-of-week selection
- [x] Add FAB button to add new contacts
- [x] Implement date picker for "last reached" button
- [x] Show actual avatars in "Pray Today" section
- [x] Make bell icon purple and functional for reminder settings
- [x] Create contact creation page
- [x] Wire FAB to navigate to contact creation page
- [x] Remove duplicate tab bar (system tab bar is showing)
- [x] Implement floating liquid glass tab bar with blur effect
- [x] Apply Material 3 expressive design language
- [x] Test all new features end-to-end
- [x] Save final checkpoint with all fixes
- [x] Add relationship type field with color coding (Family, Friends, Ministry, Prospect)
- [x] Fix person creation to actually save people to state
- [x] Show color-coded avatars on main page based on relationship type
- [x] Add streak counter in top right of home screen
- [x] Add "prayers left today" counter in top right of home screen
- [x] Save checkpoint with person creation, color coding, and counters
- [x] DEBUG: Fix contact creation not saving (investigate handleAddPerson logic)
- [x] Update background to purple gradient
- [x] Update tab bar to purple with white icons
- [x] Update FAB button to purple
- [x] Add birthday emoji and date display to person cards
- [x] Update header colors to match purple aesthetic
- [x] Save checkpoint with purple styling and contact save fix
- [x] Match People screen to latest screenshot: pale lavender background, compact header, story-style Pray Today row, grouped Family section, white rounded cards, purple People tab
- [x] Match Add Person screen to latest screenshot: top close/save bar, photo placeholder, pill relationship selector, birthday input, prayer notes field
- [x] Add birthday field and prayer note field to person creation state and display birthday text on person cards
- [x] Add realistic sample people/images-inspired placeholders for visual parity while preserving contact creation functionality
- [x] Run TypeScript and Vitest validation after screenshot-matching UI updates
- [x] Save checkpoint after screenshot-matching UI refinement

- [x] Remove screenshot-inspired starter contacts from first-run app state so new downloads start blank
- [x] Ensure empty People and Pray Today states still look intentional and guide users to add a first person
- [x] Validate clean-slate first-run behavior with TypeScript and unit tests
- [x] Save checkpoint after clean-slate first-run update
- [x] Keep Pray Today limited to people with active reminder days only
- [x] Add tappable contact prayer-detail screen matching the provided Prayer page screenshot
- [x] Add urgent lightning toggle on prayer items and show urgent requests as speech bubbles above Pray Today avatars
- [x] Move the floating add button higher so it has more space above the tab bar
- [x] Compact the Add Person form sizing and spacing while preserving the screenshot style
- [x] Enable photo selection from the Add Person photo area and use a plus badge on the small overlay icon
- [x] Make the contact bell open reminder setup with custom days of week and prayer time
- [x] Wire Last Reached to home card progress coloring and support tap-to-today plus long-press custom date
- [x] Validate requested fixes with TypeScript, unit tests, and app health checks
- [x] Save checkpoint after PrayerCircle behavior-fix update
- [x] Move urgent prayer speech bubbles to the Pray Today avatar row on the home screen only
- [x] Replace home contact progress bar with a compact days-since-last-reached bubble matching the screenshot
- [x] Add reminder frequency options for daily, weekly specific days, and monthly specific day reminders
- [x] Fix Pray Today avatar rendering after reminders are configured
- [x] Make the Pray Today plus ring mark that person as prayed for today
- [x] Count streak progress when every Pray Today person has been prayed for
- [x] Ensure daily prayer completion resets each day while reminder-based visibility remains date-specific
- [x] Validate updated reminder and streak behavior with tests and app health checks
- [x] Save checkpoint after Pray Today refinement update
- [ ] Remove a person from Pray Today after their plus ring completion feedback finishes
- [x] Update the top prayed-today counter immediately as Pray Today people are completed
- [ ] Enlarge Pray Today avatar pictures to match the screenshot scale
- [ ] Shift urgent speech bubbles to the right side of Pray Today avatars
- [x] Make home contact days-since bubbles fill from 1 to 14 days, with 0 days empty
- [x] Make tapping Last Reached on the contact page set today's date
- [x] Standardize visible dates across PrayerCircle as MM-DD-YYYY
- [x] Validate final Pray Today completion, date, and progress-bubble refinements
- [ ] Save checkpoint after final PrayerCircle polish update
- [x] Compact home-screen layout sizing to match the provided screenshots
- [x] Fix contact page navigation for all relationship categories (Family, Friends, Ministry, Prospect)
- [ ] Enlarge Pray Today avatars to make them more prominent
- [ ] Reposition urgent speech bubbles to the upper-right of avatars instead of center
- [ ] Hide the entire Pray Today section when there are no prayers scheduled for the day
- [ ] Remove avatars from Pray Today after check animation completes (keep the animation)
- [x] Update prayer count at top-right in real-time as prayers are marked off
- [x] DEBUG: Fix Friends category contacts not opening the contact page (Family works, Friends doesn't)
- [x] Validate Pray Today refinements and Friends routing fix
- [ ] Save checkpoint after Pray Today polish and Friends routing fix
- [x] Change contact-page bell action to an Edit button
- [x] Rename contact-page Mark Reached Today to Mark as Prayed
- [x] Make Mark as Prayed mark all prayer requests prayed for today and turn green as Prayed Today
- [x] Make top-right prayer counter start at today’s scheduled people count and count down as Pray Today people are checked off
- [x] Improve blank avatar styling to match the provided screenshots more closely
- [x] Redesign the bottom tab bar with a more transparent frosted style
- [x] Move the floating add button next to the tab bar rather than above it
- [x] Make reached-out progress bars start empty at 0 days and fill over the following days
- [x] Validate contact actions, Pray Today counter, tab bar layout, and progress behavior
- [x] Save checkpoint after contact and home refinements
- [x] Decouple reached-out progress bars from Mark as Prayed / Pray Today completion
- [x] Ensure reached-out progress updates only when an individual contact's reached date changes
- [x] Add an undo countdown after tapping the Pray Today avatar plus button
- [x] Remove Pray Today avatars only after the undo countdown completes
- [x] Add to the flame streak only after the entire Pray Today area is completed
- [x] Remove Prayer Notes from contact creation and contact detail surfaces
- [x] Refine bottom tab bar to better match the provided frosted pill screenshot
- [x] Redesign Settings to match the provided card-based screenshot
- [x] Add app-wide color theme selection with multiple theme choices
- [x] Add a personal profile card above the Settings stats card
- [x] Add fasting streak display to the Settings profile card
- [x] Validate PrayerCircle progress, undo countdown, settings theme, and profile fasting refinements
- [x] Save checkpoint after PrayerCircle progress, settings, and profile refinement pass
- [ ] Redesign Pray Today undo countdown to feel more unique and fluent with the app design
- [x] Make relationship selector pills highlight with relationship-specific colors when selected
- [ ] Reposition the add-contact profile-photo plus button to the bottom-right corner of the picture
- [ ] Make main contact progress pill turn yellow at 7 days and red at 14 days
- [x] Make contact-card Edit open true contact editing rather than reminder editing
- [x] Preserve reminder editing separately through the existing reminder control
- [x] Add a trash/delete button next to Save when editing a contact
- [x] Add a trash button next to the save action when editing a person so the person can be deleted safely.
- [x] Add delete-contact confirmation and remove deleted contacts from persisted people state
- [x] Add an edit button to the Settings Your Profile card
- [x] Allow profile name editing and profile photo selection
- [x] Make tapping the Settings profile card open a profile detail/contact-style screen
- [x] Remove the separate Profile and Fasting section from Settings
- [x] Add fasting summary fields under the Settings stats area
- [x] Add quick successful-day button and long-press status chooser for fasting tracking
- [x] Add personalized fast setup flow inspired by the provided Start a New Fast screenshots
- [x] Add fasting type, duration, focus list, and create-fast behavior using icons instead of emoji where practical
- [x] Add profile detail view with active fasts, personal prayers, and fasting calendar
- [x] Allow individual fasting days to be marked completed, skipped, or missed
- [x] Calculate fasting streak so completed adds, skipped preserves, and missed resets to 0
- [x] Hide the FAB on non-People tabs if feasible in the current tab structure
- [x] Validate undo, contact editing/deletion, progress thresholds, profile, and fasting changes
- [ ] Save checkpoint after PrayerCircle polish, contact editing, and fasting profile update

- [x] Fix newly created contact profile-card taps that show Person not found.
- [x] Remove initials editing from the person edit flow.
- [x] Add profile photo update support inside the person edit flow.
- [x] Highlight relationship selector options with their relationship-specific colors during contact creation and editing.
- [x] Update birthday entry guidance and display to MM-DD-YYYY.
- [x] Add Settings Your Profile edit button for profile name and profile picture.
- [x] Make tapping the Settings profile card open a personal profile detail screen.
- [x] Add personal prayers and active fast list to the profile detail screen.
- [x] Add a Start a New Fast flow with fast name, start date, duration choices, fast type, focus list, and create-fast behavior.
- [x] Replace fasting setup emoji examples with app iconography where practical.
- [x] Add fasting calendar tracking with completed, skipped, and missed daily statuses.
- [x] Calculate fasting streak so completed adds, skipped preserves, and missed resets.
- [x] Remove the separate Profile and Fasting section from Settings.
- [x] Add fasting type, fasting length, and quick successful-day or long-press status control under Settings stats.
- [x] Show fasting calendar and current fasting focus list from the personal profile/streak area.
- [x] Hide the floating add button on tabs other than People if feasible.
- [x] Change contact edit birthday input guidance and validation from MM-DD-YYYY to MM/DD/YYYY.
- [x] Move the contact edit profile-picture editor to the top of the edit page.
- [x] Move Settings fasting information into the profile card and prayer-information area.
- [x] Restore a fasting streak pill in the Settings profile card.
- [ ] Change fasting focus into an editable fasting list with to-do-list style behavior.

- [x] Fix avatar ring colors in Pray Today section to match relationship-type colors (not just avatar fill).
- [x] Fix date timezone issue: "Last Reached" button marks next day instead of today (device date mismatch).

- [x] Add fast editing modal to allow users to modify fast details (name, start date, duration, type, focus items).
- [x] Allow custom start date input for fasts (not just today).
- [x] Fix streak pill visibility by removing Edit button and making profile picture/name directly editable inline.
- [x] Add delete fast function with confirmation dialog.

## Settings Refactor & Fast Features (Priority)

- [x] Fix streak pill overflow from profile card (layout/spacing issue)
- [x] Add edit and delete buttons to fast editor modal
- [x] Move fast summary card info into the stats row (People/Prayed Today/Reminders)
- [x] Remove separate fast summary card from Settings
- [x] Implement fasting focus as interactive to-do list (add/remove/check items)
- [x] Fix calendar date alignment to match actual calendar dates (already fixed with timezone fix)
- [x] Implement system dark mode detection and proper theme switching

- [x] Add delete icon (trash) to top right of fast profile screen

## Profile Card Redesign (Settings)

- [x] Make profile card white background and increase vertical height
- [x] Move streak pill to the right side of the card
- [x] Remove "Tap for your prayer and fasting Profile" subtitle text
- [x] Add birthday display under the name
- [x] Add "Fast" pill button to access fast profile

## Urgent Fixes

- [x] Reconnect profile card to stats bar (should be one unified card)
- [x] Change stats bar to show "Fasting" stats instead of People/Prayed Today/Reminders
- [x] Fix trash icon on fast profile screen (should be red trashcan, not question mark)
- [x] Fix alignment/spacing issues in profile card and stats bar

## Timezone Issues

- [x] Audit all date calculations to use local timezone consistently
- [ ] Add timezone setting to Settings page (manual offset adjustment)
- [x] Ensure "Last Reached" dates match device date, not UTC

- [x] Update Settings fasting stats to show Completed (Green)/Skipped (Yellow)/Missed (Red) instead of Streak/Completed/Days

- [x] Fix fasting streak pill in Settings profile card to show fasting streak instead of prayer streak

- [x] Fix "Pray Today" section to show all scheduled prayers (currently stops at 8 contacts)

- [x] Change Settings profile card buttons: "Profile" → "Fast", edit icon → "Prayer" text button

- [x] Change fasting profile top-right button: edit icon when fast exists, plus icon when no fast

- [x] Create personal prayer page (for user's own prayers, like contact prayer pages)
- [x] Update "Prayer" button to navigate to personal prayer page

## Fast Editor Modal Completion (Current)

- [x] Update modal close handlers (onRequestClose, backdrop, close button) to reset isEditingFast
- [x] Update createFast function to handle edit mode (update existing fast instead of creating new)
- [x] Update modal title to show "Edit Fast" or "Start a New Fast" based on edit mode
- [x] Update save button text to show "Save Fast" or "Create Fast" based on edit mode
- [x] Write unit tests for fast creation and editing logic
- [x] Verify all tests pass (41 passed, 1 skipped)
- [ ] Test fast editing end-to-end (open existing fast, edit details, save changes)
- [ ] Test fast creation still works (no existing fast, create new one)
- [ ] Verify modal closes properly and resets state after save or cancel
