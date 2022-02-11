# Assign reviewers

This action assign reviewers based on a file like [CODEOWNERS](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-on-github/about-code-owners).

## Usage

1. Crete a file like [CODEOWNERS](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-on-github/about-code-owners).
   ```
   # .github/assign-reviewer.txt
   # This is example
   * @organization/team
   *.go @foo @bar
   *.js @baz
   ```
1. Create a workflow config.

   ```
   # .github/workflows/assign-reviewer.yml
   name: 'assign reviewers'

   on:
     pull_request

   jobs:
     add-reviewer:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v1
         - uses: ohnogumi/assign-reviewers@v0.0.4
           with:
            # required
            # If you assign team for reviewer, you generate a personal access tokens with workflow scope. 
            token: "${{ secrets.GITHUB_TOKEN }}" # "${{ secrets.PERSONAL_TOKEN }}"
            
            # optional 
            # config: ".github/assign-reviewers.txt"
   ```
