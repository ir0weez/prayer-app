/**
 * No-cents guard pins (Jonathan's reversal, 2026-10-21): every coin
 * amount in the app renders WHOLE — "18702.00" reads "18,702". The
 * shared formatter rounds half up at render time and keeps thousands
 * separators; internal balances keep their precision. A sweep pin
 * keeps `.toFixed(2)` out of coin displays.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { formatCoins } from "../hometown";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("formatCoins: whole coins, separators, half-up rounding", () => {
  it("formats the reported case", () => {
    expect(formatCoins(18702.0)).toBe("18,702");
  });
  it("rounds half up at render time", () => {
    expect(formatCoins(18702.4)).toBe("18,702");
    expect(formatCoins(18702.5)).toBe("18,703");
    expect(formatCoins(0.5)).toBe("1");
    expect(formatCoins(2.5)).toBe("3");
  });
  it("keeps thousands separators at every scale", () => {
    expect(formatCoins(999)).toBe("999");
    expect(formatCoins(1000)).toBe("1,000");
    expect(formatCoins(1234567)).toBe("1,234,567");
  });
  it("handles zero and junk", () => {
    expect(formatCoins(0)).toBe("0");
    expect(formatCoins(NaN)).toBe("0");
  });
});

describe("no coin display still emits two decimals", () => {
  // Legit non-coin uses of toFixed(2): the bank's interior-bonus
  // MULTIPLIER (x1.25), SVG polygon coordinate strings in the paper
  // art kit, and the real-money budget tracker (not game coins).
  const ALLOWED_LINE = /mult\.toFixed\(2\)|Math\.(cos|sin).*toFixed\(2\)/;
  const ALLOWED_FILES = new Set(["app/budget-tracker.tsx"]);

  const files: string[] = [];
  for (const dir of ["app", "components"]) {
    for (const f of readdirSync(join(ROOT, dir))) {
      if (f.endsWith(".tsx") || f.endsWith(".ts")) files.push(`${dir}/${f}`);
    }
  }

  it("no .toFixed(2) outside the allowlist", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (ALLOWED_FILES.has(rel)) continue;
      read(rel)
        .split("\n")
        .forEach((line, i) => {
          if (line.includes(".toFixed(2)") && !ALLOWED_LINE.test(line)) {
            offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 80)}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it("no fraction-digit coin formatting remains", () => {
    const offenders: string[] = [];
    for (const rel of files) {
      if (read(rel).includes("minimumFractionDigits: 2")) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("the Collect All surfaces render whole coins", () => {
    // Map pill + breakdown sheet (hometown) go through formatCoins…
    const town = read("app/hometown.tsx");
    expect(town).toContain("const headerCoinText = (n: number) => formatCoins(n)");
    // …and the Main Office bar delegates to the same formatter.
    const office = read("app/main-office-interior.tsx");
    expect(office).toContain("const formatCoinTotal = formatCoins");
  });
});
