import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { readJson, writeJson, isRunning } from './storage.mjs';

const exec = promisify(execFile);
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";

export function createDispatcher({ root, cloudRoot, dataDir }) {
  const jobDirectory = id => path.join(dataDir, 'jobs', id);
  return {
    async start(card) {
      if (process.env.HERDR_ENV !== '1')
        throw new Error('Start the board inside Herdr so each component gets its own workspace.');
      const directory = jobDirectory(card.jobId);
      const workspace = root;
      await mkdir(directory, { recursive: true });
      const job = {
        id: card.jobId,
        root,
        cloudRoot,
        dataDir,
        workspace,
        direct: true,
        directory,
        base: path.join(directory, 'base'),
        card,
        previewPath: `/components/${card.slug}/`,
        model: 'claude-opus-5.5',
        createdAt: new Date().toISOString(),
      };
      await writeJson(path.join(directory, 'job.json'), job);
      await writeJson(path.join(directory, 'status.json'), {
        phase: 'preparing',
        message: 'Starting named Herdr workspace.',
        updatedAt: job.createdAt,
        runnerPid: null,
      });
      const { stdout } = await exec('herdr', [
        'workspace',
        'create',
        '--cwd',
        workspace,
        '--label',
        `Sprout · ${card.name}`,
        '--no-focus',
      ]);
      const response = JSON.parse(stdout).result;
      const workspaceId = response.workspace.workspace_id;
      const paneId = response.root_pane.pane_id;
      await writeJson(path.join(directory, 'location.json'), {
        workspaceId,
        paneId,
      });
      const runner = path.join(root, 'tools/component-board/worker.mjs');
      await exec('herdr', [
        'pane',
        'run',
        paneId,
        `${quote(process.execPath)} ${quote(runner)} ${quote(path.join(directory, 'job.json'))}`,
      ]);
      return { workspaceId, paneId };
    },
    async status(id) {
      const status = await readJson(path.join(jobDirectory(id), 'status.json'));
      if (['review', 'error'].includes(status.phase)) return status;
      if (status.runnerPid && !isRunning(status.runnerPid))
        return {
          phase: 'error',
          message: 'Worker exited before completion. Its files and logs are preserved. Retry explicitly.',
        };
      if (!status.runnerPid && Date.now() - Date.parse(status.updatedAt) > 90000)
        return {
          phase: 'error',
          message: 'Worker did not start within 90 seconds. Inspect its Herdr workspace before retrying.',
        };
      return status;
    },
    async integrate(id) {
      await writeJson(path.join(jobDirectory(id), 'integrate.json'), {
        approvedAt: new Date().toISOString(),
      });
    },
    async log(id) {
      const directory = jobDirectory(id);
      const parts = [];
      for (const name of ['build.log', 'checks.log', 'integrate.log', 'integration-checks.log']) {
        try {
          const handle = await open(path.join(directory, name), 'r');
          try {
            const size = (await handle.stat()).size;
            const buffer = Buffer.alloc(Math.min(size, 24000));
            await handle.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length));
            parts.push(`--- ${name} ---\n${buffer.toString('utf8')}`);
          } finally {
            await handle.close();
          }
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      }
      return parts.join('\n\n');
    },
  };
}
