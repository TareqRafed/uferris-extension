const mockConfiguration = {
  get: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
};

const vscode = {
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showQuickPick: jest.fn(),
    createTerminal: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue(mockConfiguration),
    workspaceFolders: undefined as { uri: { fsPath: string } }[] | undefined,
  },
  tasks: {
    executeTask: jest.fn().mockResolvedValue(undefined),
  },
  commands: {
    registerCommand: jest.fn(),
  },
  Task: jest.fn().mockImplementation(function (
    this: Record<string, unknown>,
    definition: unknown,
    scope: unknown,
    name: string,
    source: string,
    execution: unknown
  ) {
    this.definition = definition;
    this.scope = scope;
    this.name = name;
    this.source = source;
    this.execution = execution;
  }),
  ShellExecution: jest.fn().mockImplementation(function (
    this: Record<string, unknown>,
    command: string,
    options?: unknown
  ) {
    this.command = command;
    this.options = options;
  }),
  TaskScope: {
    Workspace: 1,
    Global: 2,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
};

export = vscode;
