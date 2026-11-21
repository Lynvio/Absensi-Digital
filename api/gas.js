import { tanganiPermintaanGas } from '../functions/_shared/gas-proxy.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const headers = new Headers();
  if (req.headers && typeof req.headers === 'object') {
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') {
        headers.set(k, v);
      } else if (Array.isArray(v)) {
        headers.set(k, v.join(', '));
      }
    }
  }

  let body;
  if (req.method === 'POST') {
    if (typeof req.body === 'string') {
      body = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body.toString('utf8');
    } else {
      body = JSON.stringify(req.body ?? {});
    }
  }

  const request = new Request('https://vercel.local/api/gas', {
    method: req.method,
    headers,
    body,
  });
  const response = await tanganiPermintaanGas(request, process.env);

  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.status(response.status);
  if (response.status === 204) return res.end();
  return res.send(await response.text());
}
