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
const fs = require('fs');
const path = require('path');

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
        },
        attributes: ["id", "key", "value"]
    })

    console.log("config", config);
    let fromRev = config? config.value.value : 0;

    if (fromRev === 0) {
        if(!process.env.PWD){
            process.env.PWD = process.cwd()
        }
        let migrationsDir = path.join(process.env.PWD, 'migrations')
        fs.rmdirSync(migrationsDir, { recursive: true });
    }

    if (!sequelize) {
        console.log("No sequelize found");
        return false;
    }

    let lastRevision;
    try {
        let created = await makeMigration(newName, sequelize);
        console.log("makeMigration created", created);

        let {success, lastRevision: newLastRevision} = await runMigrations(sequelize, fromRev);

        lastRevision = newLastRevision;
        console.log("runMigrations lastRevision", lastRevision);

        if (!success) {
            throw new Error("Can't migrate to database");
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        }
    }

    if (config) {
        await config.update({
            value: {value: lastRevision + 1}
        });
    } else {
        await sequelize.models.config.create({
            key: "migrationRevision",
            value: {value: lastRevision + 1}
        });
    }

    return {
        success: true
    }
}

module.exports = collectionManager;
