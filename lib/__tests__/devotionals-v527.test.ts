/**
 * v527 — chapter devotionals are downloads now (Jonathan, Nov 14:
 * "Switch them all to downloadable").
 *
 * What this build changed, and what these pins hold:
 *
 *  1. Hosting: every one of the 265 chapter audios that used to
 *     ship inside the APK (assets/audio/*.m4a, 133,801,258 bytes
 *     in all) was uploaded, byte for byte, to the public
 *     `devotional-library` release on ir0weez/prayer-app, under
 *     the same file names. The registry carries each chapter's
 *     hosted name and exact byte size — pinned below against the
 *     uploaded table, so a registry edit that drifts from the
 *     hosted files fails here, not on his phone.
 *  2. No bundled audio: no .m4a remains under assets/ and the old
 *     require map (lib/devotional-audio.ts) is gone — the APK
 *     carries no devotional audio anymore, the v501 tour pin
 *     extended to chapters.
 *  3. The download state machine (lib/devotional-download.ts),
 *     the Ten Stops model carried to chapters: disk truth at the
 *     exact byte size, progress, cancel cleans the partial, a
 *     wrong-size arrival is discarded, delete removes only the
 *     local file. Download-then-play reads through the same
 *     store: no local source until a verified file is on disk.
 *  4. "Download all" (his words): a book's chapters fetch one at
 *     a time in chapter order, the aggregate is byte-true across
 *     the whole book, a cancel keeps the chapters already landed
 *     and cleans the one in flight.
 *  5. The Downloaded audio page model counts chapter devotionals
 *     alongside the tours — its own CHAPTER DEVOTIONALS group
 *     after TEN STOPS TOURS and before YOUR COMMENTARY · YOUR
 *     VOICE, canonical book order, chapter ascending.
 *
 * Isaiah was NOT here at v527: still in production, it registered
 * later, metadata-only — v528 (below) is that registration, with
 * Obadiah and Jonah beside it.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  devotionalBookTotalBytes,
  devotionalBooks,
  devotionalDownloadUrl,
  devotionalRegistry,
  devotionalsForBook,
  formatClock,
  getDevotional,
  type Devotional,
} from '../devotionals';
import { formatTenStopsSize, getTenStops } from '../ten-stops';
import {
  cancelBookDevotionalDownload,
  cancelDevotionalDownload,
  deleteBookDevotionalDownloads,
  deleteDevotionalDownload,
  devotionalFileUri,
  devotionalLocalSource,
  getBookDevotionalDownloadSnapshot,
  getDevotionalDownloadSnapshot,
  refreshBookDevotionalDownloads,
  refreshDevotionalDownload,
  resetDevotionalDownloadsForTests,
  startBookDevotionalDownload,
  startDevotionalDownload,
  bookDevotionalProgress,
} from '../devotional-download';
import {
  setTenStopsFileSystemForTests,
  type TenStopsFileSystem,
} from '../ten-stops-download';
import {
  downloadsCardModel,
  downloadsPageModel,
  downloadRowMeta,
  getDownloadedAudioSnapshot,
  refreshDownloads,
  removeDownload,
  resetDownloadsForTests,
} from '../downloads';

const tick = () => new Promise((r) => setTimeout(r, 0));

// ─── The hosted table (the uploaded bytes, name → exact size) ───────────────

/** The devotional-library release's assets, exactly as uploaded
 * from the pre-v527 bundled set on 2026-11-14 — plus the v528
 * addition (2026-11-14): Isaiah (66), Obadiah (1) and Jonah (4),
 * squeezed from the NotebookLM masters to the same speech spec
 * (mono 44.1 kHz AAC, 40 kbps) and uploaded to the same release. */
