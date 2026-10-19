import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

export default tseslint.config(
    ...tseslint.configs.recommendedTypeChecked,
    {
        plugins: { unicorn },
        rules: {
            'unicorn/no-for-loop': 'error',
            'unicorn/prefer-includes': 'error',
            'unicorn/prefer-string-starts-ends-with': 'error',
            'unicorn/no-useless-undefined': 'error',
        },
    },
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // 未使用変数: _ 始まりは「意図的に使わない」慣習として無視する。
            // ignoreRestSiblings は const { x: _drop, ...rest } の _drop を許す。
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            '@typescript-eslint/strict-boolean-expressions': [
                'error',
                {
                    allowString: false,
                    allowNumber: false,
                    allowNullableObject: false,
                    allowNullableBoolean: false,
                    allowNullableString: false,
                    allowNullableNumber: false,
                    allowAny: false,
                },
            ],
            '@typescript-eslint/no-magic-numbers': [
                'warn',
                {
                    ignore: [0, 1, -1, 2, 100],
                    ignoreArrayIndexes: true,
                    ignoreDefaultValues: true,
                    ignoreEnums: true,
                    ignoreNumericLiteralTypes: true,
                    ignoreTypeIndexes: true,
                    enforceConst: true,
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: "BinaryExpression[operator='/'][right.type='Literal'][right.value=0]",
                    message: 'リテラル 0 での除算は禁止です(Infinity になります)',
                },
                {
                    selector: "BinaryExpression[operator='%'][right.type='Literal'][right.value=0]",
                    message: 'リテラル 0 での剰余は禁止です(NaN になります)',
                },
            ],
        },
    },
    {
        ignores: ['node_modules', 'dist'],
    },
);
