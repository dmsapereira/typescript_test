const pgPromise = require('pg-promise');
const R         = require('ramda');
const request   = require('request-promise');

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

/*
interface GithubUsers
  { id : number
  };
  */

interface GithubUser{
  id: number,
  login: Text,
  name: Text,
  company: Text,
  location: Text
}

function printUserInfo(data : GithubUser){
  console.info(`ID: ${data.id}; Login: ${data.login}; Name: ${data.name}; Company: ${data.company}; Location: ${data.location}`);
}

const pgp = pgPromise(pgpDefaultConfig);
const db = pgp(options);

async function createUsersTable(){
  await db.none('CREATE TABLE github_users (id BIGSERIAL, login TEXT, name TEXT, company TEXT, location TEXT)')
    .catch(() => console.log("Table already exists"))
}


async function addUser(data : GithubUser){
  await db.one('INSERT INTO github_users VALUES ($[id], $[login], $[name], $[company], $[location]) RETURNING id', data);
}
async function getGithubUser(login : String){
  return await request({
    uri: `https://api.github.com/users/${login}`,
    headers: {
      'User-Agent': 'Request-Promise'
    },
    json: true
  });
}

async function duplicateUser(login : String){
  try{
    let row = await db.one(`SELECT 1 FROM github_users WHERE login = ${login}`);
  }catch(error){
    return true;
  }

  return false;
}

async function listUsers(){
  await db.each('SELECT * FROM github_users',null, (data : GithubUser) => printUserInfo(data));
}

async function dbOperation(login : String, listFlag : boolean){
    await createUsersTable();
    if(await duplicateUser(login)){
      let userData = await getGithubUser(login);
      await addUser(userData);
    }else{
      console.error("User already exists in the database");
    }

    if(listFlag){
      await listUsers();
    }

    process.exit(0);
}


dbOperation(process.argv[2], process.argv[3] == "-l");
