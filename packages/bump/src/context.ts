import type * as CliApp from '@epdoc/cliapp';
import * as Log from '@epdoc/logger';

type MsgBuilder = Log.MsgBuilder.Console.Builder;
type Logger = Log.Std.Logger<MsgBuilder>;

const logMgr: Log.Mgr<MsgBuilder> = new Log.Mgr<MsgBuilder>().init();
logMgr.threshold = 'info';

/**
 * The context for the command line interface.
 */
export class Context implements CliApp.ICtx<MsgBuilder, Logger> {
  log: Logger;
  logMgr = new Log.Mgr<MsgBuilder>();
  dryRun = false;

  constructor() {
    this.logMgr.init();
    this.logMgr.threshold = 'info';
    this.logMgr.show = {
      level: true,
      timestamp: 'elapsed',
    };
    this.log = this.logMgr.getLogger<Logger>();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
