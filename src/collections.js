const { Client } = require('pg')
const Sequelize = require('sequelize');
const { QueryTypes } = require('sequelize');
const getDataType = require('./datatypes/getDataType');
const define = require('./define');
const { resolveMigrations } = require('./manager');
const collectionManager = require('./manager');
const Collection = require('./schema/collection');
const Config = require('./schema/config');
const {DataTypes} = Sequelize;

collectionManager.addWeblancerDataTypes(Sequelize);

let _sequelize;
let _models;

let _dbName;
let _dbUser;
let _dbPassword;
let _groupId;
let _dbHost;
let _dbPort;

async function initCollections (dbName, dbUser, dbPassword, groupId, dbHost, dbPort) {
    dbName = dbName.toLowerCase();

    _dbName = dbName;
    _dbUser = dbUser;
    _dbPassword = dbPassword;
    _groupId = groupId;
    _dbHost = dbHost;
    _dbPort = dbPort;

    // Creating db if not exist
    let pgConfig = {
        user: dbUser,
        password: dbPassword,
    };
    dbHost && (pgConfig.host = dbHost);
    dbPort && (pgConfig.port = dbPort);
    const pgClient = new Client(pgConfig);
    await pgClient.connect();

    const isDbExist = async () => {
        let res = await pgClient.query(`SELECT FROM pg_database WHERE datname = '${dbName}'`);
        return res.rowCount > 0;
    }

    if (!await isDbExist()) {
        await pgClient
            .query(`CREATE DATABASE ${dbName}`);
    }
    
    await pgClient.end();
    // Creating db if not exist

    _sequelize = new Sequelize(
        dbName,
        dbUser,
        dbPassword,
        {
            host:  dbHost || "localhost",
            dialect: 'postgres',
        },
    );
    let query = "SELECT * FROM collections";
    if (groupId) {
        query = `${query} WHERE groupId = '${groupId}'`
    }

    let allCollections = [];
    try {
        allCollections = await _sequelize
            .query(`${query};`, { type: QueryTypes.SELECT });
    } catch (err) {
        console.log("initCollections error 0", err)
    }

    let modelMap = {};
    for(const collection of allCollections) {
        modelMap[collection.name] = 
            define(_sequelize, collection.name, collection.schema, collection.relation); 
    }

    _models = {
        collection: Collection(_sequelize, DataTypes),
        config: Config(_sequelize, DataTypes),
        ...modelMap
    };

    // Resolving assosiations
    let allModels = {};
    Object.values(_models).forEach(model => {
        allModels[model.name] = model;
    });
    Object.values(_models).forEach(model => {
        if (model.associate)
            model.associate(allModels);
    });
    // Resolving assosiations

    await _sequelize.sync({
    })

    await resolveMigrations(_sequelize);

    return {models: _models, sequelize: _sequelize};
}

async function updateCollections() {
    return await initCollections(_dbName, _dbUser, _dbPassword, _groupId, _dbHost, _dbPort);
}

async function createCollection(name, displayName, description, isApp) {
    let checkName = async (name, tryTime = 1) => {
        try {
            let sameCollection = await models.instance.findOne({
                where: {
                    name
                }
            });
    
            if (sameCollection) {
                if (!isApp) {
                    return false;
                }
    
                return `${name}_${tryTime}`;
            }

            return name;
        } catch(error) {
            console.log("route create error", error);
            return false;
        }
    }

    name = name.toLowerCase();

    let nameChecked = false;
    let tryTime = 1;
    while (!nameChecked) {
        let newName = await checkName(name, tryTime);

        if (!newName) {
            return {
                success: false, 
                error: "Name is not acceptable, try another one",
                errorStatusCode: 409
            };
        }

        if (name === newName) {
            break;
        }

        tryTime++;
    }

    let newCollection = {
        name, displayName, description
    };

    newCollection.schema = {
        id : {
            type: DataTypes.BIGINT,
            unique: true,
            autoIncrement: true,
            primaryKey: true
        }
    };

    await models.instance.collection.create(newCollection);
    
    return {
        success: true,
        collections: await models.instance.collection.findAll().toJSON()
    };
}

async function addField(collectionName, name, key, type, description) {
    let collection;
    try {
        collection = await models.instance.collection.findOne({
            where: {
                name: collectionName
            }
        })

        if (!collection) {
            return {
                success: false,
                error: "Collection not found",
                errorStatusCode: 404
            }
        }
    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorStatusCode: 500
        }
    }
    
    if (collection[key]) {
        return {
            success: false,
            error: "Key exist in collection, try another key",
            errorStatusCode: 409
        }
    }
    
    if (!getDataType(type)) {
        return {
            success: false,
            error: "Type not found",
            errorStatusCode: 404
        }
    }

    collection[key] = {
        type: getDataType(type),
        name,
        description,
        weblancerType: type
    }

    return {
        success: true,
        collection
    }
}

const sequelize = {
    get instance() {
        return _sequelize;
    }
};

const models = {
    get instance() {
        return _models;
    }
};

module.exports = {
    initCollections, 
    sequelize, 
    models, 
    DataTypes, 
    updateCollections,
    createCollection,
    addField
};