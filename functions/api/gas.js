import { tanganiPermintaanGas } from '../_shared/gas-proxy.js';

export function onRequest({ request, env }) {
  return tanganiPermintaanGas(request, env);
}
