import * as chokidar from 'chokidar';
import * as path from 'path';
import * as proc from 'child_process';
import * as makedir from 'make-dir';
import CommandTemplateProcessor from "./CommandTemplateProcessor";
import * as debugModule from 'debug';
import Configuration from "./Configuration/Configuration";
import PathWatchConfig from './Configuration/PathWatchConfig';
import ExitHandler from "./ExitHandler";
import WatchFileConfigManager from './Configuration/WatchFileConfigManager';
import WatchExecutionManager from './WatchExecutionManager';

require('colors');

const debug = debugModule(path.basename(__filename));

export default class PathWatchManager {
    private _watchers = new Array<chokidar.FSWatcher>();
    private _createDirWatchers = new Array<chokidar.FSWatcher>();
    private _reportCounter = 0;

    public constructor(private _exitHandler: ExitHandler) { }

    public createPathWatchers(watchConfigManager: WatchFileConfigManager, requiredWatchNames?: Array<string>) {
        const config = watchConfigManager.configuration;
        let baseRoot = config.baseRoot;

        if (!config.watches || config.watches.length === 0) {
            console.log('Error: No watches defined, bailing out');

            return;
        }

        const requiredWatches = this.filterWatches(watchConfigManager, requiredWatchNames);

        if (requiredWatches.length === 0) {
            console.log(`None of the specified watches is defined: ${requiredWatchNames!.join(', ')} (Maybe watches are missing the 'name' property?)`)

            return;
        }

        console.log(`Start listening to watch(es): ${requiredWatchNames!.join(', ')}`);

        for (let configWatch of requiredWatches) {
            let watchedPath = path.join(baseRoot, configWatch.watchRoot);
            let execManager = new WatchExecutionManager(configWatch.executeBeforeReady, baseRoot, configWatch.watchRoot);

            debug(`Registering watch for [${configWatch.sources.join(', ')}] on ${watchedPath}`);

            this.registerAutoDirCreator(execManager, configWatch);
            this.registerConfiguredWatchEvents(execManager, configWatch);
        }

        this.printReportLegend();
    }

    private filterWatches(watchConfigManager: WatchFileConfigManager, requiredWatchNames?: Array<string>): Array<PathWatchConfig> {
        const allWatches = watchConfigManager.configuration.watches;

        if (!allWatches || allWatches.length === 0) {
            debug('No watches configured');

            return new Array<PathWatchConfig>();
        }

        if (!requiredWatchNames || requiredWatchNames.length === 0) {
            debug('No specific watches required - using all watches');

            return allWatches;
        }

        return allWatches.filter(watch => {
            if (watchConfigManager.getWatchFolders(watch.name).length > 1) {
                debug(`Configured watch name '${watch.name}' is used more than once - conflicting watches are ignored`);

                if (requiredWatchNames.find(requiredWatchName => watch.name === requiredWatchName)) {
                    console.log(`Watch '${watch.name}' is defined more than once - therefore is not activated`.red);
                }

                return false;
            }

            return requiredWatchNames.find(requiredWatchName => watch.name === requiredWatchName);
        });
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
        let autoCreateDirTarget = configWatch.autoCreateDir.replace(/\"/g, ''); // 'make-dir' package considers double quotes as illegal chars
        let processor = new CommandTemplateProcessor(execManager, autoCreateDirTarget, true);

        newWatcher.on('addDir', (dirPath: string) => this.autoCreateDirExec(processor, dirPath));
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
                newWatcher.on(trigger, (path: string) => this.executeTriggeredCommand(processor, trigger, path));

                debug(`- Registered ${trigger} event`);
            }
        }

        newWatcher.on('ready', () => {
            execManager.allowExecution();

            if (configWatch.execAfterReady) {
                let processor = new CommandTemplateProcessor(execManager, configWatch.execAfterReady, true);

                debug(`Executing 'afterReady' command for watcher ${execManager.absoluteWatchRoot}..`);
                this.spawnCommand(processor.getDigestedCommand('N/A', execManager.absoluteWatchRoot), true);
            }

            console.log(`Watch '${configWatch.name}' for [${configWatch.sources.join(', ')}] on '${execManager.absoluteWatchRoot}' is ready`.green);
        });

        this._watchers.push(newWatcher);
    }

    private async autoCreateDirExec(processor: CommandTemplateProcessor, addedPath: string) {
        if (!processor.isAllowedExecution) {
            debug(`Triggered for execution but it is not (yet) allowed, ignoring triggered event (addDir '${addedPath}')`);

            return;
        }

        let targetFolder = processor.getDigestedCommand('addDir', addedPath);

        let path = await makedir(targetFolder).catch(error => {
            console.error(`Error: Could not create target folder for ${addedPath}. Caught error: ${error}`);

            return;
        });

        debug(`Created folder '${targetFolder}'`);
        this.reportActivity('addDir');
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
                debug(`Process '${processToExecute}' exited with code ${(<any>error).code}, by signal ${(<any>error).signal}`);

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

    private spawnCommand(processToExecute: string, showStdout: boolean) {
        debug(`Executing command "${processToExecute}`);

        const [command, ...args] = processToExecute.split(' ');
        const childProc = proc.spawn(command, args);

        if (showStdout) {
            debug(`Attaching stdout and stderr of the command '${command}'`);

            childProc.stdout.on('data', data => {
                console.log(`stdout: ${data.toString()}`);
            });

            childProc.stderr.on('data', data => {
                console.log(`stderr: ${data.toString()}`);
            });

            console.log(`Process: ${process.pid}, child: ${childProc.pid}`);
        }

        process.on('SIGTERM', () => {
            console.log(`Process got SIGTERM signal`);
        });

        process.on('SIGINT', () => {
            console.log(`Process got SIGINT signal`);

            process.exit(0);
        });

        process.on('SIGKILL', () => {
            console.log(`Process got SIGKILL signal`);
        });

        childProc.on('error', error1 => {
            debug(`Process '${command}' failed with error: ${error1.stack}`);

            console.log(`Process failed with error ${error1.message}`);
        });

        childProc.on('close', (code, signal) => {
            console.log(`Process ${childProc.pid} closed streams with exit code ${code}, signal ${signal}`);
        });

        childProc.on('exit', (code, signal) => {
            console.log(`Process ${childProc.pid} exited with exit code ${code}, signal ${signal}`);
        });

        childProc.on('warning', (warning: any) => {
            console.log(`Process warning: ${JSON.stringify(warning)}`);
        });
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
