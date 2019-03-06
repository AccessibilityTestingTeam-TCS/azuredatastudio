/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	ToggleConnectDatabaseAction, ListDatabasesAction, RunQueryAction,
	ListDatabasesActionItem, IQueryActionContext, ChangeConnectionAction
} from 'sql/parts/query/execution/queryActions';
import { Taskbar } from 'sql/base/browser/ui/taskbar/taskbar';
import { QueryInput, QueryEditorState } from 'sql/parts/query/common/queryInput';

import { TPromise } from 'vs/base/common/winjs.base';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';

export class QueryEditorActionBar extends Taskbar {

	private runQuery: RunQueryAction;
	private toggleConnect: ToggleConnectDatabaseAction;
	private changeConnection: ChangeConnectionAction;
	private listDatabases: ListDatabasesAction;
	private listDatabaseActionItem: ListDatabasesActionItem;

	private inputDisposables: IDisposable[] = [];

	private _context: IQueryActionContext = {
		input: undefined,
		editor: undefined
	};

	constructor(container: HTMLElement,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super(container, {
			actionItemProvider: action => {
				if (action.id === ListDatabasesAction.ID) {
					return this.listDatabaseActionItem;
				}
				return undefined;
			}
		});
		this.runQuery = instantiationService.createInstance(RunQueryAction);
		this.toggleConnect = instantiationService.createInstance(ToggleConnectDatabaseAction);
		this.changeConnection = instantiationService.createInstance(ChangeConnectionAction);
		this.listDatabases = instantiationService.createInstance(ListDatabasesAction);
		this.listDatabaseActionItem = instantiationService.createInstance(ListDatabasesActionItem);

		this.setContent([
			{ action: this.runQuery },
			{ action: this.toggleConnect },
			{ action: this.changeConnection },
			{ action: this.listDatabases }
		]);
	}

	public setInput(input: QueryInput): TPromise<void> {
		dispose(this.inputDisposables);
		this.inputDisposables = [];
		this.inputDisposables.push(input.state.onChange(() => this.parseState(input.state)));
		this.parseState(input.state);
		this._context.input = input;
		this.context = this._context;
		return TPromise.as(undefined);
	}

	private parseState(state: QueryEditorState) {
		this.changeConnection.enabled = state.connected && !state.executing;
		this.toggleConnect.connected = state.connected;
		this.runQuery.enabled = state.connected && !state.executing;
		this.listDatabaseActionItem.enabled = state.connected && !state.executing;
	}

	public set editor(editor: ICodeEditor) {
		this._context.editor = editor;
		this.context = this._context;
	}
}
