import { FileSpec } from '@epdoc/fs';
import { _ } from '@epdoc/type';
import { format } from '@std/datetime';

export class Changelog {
  fs: FileSpec = new FileSpec(Deno.cwd(), 'CHANGELOG.md');
  header: string;

  constructor(name: string) {
    this.header = `# Changelog for ${name}\n\nAll notable changes to this project will be documented in this file.\n\n`;
  }

  async update(version: string, message?: string[]): Promise<void> {
    const date = format(new Date(), 'yyyy-MM-dd');
    // let msg = '- Add details here';
    const msgs: string[] = [];
    if (_.isNonEmptyArray(message)) {
      message.forEach((msg) => {
        msgs.push('- ' + msg);
      });
    } else {
      msgs.push('- add details here');
    }
    const newSection = [`## [${version}] - ${date}`, '', ...msgs];

    const isFile = await this.fs.getIsFile();
    if (isFile) {
      const lines = await this.fs.readAsLines();
      const firstH2Index = lines.findIndex((line) => line.startsWith('## '));

      if (firstH2Index !== -1) {
        lines.splice(firstH2Index, 0, ...newSection, '');
        await this.fs.write(lines);
      } else {
        await this.fs.write(`${this.header}${newSection}\n`);
      }
    } else {
      await this.fs.write(`${this.header}${newSection}\n`);
    }
  }
}
