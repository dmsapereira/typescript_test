const pgPromise = require('pg-promise');
const R         = require('ramda');
const request   = require('request-promise');

const LISBON_FLAG = "-L";

// Limit the amount of debugging of SQL expressions
const trimLogsSize : number = 200;

// Database interface
interface DBOptions
  { host      : string
  , database  : string
  , user?     : string
  , password? : string
  , port?     : number
  };

// Actual database options
const options : DBOptions = {
  // user: ,
  // password: ,
  host: 'localhost',
  database: 'lovelystay_test',
};

console.info('Connecting to the database:',
  `${options.user}@${options.host}:${options.port}/${options.database}`);

const pgpDefaultConfig = {
  promiseLib: require('bluebird'),
  // Log all querys
  query(query) {
    console.log('[SQL   ]', R.take(trimLogsSize,query.query));
  },
  // On error, please show me the SQL
  error(err, e) {
    if (e.query) {
      console.error('[SQL   ]', R.take(trimLogsSize,e.query),err);
    }
  }
};

interface GithubUser{
  id: number,
  login: Text,
  name: Text,
  company: Text,
  location: Text,
  email: Text,
  followers: number,
  following: number
}

interface LocationStatistic{
  population: number,
  location: Text
}


const pgp = pgPromise(pgpDefaultConfig);
const db = pgp(options);

//Printing functions
function printUserInfo(data : GithubUser, lisbonMaskFlag : boolean){
  console.info(`
  ID: ${data.id}; 
  Login: ${data.login}; 
  Name: ${data.name}; 
  Company: ${data.company}; 
  Location: ${lisbonMaskFlag ? "Lisbon" : data.location};
  E-Mail: ${data.email};
  Followers: ${data.followers};
  Following: ${data.following}`);
}

function printLocationStats(data : LocationStatistic){
  console.info(`Location: ${data.location}; Population: ${data.population}`);
}

//Database(Postgres) Functions

async function createUsersTable(){
  await db.none('CREATE TABLE github_users (id BIGSERIAL, login TEXT, name TEXT, company TEXT, location TEXT, email TEXT, followers INT, following INT)')
    .catch(() => console.log("Table already exists"))
}


async function addUser(data : GithubUser){
  await db.one('INSERT INTO github_users VALUES ($[id], $[login], $[name], $[company], $[location], $[email], $[followers], $[following]) RETURNING id', data);
}

async function duplicateUser(login : String){
  try{
    await db.one(`SELECT 1 FROM github_users WHERE login = ${login}`);
  }catch(error){
    return false;
  }

  return true;
}

async function listUsers(lisbonMaskFlag : boolean){
  console.info("USERS")
  await db.each('SELECT * FROM github_users',null, (data : GithubUser) => printUserInfo(data, lisbonMaskFlag));
}

async function listLocationStatistics(){
  console.info("LOCATION STATISTICS")
  await db.each('SELECT COUNT(*) AS population, location FROM github_users GROUP BY location',null, printLocationStats);
}

//Github Functions

function getGithubUser(login : String){
  return request({
    uri: `https://api.github.com/users/${login}`,
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  });
}

//"Main"
function dbOperation(login : String, lisbonMaskFlag : boolean){
    createUsersTable().
    then(() => duplicateUser(login))
    .then((hasDuplicate: boolean) => {
      if(hasDuplicate)
        throw new Error('User Already Exists!')
    })
    .then(() => getGithubUser(login))
    .then((userData : GithubUser) => addUser(userData))
    .then(() => listUsers(lisbonMaskFlag))
    .then(listLocationStatistics)
    .then(() => process.exit(0))
    .catch((error) => console.log(error.message));
}

dbOperation(process.argv[2], process.argv.includes(LISBON_FLAG));