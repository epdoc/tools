# Gemini Instructions

Various command line tools, each in their own workspace.

## Description

The project uses Deno and TypeScript throughout. The command line executable uses the `commanderjs` library to expose
`schema` and `convert` commands.

## References

Read the [README](./README.md) to better understand the project and to find references to other documentation.

## Code Generation

- Do not use the TypeScript type 'any'. Instead use 'unknown'.
- Do not use switch statements. Prefer `if () {} else if () {} else {}`.
- If and only if `@epdoc/type` is already imported into this project, use the type guards and tests and other utility
  functions provided in `@epdoc/type` where possible. For example:
  - instead of using `val instanceof Date`, use `isDate(val)`.
  - instead of using `typeof val === 'string'`, use `isString(val)`.
- Import statements
  - Need to include the `.ts` extension for imported files.
  - Automatically fix `type` keyword usage in `import` statements where found in typescript `.ts` files:
  - When only importing types for all imports from a file or module, add a `type` keyword outside of the curly braces.

## Code commenting

### JSDoc Commenting Guidelines (for TypeScript)

When generating or modifying TypeScript code, please adhere to the following JSDDco commenting standards:

1. **Purpose**: JSDoc comments improve code clarity, provide IDE IntelliSense, and support automated API documentation.
2. **Placement**: Use `/** ... */` block comments directly above the code element being documented.
3. **Required Documentation**:
   - All exported functions, classes, methods, and complex type definitions (interfaces, type aliases).
   - Internal helper functions if their logic is not immediately obvious.
   - File overview, only if the file is not a single class that is already sufficiently documented
4. **Content**:
   - Start with a concise summary sentence.
   - Follow with a more detailed explanation if necessary (complex logic, edge cases, context).
5. **Common JSDoc Tags**:
   - `@param {Type} [name] - Description.`: For function/method parameters. Use brackets `[]` for optional parameters
     and specify default values if applicable (e.g., `[name='default']`).
   - `@returns {Type} - Description.`: For what a function/method returns. Omit for `void` or `Promise<void>` returns.
   - `@example <caption>Optional Caption</caption>
Code example here.`: Provide small, runnable code snippets.
   - `@throws {ErrorType} - Description.`: Document potential errors or exceptions.
   - `@deprecated [reason and/or alternative]`: Indicate deprecated elements.
   - `@see {@link otherFunction}` or `@see URL`: Link to related functions or external resources.
   - `{@link targetCode|displayText}`: For inline links within descriptions.
6. **Class-Specific Tags**:
   - `@extends {BaseClass}`: If the class extends another.
   - `@template T`: For generic classes, define type parameters.
7. **Method-Specifics**: Document all `public` and `protected` methods. `private` methods only if their logic isn't
   obvious.
8. **Consistency**: Ensure consistent style and tag usage throughout the code.
9. **Accuracy**: Comments must be kept up-to-date with code changes. Inaccurate comments are worse than no comments.
10. **Conciseness**: Avoid redundant comments that simply restate obvious code. Focus on the "why" and the API contract.

### Git Commit Message Generation

Only use the work 'refactor' when a significant change has been made to how code is organized or a class is implemented.
Instead use the word 'modified' when changes are made.
