# Features and Issues

## Rework Include and Exclude for finding files to include in launch.json

Create one or more classes in the `src` folder that will find the files that we will include in our output
configurations array of the `launch.json` file.

### Nomenclature:

- configurations - the output configurations in a launch.json file
- settings - the input settings from deno.json and launch.config.json files

### Solution

A class will be used to find files. It will take the parameters `root`: FolderSpec, `include` and `exclude`, with the
include and exclude using the exact syntax as is used in deno.json test.include and test.exclude properties. The result
will be a FileSpec array. If possible, the solution should use glob search patterns availble in deno's various @std
libraries. Even better, if there is an existing implementation that takes a folder path, include and exclude lists, then
we should use it.

Logic will be written to merge the relevant settings from a deno.json and launch.config.json file that are in the same
folder, returning an object that contains the property `groups`, which is an array of settings.

Another class will find all deno.json files in a project and return an array of the merged settings from the different
folders.

We will use the array of settings and our class to find files to search for all the file in a project. These will be
merged into one list, with lower level definitions or property values overriding higher level values (in the folder
structure).

The script will output to .vscode/launch.json a list of all the launch configurations that can be used by vscode, using
groups and separators between groups.

The script should exclude any folders that would automatically be excluded by deno's own implementation (`node_modules`,
.`git`) without having been specified in the `deno.json` test `exclude` list.

The solution must prioritize use of @epdoc/fs for all file system operations, and other @epdoc libraries such as
@epdoc/type. Deno libraries should be prioritized over other libraries, wherever @epdoc does not provide a solution.
@epdoc libraries can be found at https://github.com/orgs/epdoc/repositories.

The solution will auto generate a launch.config.json file if one does not previously exist. This will use three groups:

- test for any test files, which, if not otherwise specified, should include all *.test.ts files
- run for any *.run.ts files, even though none may have been found
- a separate group for each export from each workspace (or root if there are no workspaces), as found in the deno.json
  export, for any executable exports (ie. not for mod.ts files), using a default set of runtime args, empty set of
  scriptArgs, etc

When this is created, the console will output that it has been created for the user's ability to edit. we will create
one of these files at the same level as every deno.json file.
