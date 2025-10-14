import type { Context } from './context.ts';

/**
 * A class to manage git operations.
 */
export class Git {
  #ctx: Context;

  constructor(ctx: Context) {
    this.#ctx = ctx;
  }

  async run(cmd: string[]): Promise<void> {
    await this.runWithOutput(cmd);
  }

  async runWithOutput(cmd: string[]): Promise<string> {
    this.#ctx.log.info.h2('Running').h2(cmd.join(' ')).emit();
    const command = new Deno.Command('git', { args: cmd });
    const { code, stdout, stderr } = await command.output();
    if (code !== 0) {
      const err = new TextDecoder().decode(stderr);
      throw new Error(`Git command failed: git ${cmd.join(' ')}
${err}`);
    }
    const out = new TextDecoder().decode(stdout);
    this.#ctx.log.info.plain(out).emit();
    return out;
  }

  async add(): Promise<void> {
    const filesToAdd = await this.getFilesToAdd();
    await this.run(['add', ...filesToAdd]);
  }

  async getFilesToAdd(): Promise<string[]> {
    const porcelain = await this.getPorcelain();
    const rootDir = await this.getRootDir();
    const filesToAdd: string[] = ['.'];
    const allowedFiles = [
      'deno.lock',
      '.vscode/launch.json',
      'launch.config.json',
      'README.md',
      'deno.json',
      '.gitignore',
      'launch.config.json',
    ];
    if (rootDir && porcelain.length) {
      const packageDir = Deno.cwd();
      const relativeToRoot = packageDir.substring(rootDir.length + 1);
      const depth = relativeToRoot.split('/').length;
      const prefix = '../'.repeat(depth);

      porcelain.forEach((line) => {
        const file = line.trim().split(' ').pop();
        if (file) {
          const absFile = `${rootDir}/${file}`;
          if (!absFile.startsWith(packageDir)) {
            if (
              allowedFiles.includes(file) || file.endsWith('.md') ||
              file.startsWith('docs/')
            ) {
              filesToAdd.push(`${prefix}${file}`);
            }
          }
        }
      });
    }
    return filesToAdd;
  }

  async getPorcelain(): Promise<string[]> {
    const output = await this.runWithOutput(['status', '--porcelain']);
    return output.split('\n').filter((item) => item.length > 0);
  }

  async getRootDir(): Promise<string | undefined> {
    try {
      const output = await this.runWithOutput(['rev-parse', '--show-toplevel']);
      return output.trim();
    } catch (_err) {
      this.#ctx.log.warn.warn('Not a git repository').emit();
    }
    return undefined;
  }

  async commit(msgs: string[]): Promise<void> {
    const args = ['commit'];
    msgs.forEach((msg) => {
      args.push('-m');
      args.push(msg);
    });
    await this.run(args);
  }

  async tag(version: string, message?: string): Promise<void> {
    const msg = message ? message : version;
    await this.run(['tag', '-a', version, '-m', msg]);
  }

  async push(withTags = false): Promise<void> {
    await this.run(['push']);
    if (withTags) {
      await this.run(['push', '--tags']);
    }
  }
}
