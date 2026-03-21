export interface DocumentParseResult {
  filename: string;
  text: string;
  charCount: number;
}

export interface DocumentAnalysisResult {
  requirements: string[];
  constraints: string[];
  stakeholders: string[];
  integrationPoints: string[];
  summary: string;
}
