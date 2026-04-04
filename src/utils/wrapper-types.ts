export interface WrapperExecConfig {
  command: string;
  args?: string[];
  argTemplates?: string[];
  envArgs?: Array<{
    flag: string;
    envName: string;
  }>;
}

export interface WrapperConfig {
  scriptName: string;
  requiredEnv?: string[];
  staticEnv?: Record<string, string>;
  forwardedEnv?: Record<string, string>;
  templatedEnv?: Record<string, string>;
  useLoadEnv?: boolean;
  exec: WrapperExecConfig;
}
