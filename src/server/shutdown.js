// Graceful stop for SIGINT/SIGTERM; a signal listener replaces Node's exit, so
// this ends the process. pm2 kills 1.6 s after SIGINT, so the databases are
// written first and synchronously; open requests get the rest of `timeoutMs`.
// A second signal exits at once.
export const SERVICE_RESTART = 1012;

export function createShutdown({
  server,
  socketServers = [],
  stopJobs = [],
  flushes = [],
  timeoutMs = 1500,
  exit = (code) => process.exit(code),
  log = console
}) {
  let stopping = false;

  const runAll = (fns, label) => {
    for (const fn of fns) {
      try {
        fn();
      } catch (error) {
        log.error?.(`[Shutdown] ${label} failed:`, error.message);
      }
    }
  };

  return function shutdown(signal = 'SIGTERM') {
    if (stopping) {
      exit(1);
      return;
    }
    stopping = true;
    log.log?.(`[Shutdown] ${signal}: stopping`);

    let finished = false;
    const finish = (code) => {
      if (finished) return;
      finished = true;
      // Requests that finished in the meantime may have written again.
      runAll(flushes, 'flush');
      exit(code);
    };

    server?.close(() => finish(0));
    runAll(stopJobs, 'stop');
    for (const wss of socketServers) {
      try {
        // 1012: the clients reconnect once the server is back.
        wss.clients.forEach(ws => ws.close(SERVICE_RESTART, 'Server restart'));
        wss.close();
      } catch (error) {
        log.error?.('[Shutdown] closing sockets failed:', error.message);
      }
    }
    runAll(flushes, 'flush');
    server?.closeIdleConnections?.();

    const timer = setTimeout(() => finish(0), timeoutMs);
    timer.unref?.();
  };
}
