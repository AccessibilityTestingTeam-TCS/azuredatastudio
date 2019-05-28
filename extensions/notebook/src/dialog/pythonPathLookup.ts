/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as glob from 'glob';

import * as utils from '../common/utils';
import * as constants from '../common/constants';

export class PythonPathLookup {
	constructor() {
	}

	public async getSuggestions(): Promise<string[]> {
		let pythonSuggestions = await this.getPythonSuggestions();
		let condaSuggestion = await this.getCondaSuggestions();

		let result: string[];
		if (pythonSuggestions && condaSuggestion) {
			result = pythonSuggestions.concat(condaSuggestion);
		} else {
			result = [];
		}
		return result;
	}

	private async getCondaSuggestions(): Promise<string> {
		let condaLocations;
		if (process.platform !== constants.winPlatform) {
			let userFolder = process.env['HOME'];
			condaLocations = [
				'/opt/*conda*/bin/python3',
				'/usr/share/*conda*/bin/python3',
				`${userFolder}/*conda*/bin/python3`
			];
		} else {
			let userFolder = process.env['USERPROFILE'].replace('\\', '/').replace('C:', '');
			condaLocations = [
				'/ProgramData/[Mm]iniconda*/python3.exe',
				'/ProgramData/[Aa]naconda*/python3.exe',
				`${userFolder}/[Mm]iniconda*/python3.exe`,
				`${userFolder}/[Aa]naconda*/python3.exe`,
				`${userFolder}/AppData/Local/Continuum/[Mm]iniconda*/python3.exe`,
				`${userFolder}/AppData/Local/Continuum/[Aa]naconda*/python3.exe`
			];
		}

		let condaLocationsGlob = `{${condaLocations.join(',')}}`;
		let condaFiles = await this.globSearch(condaLocationsGlob);
		const validCondaFiles = condaFiles.filter(condaPath => condaPath.length > 0);
		return validCondaFiles.length === 0 ? undefined : validCondaFiles[0];
	}

	private globSearch(globPattern: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			glob(globPattern, (err, files) => {
				if (err) {
					return reject(err);
				}
				resolve(Array.isArray(files) ? files : []);
			});
		});
	}

	private async getPythonSuggestions(): Promise<string[]> {
		const pathsToCheck = this.getPythonCommands();

		let pythonPaths = await Promise.all(pathsToCheck.map(item => this.getPythonPath(item)));
		let results: string[] = [];
		if (pythonPaths) {
			results = pythonPaths.filter(path => path && path.length > 0);
		}
		return results;
	}

	private async getPythonPath(options: { command: string; args?: string[] }): Promise<string> {
		try {
			let args = Array.isArray(options.args) ? options.args : [];
			args = args.concat(['-c', '"import sys;print(sys.executable)"']);
			const cmd = `"${options.command}" ${args.join(' ')}`;
			let output = await utils.executeBufferedCommand(cmd, {});
			let value = output ? output.trim() : '';
			if (value.length > 0 && fs.existsSync(value)) {
				return value;
			}
		} catch (err) {
			// Ignore errors here, since this python version will just be excluded.
		}

		return undefined;
	}

	private getPythonCommands(): { command: string; args?: string[] }[] {
		const paths = ['python3.7', 'python3.6', 'python3']
			.map(item => { return { command: item }; });
		if (process.platform !== constants.winPlatform) {
			return paths;
		}

		const versions = ['3.7', '3.6', '3'];
		return paths.concat(versions.map(version => {
			return { command: 'py', args: [`-${version}`] };
		}));
	}
}