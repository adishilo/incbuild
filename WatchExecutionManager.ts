import * as path from 'path';

export default class WatchExecutionManager {
    public readonly absoluteWatchRoot: string;

    public constructor(
        private _allowExecution: boolean,
        public readonly baseRoot: string,
        public readonly watchRoot: string) {

        this.absoluteWatchRoot = path.join(this.baseRoot, this.watchRoot);
    }

    public allowExecution() {
        this._allowExecution = true;
    }

    public get isAllowedExecution(): boolean {
        return this._allowExecution;
    }
}