const HOSTED_SIZES: Record<string, number> = {
  "devotional-1corinthians-1.m4a": 521240,
  "devotional-1corinthians-10.m4a": 430921,
  "devotional-1corinthians-11.m4a": 566009,
  "devotional-1corinthians-12.m4a": 505769,
  "devotional-1corinthians-13.m4a": 561915,
  "devotional-1corinthians-14.m4a": 569142,
  "devotional-1corinthians-15.m4a": 537694,
  "devotional-1corinthians-16.m4a": 462806,
  "devotional-1corinthians-2.m4a": 433369,
  "devotional-1corinthians-3.m4a": 506127,
  "devotional-1corinthians-4.m4a": 493679,
  "devotional-1corinthians-5.m4a": 532046,
  "devotional-1corinthians-6.m4a": 558032,
  "devotional-1corinthians-7.m4a": 466325,
  "devotional-1corinthians-8.m4a": 533062,
  "devotional-1corinthians-9.m4a": 492482,
  "devotional-1kings-1.m4a": 511212,
  "devotional-1kings-10.m4a": 502291,
  "devotional-1kings-11.m4a": 452810,
  "devotional-1kings-12.m4a": 535810,
  "devotional-1kings-13.m4a": 533071,
  "devotional-1kings-14.m4a": 492258,
  "devotional-1kings-15.m4a": 457755,
  "devotional-1kings-16.m4a": 577407,
  "devotional-1kings-17.m4a": 519360,
  "devotional-1kings-18.m4a": 471339,
  "devotional-1kings-19.m4a": 458119,
  "devotional-1kings-2.m4a": 569606,
  "devotional-1kings-20.m4a": 522976,
  "devotional-1kings-21.m4a": 492863,
  "devotional-1kings-22.m4a": 608270,
  "devotional-1kings-3.m4a": 520305,
  "devotional-1kings-4.m4a": 588700,
  "devotional-1kings-5.m4a": 480416,
  "devotional-1kings-6.m4a": 509380,
  "devotional-1kings-7.m4a": 522790,
  "devotional-1kings-8.m4a": 471616,
  "devotional-1kings-9.m4a": 491125,
  "devotional-1samuel-1.m4a": 539909,
  "devotional-1samuel-10.m4a": 496954,
  "devotional-1samuel-11.m4a": 547429,
  "devotional-1samuel-12.m4a": 476622,
  "devotional-1samuel-13.m4a": 486336,
  "devotional-1samuel-14.m4a": 525125,
  "devotional-1samuel-15.m4a": 527323,
  "devotional-1samuel-16.m4a": 517162,
  "devotional-1samuel-17.m4a": 450512,
  "devotional-1samuel-18.m4a": 466594,
  "devotional-1samuel-19.m4a": 480701,
  "devotional-1samuel-2.m4a": 571936,
  "devotional-1samuel-20.m4a": 548474,
  "devotional-1samuel-21.m4a": 464060,
  "devotional-1samuel-22.m4a": 506666,
  "devotional-1samuel-23.m4a": 431212,
  "devotional-1samuel-24.m4a": 485574,
  "devotional-1samuel-25.m4a": 523744,
  "devotional-1samuel-26.m4a": 454820,
  "devotional-1samuel-27.m4a": 493494,
  "devotional-1samuel-28.m4a": 464194,
  "devotional-1samuel-29.m4a": 516836,
  "devotional-1samuel-3.m4a": 575273,
  "devotional-1samuel-30.m4a": 523616,
  "devotional-1samuel-31.m4a": 569772,
  "devotional-1samuel-4.m4a": 528083,
  "devotional-1samuel-5.m4a": 519176,
  "devotional-1samuel-6.m4a": 564743,
  "devotional-1samuel-7.m4a": 522150,
  "devotional-1samuel-8.m4a": 479263,
  "devotional-1samuel-9.m4a": 485721,
  "devotional-2corinthians-1.m4a": 479996,
  "devotional-2corinthians-10.m4a": 607179,
  "devotional-2corinthians-11.m4a": 578027,
  "devotional-2corinthians-12.m4a": 592354,
  "devotional-2corinthians-13.m4a": 484999,
  "devotional-2corinthians-2.m4a": 481226,
  "devotional-2corinthians-3.m4a": 561804,
  "devotional-2corinthians-4.m4a": 483601,
  "devotional-2corinthians-5.m4a": 509401,
  "devotional-2corinthians-6.m4a": 496762,
  "devotional-2corinthians-7.m4a": 508713,
  "devotional-2corinthians-8.m4a": 472851,
  "devotional-2corinthians-9.m4a": 470836,
  "devotional-2kings-1.m4a": 496517,
  "devotional-2kings-10.m4a": 584477,
  "devotional-2kings-11.m4a": 495720,
  "devotional-2kings-12.m4a": 465238,
  "devotional-2kings-13.m4a": 519221,
  "devotional-2kings-14.m4a": 461316,
  "devotional-2kings-15.m4a": 562768,
  "devotional-2kings-16.m4a": 495853,
  "devotional-2kings-17.m4a": 586569,
  "devotional-2kings-18.m4a": 547755,
  "devotional-2kings-19.m4a": 472560,
  "devotional-2kings-2.m4a": 555357,
  "devotional-2kings-20.m4a": 512666,
  "devotional-2kings-21.m4a": 492230,
  "devotional-2kings-22.m4a": 503951,
  "devotional-2kings-23.m4a": 583922,
  "devotional-2kings-24.m4a": 551346,
  "devotional-2kings-25.m4a": 560015,
  "devotional-2kings-3.m4a": 463641,
  "devotional-2kings-4.m4a": 499639,
  "devotional-2kings-5.m4a": 517269,
  "devotional-2kings-6.m4a": 582949,
  "devotional-2kings-7.m4a": 460872,
  "devotional-2kings-8.m4a": 477884,
  "devotional-2kings-9.m4a": 658797,
  "devotional-2samuel-1.m4a": 512622,
  "devotional-2samuel-10.m4a": 557987,
  "devotional-2samuel-11.m4a": 524957,
  "devotional-2samuel-12.m4a": 532627,
  "devotional-2samuel-13.m4a": 521583,
  "devotional-2samuel-14.m4a": 507326,
  "devotional-2samuel-15.m4a": 564603,
  "devotional-2samuel-16.m4a": 538983,
  "devotional-2samuel-17.m4a": 474957,
  "devotional-2samuel-18.m4a": 516358,
  "devotional-2samuel-19.m4a": 572375,
  "devotional-2samuel-2.m4a": 477599,
  "devotional-2samuel-20.m4a": 458795,
  "devotional-2samuel-21.m4a": 535033,
  "devotional-2samuel-22.m4a": 556227,
  "devotional-2samuel-23.m4a": 535187,
  "devotional-2samuel-24.m4a": 501330,
  "devotional-2samuel-3.m4a": 499825,
  "devotional-2samuel-4.m4a": 442558,
  "devotional-2samuel-5.m4a": 523662,
  "devotional-2samuel-6.m4a": 527698,
  "devotional-2samuel-7.m4a": 548452,
  "devotional-2samuel-8.m4a": 477820,
  "devotional-2samuel-9.m4a": 482976,
  "devotional-acts-1.m4a": 549683,
  "devotional-acts-10.m4a": 494706,
  "devotional-acts-11.m4a": 463381,
  "devotional-acts-12.m4a": 459958,
  "devotional-acts-13.m4a": 445164,
  "devotional-acts-14.m4a": 450670,
  "devotional-acts-15.m4a": 490153,
  "devotional-acts-16.m4a": 547547,
  "devotional-acts-17.m4a": 513946,
  "devotional-acts-18.m4a": 523281,
  "devotional-acts-19.m4a": 471365,
  "devotional-acts-2.m4a": 526482,
  "devotional-acts-20.m4a": 554910,
  "devotional-acts-21.m4a": 498275,
  "devotional-acts-22.m4a": 484633,
  "devotional-acts-23.m4a": 522614,
  "devotional-acts-24.m4a": 503859,
  "devotional-acts-25.m4a": 503219,
  "devotional-acts-26.m4a": 517225,
  "devotional-acts-27.m4a": 526240,
  "devotional-acts-28.m4a": 524126,
  "devotional-acts-3.m4a": 565018,
  "devotional-acts-4.m4a": 498418,
  "devotional-acts-5.m4a": 524486,
  "devotional-acts-6.m4a": 542866,
  "devotional-acts-7.m4a": 480225,
  "devotional-acts-8.m4a": 478600,
  "devotional-acts-9.m4a": 542121,
  "devotional-deuteronomy-1.m4a": 515334,
  "devotional-deuteronomy-10.m4a": 504854,
  "devotional-deuteronomy-11.m4a": 505284,
  "devotional-deuteronomy-12.m4a": 477353,
  "devotional-deuteronomy-13.m4a": 463475,
  "devotional-deuteronomy-14.m4a": 442524,
  "devotional-deuteronomy-15.m4a": 446936,
  "devotional-deuteronomy-16.m4a": 463834,
  "devotional-deuteronomy-17.m4a": 509208,
  "devotional-deuteronomy-18.m4a": 540729,
  "devotional-deuteronomy-19.m4a": 489231,
  "devotional-deuteronomy-2.m4a": 461419,
  "devotional-deuteronomy-20.m4a": 502050,
  "devotional-deuteronomy-21.m4a": 562701,
  "devotional-deuteronomy-22.m4a": 572937,
  "devotional-deuteronomy-23.m4a": 571153,
  "devotional-deuteronomy-24.m4a": 520900,
  "devotional-deuteronomy-25.m4a": 539660,
  "devotional-deuteronomy-26.m4a": 570921,
  "devotional-deuteronomy-27.m4a": 470247,
  "devotional-deuteronomy-28.m4a": 534800,
  "devotional-deuteronomy-29.m4a": 588062,
  "devotional-deuteronomy-3.m4a": 522316,
  "devotional-deuteronomy-30.m4a": 440540,
  "devotional-deuteronomy-31.m4a": 489887,
  "devotional-deuteronomy-32.m4a": 584948,
  "devotional-deuteronomy-33.m4a": 501069,
  "devotional-deuteronomy-34.m4a": 467500,
  "devotional-deuteronomy-4.m4a": 551953,
  "devotional-deuteronomy-5.m4a": 453131,
  "devotional-deuteronomy-6.m4a": 513249,
  "devotional-deuteronomy-7.m4a": 487401,
  "devotional-deuteronomy-8.m4a": 453330,
  "devotional-deuteronomy-9.m4a": 507660,
  "devotional-ecclesiastes-1.m4a": 525787,
  "devotional-ecclesiastes-10.m4a": 434789,
  "devotional-ecclesiastes-11.m4a": 500371,
  "devotional-ecclesiastes-12.m4a": 480995,
  "devotional-ecclesiastes-2.m4a": 488365,
  "devotional-ecclesiastes-3.m4a": 522330,
  "devotional-ecclesiastes-4.m4a": 502499,
  "devotional-ecclesiastes-5.m4a": 495833,
  "devotional-ecclesiastes-6.m4a": 469836,
  "devotional-ecclesiastes-7.m4a": 538785,
  "devotional-ecclesiastes-8.m4a": 400604,
  "devotional-ecclesiastes-9.m4a": 435031,
  "devotional-genesis-1.m4a": 485922,
  "devotional-genesis-10.m4a": 558391,
  "devotional-genesis-11.m4a": 433683,
  "devotional-genesis-12.m4a": 503168,
  "devotional-genesis-13.m4a": 503142,
  "devotional-genesis-14.m4a": 473819,
  "devotional-genesis-15.m4a": 428724,
  "devotional-genesis-16.m4a": 388825,
  "devotional-genesis-17.m4a": 462905,
  "devotional-genesis-18.m4a": 516811,
  "devotional-genesis-19.m4a": 422897,
  "devotional-genesis-2.m4a": 454543,
  "devotional-genesis-20.m4a": 471883,
  "devotional-genesis-21.m4a": 430225,
  "devotional-genesis-22.m4a": 444470,
  "devotional-genesis-23.m4a": 489310,
  "devotional-genesis-24.m4a": 508464,
  "devotional-genesis-25.m4a": 451694,
  "devotional-genesis-26.m4a": 471916,
  "devotional-genesis-27.m4a": 470256,
  "devotional-genesis-28.m4a": 487127,
  "devotional-genesis-29.m4a": 466341,
  "devotional-genesis-3.m4a": 454155,
  "devotional-genesis-30.m4a": 461398,
  "devotional-genesis-31.m4a": 469818,
  "devotional-genesis-32.m4a": 502111,
  "devotional-genesis-33.m4a": 624659,
  "devotional-genesis-34.m4a": 472181,
  "devotional-genesis-35.m4a": 546544,
  "devotional-genesis-36.m4a": 472505,
  "devotional-genesis-37.m4a": 516466,
  "devotional-genesis-38.m4a": 460678,
  "devotional-genesis-39.m4a": 502343,
  "devotional-genesis-4.m4a": 507333,
  "devotional-genesis-40.m4a": 508021,
  "devotional-genesis-41.m4a": 514162,
  "devotional-genesis-42.m4a": 486154,
  "devotional-genesis-43.m4a": 571855,
  "devotional-genesis-44.m4a": 524673,
  "devotional-genesis-45.m4a": 520899,
  "devotional-genesis-46.m4a": 517456,
  "devotional-genesis-47.m4a": 524769,
  "devotional-genesis-48.m4a": 546002,
  "devotional-genesis-49.m4a": 484386,
  "devotional-genesis-5.m4a": 532741,
  "devotional-genesis-50.m4a": 515547,
  "devotional-genesis-6.m4a": 444438,
  "devotional-genesis-7.m4a": 553029,
  "devotional-genesis-8.m4a": 549181,
  "devotional-genesis-9.m4a": 496470,
  "devotional-isaiah-1.m4a": 548391,
  "devotional-isaiah-10.m4a": 537517,
  "devotional-isaiah-11.m4a": 477878,
  "devotional-isaiah-12.m4a": 408248,
  "devotional-isaiah-13.m4a": 550480,
  "devotional-isaiah-14.m4a": 434479,
  "devotional-isaiah-15.m4a": 488873,
  "devotional-isaiah-16.m4a": 499290,
  "devotional-isaiah-17.m4a": 455072,
  "devotional-isaiah-18.m4a": 440508,
  "devotional-isaiah-19.m4a": 434649,
  "devotional-isaiah-2.m4a": 444669,
  "devotional-isaiah-20.m4a": 489004,
  "devotional-isaiah-21.m4a": 513518,
  "devotional-isaiah-22.m4a": 550214,
  "devotional-isaiah-23.m4a": 466359,
  "devotional-isaiah-24.m4a": 529077,
  "devotional-isaiah-25.m4a": 450685,
  "devotional-isaiah-26.m4a": 504279,
  "devotional-isaiah-27.m4a": 522764,
  "devotional-isaiah-28.m4a": 435144,
  "devotional-isaiah-29.m4a": 557815,
  "devotional-isaiah-3.m4a": 499744,
  "devotional-isaiah-30.m4a": 453106,
  "devotional-isaiah-31.m4a": 500693,
  "devotional-isaiah-32.m4a": 529384,
  "devotional-isaiah-33.m4a": 475140,
  "devotional-isaiah-34.m4a": 574282,
  "devotional-isaiah-35.m4a": 480228,
  "devotional-isaiah-36.m4a": 596228,
  "devotional-isaiah-37.m4a": 481720,
  "devotional-isaiah-38.m4a": 484493,
  "devotional-isaiah-39.m4a": 453143,
  "devotional-isaiah-4.m4a": 490751,
  "devotional-isaiah-40.m4a": 486555,
  "devotional-isaiah-41.m4a": 471763,
  "devotional-isaiah-42.m4a": 464782,
  "devotional-isaiah-43.m4a": 497476,
  "devotional-isaiah-44.m4a": 515008,
  "devotional-isaiah-45.m4a": 437988,
  "devotional-isaiah-46.m4a": 516609,
  "devotional-isaiah-47.m4a": 521529,
  "devotional-isaiah-48.m4a": 559154,
  "devotional-isaiah-49.m4a": 464529,
  "devotional-isaiah-5.m4a": 545464,
  "devotional-isaiah-50.m4a": 485628,
  "devotional-isaiah-51.m4a": 569090,
  "devotional-isaiah-52.m4a": 465642,
  "devotional-isaiah-53.m4a": 480953,
  "devotional-isaiah-54.m4a": 465942,
  "devotional-isaiah-55.m4a": 453122,
  "devotional-isaiah-56.m4a": 538439,
  "devotional-isaiah-57.m4a": 518554,
  "devotional-isaiah-58.m4a": 490990,
  "devotional-isaiah-59.m4a": 530759,
  "devotional-isaiah-6.m4a": 530788,
  "devotional-isaiah-60.m4a": 466994,
  "devotional-isaiah-61.m4a": 498049,
  "devotional-isaiah-62.m4a": 552857,
  "devotional-isaiah-63.m4a": 598260,
  "devotional-isaiah-64.m4a": 504884,
  "devotional-isaiah-65.m4a": 520904,
  "devotional-isaiah-66.m4a": 545891,
  "devotional-isaiah-7.m4a": 551106,
  "devotional-isaiah-8.m4a": 516790,
  "devotional-isaiah-9.m4a": 551945,
  "devotional-jonah-1.m4a": 528847,
  "devotional-jonah-2.m4a": 526294,
  "devotional-jonah-3.m4a": 484734,
  "devotional-jonah-4.m4a": 467914,
  "devotional-joshua-1.m4a": 490329,
  "devotional-joshua-10.m4a": 480364,
  "devotional-joshua-11.m4a": 565346,
  "devotional-joshua-12.m4a": 588201,
  "devotional-joshua-13.m4a": 469636,
  "devotional-joshua-14.m4a": 491969,
  "devotional-joshua-15.m4a": 506034,
  "devotional-joshua-16.m4a": 502513,
  "devotional-joshua-17.m4a": 560932,
  "devotional-joshua-18.m4a": 485817,
  "devotional-joshua-19.m4a": 458489,
  "devotional-joshua-2.m4a": 459440,
  "devotional-joshua-20.m4a": 567256,
  "devotional-joshua-21.m4a": 522995,
  "devotional-joshua-22.m4a": 456866,
  "devotional-joshua-23.m4a": 542338,
  "devotional-joshua-24.m4a": 561214,
  "devotional-joshua-3.m4a": 502684,
  "devotional-joshua-4.m4a": 515996,
  "devotional-joshua-5.m4a": 486751,
  "devotional-joshua-6.m4a": 511482,
  "devotional-joshua-7.m4a": 553939,
  "devotional-joshua-8.m4a": 509862,
  "devotional-joshua-9.m4a": 541400,
  "devotional-mark-1.m4a": 467723,
  "devotional-mark-10.m4a": 497205,
  "devotional-mark-11.m4a": 556927,
  "devotional-mark-12.m4a": 497195,
  "devotional-mark-13.m4a": 465270,
  "devotional-mark-14.m4a": 470526,
  "devotional-mark-15.m4a": 531946,
  "devotional-mark-16.m4a": 497948,
  "devotional-mark-2.m4a": 513773,
  "devotional-mark-3.m4a": 571494,
  "devotional-mark-4.m4a": 433638,
  "devotional-mark-5.m4a": 589409,
  "devotional-mark-6.m4a": 490086,
  "devotional-mark-7.m4a": 496506,
  "devotional-mark-8.m4a": 560425,
  "devotional-mark-9.m4a": 493794,
  "devotional-obadiah-1.m4a": 526374,
  "devotional-proverbs-1.m4a": 452226,
  "devotional-proverbs-10.m4a": 506279,
  "devotional-proverbs-11.m4a": 503555,
  "devotional-proverbs-12.m4a": 565237,
  "devotional-proverbs-13.m4a": 436837,
  "devotional-proverbs-14.m4a": 426223,
  "devotional-proverbs-15.m4a": 488825,
  "devotional-proverbs-16.m4a": 485628,
  "devotional-proverbs-17.m4a": 459073,
  "devotional-proverbs-18.m4a": 483779,
  "devotional-proverbs-19.m4a": 533974,
  "devotional-proverbs-2.m4a": 432509,
  "devotional-proverbs-20.m4a": 497758,
  "devotional-proverbs-21.m4a": 428046,
  "devotional-proverbs-22.m4a": 504895,
  "devotional-proverbs-23.m4a": 486571,
  "devotional-proverbs-24.m4a": 427748,
  "devotional-proverbs-25.m4a": 509858,
  "devotional-proverbs-26.m4a": 498566,
  "devotional-proverbs-27.m4a": 438420,
  "devotional-proverbs-28.m4a": 533336,
  "devotional-proverbs-29.m4a": 536708,
  "devotional-proverbs-3.m4a": 495073,
  "devotional-proverbs-30.m4a": 491335,
  "devotional-proverbs-31.m4a": 513795,
  "devotional-proverbs-4.m4a": 530128,
  "devotional-proverbs-5.m4a": 498677,
  "devotional-proverbs-6.m4a": 525623,
  "devotional-proverbs-7.m4a": 492926,
  "devotional-proverbs-8.m4a": 485569,
  "devotional-proverbs-9.m4a": 516707,
  "devotional-ruth-1.m4a": 632525,
  "devotional-ruth-2.m4a": 568361,
  "devotional-ruth-3.m4a": 514342,
  "devotional-ruth-4.m4a": 464318,
  "devotional-songofsolomon-1.m4a": 449065,
  "devotional-songofsolomon-2.m4a": 528064,
  "devotional-songofsolomon-3.m4a": 499534,
  "devotional-songofsolomon-4.m4a": 473620,
  "devotional-songofsolomon-5.m4a": 526355,
  "devotional-songofsolomon-6.m4a": 527316,
  "devotional-songofsolomon-7.m4a": 454163,
  "devotional-songofsolomon-8.m4a": 486522,
};

