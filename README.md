# *incbuild* - File Watcher Utility
## What is *incbuild*
*incbuild* is a utility that relates FS changes to actions that need to be taken. For instance, in a development environment, when changed files needs to be copied around to target folders or when backuping files to another folder or when you need to compile ad-hoc changed/added files.

The tool works by a defined plan given in a JSON configuration file, which allows many features.

A Simple example example:

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
            "autoCreateDir": ":watchedRoot:/Output/:changedRelPath:",
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
> incbuild watch-config.json
```
Creates a watch on the current folder that any changed/added `.json` file is immediately copied to the relevant path under the `Output/` folder.

Note that changes the `Output/` folder itself are ignored, per the `"ignored"` definition.

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
            "ignored": [ string, ... ],
            "sources": [ string, ... ],
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
### Configuration object reference:
The configuration object contains the following properties:

- `baseRoot`: The path to the root folder being watched for changed, relative to the whereabouts of this configuration file.
- `watches`: Defines a set of *watches* on the `baseRoot` folder. A *watch* is a relation between FS events and what actions to take as consequence.
- *watch*.`executeBeforeReady`: Whether to execute actions on relevant FS changes, before the watch is ready. See also [FS Events and flows]
### FS Events and flows
## CLI
