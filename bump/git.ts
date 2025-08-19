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
  }

  async add(): Promise<void> {
    await this.run(['add', '.']);
  }

  async commit(message: string): Promise<void> {
    await this.run(['commit', '-m', message]);
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