const BOOK_COUNTS: Record<string, number> = {
  Genesis: 50,
  Deuteronomy: 34,
  Joshua: 24,
  Ruth: 4,
  '1 Samuel': 31,
  '2 Samuel': 24,
  '1 Kings': 22,
  '2 Kings': 25,
  Proverbs: 31,
  Ecclesiastes: 12,
  'Song of Solomon': 8,
  Isaiah: 66,
  Obadiah: 1,
  Jonah: 4,
  Mark: 16,
  Acts: 28,
  '1 Corinthians': 16,
  '2 Corinthians': 13,
};

const BOOK_SLUGS: Record<string, string> = {
  Genesis: 'genesis',
  Deuteronomy: 'deuteronomy',
  Joshua: 'joshua',
  Ruth: 'ruth',
  '1 Samuel': '1samuel',
  '2 Samuel': '2samuel',
  '1 Kings': '1kings',
  '2 Kings': '2kings',
  Proverbs: 'proverbs',
  Ecclesiastes: 'ecclesiastes',
  'Song of Solomon': 'songofsolomon',
  Isaiah: 'isaiah',
  Obadiah: 'obadiah',
  Jonah: 'jonah',
  Mark: 'mark',
  Acts: 'acts',
  '1 Corinthians': '1corinthians',
  '2 Corinthians': '2corinthians',
};

