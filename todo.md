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

## Focus Items Daily Tracking (Complete)

- [x] Design focus item tracking data structure (pending/completed/missed)
- [x] Update PersonalFast type to include focusItemDailyStatuses
- [x] Implement focus item status persistence in AsyncStorage
- [x] Create focus item UI with tap (green) and long-press (red) handlers
- [x] Complete focus item daily reset logic in profile.tsx useFocusEffect
- [x] Write unit tests for focus item tracking functions (20 tests covering all workflows)
- [x] All 61 tests passing, TypeScript checks clean

## Completion Celebration Feature (New)

- [x] Design completion celebration UI with user avatar and fasting streak
- [x] Implement celebration display in Pray Today section
- [x] Add logic to show celebration only when all prayers are completed
- [x] Ensure celebration persists until next day (resets with daily prayer completion)
- [ ] Test end-to-end completion flow

## Dark Mode System Settings Fix (Complete)

- [x] Investigated current dark mode implementation - found theme provider had followSystem logic but wasn't properly initializing
- [x] Fixed theme provider to properly initialize with system color scheme on app load
- [x] Implemented system settings listener for theme changes - now syncs whenever system color scheme changes
- [x] TypeScript checks clean, ready for testing
- [x] Add delete button to focus items in the fasting editor modal
- [x] Add tap-to-complete fast and hold-to-miss fast on personal profile pic in Pray Today section
- [x] Add undo timer for fast completion/miss actions
- [x] Raise tab bar and FAB up from the bottom of the screen
- [x] Increase tab bar transparency to match the original design
- [x] Make settings cards smaller and more compact to match original design
- [x] Make streak count in Settings page more badge-style
- [x] Add fasting streak pill badge to Current Fast area in fasting profile
- [x] Update progress pill on main page contacts to fill at 31 days and turn black when full
- [x] Remove Prayer button from Settings profile card
- [x] Change "View Fasts" button text back to "Fast"
- [x] Move Fast button directly under profile name to reduce empty space
- [x] Fix fasting streak not showing on Pray Today personal avatar (still shows 0)
- [x] Add border around today's date in the fasting calendar
- [x] Fix progress pill not filling completely at 31+ days (shows half full instead of full)

## Instagram-Style Status Feature

- [x] Add status state management to profile (text + photo)
- [x] Create status editor modal component with photo picker
- [x] Add status display pill to Settings card under profile name
- [x] Implement photo picker for status image
- [x] Display status with text and optional photo in pill
- [x] Test status creation, editing, and deletion (all 61 tests passing)

## Cancel Fast Button

- [x] Replace "Choose status" button with red "Cancel Fast" button in profile page
- [x] Add handler to mark today's fast as missed when button is tapped
- [x] Test cancel fast functionality (all 61 tests passing)

## Status Bubble Crash & Redesign

- [x] Fix crash when saving status update in StatusModal (fixed MaterialIcons import and parseStoredProfile)
- [x] Move status bubble from Settings card to top-right overlay on profile picture
- [x] Redesign as thought bubble style overlay with sparkle emoji
- [x] Test status save and display without crashes (all 61 tests passing)

## Fast Button Redesign

- [x] Remove Fast button from profileButtonsRow in Settings card
- [x] Add circular fast icon button to bottom right corner of profile card
- [x] Display active fast icon or "Fast" text based on selection
- [x] Style as circular overlay in bottom right corner (50x50 circle with border)
- [x] Test navigation to fast profile when tapped (all 61 tests passing)
- [x] Fix Settings tab crash by using activeFastTypeInfo instead of undefined selectedFast

## Cancel Button Fix

- [x] Change "Cancel Fast" button text to just "Cancel"
- [x] Update handler to remove day's mark instead of marking as missed
- [x] Test Cancel functionality

## Status Pill Fix

- [x] Review current status bubble implementation in Settings profile card
- [x] Fix status pill to be positioned as overlay on profile picture
- [x] Simplify status editor to just text input (no photo)
- [x] Test status update functionality

## Status Bubble Redesign (Current)

