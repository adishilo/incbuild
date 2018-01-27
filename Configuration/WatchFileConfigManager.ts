import * as path from 'path';
import Configuration from "./Configuration";
import * as debugModule from 'debug';

require('colors');

const debug = debugModule(path.basename(__filename));

export default class WatchFileConfigManager {
    private watchFoldersMap = new Map<string, Array<string>>();
    private _hasDuplicateWatchNames: boolean = false;

    public readonly configuration: Configuration;

    public get hasDuplicateWatchNames(): boolean {
        return this._hasDuplicateWatchNames;
    }

    public getWatchFolders(watchName: string): Array<string> {
        const folderNames = this.watchFoldersMap.get(watchName);

        return folderNames || new Array<string>();
    }

    public * describeAllWatchFolders(): IterableIterator<string> {
        for (const watchFolders of this.watchFoldersMap) {
            for (const folder of watchFolders[1]) {
                yield `${watchFolders[0].bold}: ${folder}`;
            }

            if (watchFolders[1].length > 1) {
                console.log(`Note: watch '${watchFolders[0]}' references more than one folder and cannot be activated`.red);
            }
        }
    }

    public constructor(configurationFileName: string) {
        this.configuration = <Configuration>(require(configurationFileName));
        this.configuration.baseRoot = path.resolve(path.dirname(configurationFileName), this.configuration.baseRoot);

        this.mapWatchFolders();

        debug('Set configuration:');
        debug(JSON.stringify(this.configuration));
    }

    private mapWatchFolders() {
        if (!this.configuration.watches || this.configuration.watches.concat.length === 0) {
            return;
        }

        for (let watch of this.configuration.watches) {
            let watchedFolders = this.watchFoldersMap.get(watch.name);

            if (!watchedFolders) {
                watchedFolders = new Array<string>();

                this.watchFoldersMap.set(watch.name, watchedFolders);
            }

            watchedFolders.push(watch.watchRoot);
            if (watchedFolders.length > 1) {
                this._hasDuplicateWatchNames = true;
            }
        }
    }
}
