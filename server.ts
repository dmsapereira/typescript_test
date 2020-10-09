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

const QueryResultError = pgp.errors.QueryResultError;

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

//"Main"
function dbOperation(login : String, lisbonMaskFlag : boolean){
    db.none('CREATE TABLE github_users (id BIGSERIAL, login TEXT, name TEXT, company TEXT, location TEXT, email TEXT, followers INT, following INT)')
    .then(() => //check for a duplicate user
        db.one(`SELECT 1 FROM github_users WHERE login = '${login}'`)
        .then(() => true)
        .catch(() => false)
    , () => 
      db.one(`SELECT 1 FROM github_users WHERE login = '${login}'`)
        .then(() => true)// this disgrace is here because we want to procceed even if the table already exists
        .catch(() => false)
    )
    .then((hasDuplicate: boolean) => {      
      if(hasDuplicate){
        throw new Error('User Already Exists!')
      }
    })//get the user data from Github
    .then(() => request({
      uri: `https://api.github.com/users/${login}`,
      headers: {
        'User-Agent': 'Request-Promise'
      },
      json: true
    }))//Insert the user
    .then((userData : GithubUser) => 
        db.one('INSERT INTO github_users VALUES ($[id], $[login], $[name], $[company], $[location], $[email], $[followers], $[following]) RETURNING id', userData))
    .then(() => //Print the users
        db.each('SELECT * FROM github_users',null, (data : GithubUser) => printUserInfo(data, lisbonMaskFlag)))
    .then(() => //Print the location statistics
        db.each('SELECT COUNT(*) AS population, location FROM github_users GROUP BY location',null, printLocationStats))
    .then(() => 
        process.exit(0))
    .catch((error : Error) => {
        console.log(error.message)
        process.exit(0);
    });
}

dbOperation(process.argv[2], process.argv.includes(LISBON_FLAG));