// ─── The fake file system (the v501 harness, carried over) ──────────────────

interface PendingDownload {
  url: string;
  fileUri: string;
  callback: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void;
  resolve: (r: { uri: string; status: number } | undefined) => void;
  reject: (e: unknown) => void;
  pauseCalls: number;
}

function makeFakeFileSystem() {
  const files = new Map<string, number>();
  const pending: PendingDownload[] = [];
  const fs: TenStopsFileSystem = {
    documentDirectory: 'file:///docs/',
    getInfoAsync: async (path: string) =>
      files.has(path)
        ? { exists: true, size: files.get(path), modificationTime: 1000 }
        : { exists: false },
    makeDirectoryAsync: async () => undefined,
    deleteAsync: async (path: string) => {
      files.delete(path);
    },
    createDownloadResumable: (url, fileUri, callback) => {
      let resolveFn!: PendingDownload['resolve'];
      let rejectFn!: PendingDownload['reject'];
      const promise = new Promise<{ uri: string; status: number } | undefined>((res, rej) => {
        resolveFn = res;
        rejectFn = rej;
      });
      const item: PendingDownload = {
        url,
        fileUri,
        callback,
        resolve: resolveFn,
        reject: rejectFn,
        pauseCalls: 0,
      };
      pending.push(item);
      return {
        downloadAsync: () => promise,
        pauseAsync: async () => {
          item.pauseCalls += 1;
          item.resolve(undefined);
        },
      };
    },
  };
  return { fs, files, pending };
}

