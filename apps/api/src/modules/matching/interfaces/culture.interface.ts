export interface CultureScoreInput {
  profileValues: string[];
  projectValues: string[];
  profileWorkStyles: string[];
  projectWorkStyles: string[];
  preferredEnvironments: string[];
  projectEnvironment?: string | null;
}
