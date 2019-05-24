/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as glob from 'glob';

import * as utils from '../common/utils';
import * as constants from '../common/constants';

export class PythonPathLookup {
	constructor(private outputChannel: vscode.OutputChannel) {
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
				'/opt/*conda*/bin/python',
				'/usr/share/*conda*/bin/python',
				`${userFolder}/*conda*/bin/python`
			];
		} else {
			let userFolder = process.env['USERPROFILE'].replace('\\', '/').replace('C:', '');
			condaLocations = [
				'/ProgramData/[Mm]iniconda*/python.exe',
				'/ProgramData/[Aa]naconda*/python.exe',
				`${userFolder}/[Mm]iniconda*/python.exe`,
				`${userFolder}/[Aa]naconda*/python.exe`,
				`${userFolder}/AppData/Local/Continuum/[Mm]iniconda*/python.exe`,
				`${userFolder}/AppData/Local/Continuum/[Aa]naconda*/python.exe`
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

		let pythonPaths = await Promise.all(pathsToCheck.map(item => this.getInterpreter(item)));
		let results: string[] = [];
		if (pythonPaths) {
			results = pythonPaths.filter(path => path && path.length > 0);
		}
		return results;
	}

	private async getInterpreter(options: { command: string; args?: string[] }): Promise<string> {
		try {
			let args = Array.isArray(options.args) ? options.args : [];
			args = args.concat(['-c', '"import sys;print(sys.executable)"']);
			const cmd = `"${options.command}" ${args.join(' ')}`;
			let output = await utils.executeBufferedCommand(cmd, {});
			let value = output ? output.trim() : '';
			if (value.length > 0 && fs.existsSync(value)) {
				return value;
			}

			this.outputChannel.appendLine(`Detection of Python Interpreter for Command ${options.command} and args ${args.join(' ')} failed as file ${value} does not exist`);
			return '';
		} catch (err) {
			this.outputChannel.appendLine(`Detection of Python Interpreter for Command ${options.command} failed: ${utils.getErrorMessage(err)}`);
			return '';
		}
	}

	private getPythonCommands(): { command: string; args?: string[] }[] {
		const paths = ['python3.7', 'python3.6', 'python3', 'python2', 'python']
			.map(item => { return { command: item }; });
		if (process.platform !== constants.winPlatform) {
			return paths;
		}

		const versions = ['3.7', '3.6', '3', '2'];
		return paths.concat(versions.map(version => {
			return { command: 'py', args: [`-${version}`] };
		}));
	}
}