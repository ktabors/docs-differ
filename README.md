# docs-differ

## Getting Started
Run the following to generate a set of diff versus the base RSP docs site and spin up the comparison tool.

```
yarn diff-base <NEW_DOCS_URL>
```

The docs differ can be run independently against two user specified url link via:

```
yarn run-differ -b <BASE_URL> -c <NEW_URL>
```

The dashboard can then be started via:

```
yarn start
```
