let ARRAY = require("./datatypes/Array");
let BOOLEAN = require("./datatypes/Boolean");
let DATETIME = require("./datatypes/DateTime");
let FILE = require("./datatypes/File");
let FILEGALLERY = require("./datatypes/FileGallery");
let NUMBER = require("./datatypes/Number");
let OBJECT = require("./datatypes/Object");
let TAGS = require("./datatypes/Tags");
let TEXT = require("./datatypes/Text");
let TIME = require("./datatypes/Time");
const { makeMigration } = require("./migrations/makemigration");
const { runMigrations } = require("./migrations/runmigration");
const { QueryTypes } = require('sequelize');

let collectionManager = {};

collectionManager.addWeblancerDataTypes = (Sequelize) => {
    ARRAY.define(Sequelize);
    BOOLEAN.define(Sequelize);
    DATETIME.define(Sequelize);
    FILE.define(Sequelize);
    FILEGALLERY.define(Sequelize);
    NUMBER.define(Sequelize);
    OBJECT.define(Sequelize);
    TAGS.define(Sequelize);
    TEXT.define(Sequelize);
    TIME.define(Sequelize);
}

collectionManager.resolveMigrations = async (sequelize) => {
    let newName = new Date().getTime().toString();

    let config = await sequelize.models.config.findOne({
        where: {
            key: "migrationRevision"
        }
    })

    console.log("configs", configs);
    let fromRev = config? config.value.value : 0;

    if (!sequelize) {
        console.log("No sequelize found");
        return false;
    }

    let created = await makeMigration(newName, sequelize);
    console.log("makeMigration created", created);

    let lastRevisition = await runMigrations(sequelize, fromRev);

    console.log("runMigrations lastRevisition", lastRevisition);

    await sequelize.query(`UPDATE configs SET value = '${
        JSON.stringify({value: lastRevisition + 1})
    }' WHERE key = 'migrationRevision'`);

    await sequelize.query(`INSERT INTO configs (key, value) SELECT 'migrationRevision', '${
        JSON.stringify({value: lastRevisition + 1})
    }' WHERE NOT EXISTS (SELECT 1 FROM configs WHERE key='migrationRevision')`);
}

module.exports = collectionManager;