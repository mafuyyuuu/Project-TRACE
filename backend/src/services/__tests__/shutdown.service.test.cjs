const http = require('http');
const { EventEmitter } = require('events');
const { installShutdown } = require('../shutdown.service');
it('waits for an actual in-flight HTTP response before closing the database', async () => {
  let finish; const received = new Promise(resolve => finish = resolve); let release;
  const server = http.createServer(async (_req,res) => { finish(); await new Promise(resolve=>release=resolve); res.end('done'); });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const request = fetch(`http://127.0.0.1:${server.address().port}`); await received;
  const pool={end:vi.fn()}, exit=vi.fn(), operations={drain:vi.fn()}, signals=new EventEmitter();
  const stop=installShutdown({server,pool,operations,exit,signals});
  const pending=stop(); expect(operations.drain).toHaveBeenCalled(); expect(pool.end).not.toHaveBeenCalled();
  release(); expect(await (await request).text()).toBe('done'); await pending;
  expect(pool.end).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledWith(0);
  await stop(); expect(pool.end).toHaveBeenCalledOnce();
});