- [x] Make profile picture bigger (increase avatar size)
- [x] Move profile name down to accommodate larger avatar
- [x] Reposition status bubble as thought bubble sticking OUT from profile pic
- [x] Replace StatusModal with inline text input on Settings page
- [x] Make status editable directly from Settings without opening another screen
- [x] Test status update inline editing

## Status Bubble Positioning & Inline Editing Refinement

- [x] Move thought bubble further to the right (completely outside profile picture)
- [x] Make text input appear INSIDE the thought bubble when tapped
- [x] Add save/checkmark button inside the bubble for inline editing
- [x] Remove the separate inline editor section below the profile card

## Status Bubble Text Visibility Fix

- [x] Make text visible in the status bubble text input (added proper height and padding)

## Status Bubble Expansion for Editing

- [x] Make bubble expand to larger size when in edit mode
- [x] Show expanded text input area with better visibility
- [x] Add Cancel and Save buttons in expanded bubble

## Status Bubble Positioning Fix

- [x] Adjust expanded bubble position so it doesn't overlap profile picture
- [x] Move bubble more to the right and up
- [x] Ensure Cancel and Save buttons are fully visible

## Status Bubble Center Positioning

- [x] Center the expanded bubble on screen (like a modal)
- [x] Add dark overlay behind the bubble
- [x] Remove absolute positioning from profile area

## Status Pill Repositioning

- [x] Move status pill underneath the name instead of next to avatar
- [x] Align name with top of photo
- [x] Make status pill expand horizontally for longer text
- [x] Keep status pill as a tappable element for editing

## Status Pill Cutoff Fix & Color Customization

- [x] Fix status pill being cut off on the right side (added maxWidth constraint)
- [x] Add status expiration feature (auto-clear after 24 hours when saving)
- [x] Add color picker/palette button to customize bubble color (6 color options)
- [x] Make text input background match bubble color (uses statusColor from profile)

## Status Pill Single Line Display

- [x] Make status pill display only one line with ellipsis for long text

## Status Editor UI Fixes

- [x] Make text input background match the bubble color (now rgba(255,255,255,0.15) with white text)
- [x] Hide color palette by default, show behind a palette button (🎨 button toggles it)
- [x] Fix bubble height so it's not cut off at the bottom (minHeight: 200)
- [x] Arrange buttons: Color button | Cancel | Save (in that order)

## Status Editor Button Refinements

- [x] Reduce bubble height (removed minHeight constraint)
- [x] Change buttons from rectangular to circular with icons (40x40 circles)
- [x] Use 🎨 for color, ✕ for cancel, ✓ for save

## Status Expiration Display

- [x] Add clock icon with expiration time next to status pill (🕐 format)
- [x] Format expiration time (e.g., "20h")
- [x] Display only when status is active and not expired

## Status Editor UI Refinement (Current)

- [x] Reduce status bubble height to prevent excessive overflow
- [x] Replace emoji color palette (🎨 button) with proper icon/swatch-based color picker
- [x] Display color swatches as circular colored circles instead of emoji
- [x] Use Material icons for palette button instead of emoji
- [x] Test refined status editor UI with TypeScript checks

## Profile Card Cleanup & Redesign (Current)

- [x] Remove streak pill from profile card top-right
- [x] Move fast button to top-right corner (keep as simple icon circle)
- [x] Simplify profile card to show: avatar, name, status pill (left side only)
- [x] Add Material Design progress bar INSIDE profile card (between profile section and stats)
- [x] Progress bar shows fasting streak (e.g., "Day 3 of 40") with wavy SVG line
- [x] Increase card height to accommodate progress bar
- [x] Test profile card layout and progress bar rendering

## Status Expiration Timer Display (Current)

- [x] Update getExpirationTime to show hours and minutes (e.g., "20h 30m")
- [x] Add auto-refresh every minute so timer updates in real-time
- [x] Show minutes only if less than 1 hour remaining (e.g., "45m")
- [x] Fix timer display to trigger re-renders on refresh
- [x] Test timer display and updates

