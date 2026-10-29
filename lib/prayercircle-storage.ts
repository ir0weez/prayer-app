export const PEOPLE_STORAGE_KEY = "prayercircle.people.v1";
export const PRAYER_STREAK_STORAGE_KEY = "prayercircle.streak.v1";
export const APP_SETTINGS_STORAGE_KEY = "prayercircle.app-settings.v1";
// v315: the Settings page's Backup row shows the REAL last-export
// date. The app never recorded one before this build — the export
// flow stamps this key every time an export actually completes, and
// the row honestly reads "Not exported yet" until the first stamp.
export const LAST_EXPORT_STORAGE_KEY = "prayercircle.last-export.v1";
export const PROFILE_STORAGE_KEY = "prayercircle.profile.v1";
export const FASTS_STORAGE_KEY = "prayercircle.fasts.v1";
export const JOURNAL_STORAGE_KEY = "prayercircle.journal.v2";
export const REACHED_STAMPS_STORAGE_KEY = "prayercircle.reached-stamps.v1";
export const XP_STORAGE_KEY = "prayercircle.xp.v1";
