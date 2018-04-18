#!/usr/bin/env node

import * as debugModule from 'debug';
import * as path from 'path';
import PathWatchManager from "./PathWatchManager";
import WatchFileConfigManager from './Configuration/WatchFileConfigManager';
import ExitHandler from "./ExitHandler";
import * as cli from 'commander';
import CliValidator from './CliValidator';
import CommandsConfig from './Configuration/CommandsConfig';

const debug = debugModule(path.basename(__filename));

debug(`Arguments: ${JSON.stringify(process.argv)}`);

let watchConfig: WatchFileConfigManager;

const executeCliCommands = (cli: any): boolean => {
    if (cli.file) {
        if (!CliValidator.isFilePath(cli.file)) {
            console.log('No configuration file given'.red);

            return false;
        }

        watchConfig = new WatchFileConfigManager(path.join(process.cwd(), cli.file));

        if (!watchConfig.configuration.watches || watchConfig.configuration.watches.length === 0) {
            console.log('No watches defined.'.red);
            return false;
        }

        if (watchConfig.hasDuplicateWatchNames) {
            console.log('\nThere are conflicting watches'.red);
        }

        if (cli.list) {
            console.log(`${'Base folder:'.bold} ${path.resolve(process.cwd(), watchConfig.configuration.baseRoot).reset}`);
            console.log(`List of all available watches:
        `);
            for (const watch of watchConfig.describeAllWatchFolders()) {
                console.log(watch);
            }

            return false;
        }

        if (cli.show) {
            if (typeof cli.show !== 'string') {
                console.log('show command must specify a watch name.'.red);

                return false;
            }

            let matchingWatches = watchConfig.configuration.watches.filter(watch => watch.name === cli.show);

            for (let watch of matchingWatches) {
                console.log(`Configuration of watch ${watch.name}:`.bold);
                console.log(JSON.stringify(watch), '\n');
            }

            return false;
        }

        return true;
    }

    console.log('No configuration file given'.red);

    return false;
}

const appVersion = require('./package.json').version;

cli
    .version(appVersion)
    .option('-f, --file <path> [[watch] [watch] ...]', 'Specify a watch-definitions file, and optionally select which watches to activate')
    .option('-l, --list', 'List all available watches (only with -f specified)')
    .option('-s, --show [watch]', 'Show the configuration of a watch (only with -f specified)')
    .parse(process.argv);

if (process.argv.length === 2) {
    console.log('No parameters given.');

    cli.help();
}

try {
    if (executeCliCommands(cli)) {
        let exitHandler = new ExitHandler();
        let watchManager = new PathWatchManager(exitHandler);
        
        watchManager.createPathWatchers(watchConfig!, cli.args);
    } else {
        cli.help();
    }

} catch (error) {
    debug(error.stack);
    
    console.error(error.message.red);
}
