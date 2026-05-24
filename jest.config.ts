import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  verbose: true,
  transform: {
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
        diagnostics: { warnOnly: true, ignoreCodes: [151002] },
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^\\./pluginManager\\.js$": "<rootDir>/src/__mocks__/pluginManager.js",
    "^(\\./|.*/)lib/Mqtt\\.js$": "<rootDir>/src/__mocks__/Mqtt.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

export default config;
