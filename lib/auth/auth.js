// import { createHash } from 'crypto'; // change to bcrypt
import DEFAULT_OPTS from '../settings.js';
import { readFileSync } from 'fs';
import path from 'path';
import debugLib from '../utils.js';
import Database from 'better-sqlite3';
import bcrypt from "bcrypt";
const saltRounds = 10;

const perms = {
    1 : "PUBLISH",
    2 : "CONSUME",
    3 : "PUBLISH|CONSUME",
    4 : "ADMIN"
}

export default class Auth{

    constructor(){
      this.db = new Database('auth.db')
      this.initDatabase()
   
    }

    initDatabase(){
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
              name TEXT PRIMARY KEY,
              password TEXT,
              permissions INTEGER,
              updated_at INTEGER
            );
            
            PRAGMA journal_mode = WAL;  -- Better write performance
          `);
    }
   
    readCredentials(){
    //  console.log(DEFAULT_OPTS.cwd)
     const f = readFileSync(path.join(DEFAULT_OPTS.cwd, ".auth"), "utf-8")
     const lines = f.split('\n');
    //  console.log(lines)
     for(const line of lines){
        // console.log(line);

        if (line.includes(':')) {
            const [username, password, permissions] = line.split(":");
           debugLib.Debug(`found user in .auth ${username}`, "info");
        //    console.log(username, password, permissions)
             
            this.insertUser(username.trim(), password.trim(), permissions)
        } else {
            debugLib.Debug(`Skipping invalid line: ${line} in .auth`, "error");
        }
     }
    }

    verifyPassword(password, storedHash) {
          const hashed = bcrypt.compareSync(password, storedHash);
           return hashed
     }

     insertUser(username, password, permissions){
           const transaction = this.db.transaction(() => {
         
              password =  bcrypt.hashSync(password, saltRounds);
         
       
      
              const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO users 
                VALUES (?, ?, ?, ?)
              `);
              debugLib.Debug(`adding user ${username} permission level: ${perms[+permissions]}`, "info")
              stmt.run(username, password, permissions, Date.now())
              });


          transaction()
     }

     Authenticate(username, password){
        const user = this.db.prepare(`
            SELECT name, password, permissions  FROM users WHERE name = '${username}'
        `).all()

       if(user.length != 0){
        if(this.verifyPassword(password, user[0].password)){
            return [user[0].name, user[0].permissions]
        }
       }
   
       return undefined
     }
}