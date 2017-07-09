#!/usr/bin/env node

import * as debugModule from 'debug';
import * as path from 'path';
import PathWatchManager from "./PathWatchManager";
import WatchFileConfigManager from "./Configuration/WatchFileConfigManager";
import ExitHandler from "./ExitHandler";

const debug = debugModule(path.basename(__filename));

debug(`Arguments: ${JSON.stringify(process.argv)}`);

if (!process.argv[2]) {
    console.log('Error: Please supply the path to configuration file.');

    process.exit(1);
}

let exitHandler = new ExitHandler();
let watchManager = new PathWatchManager(exitHandler);
let watchConfig = new WatchFileConfigManager(path.join(process.cwd(), process.argv[2]));

watchManager.createPathWatchers(watchConfig.configuration);
