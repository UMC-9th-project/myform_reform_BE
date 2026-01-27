import eslintPluginPrettier from 'eslint-plugin-prettier';
import typescriptEslintParser from '@typescript-eslint/parser';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'generated/**/*',
      '@types/**/*',
      '__test__/**/*'
    ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptEslintParser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.scripts.json'],
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      prettier: eslintPluginPrettier
    },
    rules: {
      // Prettier 충돌 방지
      // 'prettier/prettier': 'warn',

      // 코드 품질
      'no-unused-vars': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',

      // 스타일 (Google 권장), 사실 prettier에서 전부 잡을 수 있다.
      indent: ['warn', 2],
      quotes: ['warn', 'single'],
      semi: ['warn', 'always'],
      'comma-dangle': ['warn', 'never'],
      'brace-style': ['warn', '1tbs', { allowSingleLine: true }],

      // 네이밍 컨벤션 (Google 기준)
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'default',
          format: ['camelCase']
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE']
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'class',
          format: ['PascalCase']
        },

        {
          selector: 'function',
          format: ['camelCase']
        }
      ],

      // ===, !== 권장
      eqeqeq: ['warn', 'always'],

      // 삼항 연산자 줄바꿈
      'multiline-ternary': ['warn', 'always-multiline'],

      // 한 줄에 하나의 변수 선언 (var)
      'one-var': ['warn', 'never'],

      // eval 사용 금지
      'no-eval': 'warn',

      // with 사용 금지
      'no-with': 'warn',

      // Object.freeze 등 금지
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "CallExpression[callee.object.name='Object'][callee.property.name='freeze']",
          message: 'Do not use Object.freeze'
        },
        {
          selector:
            "CallExpression[callee.object.name='Object'][callee.property.name='seal']",
          message: 'Do not use Object.seal'
        },
        {
          selector:
            "CallExpression[callee.object.name='Object'][callee.property.name='preventExtensions']",
          message: 'Do not use Object.preventExtensions'
        }
      ],

      // require는 최상단에 위치
      'global-require': 'warn',

      // setter 사용 금지
      'accessor-pairs': ['warn', { setWithoutGet: true }]
    }
  }
];
