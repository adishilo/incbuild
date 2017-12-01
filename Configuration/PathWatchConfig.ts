import CommandsConfig from "./CommandsConfig";

export default class PathWatchConfig {
    public readonly name: string;
    public readonly executeBeforeReady: boolean;
    public readonly watchRoot: string;
    public readonly ignored: Array<string>;
    public readonly sources: Array<string>;
    public readonly autoCreateDir: string; // If exists - the target path where to create a new folder. Disregards 'sources' field
    public readonly execAfterReady: string;
    public readonly triggeredCommands: Array<CommandsConfig>;
}
