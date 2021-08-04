#!/usr/bin/env node

const path              = require("path");
const fs                = require("fs");

const migrate           = require("./lib/migrate");
const pathConfig = require('./lib/pathconfig');

let migrationTools = {};

migrationTools.runMigrations = async (sequelize, fromRevision = 0, fromPos = 0, stop = false, rollback = false, noTransaction = false) => 
{
    const optionDefinitions = [
        { name: 'rev', alias: 'r', type: Number, description: 'Set migration revision (default: 0)', defaultValue: 0 },
        { name: 'rollback', alias: 'b', type: Boolean, description: 'Rollback to specified revision', defaultValue: false },
        { name: 'pos', alias: 'p', type: Number, description: 'Run first migration at pos (default: 0)', defaultValue: 0 },
        { name: 'no-transaction', type: Boolean, description: 'Run each change separately instead of all in a transaction (allows it to fail and continue)', defaultValue: false },
        { name: 'one', type: Boolean, description: 'Do not run next migrations', defaultValue: false },
        { name: 'list', alias: 'l', type: Boolean, description: 'Show migration file list (without execution)', defaultValue: false },
        { name: 'migrations-path', type: String, description: 'The path to the migrations folder' },
        { name: 'models-path', type: String, description: 'The path to the models folder' },
        { name: 'help', type: Boolean, description: 'Show this message' }
    ];
    
    let {
        migrationsDir, 
        modelsDir
    } = pathConfig({});
    
    if (!fs.existsSync(modelsDir)) {
        console.log("Can't find models directory. Use `sequelize init` to create it")
        return false;
    }
    
    if (!fs.existsSync(migrationsDir)) {
        console.log("Can't find migrations directory. Use `sequelize init` to create it")
        return false;
    }
    
    // const sequelize = require(modelsDir).sequelize;
    const queryInterface = sequelize.getQueryInterface();
    
    let migrationFiles = fs.readdirSync(migrationsDir)
    // filter JS files
      .filter((file) => {
        return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
      })
    // sort by revision
      .sort( (a, b) => {
          let revA = parseInt( path.basename(a).split('-',2)[0]),
              revB = parseInt( path.basename(b).split('-',2)[0]);
          if (rollback) {
              if (revA < revB) return 1;
              if (revA > revB) return -1;
          } else {
              if (revA < revB) return -1;
              if (revA > revB) return 1;
          }
          return 0;
      })
    // remove all migrations before fromRevision
      .filter((file) => {
          let rev = parseInt( path.basename(file).split('-',2)[0]);
          return (rev >= fromRevision);
      });
      
    console.log("Migrations to execute:");  
    migrationFiles.forEach((file) => {
        console.log("\t"+file);
    });

    let lastRev = fromRevision;
    for (const file of migrationFiles) {
        console.log("Execute migration from file: "+file);
        let success = await migrate.executeMigration(queryInterface, path.join(migrationsDir, file), !noTransaction, fromPos, rollback);
        
        if (!success)
            return lastRev;
        
        lastRev = parseInt( path.basename(file).split('-',2)[0]);

        fromPos = 0;
    }

    return lastRev;
}

module.exports = migrationTools;