let fake = makeFakeFileSystem();

beforeEach(() => {
  fake = makeFakeFileSystem();
  resetDevotionalDownloadsForTests();
  resetDownloadsForTests();
  setTenStopsFileSystemForTests(fake.fs);
});

afterAll(() => {
  setTenStopsFileSystemForTests(null);
  resetDevotionalDownloadsForTests();
  resetDownloadsForTests();
});

const uriFor = (d: Devotional) => `file:///docs/devotionals/${d.audioFile}`;

/** The store's snapshot for one chapter entry. */
const snap = (d: Devotional) => getDevotionalDownloadSnapshot(d.book, d.chapter);

/** Start a chapter download and wait until its transfer is parked. */
async function startAndPark(d: Devotional) {
  const done = startDevotionalDownload(d);
  await tick();
  const transfer = fake.pending[fake.pending.length - 1];
  expect(transfer).toBeDefined();
  return { done, transfer };
}

/** Drive a parked transfer to a verified landing. */
async function land(transfer: PendingDownload, d: Devotional) {
  fake.files.set(transfer.fileUri, d.sizeBytes!);
  transfer.resolve({ uri: transfer.fileUri, status: 200 });
  await tick();
  await tick();
}

// ─── The registry ↔ hosting integrity ───────────────────────────────────────

