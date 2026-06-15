// Valores válidos compartilhados entre validação, API e front.
export const AREAS    = ['mobilidade', 'energia', 'saude', 'seguranca', 'dados', 'outro'];
export const PERFIS   = ['startup', 'empresa', 'pesquisador', 'estudante', 'poder-publico', 'outro'];
export const ESTAGIOS = ['ideia', 'prototipo', 'piloto', 'escala'];

export const PROPOSAL_STATUS = ['submitted', 'under_review', 'approved', 'rejected', 'archived'];
export const CONTACT_STATUS  = ['new', 'read', 'replied', 'archived'];
export const PROJECT_STATUS  = ['planning', 'active', 'paused', 'completed', 'archived'];
export const KEY_SCOPES      = ['read', 'ingest', 'read_ingest'];

export const AREA_LABEL = {
  mobilidade: 'Mobilidade urbana',
  energia: 'Energia inteligente',
  saude: 'Saúde e bem-estar',
  seguranca: 'Segurança pública',
  dados: 'Dados e IoT',
  outro: 'Outro',
};
