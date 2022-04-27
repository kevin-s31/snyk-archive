# Remove archived repositories from Snyk

This tool will go through a Snyk organisation and prompt you about archived github repositories which still have Snyk integration, and is able to remove the snyk integration for you.

To use this tool you will need a GitHub token which has read permissions on repositories and a Snyk token.

You can run this tool via `npx snyk-cleanup-archived-github-repositories`


## Contributing

To publish this package to npm, create a new release in [github](https://github.com/Financial-Times/snyk-cleanup-archived-repositories/releases). In the `Choose a tag` dropdown enter a version following SemVer, e.g. v1.1.1.