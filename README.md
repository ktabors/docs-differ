# docs-differ

A puppeteer and screenshots-diff based tool to create a visual comparison of two version of a website. It was built for use with the React Spectrum Docs site.

The tool takes two urls and recursively crawls every page of those sites. It does not follow any external links. After these are complete it does a screenshot comparision for a visual diff of all urls that are equivalent.

## Setup

You can clone the repo, crawl two versions of the site, and start the web dashboard. Make sure you have the following requirements installed: node (v12.0.0+) and yarn (v1.22.0+).

```
yarn install
```

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

## Usage

See all the command line arguments for this tool.
```
yarn run-differ --help
```

To disable mobile screenshots (default `false`).
```
yarn run-differ -m -b <BASE_URL> -c <NEW_URL>
```

To disable desktop screenshots (default `false`).
```
yarn run-differ -d -b <BASE_URL> -c <NEW_URL>
```

If the screenshot comparison fails and doesn't complete, you can rerun it without running the scraper.
```
yarn run-differ -r
```

An optimization for saving disk space is to delete the crawled screenshots after the screeshot comparison completes.
```
yarn run-differ -f -b <BASE_URL> -c <NEW_URL>
```

To crawl a new baseline followed by a screenshot comparision of this new baseline and the existing current.
```
yarn run-differ -u -b <BASE_URL>
```

To crawl a new current followed by a screenshot comparision of the existing baseline and this new current.
```
yarn run-differ -w -c <BASE_URL>
```

There is an added delay of 100ms to desktop screenshots because the page isn't always fully rendered when pupeteer tries to take the screenshot. Use this to increase or decrease that delay.
```
yarn run-differ -t 1000 -b <BASE_URL> -c <NEW_URL>
```

Sites often have 100+ pages and running this tool in serial is time consuming. We used a clustering tool to parallelize requests, default 10. Use this to change the number of parallel requests.
```
yarn run-differ -k 20 -b <BASE_URL> -c <NEW_URL>
```

The tool logs every url request it makes, this quiets those.
```
yarn run-differ -q -b <BASE_URL> -c <NEW_URL>
```

This is a debugging option to quickly run the tool on a subset of the site.
```
yarn run-differ -s 10 -b <BASE_URL> -c <NEW_URL>
```
