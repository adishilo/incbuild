import * as fs from 'fs';

export default class CliValidator {
    public static isFilePath(path: string): boolean {
        if (!path) {
            console.log('Error: Please supply the path to the configuration file.\n');

            return false;
        }

        let file: number;
        try {
            file = fs.openSync(path, 'r')
        } catch (error) {
            console.log(`Error: Given path '${path}' does not exist. Error: ${error}`);

            return false;
        }

        return CliValidator.isFile(file, path);
    }

    private static isFile(file: number, path: string): boolean {
        const fileStats = fs.fstatSync(file);
        if (!fileStats.isFile()) {
            console.log(`Error: Given path '${path}' is not a file`);

            return false;
        }

        return true;
    }
}