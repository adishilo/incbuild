import * as chokidar from 'chokidar';
import * as path from 'path';
import * as proc from 'child_process';
import * as mkdirp from 'mkdirp';
import CommandTemplateProcessor from "./CommandTemplateProcessor";
import * as debugModule from 'debug';
import Configuration from "./Configuration/Configuration";
import PathWatchConfig from "./Configuration/PathWatchConfig";
import WatchExecutionManager from "./WatchExecutionManager";
import ExitHandler from "./ExitHandler";

const debug = debugModule(path.basename(__filename));

export default class PathWatchManager {
    private _watchers = new Array<chokidar.FSWatcher>();
    private _createDirWatchers = new Array<chokidar.FSWatcher>();
    private _reportCounter = 0;

    public constructor(private _exitHandler: ExitHandler) {}

    public createPathWatchers(config: Configuration) {
        let baseRoot = config.baseRoot;

        for (let configWatch of config.watches) {
            let watchedPath = path.join(baseRoot, configWatch.watchRoot);
            let execManager = new WatchExecutionManager(configWatch.executeBeforeReady, baseRoot, configWatch.watchRoot);

            debug(`Registering watch for [${configWatch.sources.join(', ')}] on ${watchedPath}`);

            this.registerAutoDirCreator(execManager, configWatch);
            this.registerConfiguredWatchEvents(execManager, configWatch);
        }

        this.printReportLegend();
    }

    private registerAutoDirCreator(execManager: WatchExecutionManager, configWatch: PathWatchConfig) {
        if (!configWatch.autoCreateDir) {
            return;
        }

        let newWatcher = chokidar.watch(
            ".",
            {
                cwd: execManager.absoluteWatchRoot,
                ignored: configWatch.ignored || [],
                persistent: true
            });
        let processor = new CommandTemplateProcessor(execManager, configWatch.autoCreateDir, true);

        newWatcher.on('addDir', dirPath => this.autoCreateDirExec(processor, dirPath));
        debug(`- Registered auto folder creation listening on ${execManager.absoluteWatchRoot}`);

        this._createDirWatchers.push(newWatcher);
    }

    private registerConfiguredWatchEvents(execManager: WatchExecutionManager, configWatch: PathWatchConfig) {
        let newWatcher = chokidar.watch(
            configWatch.sources,
            {
                cwd: execManager.absoluteWatchRoot,
                ignored: configWatch.ignored || [],
                persistent: true
            });

        for (let triggeredCommand of configWatch.triggeredCommands) {
            let processor = new CommandTemplateProcessor(execManager, triggeredCommand.commands, triggeredCommand.showStdout);

            for (let trigger of triggeredCommand.triggeringEvents) {
                newWatcher.on(trigger, path => this.executeTriggeredCommand(processor, trigger, path));

                debug(`- Registered ${trigger} event`);
            }
        }

        newWatcher.on('ready', () => {
            execManager.allowExecution();

            if (configWatch.execAfterReady) {
                let processor = new CommandTemplateProcessor(execManager, configWatch.execAfterReady, true);

                debug(`Executing 'afterReady' command for watcher ${execManager.absoluteWatchRoot}..`);
                this.executeCommand(processor.getDigestedCommand('N/A', execManager.absoluteWatchRoot), true);
            }

            console.log(`Watch for [${configWatch.sources.join(', ')}] on '${execManager.absoluteWatchRoot}' is ready`);
        });

        this._watchers.push(newWatcher);
    }

    private autoCreateDirExec(processor: CommandTemplateProcessor, addedPath: string) {
        if (!processor.isAllowedExecution) {
            debug(`Triggered for execution but it is not (yet) allowed, ignoring triggered event (addDir '${addedPath}')`);

            return;
        }

        let targetFolder = processor.getDigestedCommand('addDir', addedPath);

        mkdirp(targetFolder, err => {
            if (err) {
                console.error(`Error: Could not create target folder for ${addedPath}`);

                return;
            }

            debug(`Created folder '${targetFolder}'`);
            this.reportActivity('addDir');
        });
    }

    private executeTriggeredCommand(processor: CommandTemplateProcessor, changeType: string, changedRelativePath: string) {
        if (!processor.isAllowedExecution) {
            debug(`Triggered for execution but it is not (yet) allowed, ignoring triggered event (${changeType} '${changedRelativePath}')`);

            return;
        }

        changedRelativePath = changedRelativePath || '';

        debug(`Digesting command: ${changeType} event for '${path.join(processor.watchRoot, changedRelativePath)}'`);
        processor.getDigestedCommands(changeType, changedRelativePath).forEach(command => this.executeCommand(command, processor.showStdout));

        this.reportActivity(changeType);
    }

    private executeCommand(processToExecute: string, showStdout: boolean) {
        let childProc = proc.exec(processToExecute, (error, stdout, stderr) => {
            if (error) {
                console.log(`Error executing shell command [${processToExecute}]: ${error}`);
                debug(`stderr: ${stderr}`);

                this._exitHandler.unregisterProcess(childProc.pid);

                return;
            }

            if (showStdout) {
                console.log('\n' + stdout);

                this._reportCounter = 0; // So the next report starts at a new line
            }

            this._exitHandler.unregisterProcess(childProc.pid);            
        });

        this._exitHandler.registerProcess(childProc);
    }

    private printReportLegend() {
        if (process.env.DEBUG) {
            return;
        }

        console.log(`
        Changes report legend:
        
        a - Added file
        f - Added folder
        c - Changed file
        d - Deleted file
        e - Watcher error
        . - Any other change event
        `);
    }

    private reportActivity(changeType: string) {
        if (process.env.DEBUG) {
            return;
        }

        let report: string;

        switch (changeType) {
            case 'add':
                report = 'a';
                break;

            case 'addDir':
                report = 'f';
                break;

            case 'change':
                report = 'c';
                break;

            case 'unlink':
                report = 'd';
                break;

            case 'error':
                report = 'e';
                break;

            default:
                report = '.';
                break;
        }

        if (this._reportCounter % 100 === 0) {
            process.stdout.write(`\n[${new Date().toISOString()}] `);
        }

        process.stdout.write(report);
        ++this._reportCounter;
    }
}
