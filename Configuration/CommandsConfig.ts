export default class CommandsConfig {
    public readonly triggeringEvents: Array<string>; // According to chokidar event names
    public readonly commands: Array<string>;
    public readonly showStdout: boolean;
}
