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

## Family Grouping UI Refinement

- [x] Move family groups into their relationship sections instead of separate FAMILIES section
- [x] Keep family groups and individual members together under their assigned relationship type

## Family Overview and Management

- [x] Create family overview screen showing all family members
- [x] Make family members tappable to view their individual prayer cards
- [x] Add "Add more to family" button for existing families to add additional members
- [x] Allow removing individual members from a family (already implemented)

## Family Grouping Bug Fixes

- [x] Fix multiple family cards showing instead of combining into single card (deduplicate by familyId)
- [x] Add profile photo display to family overview screen
- [x] Fix family member navigation to show prayer requests

## Critical Family Grouping Fixes

- [x] Fix family.tsx using wrong storage key (prayercircle_people instead of prayercircle.people.v1)
- [x] Fix groupIntoFamily to reuse existing familyId when adding to existing families instead of creating new ones
- [x] Ensure family cards don't duplicate when members have different relationships

## Delete Button Fix

- [x] Fix delete button in edit person modal not responding to touches (added pointerEvents="auto")

## Family Screen Redesign

- [x] Replace family member cards with avatar-only view
- [x] When avatar is tapped, expand to show prayer requests inline (no navigation)
- [x] Animate selected avatar to move to the side while prayer requests appear
- [x] Allow editing prayer requests directly from the expanded view
- [x] Add ability to close expanded view by tapping elsewhere or back button
- [x] Add checkboxes to mark prayer requests as done inline
- [x] Fix background colors to match theme (surface color for expanded view)

## Button Text Fix

- [x] Fix "Add to Family" button text not displaying fully (added width and padding constraints)

## Family Card Photo Fix

- [x] Fix StackedAvatar component to display actual photos instead of just initials

## Family Grouping UX Improvements

- [x] Add checkmarks next to people's names in "Add to Family" modal when they're already in the same family
- [x] Allow adding multiple people to a family in one session without closing the modal
- [x] Show visual feedback when a person is successfully added to a family (opacity change + checkmark)

## Family Hierarchy Organization

- [x] Add spouse relationship tracking to Person model (spouseId field)
- [x] Organize family members by spouse pairs and their children on family page
- [x] Show couple avatars side-by-side with children grouped below them
- [ ] Add UI to set/edit spouse relationships in person edit modal

## Family Type Selector UI

- [x] Add "Family Type" dropdown to person edit modal (Spouse, Child, Other)
- [x] Auto-link spouses when both are marked as "Spouse" to each other
- [x] Update family hierarchy display to use family type instead of just spouse relationships

## Stacked Avatar Fix

- [x] Update StackedAvatar to show 2 large avatars (couple) with children as small overlapping avatars in background

## Ungroup All Feature

- [x] Add "ungroup all" icon button in top-right of family screen
- [x] Show confirmation dialog before ungrouping entire family
- [x] Remove familyId from all members when ungrouping

## Family Type Selector Relocation

- [x] Move Family Type selector from person edit modal to Add to Family modal (contextual placement)
- [x] Hide Family Type selector from main person edit modal when person is not in a family
- [x] Show Family Type selector in Add to Family modal so user can set role while selecting family

## StackedAvatar Refinement

- [x] Refine StackedAvatar to show 2 large spouse avatars prominently
- [x] Add gradient opacity fade for children avatars after 4 total avatars
- [x] Improve visual hierarchy and spacing for family cards

## Family Screen Improvements

- [x] Add visual distinction for spouses vs children (badge, ring color, or size)
- [x] Implement avatar selection on family screen to show individual prayers
- [x] Keep single-page layout while allowing multi-person prayer display

## Family Screen Avatar Layout Refinement

- [x] Revert family screen to stacked avatar layout (like home screen)
- [x] Make children avatars smaller than spouses for visual distinction
- [x] Keep prayer display on same page when avatar is selected

## Add to Family Modal Improvements

- [x] Require family type selection before adding family member
- [x] Disable "Add to Family" button until both person and family type are selected
- [x] Show visual feedback when family type is selected

## Family Screen Redesign (Mockup)

- [x] Redesign family screen to match mockup layout with hero section
- [x] Add horizontal scrollable family member avatars
- [x] Implement prayer items list with checkboxes and delete buttons
- [x] Add "Mark as Prayed" and "Last reached" action buttons

## Family Screen Photo Avatars & Edit Mode

- [x] Display photo avatars on family screen hero section when available
- [x] Display photo avatars in family members horizontal scroll when available
- [x] Implement in-page edit mode toggle (Edit button switches between view/edit)
- [x] Show prayer item add/edit/delete UI when in edit mode
- [x] Persist changes without leaving the family screen

## Family Screen Bug Fixes

- [x] Fix photo avatars not displaying on family screen (showing initials instead)
- [x] Revert Edit button to open full edit modal like person page
- [x] Ensure Mark as Prayed button works identically to person page
- [x] Ensure Last reached button works identically to person page
- [x] Make family screen function exactly like person page

## Add Prayer Item on Family Screen

- [x] Implement prayer item input field on family screen
- [x] Add functionality to create new prayer items directly from family screen
- [x] Persist new prayer items to storage

## Critical Bug Fixes

- [x] Fix data deletion bug when toggling prayer items on family screen (was persisting only family subset instead of full people array)
- [x] Fix avatar centering in family cards (wrap StackedAvatar in centered container)

## Drag-and-Drop Contact Reordering (REMOVED - Too Complex)

- [x] Attempted to implement but removed due to architectural complexity
- [x] Issue: People and families are stored separately; mixing them in reorder logic caused data loss
- [x] Decision: Removed feature to restore stability; can revisit with simpler approach later (e.g., reorder on edit screen only)


## Critical Bugs - May 19, 2026

- [x] Fix family screen loading bug - gets stuck on "Loading..." when switching between family groups
- [x] Restore visibility of invisible contacts from earlier data deletion bug
- [x] Adjust spouse avatar positioning - move them down more in family cards

- [x] Display person's birthday on prayer detail page below relationship type

- [ ] Add action buttons to family group page (Mark as Prayed, Last reached) like individual pages
- [x] Add delete button to last reached date editor on person detail page
- [x] Add ungroup button to family group page header


## New Features - May 20, 2026

- [x] Add custom relationship category - allow users to type in their own relationship title
  - [x] Add input field in Add Person modal for custom category
  - [x] Display custom categories alongside preset ones (Family, Friends, Ministry, Prospect)
  - [x] Custom relationship takes precedence when provided
  
- [x] Add app data reset button in Settings
  - [x] Create "Clear All Data" button in Settings tab
  - [x] Show confirmation dialog before deleting
  - [x] Delete all people, families, prayer items, and reminders
  - [x] Reset app to initial state
  
