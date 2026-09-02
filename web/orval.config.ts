import { defineConfig } from 'orval'

export default defineConfig({
  myfinances: {
    input: {
      // OpenAPI document emitted by the .NET build (backend/openapi/…).
      target: '../backend/openapi/MyFinances.Api.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      indexFiles: true,
      override: {
        mutator: {
          path: './src/api/mutator.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
})
