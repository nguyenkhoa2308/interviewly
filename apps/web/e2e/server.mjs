import { createServer } from 'node:http';

import next from 'next';

const app = next({ dev: false, dir: process.cwd() });
const handle = app.getRequestHandler();

await app.prepare();

createServer((request, response) => {
    if (request.url === '/__e2e__/pid') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ pid: process.pid }));
        return;
    }

    return handle(request, response);
}).listen(3100);