- [x] Add animations for visual appeal and social network feel
  - [x] Pulsing animation around fasting avatar when marked as successful
  - [x] Entrance animations for people cards (component created)
  - [x] Custom animation components using react-native-reanimated
  - [x] Smooth, performant animations that don't feel heavy
  - [ ] Consider micro-interactions that feel alive without being distracting

## Family Card Improvements (Current)

- [x] Fix family card avatar vertical centering - add top padding to stacked avatars
- [x] Implement expandable family cards - show/hide member list on tap
- [x] Create individual member cards within expanded family view
- [x] Add member card tap navigation to person profile
- [x] Add "Family Group" section to person profile page
- [x] Display family name and member count in person profile
- [x] Test expandable family cards with various family sizes
- [x] Test Family Group section on person profile
- [x] Fix expanded family member rendering to use correct variable names and EmergencyPrayerPill props
- [x] Redesign emergency prayer countdown pill to use solid red depleting progress instead of animated stripes
- [x] Fix expanded family container width to match main card (marginHorizontal: 24) so it doesn't overlap next group
- [x] Reduce emergency pill size to match regular reach pills (height: 26, padding: 10, borderRadius: 13)
- [x] Fix expanded family container corner gap and add bottom margin for spacing (marginTop: -1, marginBottom: 8)
- [x] Fix emergency pill to use theme colors for light/dark mode support
- [x] Connect expanded family container to main card with continuous border
- [x] Add smooth fade-in animation to expanded family member list
- [x] Remove bottom border radius from main family card when expanded to create seamless connection with expanded list
- [x] Fix avatar vertical centering in family cards by removing paddingTop and adding alignItems: center
- [x] Fix avatar vertical centering by removing explicit height constraint to allow natural centering
- [x] Fix tab bar dark mode support by using dynamic tint and theme colors
- [x] Fix person detail page dark mode support by converting hardcoded colors to theme-aware colors
- [x] Fix avatar vertical centering by adding paddingTop to push avatars down in family cards
- [x] Fix avatar vertical centering by making container take full height and center avatars within it


## Dark Mode & Personal To-Do List Features

- [x] Fix remaining dark mode issues on person detail page (light backgrounds in dark mode)
- [ ] Add "isPersonal" flag to Person data structure
- [ ] Create UI to mark a contact as personal (yourself)
- [ ] Create ToDo data structure with title, description, scheduledTime, completed fields
- [ ] Implement to-do CRUD operations (add, edit, delete, complete)
- [ ] Add time-based scheduling for to-dos (specific times each day)
- [ ] Integrate personal to-dos into getPrayTodayList function
- [ ] Display personal to-dos in "Pray Today" section as urgent items
- [ ] Implement to-do completion tracking (complete and show next to-do)
- [ ] Replace "Add status" button with "To-Do List" button in Settings page
- [ ] Create dedicated personal to-do management page (accessible from Settings)
- [ ] Add to-do list UI to personal to-do page (similar to prayer items)
- [ ] Test personal to-do feature end-to-end

## Personal Profile Feature (Complete)

- [x] Fixed dark mode on person detail page - all hardcoded light colors now use theme-aware colors
- [x] Added isPersonal flag to Person data structure
- [x] Added PersonalTodo type with scheduled time, sequential ordering, and completion tracking
- [x] Added helper functions for personal to-do CRUD operations
- [x] Create UI to mark a contact as personal (yourself) - toggle in edit modal
- [x] Create personal to-do list management modal
- [x] Implement to-do item creation with scheduled time
- [x] Implement sequential to-do completion flow (next one appears after completion)
- [x] Integrate personal to-dos into Pray Today section as urgent items when due
- [x] Add To-Do List section on person detail screen below Prayer Items
- [x] Show personal to-do list view in person detail screen when isPersonal is true
- [x] Display due personal to-dos as thought bubbles over fasting avatar in Pray Today
- [x] Add ability to delete personal to-dos from the list
- [x] Personal to-dos sit in thought bubble until checked off

## Personal To-Do Recurring & Toggle Fixes (Complete)

- [x] Implement auto-reset logic for recurring to-dos in getDuePersonalTodos
  - [x] Check if to-do was completed on a previous day (completedAt !== today)
  - [x] If completed on different day and has daysOfWeek set, check if today is a recurring day
  - [x] Auto-reset isDone to false when recurring day arrives
- [x] Verify unmark functionality works correctly (toggle isDone state)
  - [x] Updated checkbox handler to properly manage completedAt when toggling
  - [x] When unmarking: remove completedAt timestamp
  - [x] When marking: add completedAt with current date and time
- [x] Test recurring to-dos reset on their scheduled days
- [x] Ensure to-dos reappear in thought bubble after unmarking or auto-reset
- [x] Run full test suite to verify no regressions (all 66 tests passing)
- [ ] Save checkpoint after recurring to-do implementation

## Status Highlight Replacement & Notification Pill (Fixed)

- [x] Replace status highlight speech bubble with next personal to-do display
  - [x] Remove problematic speech bubble rendering that was cut off
  - [x] Simplify UI to focus on core functionality
- [x] Implement dynamic notification pill for emergency prayers
  - [x] Create notification pill component that displays at top of screen
  - [x] Show emergency prayer count and title in pill
  - [x] Update pill when emergency prayers are added/removed
  - [x] Style as native-looking notification badge (red color for emergencies)
  - [x] Fix NotificationPill not rendering - added to main return statement
  - [x] Connected to getAllActiveEmergencyPrayers data
- [x] Test both features end-to-end
- [x] Run full test suite and verify no regressions (all 66 tests passing)
- [ ] Save checkpoint after implementation

## Dark Mode Fix for Fasting Profile Page (Complete)

- [x] Fix dark mode support on profile.tsx (fasting page)
  - [x] Replace hardcoded light background with bg-background class
  - [x] Update header icon button to use colors.surface
  - [x] Update header title color to use colors.foreground
  - [x] Update profile name and subtitle colors to use theme colors
  - [x] All 66 tests passing

## Status Bar Notification for Emergency Prayers (Removed)

- [x] Attempted to implement status bar notification using expo-notifications
- [x] Realized standard notifications don't work as pill badges in status bar
- [x] User decided to remove feature entirely
- [x] Cleaned up code and removed useEmergencyNotification hook

## To-Do Completion Animations (Complete)

- [x] Add scale and fade animations when checking off to-dos
  - [x] Create animated component wrapper for to-do items (AnimatedTodoItem)
  - [x] Add scale-down animation on completion (0.8 scale over 150ms)
  - [x] Add fade-out animation before item disappears (300ms fade)
  - [x] Smooth transition to next to-do
