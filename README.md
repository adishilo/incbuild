# *incbuild* - File Watcher Utility
## What is *incbuild*
*incbuild* is a utility that relates FS changes to actions that need to be taken. For instance, in a development environment, when changed files needs to be copied around to target folders or when backuping files to another folder or when you need to compile ad-hoc changed/added files.

The tool works by a defined plan given in a JSON configuration file, which allows many features.

Let's start with an example:

Install:
```bash
> npm install -g incbuild
```

**watch-config.json**
```json
{
    "baseRoot": ".",
    "watches": [
        {
            "watchRoot": ".",
            "sources": [ "**/*.json" ],
            "ignored": [ "Output" ],
            "triggeredCommands": [
                {
                    "triggeringEvents": [ "add", "change" ],
                    "commands": [ "cp :changedAbsPath: :watchedRoot:/Output/:changedRelFolder:" ]
                }
            ]
        }
    ]
}
```
Running
```bash
> incbuild -f watch-config.json
```
(See [incbuild CLI](#cli))

Creates a watch on the current folder (`watchRoot` property) that any changed/added `.json` file (`sources` property) is immediately copied to the relevant path under the `Output/` folder.

Note that changes the `Output/` folder itself are ignored, per the `"ignored"` definition.
### Following FS structural changes
If a new folder is created in our watched root, and then we're creating files under that new folder - it does not exist on the relative `Output/` path, and so the creation of new files will fail.
In order to handle such FS structure cases, we have the `autoCreateDir` configuration property to help. Adding:
```json
"autoCreateDir": ":watchedRoot:/Output/:changedRelPath:"
```
to the watch, follows up any new folder creation to the target folder where we define (in this example - under the relative path under `Output/` folder).
### Doing preparations once
We might want to do some one-time action once the events-watcher is ready. For that, we can use the `execAfterReady` property. This executes a command template (see [Path templates](#path-templates)) once the watcher is ready. For example, run the tsc (TypeScript Compiler) in watch mode for the relevant folder:
```json
"execAfterReady": ":baseRoot:/node_modules/.bin/tsc -w -p :watchedRoot:"
```
So now, our elaborated example looks like this:

**watch-config.json**
```json
{
    "baseRoot": ".",
    "watches": [
        {
            "watchRoot": ".",
            "sources": [ "**/*.json" ],
            "ignored": [ "Output" ],
            "autoCreateDir": ":watchedRoot:/Output/:changedRelPath:",
            "execAfterReady": ":baseRoot:/node_modules/.bin/tsc -w -p :watchedRoot:",
            "triggeredCommands": [
                {
                    "triggeringEvents": [ "add", "change" ],
                    "commands": [ "cp :changedAbsPath: :watchedRoot:/Output/:changedRelFolder:" ]
                }
            ]
        }
    ]
}
```

**Important: It is important to terminate *incbuild* activity with Ctrl+C, and not rely on parent processes it was started with (like VS Code) doing so, because otherwise *incbuild* might leave orphan processes (started with the `execAfterReady` configuration) running.**
## Configuration reference
### Configuration file
The configuration `.json` file carries the following scheme. Note that since this file is `require`d, it can also be a Javascript file that exports the relevant configuration object.
```typescript
{
    "baseRoot": string,
    "watches": [
        {
            "executeBeforeReady": boolean,
            "watchRoot": string,
            "sources": [ string, ... ],
            "ignored": [ string, ... ],
            "autoCreateDir": CommandTemplate,
            "execAfterReady": CommandTemplate,
            "triggeredCommands": [
                {
                    "triggeringEvents": [ string, ... ],
                    "commands": [ CommandTemplate, ... ],
                    "showStdout": boolean
                }
            ]
        }, ...
    ]
}
```
A `config.schema.json` JSON schema file can be found on the root of the *incbuild* Javascript installation folder (and also on the root of the Typescript sources in GitHub) for reference and validation of any configuration file given to the *incbuild* tool.
### Configuration object reference:
The configuration object contains the following properties:

| Property | Description | Default value |
| --- | --- | --- |
| `baseRoot` | The path to the root folder being watched for changed, relative to the whereabouts of this configuration file. | **Mandatory Field** |
| `watches` | Defines a set of *watches* on the `baseRoot` folder. A *watch* is a relation between FS events and what actions to take as consequence. | **Mandatory Field** |
| *watch*.`executeBeforeReady` | Whether to execute actions on relevant FS changes, before the watch is ready. See also [FS Events and flows](#fs-events-and-flows). | `false` |
| *watch*.`watchRoot` | The root folder watched for FS changes, relative to the `baseRoot`. | **Mandatory Field** |
| *watch*.`sources` | A list of file paths, relative to the `watchRoot` folder, for which we are listening for FS events. Accepts Glob definitions. | **Mandatory Field** |
| *watch*.`ignored` | A list of folders/files, relative to the `watchRoot` folder, which are to be ignored when watching for FS events. | `[]` |
| *watch*.`autoCreateDir` | When used, FS folder creation events cause the creation of a matching folders in a path according to the given template. No need to use double-quotes, event for folder names containing spaces. See [Path templates](#path-templates). | `""` |
| *watch*.`execAfterReady` | When used, is a command template to execute after the watch is ready. See [FS Events and flows](#fs-events-and-flows) and [Path templates](#path-templates). | `""` |
| *watch*.`triggeredCommnads` | A collection of triggering FS events and the actions to take as consequence. | **Mandatory Field** |
| *watch.command*.`triggeringEvents` | A list of FS event names that when triggered causes the given `commands` to execute. See [FS Events and flows](#fs-events-and-flows). | **Mandatory Field** |
| *watch.command*.`commands` | A list of command templates to execute when one of the defined `triggeringEvents` is triggered. Those commands are assumed to be shell commands and are each executed in a separate process. For now, the shell is the same shell as the one used to run *incbuild* with. | **Mandatory Field** |
| *watch.command*.`showStdout` | When set, the `stdout` of the executed command process is written to the console. | `false` |

### FS Events and flows
The watching for FS events is done using the [chokidar npm ackage](https://www.npmjs.com/package/chokidar).
As such, it defines [names for the FS events being watched for](https://www.npmjs.com/package/chokidar#methods--events). Those names are the names to be used in the *watch.command*.`triggeringEvents` propery list, and currently are:
- add
- addDir
- change
- unlink
- unlinkDir
- ready
- raw
- error
- all

The flow of watch creation is as follows:

1. Once such a watch is registered, chokidar scans the folder recursively to find matching files to watch FS events for. Each such file is triggered for with an 'add' event.
2. Once the scan is done, the 'ready' event is triggered.

So if the *watch*.`executeBeforeReady` property is set, the 'add' events triggered while scanning **will executed the relevant commands**. This is good for aligning a target folder with the changes done while the *incbuild* tool was not running.

The *watch*.`executeBeforeReady` property can define a command to execute once the 'ready' event was triggered, meaning chokidar finished the scan and the watch is ready and running.

All of this activity, and much more, can be seen if running the *incbuild* tool in debug mode. See [Running with debug messages](#running-with-debug-messages).
### Path templates
Several properties on the configuration JSON schema use the `CommandTemplate` type. This is basically a `string`, that can accept several wild-cards that are substituted on run time with the relevant required information:

- `:baseRoot:` is the path relative to the configuration file of the base root for all watches.
- `:watchedRoot:` is the absolute path of the root folder of the watch.
- `:changedAbsPath:` is the absolute path of the changed file/folder.
- `:changedRelPath:` is the path of the changed file/folder, relative to the root of the watch root.
- `:changedFile:` is the name of the changed file (without the prefix-path).
- `:changedRelFolder:` is the path of the folder of the changed file/folder, relative to the watch root.
- `:changedAbsFolder:` is the absolute path of the folder of the changed file/folder.
- `:changeType:` is the name of the triggering event. See [FS Events and flows](#fs-events-and-flows).

## CLI
The *incbuild* tool has a simple CLI which syntax can be viewed with the following command:
```bash
> incbuild -h
Usage:
  incbuild [OPTIONS] [ARGS]

Options:
  -f, --file FILE        Configuration file name to use
  -v, --version          Display the current version
  -h, --help             Display help and usage details
```
## Running with debug messages
*incbuild* uses the [debug npm package](https://www.npmjs.com/package/debug), so in order to see debug message, use the `DEBUG` environment variable as described in the *debug* package documentation.
## GitHub project
The *incbuild* tool is an open-source MIT license [project in GitHub](https://github.com/adishilo/incbuild).
