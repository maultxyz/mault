import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", ".turbo/**"],
  },
  tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["error", "warn"] }],
    },
  },
  {
    files: ["src/**/*.tsx"],
    ...jsxA11y.flatConfigs.strict,
    settings: {
      "jsx-a11y": {
        components: {
          Button: "button",
          InputGroupButton: "button",
          Input: "input",
          InputGroupInput: "input",
          Textarea: "textarea",
          img: "img",
        },
      },
    },
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/anchor-has-content": "off",
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          assert: "either",
          depth: 4,
          controlComponents: [
            "Input",
            "InputGroupInput",
            "Textarea",
            "Checkbox",
            "Switch",
            "Select",
            "SelectTrigger",
            "Slider",
            "Combobox",
            "ComboboxInput",
            "RadioGroupItem",
          ],
        },
      ],
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "marquee"], allowExpressionValues: true },
      ],
      "jsx-a11y/no-noninteractive-element-interactions": [
        "error",
        { handlers: ["onClick", "onMouseDown", "onMouseUp", "onKeyPress"] },
      ],
    },
  },
);