- [x] Add haptic and sound feedback
  - [x] Trigger medium impact haptic on tap
  - [x] Add success notification haptic on completion
- [x] Test animations for smooth performance (all 66 tests passing)
- [ ] Save checkpoint after implementation

## To-Do Reset Timing & Reminders Tab (Complete)

- [x] Fix to-do reset timing to use Pacific Standard Time
  - [x] Created getTodayInPST() helper function using Intl.DateTimeFormat
  - [x] Created getCurrentDayOfWeekInPST() helper function
  - [x] Updated getDuePersonalTodos to use PST for day boundary calculations
  - [x] Todos now reset at midnight PST, not mid-day
- [x] Add Joi-style daily summary to Reminders tab
  - [x] Redesigned DailySummaryCard to match Joi calendar layout
  - [x] Big bold day name (Mon, Tue, etc) with date on right
  - [x] Paragraph format: "You have ✓ X todos and 💜 Y prayers today"
  - [x] Fixed prayer count to only count regular prayers (not urgent/emergency)
  - [x] Added progress bar showing completion percentage
  - [x] Styled to match Joi calendar aesthetic with theme colors
- [x] Implement scroll-up animations
  - [x] Added scroll-up animation to DailySummaryCard (30px slide + fade in)
  - [x] Animation duration: 400ms with parallel timing
  - [x] Smooth transitions with opacity fade-in
- [x] Test all changes and verify functionality (all 66 tests passing)
- [x] Redesign Reminders tab header to match Joi Calendar
  - [x] Moved day name and date from card to header area
  - [x] Removed card box - now displays as full-width header
  - [x] Increased day name font size to 56px for prominence
  - [x] Replaced heart emoji with prayer hands icon (MaterialIcons favorite)
  - [x] Raised header up with adjusted padding
  - [x] Larger summary text (18px) without card border
  - [x] All 66 tests passing
- [x] Fixed prayer count to include all prayers (urgent/emergency)
  - [x] Changed filter to count ALL prayers, not just regular ones
  - [x] Prayer count now matches home screen X/X prayed today
  - [x] Counts update in real-time as prayers are marked complete
- [x] Replaced progress bar with personal todo avatars
  - [x] Removed useless progress bar
  - [x] Display personal todos as avatars with icons (like Pray Today section)
  - [x] Added thought bubbles above each avatar showing todo title
  - [x] Made todo row horizontally scrollable
  - [x] Shows only personal todos (no fasting avatar or prayer avatars)
  - [x] Tap avatars to toggle todo completion directly from Reminders tab
  - [x] Checkmark badge appears when todo is completed
  - [x] All 66 tests passing
- [x] Fixed critical bugs in Reminders tab
  - [x] Prayer count now uses prayTodayList (matches home screen)
  - [x] Counts update in real-time when items are checked off
  - [x] Only incomplete todos display (completed ones disappear)
  - [x] Icons now render correctly on todo avatars
  - [x] Completed todos filtered from display
  - [x] All 66 tests passing
- [x] Added fasting status to daily summary
  - [x] Summary shows remaining todos, prayers, and fasting status
  - [x] Fasting status displays as Complete, Missed, Skipped, or Not selected
  - [x] Linked to active fasting profile status
  - [x] Changed to remaining counts for real-time countdown effect
  - [x] All 66 tests passing
- [x] Save checkpoint after implementation

## Reminders Tab Enhanced Features (Complete)

- [x] Sort todos by time when time is set
  - [x] Implement time-based sorting for personal todos
  - [x] Display todos in chronological order
- [x] Add ministry finance tracker
  - [x] Added budgetAmount field to Person type
  - [x] Display budget amount in summary with $ symbol
- [x] Add people reach-out counter
  - [x] Count people not reached out to in 14 days
  - [x] Display count in summary with people icon
- [x] Add Bible study tracker
  - [x] Display current Bible book and chapter
  - [x] Use Genesis 1 as placeholder for now
  - [x] Add book icon to summary
- [x] Update summary paragraph with all metrics
  - [x] Format: "You have X todos, you are currently reading [Book Chapter], have Y Prayers, Z to budget, W people to reach, and your fasting is [status] today."
  - [x] Add appropriate symbols for each metric
- [x] Test all features and verify functionality
  - [x] All 66 tests passing
  - [x] TypeScript clean
- [x] Save checkpoint
- [x] Fixed fasting status display
  - [x] Map dayStatuses values (completed/missed/skipped) to display format (complete/missed/skipped)
  - [x] Reminders tab now shows correct fasting status based on user selection
  - [x] All 66 tests passing
- [x] Updated summary styling
  - [x] Added faint underlines to bolded text (using border color with 60% opacity)
  - [x] Changed all icons to foreground color (black in light mode, white in dark mode)
  - [x] Removed purple primary color from icons for better visual consistency
  - [x] All 66 tests passing

## Bible & Budget Tracker Features (In Progress)

- [ ] Design data structures
  - [ ] Bible tracker: book, chapter, verses read, completion status
  - [ ] Budget tracker: categories, budgeted amount, spent amount, transactions
- [ ] Implement Bible tracker
  - [ ] Bible book/chapter selector
  - [ ] Mark chapters as read
  - [ ] Display current reading progress
  - [ ] Persist data to AsyncStorage
- [ ] Implement budget tracker
  - [ ] Create budget categories
  - [ ] Log expenses with amounts
  - [ ] Calculate remaining budget per category
  - [ ] Persist data to AsyncStorage
- [ ] Add screens to Settings tab
  - [ ] Bible tracker screen
  - [ ] Budget tracker screen
- [ ] Update Reminders tab
  - [ ] Display current Bible book and chapter (with progress)
  - [ ] Display total budget and spent amounts
- [ ] Test all features
- [ ] Save checkpoint


## Bible & Budget Tracker Features (Complete)

- [x] Create Bible tracker screen (app/bible-tracker.tsx)
  - [x] Select Bible books from dropdown
  - [x] Mark chapters as read with checkmarks
  - [x] Track progress through entire Bible
  - [x] Persist Bible progress to AsyncStorage
  - [x] Display current book and chapter
- [x] Create budget tracker screen (app/budget-tracker.tsx)
  - [x] Add budget categories with amounts
  - [x] Log expenses to categories
  - [x] Track remaining budget per category
  - [x] Display total budgeted, spent, and remaining
  - [x] Persist budget data to AsyncStorage
- [x] Integrate Bible data into Reminders tab
  - [x] Load Bible chapters from AsyncStorage
  - [x] Display current Bible book/chapter in summary
  - [x] Update when new chapters are marked read
