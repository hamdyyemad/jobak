/**
 * Regression cases for the two functions that put wrong data on job cards.
 *
 * Both bugs reached production and were visible to users, which is the bar for
 * getting a probe of your own:
 *
 *   * `clean()` stringified objects, so `"[object Object]"` was written to
 *     `jobs.location` and rendered on every card for the sources that publish a
 *     structured location.
 *   * a boolean `isRemote` flag beat the words "Hybrid", so listings showed as
 *     Remote here while the original posting said Hybrid.
 *
 *   npx tsx scripts/normalize-probe.ts
 */
import { clean, inferJobType, resolveJobType } from "../src/lib/normalize.js";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
    const ok = actual === expected;
    if (!ok) failures++;
    console.log(
        `${ok ? "ok   " : "FAIL "} ${label.padEnd(52)} ${JSON.stringify(actual)}${
            ok ? "" : `  expected ${JSON.stringify(expected)}`
        }`
    );
}

console.log("clean() — structured values must never render as [object Object]");
check("plain string", clean("Cairo"), "Cairo");
check("null", clean(null), "");
check("number", clean(5), "5");
check("{ name }", clean({ name: "Cairo" }), "Cairo");
check("{ city, country }", clean({ city: "Cairo", country: "Egypt" }), "Cairo, Egypt");
check("{ name } duplicated in city", clean({ name: "Cairo", city: "Cairo" }), "Cairo");
check("array of strings", clean(["Cairo", "Giza"]), "Cairo, Giza");
check("array of objects", clean([{ name: "Cairo" }, { name: "Dubai" }]), "Cairo, Dubai");
check("nested displayName", clean({ displayName: "Remote" }), "Remote");
check("object with no label", clean({ lat: 30.1, lng: 31.2 }), "");
check("empty object", clean({}), "");
check("entities still decoded", clean("Larsen &amp; Toubro"), "Larsen & Toubro");
check("whitespace still collapsed", clean("  a   b  "), "a b");

console.log("\nresolveJobType() — an explicit 'hybrid' beats a remote flag");
check("flag true, text says hybrid", resolveJobType(true, "Hybrid"), "hybrid");
check("flag true, text silent", resolveJobType(true, "Cairo, Egypt"), "remote");
check("flag false, text says hybrid", resolveJobType(false, "Hybrid role"), "hybrid");
check("flag false, text says remote", resolveJobType(false, "Fully remote"), "remote");
check("flag false, text silent", resolveJobType(false, "Cairo, Egypt"), "onsite");
check("flag null, text says hybrid", resolveJobType(null, "hybrid"), "hybrid");
check("hybrid in a later field", resolveJobType(true, "Engineer", "Cairo", "Hybrid"), "hybrid");
check("Wuzzuf displayedName object", resolveJobType(false, { displayedName: "Hybrid" }), "hybrid");
check("structured, label key", resolveJobType(false, { name: "Hybrid" }), "hybrid");

console.log("\ninferJobType() — reads structured values instead of [object object]");
check("object arrangement", inferJobType({ name: "Remote" }), "remote");
check("array of tags", inferJobType(["full-time", "hybrid"]), "hybrid");
check("plain onsite", inferJobType("Cairo office"), "onsite");

console.log(`\n${failures === 0 ? "all clear" : `${failures} FAILURE(S)`}`);
process.exitCode = failures === 0 ? 0 : 1;
