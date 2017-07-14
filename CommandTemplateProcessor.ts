import * as path from 'path';
import WatchExecutionManager from "./WatchExecutionManager";

const baseRootRex = /:baseRoot:/g;
const watchedRootRex = /:watchedRoot:/g;
const changedAbsolutePathRex = /:changedAbsPath:/g;
const changedRelativePathRex = /:changedRelPath:/g;
const changedFileRex = /:changedFile:/g;
const changedRelFolderRex = /:changedRelFolder:/g;
const changedAbsFolderRex = /:changedAbsFolder:/g;
const changeTypeRex = /:changeType:/g;

export default class CommandTemplateProcessor {
    private _commands: Array<string>;

    public constructor(
        private _execManager: WatchExecutionManager,
        commands: string | Array<string>,
        public readonly showStdout: boolean) {

        this._commands = commands instanceof Array
            ? commands
            : [ commands ];
    }

    public get isAllowedExecution(): boolean {
        return this._execManager.isAllowedExecution;
    }

    public get baseRoot(): string {
        return this._execManager.baseRoot;
    }

    public get watchRoot(): string {
        return this._execManager.watchRoot;
    }

    public getDigestedCommands(changeType: string, changedRelativePath: string): Array<string> {
        return this._commands.map(template => this.getDigestedCommand(changeType, changedRelativePath, template));
    }

    public getDigestedCommand(changeType: string, changedRelativePath: string, commandTemplate?: string): string {
        let changedAbsolutePath = path.join(this._execManager.absoluteWatchRoot, changedRelativePath);

        commandTemplate = commandTemplate || this._commands[0];

        return commandTemplate
            .replace(baseRootRex, this._execManager.baseRoot)
            .replace(watchedRootRex, this._execManager.absoluteWatchRoot)
            .replace(changedAbsolutePathRex, changedAbsolutePath)
            .replace(changedRelativePathRex, changedRelativePath)
            .replace(changedFileRex, path.basename(changedRelativePath))
            .replace(changedRelFolderRex, path.dirname(changedRelativePath))
            .replace(changedAbsFolderRex, path.dirname(changedAbsolutePath))
            .replace(changeTypeRex, changeType)
            .replace(/\\/g, '/');
    }
}
