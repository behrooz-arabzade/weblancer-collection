let migrate = require("./lib/migrate");
let pathConfig = require('./lib/pathconfig');

const fs                = require("fs");
const path              = require("path");
const _                 = require("lodash");
const {cloneDeep} = require("lodash");

let migrationTools = {};

migrationTools.makeMigration = async (name, sequelize) =>
{
    const optionDefinitions = [
        { name: 'preview', alias: 'p', type: Boolean, description: 'Show migration preview (does not change any files)' },
        { name: 'name', alias: 'n', type: String, description: 'Set migration name (default: "noname")',},
        { name: 'comment', alias: 'c', type: String, description: 'Set migration comment' },
        { name: 'execute', alias: 'x', type: Boolean, description: 'Create new migration and execute it' },
        { name: 'migrations-path', type: String, description: 'The path to the migrations folder' },
        { name: 'models-path', type: String, description: 'The path to the models folder' },
        { name: 'help', type: Boolean, description: 'Show this message' }
    ];

    const {
        migrationsDir,
        modelsDir
    } = pathConfig({});

    if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir);
    }

    if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir);
    }

    // current state
    const currentState = {
        tables: {}
    };

    // load last state
    let previousState = {
        revision: 0,
        version: 1,
        tables: {}
    };

    try {
        previousState = JSON.parse(fs.readFileSync(path.join(migrationsDir, '_current.json') ));
    } catch (e) { }

    let models = cloneDeep(sequelize.models);

    currentState.tables = migrate.reverseModels(sequelize, models);

    let upActions = migrate.parseDifference(previousState.tables, currentState.tables);
    let downActions = migrate.parseDifference(currentState.tables, previousState.tables);

    // sort actions
    migrate.sortActions(upActions);
    migrate.sortActions(downActions);

    let migration = migrate.getMigration(upActions, downActions);

    if (migration.commandsUp.length === 0)
    {
        console.log("No changes found");
        return false;
    }

    // log migration actions
    _.each(migration.consoleOut, (v) => { console.log ("[Actions] "+v)});

    // backup _current file
    if (fs.existsSync(path.join(migrationsDir, '_current.json')))
        fs.writeFileSync(path.join(migrationsDir, '_current_bak.json'),
            fs.readFileSync(path.join(migrationsDir, '_current.json'))
        );


    // save current state
    currentState.revision = previousState.revision + 1;
    fs.writeFileSync(path.join(migrationsDir, '_current.json'), JSON.stringify(currentState, null, 4) );

    // write migration to file
    let info = migrate.writeMigration(currentState.revision,
                   migration,
                   migrationsDir,
                   (name) ? name : 'noname',
                   '');

    console.log(`New migration to revision ${currentState.revision} has been saved to file '${info.filename}'`);

    return true;
}

module.exports = migrationTools;
