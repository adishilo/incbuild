#!/usr/bin/env node

import * as debugModule from 'debug';
import * as cli from 'cli';
import * as path from 'path';
import PathWatchManager from "./PathWatchManager";
import WatchFileConfigManager from "./Configuration/WatchFileConfigManager";
import ExitHandler from "./ExitHandler";

const debug = debugModule(path.basename(__filename));

debug(`Arguments: ${JSON.stringify(process.argv)}`);

cli.enable('version');
cli.setApp(`${__dirname}/package.json`);
let cliOptions = cli.parse({
    'file': [ 'f', 'Configuration file name to use', 'file', undefined ]
});

console.dir(cliOptions);

if (!cliOptions.file) {
    console.log('Error: Please supply the path to the configuration file.\n');
    cli.getUsage();

    process.exit(1);
}

let exitHandler = new ExitHandler();
let watchManager = new PathWatchManager(exitHandler);
let watchConfig = new WatchFileConfigManager(path.join(process.cwd(), cliOptions.file));

watchManager.createPathWatchers(watchConfig.configuration);
