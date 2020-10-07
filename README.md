# Typescript Interview Test

1. Install postgres & nodejs
2. Create the test database using the `./createdb.sh` script
3. Install the `npm_modules` for this project running `npm install`
4. Run `npm run test` to get the program running (modify the user and password if needed)
5. Examine the typescript code under `server.ts`

# Instructions
First of all I want to thank you for spending time reviewing my proposal!

## Arguments
For my proposal the given arguments are the following
### node server.ts <github_username> <lisbon_flag>

1. **github_username**: Mandatory argument. Github username to search. An example would be:
   * **node server.ts dmsapereira**

2. **lisbon_flag**: Masks all the users to be located in Lisbon. The argument is **-L**. If we add more flags, their order is irrelevant as long as they all are **after the username argument**. An example of the flag's usage would be 
   * **node server.ts dmsapereira -L**


