import { createTreeWithEmptyWorkspace } from '../../generators/testing-utils/create-tree-with-empty-workspace';
import type { Tree } from '../../generators/tree';
import {
  addProjectConfiguration,
  readProjectConfiguration,
  readWorkspaceConfiguration,
  updateWorkspaceConfiguration,
} from '../../generators/utils/project-configuration';
import { writeJson } from '../../generators/utils/json';
import prefixOutputs from './prefix-outputs';
import { validateOutputs } from 'nx/src/tasks-runner/utils';

describe('15.0.0 migration (prefix-outputs)', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should prefix project outputs', async () => {
    addProjectConfiguration(tree, 'proj', {
      root: 'proj',
      targets: {
        build: {
          executor: 'nx:run-commands',
          outputs: [
            'dist',
            'dist/{projectRoot}',
            'dist/{projectRoot}/**/*.js',
            'proj/coverage',
            './test-results',
            '{projectRoot}/build',
            '{options.outputDirectory}',
          ],
          options: {},
        },
      },
    });

    await prefixOutputs(tree);

    const updated = readProjectConfiguration(tree, 'proj');

    expect(updated.targets.build.outputs).toEqual([
      '{workspaceRoot}/dist',
      '{workspaceRoot}/dist/{projectRoot}',
      '{workspaceRoot}/dist/{projectRoot}/**/*.js',
      '{projectRoot}/coverage',
      '{projectRoot}/test-results',
      '{projectRoot}/build',
      '{options.outputDirectory}',
    ]);

    expect(() => validateOutputs(updated.targets.build.outputs)).not.toThrow();
  });

  it('should prefix target default outputs', async () => {
    const workspace = readWorkspaceConfiguration(tree);
    updateWorkspaceConfiguration(tree, {
      ...workspace,
      targetDefaults: {
        build: {
          outputs: ['dist', '{projectRoot}/build', '{options.outputPath}'],
        },
      },
    });

    await prefixOutputs(tree);

    const updated = readWorkspaceConfiguration(tree);

    expect(updated.targetDefaults).toMatchInlineSnapshot(`
      Object {
        "build": Object {
          "outputs": Array [
            "{workspaceRoot}/dist",
            "{projectRoot}/build",
            "{options.outputPath}",
          ],
        },
      }
    `);
  });

  it('should not error for package.json projects', async () => {
    writeJson(tree, 'proj/package.json', {
      name: 'proj',
      scripts: {
        build: 'echo',
      },
    });
    tree.delete('workspace.json');

    await prefixOutputs(tree);
  });
});
