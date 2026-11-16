export interface Environment {
  production: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  mapboxAccessToken: string;
  r2PublicBaseUrl: string;
}

export const environment: Environment = {
  production: true,
  supabaseUrl: '',
  supabaseAnonKey: '',
  mapboxAccessToken: '',
  r2PublicBaseUrl: '',
};