## Progress Bar Fixes (Current)

- [x] Move progress bar above stats row (between profile section and stats)
- [x] Add purple background to progress bar section
- [x] Update border colors for purple background
- [x] Update progress bar container background for better contrast
- [x] Add rounded corners (borderRadius: 12) to progress bar section
- [x] Fix status timer display to show countdown properly
- [x] Create animated wavy progress bar component
- [x] Add fill animation based on fast progress percentage
- [x] Add continuous wave animation (2s loop) with proper transform
- [x] Fix animation to use translateX with useNativeDriver
- [x] Test animated progress bar rendering
- [x] Fix status timer display by ensuring expirationRefresh triggers re-renders
- [x] Increase squiggle stroke width from 2 to 3
- [x] Add vertical progress marker line at end of filled bar
- [x] Add statusExpiresAt and statusColor to profile parsing

## Animations & Progress Bar Fix (Current)

- [x] Fix progress bar to show current day number (e.g., "Day 132 of 365") not completed days count
- [x] Add pulsing animation to fasting avatar when fast completed for the day
- [ ] Add scale animation to status pill when saved
- [ ] Add fade-in animation to timer text
- [ ] Add subtle pulse to stats numbers when they update
- [ ] Add wave animation enhancement to progress bar line
- [x] Test all animations on iOS, Android, and Web

## Highlight Status Feature (Current)

- [x] Add highlight toggle button in status modal
- [x] Store highlighted status text in profile (statusHighlight field)
- [x] Create speech bubble component for fasting avatar
- [x] Display speech bubble above fasting avatar with highlighted text
- [ ] Add auto-hide animation for speech bubble after 5 seconds
- [x] Test highlight feature with various text lengths

## Streak Badge on Fast Icon (Current)

- [x] Add streak badge to bottom-right corner of fast icon circle
- [x] Display current streak number in badge
- [x] Use flame emoji with custom badge styling
- [x] Position badge absolutely in bottom-right corner
- [x] Test badge display on different streak counts

## Status Expiration Fixes (Current)

- [x] Auto-clear expired status when timer reaches zero
- [x] Change timer display from emoji to simple hourly countdown (24H, 23H, 22H, etc.)
- [x] Update timer every hour instead of every minute
- [x] Test auto-clear and timer display functionality

## Undo Timer Animation Enhancement (Current)

- [x] Create new UndoCountdownTimer component with circular progress ring
- [x] Implement countdown number display (5, 4, 3, 2, 1) that updates every second
- [x] Add pulse animation that intensifies in the final 3 seconds
- [x] Position circular timer above the avatar (top-center)
- [x] Update storyItem height to accommodate the timer overlay
- [x] Remove "Tap undo" text label (timer is now self-explanatory)
- [x] Make timer tappable for fast action undo
- [x] Test undo timer animations on all platforms
- [x] Add haptic feedback at key moments (start, final 3 seconds, completion)

## Android Prayer Widget (Deferred)

Skipping widget implementation until Expo adds native widget support. Current Expo SDK 54 doesn't support home screen widgets without ejecting from managed workflow.

## Dark Mode Toggle Fix

- [x] Fixed dark mode toggle in settings to properly call setColorScheme() from ThemeProvider
- [x] Dark mode now correctly switches theme colors when toggled in settings
- [x] Verified all 62 tests passing with dark mode integration

## Contact Card Cleanup

- [x] Remove "Family • Not reached yet" text from contact cards on homepage
- [x] Keep only birthday information in the subtitle

## Family Grouping Feature

- [x] Add familyId and familyName fields to Person data model
- [x] Create family grouping logic (auto-generate family name from last name)
- [x] Implement groupIntoFamily and ungroupFromFamily helper functions
- [x] Create stacked avatar component for family cards with overlapping avatars
- [x] Add group/ungroup buttons in contact detail screens with modals
- [x] Update homepage to display family groups with stacked avatars
- [x] Ensure "Pray Today" still shows all individuals from grouped families
- [x] Test family grouping end-to-end
