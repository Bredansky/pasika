# Application Structure Rule

Without a fixed set of folders, every contributor invents a new place for code and the layer model stops describing the repository. This rule fixes which folders exist and what each one holds.

- Application source MUST live under `src/`.
- A source file MUST NOT exceed 300 lines.
- `src/` MUST contain only the `app/`, `compositions/`, `features/`, and `shared/` folders, the root support folders, `config/`, `locales/`, and the files a framework requires at the `src` root.
- `src/features/` MUST contain only feature folders.
- A folder holding support files MUST be named `hooks/`, `types/`, `schemas/`, `constants/`, or `utils/`, matching the kind of file it holds.
- A `types/`, `schemas/`, or `constants/` folder MUST NOT mix unrelated support kinds; keep types, schemas, and constants in their matching folders.
- A support folder MUST NOT contain a component.
- A file that does not define a component MUST have a kebab-case name.
- A feature folder, `src/compositions/`, `src/shared/`, and a nested component folder MAY each contain support folders, and any other folder in these scopes MUST be a component folder containing a `.tsx` file with the same name and an `index.ts` that named-re-exports that component.
- A non-`index.ts` `.ts` file MUST NOT only re-export a sibling React component; place the component implementation in the `.tsx` file at the public import path instead. Component-folder `index.ts` entry points remain required.