describe('v527 registry — every chapter carries its hosted name and exact size', () => {
  // v528 RE-BASE (2026-11-14): the library grew 265 → 336 chapters,
  // 11 → 14 books — Isaiah (66), Obadiah (1) and Jonah (4) registered
  // metadata-only, their audio hosted in this same release.
  // v529 RE-BASE (2026-11-14): the library grew 336 → 380 chapters,
  // 14 → 16 books — Mark (16) and Acts (28) registered metadata-only,
  // their audio hosted in this same release.
  // v530 RE-BASE (2026-11-15): the library grew 380 → 409 chapters,
  // 16 → 18 books — 1 Corinthians (16) and 2 Corinthians (13)
  // registered metadata-only, their audio hosted in this same
  // release.
  it('the library now stands at 409 chapters across 18 books', () => {
    const all = devotionalRegistry();
    expect(all.length).toBe(409);
    expect(devotionalBooks()).toEqual(Object.keys(BOOK_COUNTS));
    for (const [book, count] of Object.entries(BOOK_COUNTS)) {
      expect(devotionalsForBook(book).length, book).toBe(count);
    }
  });

  it('every entry names its hosted asset, in the hosted pattern, uniquely', () => {
    const seen = new Set<string>();
    for (const d of devotionalRegistry()) {
      expect(d.bookLevel).toBeFalsy();
      expect(d.audioFile).toBe(`devotional-${BOOK_SLUGS[d.book]}-${d.chapter}.m4a`);
      expect(seen.has(d.audioFile)).toBe(false);
      seen.add(d.audioFile);
    }
    expect(seen.size).toBe(409);
  });

  it('every sizeBytes is the hosted file’s exact size', () => {
    for (const d of devotionalRegistry()) {
      expect(d.sizeBytes, d.audioFile).toBe(HOSTED_SIZES[d.audioFile]);
      expect(d.sizeBytes).toBeGreaterThan(0);
    }
    // The hosted table itself is complete: nothing hosted that is
    // not registered, nothing registered that is not hosted.
    expect(Object.keys(HOSTED_SIZES).length).toBe(409);
  });

  // v528 RE-BASE (2026-11-14): the hosted total grew by the three
  // new books' 35,610,432 bytes (Isaiah 33,076,269 + Obadiah
  // 526,374 + Jonah 2,007,789).
  // v529 RE-BASE (2026-11-14): the hosted total grew by the two
  // new books' 22,337,036 bytes (Mark 8,133,865 + Acts 14,203,171).
  // v530 RE-BASE (2026-11-15): the hosted total grew by the two
  // new books' 14,898,367 bytes (1 Corinthians 8,170,618 +
  // 2 Corinthians 6,727,749).
  it('the whole library is 206,647,093 hosted bytes', () => {
    const total = devotionalRegistry().reduce((a, d) => a + (d.sizeBytes ?? 0), 0);
    expect(total).toBe(206_647_093);
    for (const book of devotionalBooks()) {
      const bookTotal = devotionalsForBook(book).reduce((a, d) => a + (d.sizeBytes ?? 0), 0);
      expect(devotionalBookTotalBytes(book), book).toBe(bookTotal);
      expect(bookTotal).toBeGreaterThan(0);
    }
    expect(devotionalBookTotalBytes('Galatians')).toBe(0);
  });

  it('the download URL is the devotional-library release asset', () => {
    const ruth1 = getDevotional('Ruth', 1)!;
    const url = new URL(devotionalDownloadUrl(ruth1));
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('github.com');
    expect(url.pathname).toBe(
      '/ir0weez/prayer-app/releases/download/devotional-library/devotional-ruth-1.m4a',
    );
  });

  // v528 RE-BASE (2026-11-14): Isaiah HAS arrived — registered
  // metadata-only with Obadiah and Jonah, downloadable from the
  // start; the full per-book pins live in devotionals-v528.test.ts.
  // The not-yet seat moves on to Jeremiah.
  // v529 RE-BASE (2026-11-14): Mark and Acts HAVE arrived —
  // registered metadata-only, downloadable from the start; the
  // full per-book pins live in devotionals-v529.test.ts. The
  // not-yet seat moves on to Romans.
  // v530 RE-BASE (2026-11-15): 1 Corinthians and 2 Corinthians
  // HAVE arrived — registered metadata-only, downloadable from
  // the start; the full per-book pins live in
  // devotionals-v530.test.ts. The not-yet seat moves on to
  // Galatians.
  it('1 Corinthians and 2 Corinthians are registered now (v530) — Galatians is the not-yet book', () => {
    expect(getDevotional('1 Corinthians', 1)).not.toBeNull();
    expect(getDevotional('1 Corinthians', 16)).not.toBeNull();
    expect(devotionalsForBook('1 Corinthians').length).toBe(16);
    expect(devotionalBooks()).toContain('1 Corinthians');
    expect(getDevotional('2 Corinthians', 1)).not.toBeNull();
    expect(getDevotional('2 Corinthians', 13)).not.toBeNull();
    expect(devotionalsForBook('2 Corinthians').length).toBe(13);
    expect(devotionalBooks()).toContain('2 Corinthians');
    expect(getDevotional('Galatians', 1)).toBeNull();
    expect(devotionalsForBook('Galatians')).toEqual([]);
    expect(devotionalBooks()).not.toContain('Galatians');
  });
});

describe('v527 — no bundled devotional audio remains', () => {
  it('no .m4a stands anywhere under assets/', () => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith('.m4a')) found.push(p);
      }
    };
    walk(join(process.cwd(), 'assets'));
    expect(found).toEqual([]);
  });

  it('the bundled require map is gone', () => {
    expect(existsSync(join(process.cwd(), 'lib', 'devotional-audio.ts'))).toBe(false);
  });

  it('the listen view resolves chapters through the download store, never a bundle', () => {
    const src = readFileSync(join(process.cwd(), 'components', 'devotional-listen.tsx'), 'utf8');
    expect(src).not.toContain('devotional-audio');
    expect(src).toContain('refreshDevotionalDownload');
    expect(src).toContain('startDevotionalDownload');
    expect(src).toContain('devotionalLocalSource');
  });
});

// ─── The chapter download state machine ─────────────────────────────────────

