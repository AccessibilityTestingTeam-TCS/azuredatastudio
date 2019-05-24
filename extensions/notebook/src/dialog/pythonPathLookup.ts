/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs';

import * as utils from '../common/utils';
import * as constants from '../common/constants';

export class PythonPathLookup {
	constructor(private outputChannel: vscode.OutputChannel) {

	}

	public async getSuggestions(): Promise<string[]> {
		let pythonSuggestions = await this.getPythonSuggestions();
		let condaSuggestions = await this.getCondaSuggestions();

		return pythonSuggestions.concat(condaSuggestions);
	}

	private async getCondaSuggestions(): Promise<string[]> {
		let condaLocations;
		if (process.platform === constants.winPlatform) {
			let userFolder = process.env['HOME'];
			condaLocations = [
				'/opt/*conda*/bin/conda',
				'/usr/share/*conda*/bin/conda',
				`${userFolder}/*conda*/bin/conda`
			];
		} else {
			let userFolder = process.env['USERPROFILE'];
			condaLocations = [
				'C:\\ProgramData\\[Mm]iniconda*\\Scripts\\conda.exe',
				'C:\\ProgramData\\[Aa]naconda*\\Scripts\\conda.exe',
				`${userFolder}\\[Mm]iniconda*\\Scripts\\conda.exe`,
				`${userFolder}\\[Aa]naconda*\\Scripts\\conda.exe`,
				`${userFolder}\\AppData\\Local\\Continuum\\[Mm]iniconda*\\Scripts\\conda.exe`,
				`${userFolder}\\AppData\\Local\\Continuum\\[Aa]naconda*\\Scripts\\conda.exe`
			];
		}

		const condaFile = condaLocations.find(location => fs.existsSync(location));
		if (condaFile) {
			return [condaFile];
		} else {
			return [];
		}
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
			const args = Array.isArray(options.args) ? options.args : [];
			const cmd = `"${options.command}" ${args.join(' ')}`;
			return utils.executeBufferedCommand(cmd, {})
				.then(output => output.trim())
				.then(value => {
					if (value.length > 0 && fs.existsSync(value)) {
						return value;
					}
					this.outputChannel.appendLine(`Detection of Python Interpreter for Command ${options.command} and args ${args.join(' ')} failed as file ${value} does not exist`);
					return '';
				});
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