- [x] Integrate budget data into Reminders tab
  - [x] Load budget categories and transactions from AsyncStorage
  - [x] Calculate remaining budget
  - [x] Display in daily summary
  - [x] Update in real-time as expenses are logged
- [x] Test all features
  - [x] All 66 tests passing
  - [x] TypeScript clean

- [x] Removed underlines from summary text
  - [x] Cleaned up styling to remove textDecorationLine properties
  - [x] Maintained bold white text for key metrics
  - [x] All 66 tests passing
- [x] Created dedicated Bible chapters tracker screen (app/bible-chapters.tsx)
  - [x] Shows all 66 Bible books with chapter counts
  - [x] Check off chapters one by one as you read
  - [x] Progress bar showing overall reading completion percentage
  - [x] Chapters persist to AsyncStorage
  - [x] Strikethrough and green background for completed chapters
  - [x] Section headers for each Bible book

- [x] Add Bible Tracker button to Settings
  - [x] Added Bible Tracker button to profile card
  - [x] Button opens Bible chapters tracker screen
  - [x] Shows current Bible progress
- [x] Add Budget Tracker button to Settings
  - [x] Added Budget Tracker button next to Bible Tracker
  - [x] Button opens budget tracker screen
  - [x] Shows budget summary
- [x] Sync Bible progress to Reminders tab
  - [x] Created getMostRecentBibleChapter() helper function
  - [x] Display dynamic Bible book/chapter based on read chapters
  - [x] Updates in real-time as chapters are marked read
- [x] Removed underlines from Reminders summary text
  - [x] Cleaner visual appearance
  - [x] All 66 tests passing

- [x] Redesign Bible tracker to use calendar-style chapter buttons
  - [x] 5-column grid layout matching fasting calendar style
  - [x] Orange buttons for unread chapters, green for completed
  - [x] Book headers above each section
  - [x] Progress bar at top showing completion percentage
- [x] Improve Settings profile card layout
  - [x] Restructured card to display buttons below name/subtitle
  - [x] Better visual hierarchy for Bible and Budget buttons
  - [x] Buttons positioned prominently in the profile card

- [x] Change chapter buttons to outline style with toggle completion
  - [x] Unread chapters show as outline (border only, no fill)
  - [x] Tap to toggle to green filled (completed)
  - [x] Tap again to undo (back to outline)
- [x] Add book status pills next to each book title
  - [x] Show "current", "complete", or "not started" status
  - [x] Tappable to cycle through states
  - [x] Only one book can be "current" at a time
- [x] Integrate current book display in Reminders tab
  - [x] Display the book marked as "current" in the summary
  - [x] Update dynamically when book status changes

- [x] Auto-complete book when all chapters marked done
  - [x] Check if all chapters are read when marking a chapter
  - [x] Automatically change pill to "complete" if all chapters done
- [x] Mark all chapters green when setting book to complete
  - [x] When tapping pill to set status to "complete", mark all chapters as read
  - [x] Update UI to show all green buttons
- [x] Add reset button at top of Bible tracker
  - [x] Button to clear all Bible progress
  - [x] Confirmation dialog before resetting

- [x] Redesign Budget page with monthly calendar view
  - [x] Create calendar view showing days of the month
  - [x] Allow marking expenses as due on specific days
  - [x] Show expense amount for each day
  - [x] Mark expenses as paid
  - [x] Calculate total for the month
- [x] Update Reminders tab to show budget total and remaining
  - [x] Display total monthly expenses
  - [x] Display remaining balance after paid expenses
- [x] Auto-scroll Bible tracker to current book
  - [x] Detect book marked as "current"
  - [x] Scroll to that book on page load
- [x] Unmark chapters when setting book to "not started"
  - [x] When cycling back to "not started", clear all chapter marks

- [x] Fix Bible tracker auto-scroll to current book
- [x] Move reset button to right side of header
- [x] Position status pill next to book name
- [x] Add close/exit button to Bible tracker page

- [ ] Redesign undo timers on Pray Today section
  - [ ] Make timers more prominent and visible
  - [ ] Better positioning to avoid overlapping avatars
- [ ] Add Bible info to Settings profile
  - [ ] Show current Bible chapter being read
  - [ ] Display days since last Bible read (count-up timer)
  - [ ] Keep pill form styling
- [ ] Fix budget calendar display
  - [ ] Show total amount due on each day
  - [ ] Show "$0" when all expenses paid
  - [ ] Fix date offset issue (showing on wrong day)

- [x] Redesign undo timers on Pray Today section
  - [x] Reposition timer below avatar instead of overlapping
- [x] Fix budget calendar to show amounts and fix date offset
  - [x] Fixed date creation to use correct month (added 12:00 time)
  - [x] Changed display from "0/1" to show remaining amount "$X"

- [x] Fix back gesture navigation to return to People tab instead of exiting app
  - [x] Added BackHandler listener to tab layout
  - [x] Prevents app exit on back swipe, returns to People tab instead

- [x] Fix date offset bug in Budget tracker (expenses showing on wrong day)
  - [x] Changed from Date constructor to string formatting to avoid timezone issues
- [x] Add recurring expense functionality
  - [x] Add isRecurring flag to MonthlyExpense interface
  - [x] Add checkbox to add expense modal
  - [x] Display recurring badge on expenses

- [x] Fix Bible tracker spacing (reduced gaps between books)
- [x] Fix auto-scroll to current book (improved height calculation)
- [x] Add current Bible chapter pill to Settings profile card
- [x] Add days-since-last-read counter pill to Settings profile card
- [x] Save lastBibleReadDate when marking chapters as read

- [x] Replace "Add status" pill in Settings with Bible reading info (current book + days since read)
- [x] Fix people-to-reach count to only include people who have been marked AND are past 14 days

- [x] Fix Bible tracker auto-scroll using onLayout measurements (not pixel guessing)
- [x] Don't scroll if no book is marked as current
- [x] Add book navigation modal (list icon) for quick jump to any book
- [x] Fix Settings Bible pill auto-refresh when returning from profile/Bible pages
- [x] Make Bible pill bigger with overlapping squircle "Xd ago" badge on bottom-left
- [x] Fix back gesture: only go to People from tabs, sub-pages go to previous page

