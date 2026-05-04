/**
 * Shared types for the CLI system
 */

export interface Command {
    key: string;
    description: string;
    action: string;
    needsInput?: boolean;
    inputPrompt?: string;
}

export interface ScriptCategory {
    name: string;
    description: string;
    commands: Command[];
}
