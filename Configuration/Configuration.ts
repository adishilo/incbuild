import * as path from 'path';
import PathWatchConfig from "./PathWatchConfig";

export default class Configuration {
    public baseRoot: string; // The value on the JSON file must be relative to the folder of the JSON configuration file
    public readonly watches: Array<PathWatchConfig> | undefined = undefined;
}