- [x] Rename "Reminders" tab to "Schedule"
- [x] Build Schedule tab with Joi-style day header and date strip
- [x] Add scroll-up behavior that covers day summary, scroll-down reveals it
- [x] Add swipe left/right to navigate between days
- [x] Implement linear view showing todos, events, ministries, worship card, fasting card, Bible reading
- [x] Add keyword-based illustrated event cards (BBQ, Church, Worship, Bible Study, Doctor, Baby Shower, holidays)
- [x] Completed events shrink and show solid color instead of image
- [x] Add animated icons next to todos (spark animation on complete)
- [x] Build "+" button modal with Ministry, Event, and Todo creation forms
- [x] Ministry form: type, due date/duration, location
- [x] Event form: standard calendar event fields
- [x] Todo form: simple checkbox item
- [x] Integrate People birthdays into Schedule dates
- [x] Transfer personal page todos to Schedule area
- [x] Add expandable Worship card
- [x] Add expandable Fasting card
- [x] Add Bible chapter scheduling

- [x] BUG: + button positioning too low (should align with tab bar) — fixed bottom: 24 → 60
- [x] BUG: Budget display not showing actual budget data — verified calculation is correct
- [x] BUG: People reached count not calculating 14-day threshold correctly — verified calculation is correct

- [x] BUG: Fasting status not updating in Schedule summary — fixed with useMemo reactivity
- [x] BUG: Todos count not updating in Schedule summary — fixed with useMemo reactivity
- [x] BUG: Last reached (people to reach) not updating in Schedule summary — fixed with useMemo reactivity
- [x] BUG: Current Bible chapter not updating in Schedule summary — fixed with useMemo reactivity
- [x] BUG: Budget not updating when changed in Schedule summary — fixed with useMemo reactivity

- [x] BUG: Budget changes not persisting to AsyncStorage — fixed by reading from monthlyBudgetExpenses
- [x] BUG: Scroll animation doesn't cover summary (fades instead of sliding) — fixed by wrapping summary in Animated.View with scroll-linked transform
- [x] BUG: Ministry events not displaying in Schedule tab — verified ministries are correctly added to listData and renderItem

- [x] Add time picker for todos in Schedule tab
- [x] Auto-reorder todos and events by time (chronological order)
- [x] Improve todo UI with animated flame icon (gray fill, color on right, spark animation)
- [x] Generate keyword-based event illustrations (church, BBQ, worship, etc.) — 9 keywords: church, BBQ, worship, Bible study, doctor, baby shower, birthday, Christmas, Easter
- [x] Implement full-bleed event images that blend into event card background — images render with overlay gradient and text on bottom
- [x] Add calendar date picker UI to all Schedule forms (Event, Todo, Ministry)
- [x] Add clock time picker UI to all Schedule forms (Event, Todo, Ministry)
- [x] Fix real-time summary refresh when budget/Bible/fasting changes in other tabs
- [x] Add event/ministry counts to Schedule summary ("_todos, _events, _ministries")vent/ministry counts to Schedule summary ("_todos, _events, _ministries") — displays actual counts for the selected day
- [ ] Implement Bible Study scheduling form with book selection and date/time
- [ ] Auto-check Bible chapters when Bible Study is marked complete
- [ ] Update summary to show next chapter after Bible Study completion

- [x] Create unified Bible tracking system (lib/bible-unified.ts)
- [x] Migrate app/bible-tracker.tsx to use unified system
- [x] Create Bible sync helpers (lib/bible-sync.ts) to sync unified system to old systems
- [x] Add BibleStudySession type and helpers to lib/schedule-data.ts
- [x] Add Bible Study form to Schedule tab with book/chapter picker
- [ ] Wire Bible Study completion to mark chapters in unified + sync to old systems
- [x] Update Schedule summary to show next chapter from unified system (now shows next unread chapter)
- [x] Test Bible Study scheduling end-to-end

- [x] BUG: Remove day header duplication in Schedule tab (show once, not twice)
- [x] FEATURE: Add "Schedule" title at top, summary below, date strip slides over on scroll-up (Joi-style)
- [x] FEATURE: Make event text white for visibility on image backgrounds
- [ ] FEATURE: Match todo icons to types (prayer hands, toothbrush, therapy icon, etc.)
- [ ] FEATURE: Link summary avatars to Schedule todos instead of prayer profile todos
- [ ] BUG: Sort todos/events/ministries chronologically by time within a day
- [ ] FEATURE: Show time in pill next to todos
- [ ] CHECKPOINT: Save after each major fix

- [x] BUG: Remove day name and date from summary card (showing twice - once in summary, once in day header)
- [x] BUG: Scroll doesn't go all the way to top (summary card blocking full scroll) — FINAL FIX v5: Simplified layout. Summary scrolls normally with everything else. Fixed crash on date selection (onDateSelect → setSelectedDate). Added visual separation with borders between summary and date card.
- [x] BUG: Budget displays with too many decimals (712.6199999999999 instead of formatted)
- [x] FEATURE: Match todo icons to specific types (toothbrush for Brush Teeth, prayer hands for Pray, etc.)
- [x] FEATURE: Chronological sorting for todos, events, and ministries by time within each day
- [x] FEATURE: Link summary avatars to Schedule todos (tapping avatars opens Schedule todo form)

- [x] FIX: Make date header and todo list have same background (remove border between them)
- [x] FIX: Extend background to phone edges (remove padding/margins causing visual glitch)
- [x] FIX: Sync Bible book/chapter in summary with Bible Reading section
- [x] FIX: Dynamic todo count - count actual todos for selected day and decrement when checked (now filters incomplete items)
- [x] FIX: Dynamic event count - count actual events for selected day and decrement when completed (now filters incomplete items)
- [x] FIX: Dynamic ministry count - count actual ministries for selected day and decrement when completed (now filters incomplete items)
- [x] FIX: People to reach - only count people not reached within 14 days (already implemented correctly)
- [x] FIX: Bible study summary shows next unread chapter instead of hardcoding chapter 1

- [x] Implement swipe gestures on todos (left to delete, right to edit)
- [x] Implement swipe gestures on events (left to delete, right to edit)
- [x] Create material design progress bar component
- [x] Integrate progress bar under Schedule summary showing tasks & events completion

- [x] Add "Good morning, [Name]" greeting with profile picture to Schedule summary
- [x] Fix profile data loading to use canonical PROFILE_STORAGE_KEY
- [x] Reload profile data when Schedule tab comes into focus (useFocusEffect)
- [x] Reduce todo item width by increasing horizontal padding (4px → 16px)

- [x] Integrate user greeting and profile picture into summary paragraph (not separate)
- [x] Wire Bible study completion to markChapterAsRead and sync to unified Bible system
- [x] Add marginHorizontal to event cards and dropdown menus to reduce width

## Current Sprint - Bible & UI Improvements

