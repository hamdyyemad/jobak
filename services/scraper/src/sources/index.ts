import { registry } from "../core/registry.js";

import { AshbySource, GreenhouseSource, WorkableSource } from "./ats/boards.js";
import { BaytSource } from "./mena/bayt.js";
import { ForasnaSource } from "./mena/forasna.js";
import { TalentSource } from "./mena/talent.js";
import { WuzzufSource } from "./mena/wuzzuf.js";
import { ArbeitnowSource } from "./remote/arbeitnow.js";
import { HimalayasSource } from "./remote/himalayas.js";
import { JobicySource } from "./remote/jobicy.js";
import { RemoteOkSource } from "./remote/remoteok.js";
import { RemotiveSource } from "./remote/remotive.js";
import { WeWorkRemotelySource } from "./remote/weworkremotely.js";

/**
 * The catalogue.
 *
 * **Order is load-bearing.** The pipeline's dedupe keeps the first sighting of a
 * posting, and the same role is routinely cross-posted to an ATS, an
 * aggregator and a remote board. Registering them best-first means the copy
 * that survives is the one with the fullest description and the most direct
 * apply URL:
 *
 *   1. **ATS** — first-party, complete, and the apply link is the company's own.
 *   2. **MENA boards** — the market this product exists for, and Wuzzuf hands us
 *      the company's website and LinkedIn for free.
 *   3. **Remote boards** — broad, but they only ever describe someone else's
 *      posting.
 *
 * LinkedIn's guest endpoint is deliberately absent. It answered a home
 * connection and refused Vercel's, so it contributed nothing from production
 * while costing a full timeout on every run — a source that reliably returns
 * zero is worse than no source, because it looks like coverage.
 */
registry.register(() => new GreenhouseSource());
registry.register(() => new AshbySource());
registry.register(() => new WorkableSource());

registry.register(() => new WuzzufSource());
registry.register(() => new BaytSource());
registry.register(() => new TalentSource());
registry.register(() => new ForasnaSource());

registry.register(() => new RemoteOkSource());
registry.register(() => new RemotiveSource());
registry.register(() => new WeWorkRemotelySource());
registry.register(() => new HimalayasSource());
registry.register(() => new JobicySource());
registry.register(() => new ArbeitnowSource());

export { registry };
