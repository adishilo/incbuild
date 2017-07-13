import * as path from 'path';
import Configuration from "./Configuration";
import * as debugModule from 'debug';

const debug = debugModule(path.basename(__filename));

export default class WatchFileConfigManager {
    public readonly configuration: Configuration;

    public constructor(configurationFileName: string) {
        this.configuration = <Configuration>(require(configurationFileName));
        this.configuration.baseRoot = path.resolve(path.dirname(configurationFileName), this.configuration.baseRoot);

        debug('Set configuration:');
        debug(JSON.stringify(this.configuration));
    }
}
