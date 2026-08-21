/**
 * Country / flag data generation commands
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    name: "Countries",
    description: "Regenerate the country list and flag assets",
    commands: [
        {
            key: "1",
            description: "Regenerate countries + copy flag SVGs to public/",
            action: "tsx scripts/countries/generate-countries.ts",
        },
    ],
};
