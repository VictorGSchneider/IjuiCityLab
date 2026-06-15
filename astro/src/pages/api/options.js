import { json } from '../../lib/http.js';
import { AREAS, PERFIS, ESTAGIOS } from '../../lib/options.js';
export const GET = () => json({ areas: AREAS, perfis: PERFIS, estagios: ESTAGIOS });