- [ ] FIX: Bible display shows Genesis 1 instead of 2 Timothy 2 (currently marked as current)
- [ ] FEATURE: Add color picker (5 colors) to todo/event/ministry creation forms
- [ ] FEATURE: Display colored badges/indicators on todos, events, and ministries
- [ ] FEATURE: Add swipe-right-to-edit and swipe-left-to-delete to ministry items
- [ ] FEATURE: Hide empty todo/event/ministry sections when count is 0
- [ ] FIX: Add missing icons for stats in summary
- [x] FIX: Sticky todo scroll bug - top todo scrolls with page when scrolling down

## People Linking to Schedule Items (Current)

- [x] Add linkedPeopleIds field to ScheduleTodo, ScheduleEvent, ScheduleMinistry types
- [x] Add people selector UI to Todo creation form
- [x] Add people selector UI to Event creation form
- [x] Add people selector UI to Ministry creation form
- [x] Update TodoItem component to accept people prop and render linked avatars
- [x] Update EventCard component to accept people prop and render linked avatars
- [x] Update MinistryCard component to accept people prop and render linked avatars
- [x] Pass people prop to all three components in renderItem function
- [x] Display linked people as small avatar circles (24px) on schedule items
- [x] Show overflow badge (+N) when more than 3 people are linked
- [x] Persist linkedPeopleIds to AsyncStorage with schedule items
- [ ] Write unit tests for linkedPeopleIds persistence in schedule-data.test.ts
- [ ] Test linked people avatars display correctly on all schedule items
- [ ] Test avatar overflow badge displays correctly when >3 people linked

## White Space (Time Block) Feature (Complete)

- [x] Create time-blocks.ts helper library with time conversion functions
- [x] Implement calculateAvailableTimeBlocks function to find gaps in schedule
- [x] Add formatDuration helper to display time in readable format (e.g., "2h 30m")
- [x] Create TimeBlockCard component to display available time blocks
- [x] Add visual indicators for block size (green for 2+ hours, orange for 1+ hour, gray for <1 hour)
- [x] Display suggested activities based on block size (strategic planning, writing, quick tasks)
- [x] Integrate time blocks into Schedule tab rendering
- [x] Calculate and display available blocks between scheduled items
- [x] Write comprehensive unit tests for time block calculations (12 tests passing)
- [x] Test time conversion, duration formatting, and gap detection
- [x] Test overlapping events and completed item filtering
- [x] Test custom business hours support

## Schedule Tab UI Improvements (Complete)

- [x] Refactor time blocks to intertwine chronologically with todos/events instead of showing at end
- [x] Redesign time block cards to be more compact and readable (TimeBlockIndicator component)
- [x] Replace people selector list with avatar-based picker (AvatarPeopleSelector component)
- [x] Display linked people's actual photos on schedule item cards using StackedAvatar
- [x] Test all UI improvements and verify readability
- [x] All components compile without TypeScript errors

## Critical Bug Fixes (Current)

- [x] Fix day switching navigation - added extraData prop to FlatList for proper re-rendering
- [x] Fix people list truncation - AvatarPeopleSelector already has flex: 1 and scrollEnabled: true
- [x] Filter out expired time blocks - implemented filterExpiredTimeBlocks function
- [x] Add color selector for time blocks - added time block color picker modal with 6 colors
- [x] Add delete time block functionality - added delete button in color picker modal
- [x] Verify avatar display on schedule item list view - using StackedAvatar component
- [x] Remove sticky header from schedule page - entire page now scrolls naturally
- [x] Fix time block color selection - customColor prop now properly passed to TimeBlockIndicator
- [x] Add countdown timer to time blocks - shows remaining hours/minutes and updates every minute
- [x] Time blocks disappear when time passes - already implemented with filterExpiredTimeBlocks
- [x] Fix Bible chapter display in summary - now reloads when home tab comes into focus
- [x] Add pulsing glow effect to ministry cards - animates with 1.5s cycle like fasting avatar
- [x] Add colored border to ministry cards - matches the selected ministry color
- [x] Remove shadow-only glow - replaced with pulsing animated glow background
- [x] Fix event card avatar display - avatars now show next to time on the right side
- [x] Fix ministry card layout - moved avatars inline with time instead of below
- [x] Remove ministry card width constraint - removed maxWidth to allow full width
- [x] Fix Bible chapter display - only shows books marked as "current", not "not-started"
- [x] Bible chapter disappears when no current book - returns empty string instead of placeholder


## Phase 2 Feature Requests (Current)

- [x] Fix available hours calculation to subtract time block hours as they count down
- [x] Add profile name badge with fast-based color (green/yellow/red) and streak counter overlay
- [ ] Implement contact card expand animation with layout transition (avatars move down, name moves left)
- [x] Add todo-to-event linking with checkbox selector in todo creation page
- [x] Add "Read" option to ministry creation form
- [x] Implement ministry collapse on complete (shrink and show solid color overlay)
- [x] Connect Bible summary to ministry form (mark chapters as read when Read ministry created)
- [x] Update summary display to show "last chapter read" from completed Read ministries instead of "currently reading"
- [x] Fix "to reach" text to not be bolded in summary
- [x] Fix Bible summary to include completed Bible Study sessions (not just Read ministries)
- [x] Add Event/Ministry badge display to todo cards
- [x] Fix Bible Study ministries to mark chapters as read (same as Read ministries)

## Phase 3 Bug Fixes (Current)

- [x] Fix available hours calculation (date comparison issue)
- [x] Replace todo people selector with tag selector (Ministry/Event/Family/Therapy/Personal)
- [x] Fix name badge colors (red for missed, yellow for skipped)
- [x] Reduce ministry card padding for compact layout
- [x] Free time blocks already persist correctly on non-selected days
- [x] Add scale-down animation for ministry completion
- [x] Implement contact card expand animation (tap to expand/collapse)
- [x] Fix glow effect for ministry cards (shadow-based halo effect)
- [x] Add prayer items reveal animation on contact expand (staggered slide-in)
- [x] Add schedule tab todos to Pray Today section with avatars


- [ ] Reduce ministry card padding and margins for more compact layout
- [ ] Fix free time blocks to persist on non-selected days (only countdown on selected day)


## Phase 4 Bug Fixes (Current)