describe('v527 chapter download state machine', () => {
  const ruth1 = () => getDevotional('Ruth', 1)!;

  it('idle → downloading (real progress) → ready, verified by exact size', async () => {
    const d = ruth1();
    expect(snap(d)).toEqual({ status: 'idle' });
    expect(devotionalLocalSource(d)).toBeNull();
    const { done, transfer } = await startAndPark(d);
    expect(transfer.url).toBe(devotionalDownloadUrl(d));
    expect(transfer.fileUri).toBe(uriFor(d));
    expect(devotionalFileUri(fake.fs, d)).toBe(uriFor(d));
    transfer.callback({
      totalBytesWritten: Math.floor(d.sizeBytes! / 2),
      totalBytesExpectedToWrite: d.sizeBytes!,
    });
    const mid = snap(d);
    expect(mid.status).toBe('downloading');
    if (mid.status === 'downloading') expect(mid.fraction).toBeCloseTo(0.5, 2);
    await land(transfer, d);
    await done;
    expect(snap(d)).toEqual({ status: 'ready' });
    // Download-then-play's source: the local file, only now.
    expect(devotionalLocalSource(d)).toEqual({ uri: uriFor(d) });
  });

  it('a wrong-size arrival is discarded — never kept as ready', async () => {
    const d = ruth1();
    const { done, transfer } = await startAndPark(d);
    fake.files.set(transfer.fileUri, 12345);
    transfer.resolve({ uri: transfer.fileUri, status: 200 });
    await done;
    expect(snap(d).status).toBe('error');
    expect(fake.files.has(transfer.fileUri)).toBe(false);
    expect(devotionalLocalSource(d)).toBeNull();
  });

  it('a failed transfer errors and leaves no file behind', async () => {
    const d = ruth1();
    const { done, transfer } = await startAndPark(d);
    fake.files.set(transfer.fileUri, 999);
    transfer.reject(new Error('network down'));
    await done;
    expect(snap(d).status).toBe('error');
    expect(fake.files.has(transfer.fileUri)).toBe(false);
  });

  it('cancel pauses, removes the partial, and settles to idle', async () => {
    const d = ruth1();
    const { done, transfer } = await startAndPark(d);
    transfer.callback({ totalBytesWritten: 100000, totalBytesExpectedToWrite: d.sizeBytes! });
    fake.files.set(transfer.fileUri, 100000);
    await cancelDevotionalDownload(d);
    await done;
    expect(transfer.pauseCalls).toBe(1);
    expect(snap(d)).toEqual({ status: 'idle' });
    expect(fake.files.has(transfer.fileUri)).toBe(false);
  });

  it('a second start while one is in flight is a no-op', async () => {
    const d = ruth1();
    const first = await startAndPark(d);
    await startDevotionalDownload(d);
    expect(fake.pending.length).toBe(1);
    await land(first.transfer, d);
    await first.done;
    expect(snap(d)).toEqual({ status: 'ready' });
  });

  it('delete removes only the local file and settles to idle', async () => {
    const d = ruth1();
    const { done, transfer } = await startAndPark(d);
    await land(transfer, d);
    await done;
    await deleteDevotionalDownload(d);
    expect(snap(d)).toEqual({ status: 'idle' });
    expect(fake.files.has(uriFor(d))).toBe(false);
    expect(devotionalLocalSource(d)).toBeNull();
  });

  it('refresh reads the disk: an exact file is ready with no transfer at all', async () => {
    const d = ruth1();
    fake.files.set(uriFor(d), d.sizeBytes!);
    const s = await refreshDevotionalDownload(d);
    expect(s).toEqual({ status: 'ready' });
    expect(fake.pending.length).toBe(0);
    expect(devotionalLocalSource(d)).toEqual({ uri: uriFor(d) });
  });

  it('refresh discards a wrong-size file standing on disk', async () => {
    const d = ruth1();
    fake.files.set(uriFor(d), d.sizeBytes! - 1);
    const s = await refreshDevotionalDownload(d);
    expect(s).toEqual({ status: 'idle' });
    expect(fake.files.has(uriFor(d))).toBe(false);
  });
});

// ─── Download all: the book aggregate ───────────────────────────────────────

describe('v527 Download all — sequential, byte-true, cancellable', () => {
  const ruth = () => devotionalsForBook('Ruth');

  it('downloads every chapter in order, one transfer at a time', async () => {
    const done = startBookDevotionalDownload('Ruth');
    await tick();
    expect(getBookDevotionalDownloadSnapshot('Ruth').status).toBe('downloading');
    for (const d of ruth()) {
      // Exactly one transfer is ever in flight, and it is this
      // chapter's, in chapter order.
      const transfer = fake.pending[fake.pending.length - 1];
      expect(transfer.fileUri).toBe(uriFor(d));
      await land(transfer, d);
    }
    await done;
    expect(getBookDevotionalDownloadSnapshot('Ruth')).toEqual({ status: 'idle' });
    const p = bookDevotionalProgress('Ruth');
    expect(p.allDownloaded).toBe(true);
    expect(p.downloadedCount).toBe(4);
    expect(p.downloadedBytes).toBe(p.totalBytes);
    expect(p.totalBytes).toBe(devotionalBookTotalBytes('Ruth'));
    for (const d of ruth()) expect(devotionalLocalSource(d)).toEqual({ uri: uriFor(d) });
  });

  it('the aggregate fraction is bytes across the whole book', async () => {
    const chapters = ruth();
    const done = startBookDevotionalDownload('Ruth');
    await tick();
    await land(fake.pending[fake.pending.length - 1], chapters[0]);
    const second = fake.pending[fake.pending.length - 1];
    second.callback({
      totalBytesWritten: Math.floor(chapters[1].sizeBytes! / 2),
      totalBytesExpectedToWrite: chapters[1].sizeBytes!,
    });
    const run = getBookDevotionalDownloadSnapshot('Ruth');
    expect(run.status).toBe('downloading');
    if (run.status === 'downloading') {
      const expected =
        (chapters[0].sizeBytes! + chapters[1].sizeBytes! / 2) / devotionalBookTotalBytes('Ruth');
      expect(run.fraction).toBeCloseTo(expected, 3);
      expect(run.chapter).toBe(2);
    }
    await land(second, chapters[1]);
    await land(fake.pending[fake.pending.length - 1], chapters[2]);
    await land(fake.pending[fake.pending.length - 1], chapters[3]);
    await done;
  });

  it('cancel mid-book keeps the landed chapters and cleans the one in flight', async () => {
    const chapters = ruth();
    const done = startBookDevotionalDownload('Ruth');
    await tick();
    await land(fake.pending[fake.pending.length - 1], chapters[0]);
    const second = fake.pending[fake.pending.length - 1];
    fake.files.set(second.fileUri, 5000); // the in-flight partial
    await cancelBookDevotionalDownload('Ruth');
    await done;
    expect(second.pauseCalls).toBe(1);
    expect(snap(chapters[0])).toEqual({ status: 'ready' });
    expect(snap(chapters[1])).toEqual({ status: 'idle' });
    expect(fake.files.has(second.fileUri)).toBe(false);
    const p = bookDevotionalProgress('Ruth');
    expect(p.downloadedCount).toBe(1);
    expect(p.allDownloaded).toBe(false);
  });

  it('chapters already on disk are skipped, not re-fetched', async () => {
    const chapters = ruth();
    fake.files.set(uriFor(chapters[0]), chapters[0].sizeBytes!);
    fake.files.set(uriFor(chapters[2]), chapters[2].sizeBytes!);
    const done = startBookDevotionalDownload('Ruth');
    await tick();
    await tick();
    // The first transfer belongs to chapter 2 — chapter 1 was
    // already here.
    expect(fake.pending.length).toBe(1);
    expect(fake.pending[0].fileUri).toBe(uriFor(chapters[1]));
    await land(fake.pending[0], chapters[1]);
    await land(fake.pending[fake.pending.length - 1], chapters[3]);
    await done;
    expect(bookDevotionalProgress('Ruth').allDownloaded).toBe(true);
  });

  it('a chapter failure stops the run and names itself; landed chapters stay', async () => {
    const chapters = ruth();
    const done = startBookDevotionalDownload('Ruth');
    await tick();
    await land(fake.pending[fake.pending.length - 1], chapters[0]);
    const second = fake.pending[fake.pending.length - 1];
    second.reject(new Error('network down'));
    await done;
    const run = getBookDevotionalDownloadSnapshot('Ruth');
    expect(run.status).toBe('error');
    expect(snap(chapters[0])).toEqual({ status: 'ready' });
    expect(fake.pending.length).toBe(2); // chapters 3–4 were never started
  });

  it('refreshBookDevotionalDownloads reads the whole book from disk', async () => {
    const chapters = ruth();
    fake.files.set(uriFor(chapters[1]), chapters[1].sizeBytes!);
    await refreshBookDevotionalDownloads('Ruth');
    const p = bookDevotionalProgress('Ruth');
    expect(p.downloadedCount).toBe(1);
    expect(p.downloadedBytes).toBe(chapters[1].sizeBytes!);
  });

  it('deleteBookDevotionalDownloads frees every chapter of the book', async () => {
    const done = startBookDevotionalDownload('Ruth');
    await tick();
    for (const d of ruth()) await land(fake.pending[fake.pending.length - 1], d);
    await done;
    expect(bookDevotionalProgress('Ruth').allDownloaded).toBe(true);
    await deleteBookDevotionalDownloads('Ruth');
    const p = bookDevotionalProgress('Ruth');
    expect(p.downloadedCount).toBe(0);
    expect(fake.files.size).toBe(0);
  });
});

