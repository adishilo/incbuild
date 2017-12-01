#!/usr/bin/env node

import * as debugModule from 'debug';
import * as path from 'path';
import PathWatchManager from "./PathWatchManager";
import WatchFileConfigManager from "./Configuration/WatchFileConfigManager";
import ExitHandler from "./ExitHandler";
import * as cli from 'commander';
import CliValidator from './CliValidator';
import CommandsConfig from './Configuration/CommandsConfig';

const debug = debugModule(path.basename(__filename));

debug(`Arguments: ${JSON.stringify(process.argv)}`);

const validateCli = (cli: any): boolean => {
    return CliValidator.isFilePath(cli.file);
}

const appVersion = require('./package.json').version;

cli
    .version(appVersion)
    .usage('<options> [[watch] [watch] ...]')
    .option('-f, --file <path>')
    .parse(process.argv);

if (!validateCli(cli)) {
    cli.help();
}

let exitHandler = new ExitHandler();
let watchManager = new PathWatchManager(exitHandler);
let watchConfig = new WatchFileConfigManager(path.join(process.cwd(), cli.file));

watchManager.createPathWatchers(watchConfig.configuration, cli.args);