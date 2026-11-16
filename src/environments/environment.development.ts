import { Environment } from './environment.model';
export * from './environment.model';

export const environment: Environment = {
  production: false,
  supabaseUrl: '',
  supabaseAnonKey: '',
  mapboxAccessToken: '',
  r2PublicBaseUrl: '',
};
