// @ts-check

import eslint from "npm:@eslint/js";
import tseslint from "npm:typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended
);
