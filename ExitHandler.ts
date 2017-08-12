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

        process.on('uncaughtException', async (error) => {
            console.error(`Uncaught exception at: ${error}`);

            await this.terminateChildProcesses();
            process.exit(1);
        });

        process.on('SIGINT', async () => {
            await this.terminateChildProcesses();
            debug('Caught SIGINT, terminating');

            process.exit(0);
        });

        process.on('SIGHUP', async () => {
            await this.terminateChildProcesses();
            debug('Caught SIGHUP, terminating');

            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.terminateChildProcesses();
            debug('Caught SIGTERM, terminating');

            process.exit(0);
        });
    }

    public registerProcess(childProc: proc.ChildProcess) {
        this._childProcs.set(childProc.pid, childProc);

        debug(`Registered child process PID ${childProc.pid}`);
    }

    public unregisterProcess(pid: number) {
        let childProc = this._childProcs.get(pid);

        if (!this._childProcs.delete(pid)) {
            debug(`Trying to unregister a non existing process (PID ${pid})`);

            return;
        }

        debug(`Unregistered child process PID ${pid}`);
    }

    public terminateChildProcesses(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let childsCount = this._childProcs.size;

            for (let childProc of this._childProcs.values()) {
                // Prepare an 'exit' listener:
                childProc.on('exit', (code, signal) => {
                    debug(`Terminated process PID ${childProc.pid} by signal '${signal}'. Child process returned: ${code}`);
                    console.log(`Terminated process PID ${childProc.pid} by signal '${signal}'. Child process returned: ${code}`);

                    --childsCount;

                    if (childsCount === 0) {
                        debug('All child processes terminated');

                        this._childProcs.clear();
                        resolve();
                    }
                });

                childProc.kill();
            }
        });
    }
}