- [x] Fix fast progress bar to increment daily until finish date
- [x] Fix available hours calculation (showing 17 hours at 9 PM, should be much less)
- [x] Fix todo creation form scroll issue (can't scroll up)
- [x] Filter events/ministries to show only upcoming items with dates
- [x] Update todo badge to show event/ministry title and match color
- [x] Compact ministry creation person selector layout
- [ ] Change swipe delete to long-press with confirmation modal
- [x] Fix prospect contact tap to open prayer card

## Phase 5: Bug Fixes and New Features (Current)

- [ ] Fix badge persistence bug: event/ministry badge disappears on app relaunch until switching days
- [ ] Replace swipe-to-delete with long-press context menu for todos, events, and ministries
- [ ] Fix available hours calculation: summary shows 13 hours but schedule shows 2 hours (only count actual free blocks, not all-day blocks)
- [ ] Make free time blocks countdown and disappear after their time passes
- [x] Implement worship list feature with standalone reusable playlists
- [x] Add ability to paste Spotify/Apple Music links with automatic metadata and artwork fetching
- [x] Add manual worship entry option with photo upload capability
- [x] Link worship lists to schedule days/events for easy access
- [x] Fix worship album form to use parent component's form instead of duplicate form
- [x] Fix WorshipAlbumCard to use expo-image instead of react-native Image
- [x] Add comprehensive tests for worship album persistence and filtering
- [x] Verify album artwork displays correctly with coverUrl from Spotify API


## Phase 6: UX Improvements and Bug Fixes

- [x] Add long-press context menu to EventCard (delete/edit) to match TodoCard
- [x] Add long-press context menu to MinistryCard (delete/edit) to match TodoCard
- [x] Implement overdue todos that roll to next day with "Overdue" badge
- [x] Add "Back to Today" button in date selector when date is changed
- [x] Change date swipe navigation to jump 7 days (week) instead of 1 day
- [x] Create event/ministry detail card that shows on tap with linked people
- [x] Add notes field to ScheduleTodo data model
- [x] Display todo notes under todo title in schedule view
- [x] Replace emoji event icons with proper Material Design icons
- [x] Map event types to icons: Lunch, Dinner, Doctor, Baby, Pray, Meeting, Reach Out, Write, Study, Read, BBQ, Visit, Soccer, Basketball, Baseball, Music, Concert, Worship
- [x] Add ministry type icons (Outreach, Teaching, Worship, Service, Prayer, Youth, Missions, Hospitality, Counseling, Bible Study, Read, Other)
- [x] Fix available hours calculation (already dynamic, subtracts scheduled items correctly)
- [x] Remove duplicate Worship box in dropdown (was nested header)
- [x] Change summary label from "last chapter read" to "last bible study"
- [x] Fix worship album saving (added delay to allow state update before closing modal)
- [ ] Fix free time blocks to only countdown on today's date (not other days)
- [ ] Add progress bar animation to Tasks & Events counter (squiggle when counting, glow when complete)
- [ ] Test all new features end-to-end
- [ ] Save final checkpoint with all improvements

## Phase 7: Event/Ministry Editing

- [x] Add notes field to ScheduleEvent and ScheduleMinistry models
- [x] Create EventEditForm component with all editable fields
- [x] Create MinistryEditForm component with all editable fields
- [x] Add edit button to EventDetailCard and MinistryDetailCard
- [x] Integrate edit forms into detail cards
- [x] Connect edit handlers to update events/ministries in state

## Bible Study Event Completion Fix

- [x] Add Bible Study sessions to schedule list display
- [x] Make Bible Study events tappable to mark as complete
- [x] Update "last chapter read" summary to include completed Bible Study sessions
- [x] Ensure Bible Study completion updates the summary in real-time
- [x] Test Bible Study event completion workflow end-to-end

## Personal Study Box Sync Fix

- [x] Add useEffect to sync currentBibleBook with bibleState changes
- [x] Ensure Personal Study box displays current book and next unread chapter
- [x] Verify real-time updates when Bible chapters are marked as read

## Chapter Completion Animation & Reading Progress

- [x] Add spring zoom animation to checkmark when chapter is marked as read
- [x] Display reading progress (X of Y chapters) in Personal Study box
- [x] Verify animations work smoothly on all platforms
- [x] Test progress display updates in real-time

## Modal Removal & Summary Fix

- [x] Remove modal popups from event/ministry item taps
- [x] Make event/ministry items mark as complete on tap (no modal)
- [x] Verify summary updates when Bible Study events are marked complete
- [x] Confirm getLastChapterRead includes completed Bible Study sessions


## Bible State Sync Issues

- [x] Fix Personal Study box to show current book from unified Bible state (not completed Bible Study sessions)
- [x] Prevent marking chapters in events from changing the current book
- [x] Ensure Personal Study shows actual current book (Lamentations) not last completed chapter
- [x] Summary shows last chapter read from any completed event


## Bible State Sync Fix

- [x] Fix Settings tab (bible-chapters.tsx) to save book statuses to unified storage
- [x] Fix Personal Study box to show current book from Lamentations (not 2 Timothy)
- [x] Ensure changes in Settings tab sync to Schedule tab immediately
- [ ] Add floating "Today" pill that pops up from tab bar


## Phase 7: Worship Album Image Upload Feature

- [x] Fix worship album saving issue where albums weren't persisting after form submission
- [x] Implement image picker for direct album cover uploads instead of URL-only input
- [x] Add formAlbumCoverImage state variable to track uploaded image URI
- [x] Update album preview to display uploaded image with priority over URL
- [x] Replace URL input field with interactive image picker button
- [x] Add "Clear image" button to allow users to remove uploaded image and fall back to URL
- [x] Update handleSaveWorshipList to use uploaded image (formAlbumCoverImage) or URL fallback
- [x] Add pickAlbumCover function using expo-image-picker for image selection
- [x] Write comprehensive tests for image upload workflow and image/URL priority logic
- [x] Verify all 240 tests pass including new image upload tests


## Phase 8: UI Polish & Multi-Day Bible Study Tracker

- [x] Restore ministry badge text labels (show both icon and type name)
- [x] Compact ministry cards (reduced padding and margins for better space efficiency)
- [x] Fix available hours countdown to match free time blocks (exclude completed items from calculation)
- [x] Implement multi-day Bible study tracker with day selector
  - [x] Create day selector UI component with tappable day names
  - [x] Show only days with completed Bible studies (not all 7 days)
  - [x] Add dashed underline to selected day name
  - [x] Auto-update summary when day is selected
  - [x] Show "last {DayName} bible study {book chapter}" format in summary

## Phase 9: Bible Study Completion Persistence

- [x] Implement AsyncStorage persistence for Bible studies
  - [x] Verified existing useEffect hook auto-saves when bibleStudies state changes (line 977-979 in schedule-tab.tsx)
  - [x] Verified loadData function restores state on app load (line 945 in schedule-tab.tsx)
  - [x] Verified completion state (isCompleted, completedAt) is preserved in AsyncStorage
- [x] Test persistence across app restarts
  - [x] Created comprehensive persistence test suite (bible-study-persistence.test.ts)
  - [x] Test: Persist Bible studies to AsyncStorage when created
  - [x] Test: Preserve completion state when persisting Bible studies
  - [x] Test: Load Bible studies from AsyncStorage with completion state intact
  - [x] Test: Handle multiple Bible studies with mixed completion states
  - [x] Test: Preserve all Bible study fields during persistence (notes, times, etc.)
- [x] Verify all tests pass with persistence logic (244 tests passing, 1 skipped)

## Phase 10: Fix Available Hours Calculation

- [x] Fixed available hours mismatch with free time blocks
  - [x] Identified root cause: summary was excluding completed items, but time blocks included them
  - [x] Updated calculateRemainingTime to include completed items (they still block calendar time)
  - [x] Updated schedule-tab.tsx to pass all items (not just incomplete) to calculateRemainingTime
  - [x] Updated test expectations to reflect new behavior
  - [x] All 244 tests passing
  - [x] Available hours in summary now matches free time blocks display

## Phase 11: Fix Bible Study Day Selector Visibility

- [x] Fixed day selector not showing in summary
  - [x] Identified root cause: getUniqueBibleStudyDays included ALL studies, but getLastChapterRead only showed COMPLETED studies
  - [x] Updated getUniqueBibleStudyDays to filter for completed studies only
  - [x] Updated getBibleStudyForDay to filter for completed studies only
  - [x] Day selector now only shows days with completed Bible studies (matching display logic)
  - [x] All 244 tests passing
  - [x] Day selector now visible when user completes a Bible study

## Phase 14: Bible Study Day Selector Fixes

- [x] Fix day selector to auto-default to current calendar day when scrolling (not persist previous selection)
- [x] Add delete button in day selector dropdown to remove Bible studies no longer attending
- [x] Fix "No Monday chapters read" error by reverting getLastChapterRead to show most recent study overall
  - [x] Removed date-aware filtering that was causing "No {Day} chapters read" fallback
  - [x] Now returns day name of most recent study, not filtered by current calendar day
  - [x] Day selector still works independently to navigate between available days

## Phase 15: Bible Study Summary Shows Selected Day Only + 12-Hour Time

- [x] Convert 24-hour military time to 12-hour AM/PM format throughout schedule
  - [x] Added format12HourTime() and formatDecimalTo12Hour() helpers to lib/utils.ts
  - [x] Updated DateTimePicker to show "2 PM" instead of "14"
  - [x] Updated TimelineVisualization hour labels to "6A", "9A", "1P" etc.
  - [x] Updated event and ministry time displays in schedule list
- [x] Bible study summary now shows study for selected day only (not global most recent)
  - [x] getLastChapterRead() now accepts forDate parameter and filters by day of week
  - [x] Summary always shows current calendar day name (e.g., "Tuesday" on Tuesday)
  - [x] Shows "none" if no completed Bible study exists for that day of week
  - [x] Day selector dropdown still allows switching to other days with completed studies

## Phase 16: Ministry Card Compactness + Available Hours Fix

- [x] Make ministry cards more compact (reduce padding/spacing)
- [x] Fix available hours in summary to match/countdown with free time blocks in schedule
- [x] Fix free time block indicators to show 12-hour AM/PM format (currently showing 24-hour like "14:00 → 18:00")

## Phase 17: Time Blocks Only Show on Today

- [x] Free time blocks only appear on today's schedule (not past or future days)

## Phase 18: Time Blocks Today+Future + Ministry Card Fix

- [x] Free time blocks show on today and future days, hidden on past days only
- [x] Today's blocks still count down (expired ones removed), future days show all blocks
- [x] Ministry cards reverted to cleaner multi-line layout (type tag, title, time/bible ref on separate lines)

## Phase 19: Todo Time Indicator

- [x] Show scheduled time below todo title (in primary color, 12-hour format) when startTime is set

## Phase 20: Todo Glow Effect During Active Hour

- [x] Todos with a startTime glow with a pulsing shadow during their scheduled hour
- [x] Glow uses the todo's color (or default purple) and fades after the hour passes
- [x] Completed todos don't glow

## Phase 21: Compact Ministry Cards + Glow Until Complete

- [x] Ministry cards made thinner - type tag and title on same row, time/bible ref on second row
- [x] Reduced card padding for a more compact look
- [x] Glow effect pulses based on card color, stops when marked complete

## Phase 22: Glow on Icon Only + Auto-Activate

- [x] Move glow effect from whole row to just the icon/checkbox circle
- [x] Add 1-minute interval timer so glow activates/deactivates without app restart

## Phase 23: Prominent Glow on Current Todo

- [x] Calculate "current todo" as the first incomplete todo whose time has arrived (or next if none have)
- [x] Apply prominent pulsing glow (like fasting image) to the current todo's icon
- [x] Glow disappears when todo is completed or time passes

## Phase 24: Current Time Indicator Line

- [x] Add a "NOW" indicator line that shows current time in the schedule (today only)
- [x] Insert the line at the chronologically correct position between items

## Phase 25: Fix Time Block Duration Display

- [x] Show actual remaining time (not rounded up) in time block badges (e.g., "9m" instead of "1h")
- [x] Display hours + minutes when both are present (e.g., "1h 15m")

## Phase 26: NOW Indicator Pill Shape

- [x] Move NOW label to the left of the line as a pill-shaped badge

## Phase 27: Fix Time Block Duration Calculation

- [x] Use pre-calculated block label instead of recalculating duration (was causing incorrect hours display)

## Phase 28 (Retry): Pulsing Red Dot on NOW Indicator (Fixed)

- [x] Create separate NowIndicator component to avoid hooks in renderItem
- [x] Add pulsing red dot to NOW pill with proper component structure


## Phase 29: Fix Edit Button on Event and Ministry Cards

- [x] Event cards now open detail modal on tap (instead of toggling completion)
- [x] Ministry cards now open detail modal on tap (instead of toggling completion)
- [x] Context menu edit action opens detail modal for both event and ministry cards

## Current Session Fixes

- [x] Add Personal Study collapsible section to schedule tab (like Fasting/Worship sections) - Enhanced with progress bar, percentage, and improved button styling. Now defaults to expanded for quick access.
- [x] Debug and fix free time block duration calculation (showing wrong hours) - Now shows "Xh Ym" format instead of just hours
- [x] Add icons for Gardening and Water todos (grass and water-drop icons)


## Current Session - Major Updates

- [x] Update chapter summary format to dramatic cliffhanger style ("Last time in..." + "This time in..." + question)
- [x] Clear AsyncStorage cache for old summaries
- [x] Debug and fix free time hour block duration calculation (still showing wrong hours)
- [x] Create missed todos tracker to replace Fasting section
- [x] Make Personal Study card expandable (hide Mark as Read + summary on tap, always show book/chapter/progress)
- [x] Add back arrow button next to Mark as Read button