// ─── The Downloaded audio page model ────────────────────────────────────────

describe('v527 downloads page model — devotionals join the tours', () => {
  const seedDisk = () => {
    const g1 = getDevotional('Genesis', 1)!;
    const g2 = getDevotional('Genesis', 2)!;
    const r1 = getDevotional('Ruth', 1)!;
    fake.files.set(uriFor(g2), g2.sizeBytes!);
    fake.files.set(uriFor(g1), g1.sizeBytes!);
    fake.files.set(uriFor(r1), r1.sizeBytes!);
    return { g1, g2, r1 };
  };

  it('refreshDownloads lists devotional downloads from disk truth', async () => {
    seedDisk();
    const items = await refreshDownloads();
    expect(items.length).toBe(3);
    expect(items.every((i) => i.kind === 'devotional')).toBe(true);
    // A wrong-size file is not a download.
    const g3 = getDevotional('Genesis', 3)!;
    fake.files.set(uriFor(g3), 42);
    const after = await refreshDownloads();
    expect(after.length).toBe(3);
    expect(fake.files.has(uriFor(g3))).toBe(false);
  });

  it('the groups stand tours → devotionals → voice, rows canonical then chapter', async () => {
    seedDisk();
    // A tour on disk too, so all three shelves stand and their
    // order is the pin (each media group renders only while it
    // has rows — the v502 rule, unchanged).
    const hebrews = getTenStops('Hebrews')!;
    fake.files.set(`file:///docs/ten-stops/${hebrews.fileName}`, hebrews.sizeBytes);
    await refreshDownloads();
    const model = downloadsPageModel(getDownloadedAudioSnapshot());
    expect(model.groups.map((g) => g.id)).toEqual(['tours', 'devotionals', 'voice']);
    const devGroup = model.groups.find((g) => g.id === 'devotionals')!;
    expect(devGroup.label).toBe('CHAPTER DEVOTIONALS');
    expect(
      devGroup.items.map((i) => (i.kind === 'devotional' ? `${i.entry.book} ${i.entry.chapter}` : '')),
    ).toEqual(['Genesis 1', 'Genesis 2', 'Ruth 1']);
    // The storage bar carries one slice per download, uniquely keyed.
    const ids = model.segments.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('devotional|Genesis|1');
    expect(ids).toContain('ten-stops|Hebrews');
    expect(model.totalBytes).toBe(
      hebrews.sizeBytes +
        getDevotional('Genesis', 1)!.sizeBytes! +
        getDevotional('Genesis', 2)!.sizeBytes! +
        getDevotional('Ruth', 1)!.sizeBytes!,
    );
  });

  it('without a tour on disk the shelves stand devotionals → voice', async () => {
    seedDisk();
    await refreshDownloads();
    const model = downloadsPageModel(getDownloadedAudioSnapshot());
    expect(model.groups.map((g) => g.id)).toEqual(['devotionals', 'voice']);
  });

  it('a devotional row’s meta names book, chapter, duration and size', async () => {
    const { g1 } = seedDisk();
    await refreshDownloads();
    const item = getDownloadedAudioSnapshot().find(
      (i) => i.kind === 'devotional' && i.entry.book === 'Genesis' && i.entry.chapter === 1,
    )!;
    expect(downloadRowMeta(item)).toBe(
      `Genesis 1 · ${formatClock(g1.durationSec)} · ${formatTenStopsSize(g1.sizeBytes!)}`,
    );
  });

  it('the Books card counts devotional downloads, dressed by a devotional book', async () => {
    seedDisk();
    const items = await refreshDownloads();
    const card = downloadsCardModel(items);
    expect(card.visible).toBe(true);
    expect(card.line).toContain('3 items');
    expect(card.totalBytes).toBe(
      getDevotional('Genesis', 1)!.sizeBytes! +
        getDevotional('Genesis', 2)!.sizeBytes! +
        getDevotional('Ruth', 1)!.sizeBytes!,
    );
    expect(['Genesis', 'Ruth']).toContain(card.newestBook);
  });

  it('removeDownload deletes the devotional’s local file only', async () => {
    const { r1 } = seedDisk();
    await refreshDownloads();
    const item = getDownloadedAudioSnapshot().find(
      (i) => i.kind === 'devotional' && i.entry.book === 'Ruth',
    )!;
    const after = await removeDownload(item);
    expect(after.some((i) => i.kind === 'devotional' && i.entry.book === 'Ruth')).toBe(false);
    expect(fake.files.has(uriFor(r1))).toBe(false);
    expect(after.length).toBe(2);
  });
});
