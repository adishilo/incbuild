/**
 * Handle clean exit on intended and non intended termination
*/
import * as proc from 'child_process';
import * as debugModule from 'debug';
import * as path from 'path';

const debug = debugModule(path.basename(__filename));

export default class ExitHandler {
    private _childProcs = new Map<number, proc.ChildProcess>(); // Map PID -> child process

    public constructor() {
        process.on('unhandledRejection', (reason, error) => {
            console.error(`Unhandled Rejection at: ${error}`);
        });

        process.on('uncaughtException', (error) => {
            console.error(`Uncaught exception at: ${error}`);

            this.terminateChildProcesses();
            process.exit(1);
        });

        process.on('SIGINT', () => {
            debug('Caught SIGINT, terminating');

            this.terminateChildProcesses();
            process.exit(0);
        });
    }

    public registerProcess(childProc: proc.ChildProcess) {
        this._childProcs.set(childProc.pid, childProc);

        debug(`Registered child process PID '${childProc.pid}'`);
    }

    public unregisterProcess(pid: number) {
        let childProc = this._childProcs.get(pid);

        if (!this._childProcs.delete(pid)) {
            debug(`Trying to unregister a non existing process (PID ${pid})`);

            return;
        }

        debug(`Unregistered child process PID ${pid}`);
    }

    public terminateChildProcesses() {
        for (let childProc of this._childProcs.values()) {
            childProc.kill();

            debug(`Terminated process PID ${childProc.pid}`);
        }

        this._childProcs.clear();
    }
}