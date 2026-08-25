# Public Workspace Data

This repository stores public, project-associated files managed through [gh-workspace-data](https://github.com/SorinGFS/gh-workspace-data). It keeps optional tests, documentation, examples, benchmarks, and other supplemental material outside canonical project repositories while making that material available beside project code as ordinary files.

## Layout

Each component is addressed by concern and canonical GitHub project identity:

```text
<concern>/github.com/<owner>/<project>/<path>
```

Concerns are open-ended categories such as `tests`, `docs`, or `benchmarks`. For example:

```text
tests/github.com/SorinGFS/url-templates/0/schema.json
```

materializes in a checkout of `SorinGFS/url-templates` as:

```text
#/public/tests/0/schema.json
```

The complete source path keeps every project unambiguous; the workspace path omits the project identity because the active checkout already supplies it.

## Load public data

Install the GitHub CLI extension once:

```sh
gh extension install SorinGFS/gh-workspace-data
```

Then run these commands from a canonical project checkout:

```sh
gh workspace-data init
gh workspace-data load
```

The extension discovers every public concern matching that project's Git origin and materializes only those components under `#/public/`.

## Contribute

Maintain public data from the associated canonical project workspace:

1. Load the project data.
2. Add, edit, move, or delete files under `#/public/<concern>/`.
3. Publish the changes:

   ```sh
   gh workspace-data publish
   ```

Publication creates or updates a contribution branch and pull request instead of pushing directly to this repository's default branch.

## Boundaries

- Data here is public. Never store secrets, credentials, private keys, tokens, or confidential material.
- Supplemental data remains independent of the canonical project's implementation, required build, CI, and distribution contract.
- Direct maintenance of this repository is reserved for initial setup or explicit administrative repair; routine changes should flow through `gh workspace-data publish`.
